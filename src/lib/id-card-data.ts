import { prisma } from '@/lib/prisma';
import { formatGoogleDriveDirectUrl } from '@/lib/google-drive';
import {
  formatQrPayload,
  generateQrDataUrl,
  generateStrong8DigitCode,
  getOrCreateStudentQrToken,
} from '@/lib/qr-service';

export type IdCardSortBy =
  | 'CLASS_THEN_NAME'
  | 'CLASS_THEN_SPR'
  | 'NAME_ASC'
  | 'SPR_ASC';

export interface StudentIdCardRecord {
  id: string;
  sprId: string;
  eightDigitSprId: string;
  studentCode: string | null;
  fullName: string;
  classId: string | null;
  className: string;
  numericGrade: number;
  division: string;
  academicYear: string;
  schoolName: string;
  photoUrl: string | null;
  rawPhotoUrl?: string | null;
  fatherName: string;
  place: string;
  district: string;
  location: string;
  phone: string;
  email: string;
  qrToken: string;
  qrPayload: string;
  qrDataUrl?: string;
  issueDate: string;
}

export interface FetchIdCardRecordsOptions {
  classId?: string;
  sortBy?: string;
  studentIds?: string[];
  includeQrDataUrl?: boolean;
  includeClasses?: boolean;
  academicYearOverride?: string;
}

export interface FetchIdCardRecordsResult {
  cards: StudentIdCardRecord[];
  classes: { id: string; name: string; numericGrade: number }[];
  sortBy: IdCardSortBy;
}

const VALID_SORTS = new Set<IdCardSortBy>([
  'CLASS_THEN_NAME',
  'CLASS_THEN_SPR',
  'NAME_ASC',
  'SPR_ASC',
]);

export function normalizeIdCardSortBy(raw?: string | null): IdCardSortBy {
  if (raw && VALID_SORTS.has(raw as IdCardSortBy)) {
    return raw as IdCardSortBy;
  }
  return 'CLASS_THEN_NAME';
}

function findPersonalFamilyAnswer(
  answers: Record<string, unknown>,
  keywords: string[]
): string | null {
  for (const kw of keywords) {
    const direct = answers[kw];
    if (typeof direct === 'string' && direct.trim()) {
      return direct.trim();
    }
  }
  for (const [k, val] of Object.entries(answers)) {
    if (typeof val === 'string' && val.trim()) {
      const lowerKey = k.toLowerCase();
      if (keywords.some((kw) => lowerKey.includes(kw.toLowerCase()))) {
        return val.trim();
      }
    }
  }
  return null;
}

function sortIdCards(cards: StudentIdCardRecord[], sortBy: IdCardSortBy): void {
  if (sortBy === 'CLASS_THEN_NAME') {
    cards.sort((a, b) => {
      if (b.numericGrade !== a.numericGrade) {
        return b.numericGrade - a.numericGrade;
      }
      return (a.fullName || '').localeCompare(b.fullName || '', undefined, {
        sensitivity: 'base',
      });
    });
  } else if (sortBy === 'CLASS_THEN_SPR') {
    cards.sort((a, b) => {
      if (b.numericGrade !== a.numericGrade) {
        return b.numericGrade - a.numericGrade;
      }
      return (a.sprId || '').localeCompare(b.sprId || '', undefined, {
        numeric: true,
      });
    });
  } else if (sortBy === 'NAME_ASC') {
    cards.sort((a, b) =>
      (a.fullName || '').localeCompare(b.fullName || '', undefined, {
        sensitivity: 'base',
      })
    );
  } else if (sortBy === 'SPR_ASC') {
    cards.sort((a, b) =>
      (a.sprId || '').localeCompare(b.sprId || '', undefined, {
        numeric: true,
      })
    );
  }
}

/**
 * Fetches student records with questionnaire fallbacks, active QR tokens/payloads,
 * deterministic 8-digit codes, and canonical sorting for ID card JSON & bulk PDF exports.
 */
export async function fetchIdCardRecords(
  options: FetchIdCardRecordsOptions = {}
): Promise<FetchIdCardRecordsResult> {
  const {
    classId = '',
    studentIds,
    includeQrDataUrl = true,
    includeClasses = true,
    academicYearOverride,
  } = options;
  const sortBy = normalizeIdCardSortBy(options.sortBy);

  const cleanedIds = Array.isArray(studentIds)
    ? Array.from(
        new Set(
          studentIds
            .map((id) => (typeof id === 'string' ? id.trim() : ''))
            .filter(Boolean)
        )
      )
    : [];

  const whereClause: Record<string, any> = {};
  if (cleanedIds.length > 0) {
    whereClause.id = { in: cleanedIds };
  } else {
    whereClause.status = 'ACTIVE';
    if (classId && classId !== 'ALL') {
      whereClause.classId = classId;
    }
  }

  const [students, classes] = await Promise.all([
    prisma.student.findMany({
      where: whereClause,
      include: {
        class: { select: { id: true, name: true, numericGrade: true } },
        school: { select: { id: true, name: true } },
        academicYear: { select: { id: true, name: true } },
        qrToken: true,
        questionnaireResponses: {
          where: {
            questionnaire: {
              OR: [
                { code: 'PERSONAL_FAMILY' },
                { title: { contains: 'Personal', mode: 'insensitive' } },
                { title: { contains: 'Family', mode: 'insensitive' } },
              ],
            },
          },
          select: {
            answers: true,
            status: true,
          },
          take: 1,
        },
      },
    }),
    includeClasses
      ? prisma.academicClass.findMany({
          select: { id: true, name: true, numericGrade: true },
          orderBy: { numericGrade: 'desc' },
        })
      : Promise.resolve([]),
  ]);

  const issueDate = new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const processedCards = await Promise.all(
    students.map(async (st): Promise<StudentIdCardRecord> => {
      const pfAnswers =
        st.questionnaireResponses?.[0]?.answers &&
        typeof st.questionnaireResponses[0].answers === 'object'
          ? (st.questionnaireResponses[0].answers as Record<string, unknown>)
          : {};

      const resolvedFather =
        st.fatherName ||
        findPersonalFamilyAnswer(pfAnswers, ['father_name', 'father']) ||
        null;
      const resolvedPlace =
        st.place ||
        findPersonalFamilyAnswer(pfAnswers, ['place', 'locality']) ||
        null;
      const resolvedDistrict =
        st.district ||
        findPersonalFamilyAnswer(pfAnswers, ['district']) ||
        null;
      const resolvedPhone =
        st.studentPhone ||
        findPersonalFamilyAnswer(pfAnswers, ['student_phone', 'student_contact']) ||
        st.guardianPhone ||
        findPersonalFamilyAnswer(pfAnswers, [
          'guardian_phone',
          'guardian_contact',
          'parent_phone',
        ]) ||
        null;
      const resolvedEmail =
        st.studentEmail ||
        findPersonalFamilyAnswer(pfAnswers, ['student_email', 'email']) ||
        null;

      let qrToken: string;
      let qrPayload: string;
      if (st.qrToken && st.qrToken.status === 'ACTIVE' && st.qrToken.qrToken) {
        qrToken = st.qrToken.qrToken;
        qrPayload = formatQrPayload(qrToken);
      } else {
        const ensured = await getOrCreateStudentQrToken(st.id);
        qrToken = ensured.qrToken;
        qrPayload = ensured.qrPayload;
      }

      const qrDataUrl = includeQrDataUrl
        ? await generateQrDataUrl(qrPayload)
        : undefined;

      const rawPhoto = st.photoUrl || null;
      const resolvedPhoto = formatGoogleDriveDirectUrl(rawPhoto, 400) || rawPhoto;
      const resolvedSprId = st.sprStudentId || 'SPR0000';
      const eightDigitSprId = generateStrong8DigitCode(st.id, resolvedSprId);

      return {
        id: st.id,
        sprId: resolvedSprId,
        eightDigitSprId,
        studentCode: st.studentId,
        fullName: st.fullName || 'Student Name',
        classId: st.classId,
        className: st.class?.name || 'Assigned Class',
        numericGrade: st.class?.numericGrade ?? 0,
        division: st.division || 'A',
        academicYear: academicYearOverride || '2026-27',
        schoolName: st.school?.name || "Ma'din School of Excellence",
        photoUrl: resolvedPhoto,
        rawPhotoUrl: rawPhoto,
        fatherName: resolvedFather || '—',
        place: resolvedPlace || '—',
        district: resolvedDistrict || '—',
        location:
          [resolvedPlace, resolvedDistrict].filter(Boolean).join(', ') || '—',
        phone: resolvedPhone || '—',
        email: resolvedEmail || '—',
        qrToken,
        qrPayload,
        ...(qrDataUrl ? { qrDataUrl } : {}),
        issueDate,
      };
    })
  );

  sortIdCards(processedCards, sortBy);

  return {
    cards: processedCards,
    classes,
    sortBy,
  };
}
