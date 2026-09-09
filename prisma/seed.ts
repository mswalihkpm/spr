import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SPR Madin database...');

  // 1. System Settings
  await prisma.systemSetting.upsert({
    where: { key: 'INSTITUTION_NAME' },
    update: {},
    create: {
      key: 'INSTITUTION_NAME',
      value: 'Madin School of Excellence',
      description: 'Full official name of the educational institution',
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'MISSING_DATA_RULE' },
    update: {},
    create: {
      key: 'MISSING_DATA_RULE',
      value: 'IGNORE_NORMALIZE',
      description: 'Strategy for handling missing category records (IGNORE_NORMALIZE, TREAT_AS_ZERO, REQUIRE_COMPLETE)',
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'DISPLAY_AUTOSCROLL_INTERVAL' },
    update: {},
    create: {
      key: 'DISPLAY_AUTOSCROLL_INTERVAL',
      value: '10',
      description: 'Display mode carousel rotation speed in seconds',
    },
  });

  // 2. Main Super Admin Accounts & Creative Hub Admin
  const admin1PasswordHash = await bcrypt.hash('7412369', 10);
  const superAdmin1 = await prisma.user.upsert({
    where: { email: 'excellence@madin.edu.in' },
    update: {
      passwordHash: admin1PasswordHash,
      mustChangePassword: false,
      status: 'ACTIVE',
      role: 'SUPER_ADMIN',
      name: 'Super Administrator (Excellence)',
    },
    create: {
      email: 'excellence@madin.edu.in',
      name: 'Super Administrator (Excellence)',
      passwordHash: admin1PasswordHash,
      role: 'SUPER_ADMIN',
      mustChangePassword: false,
      status: 'ACTIVE',
    },
  });
  console.log('Super Admin 1 provisioned:', superAdmin1.email);

  const admin2PasswordHash = await bcrypt.hash('9632147', 10);
  const superAdmin2 = await prisma.user.upsert({
    where: { email: 'mswalihkpm@gmail.com' },
    update: {
      passwordHash: admin2PasswordHash,
      mustChangePassword: false,
      status: 'ACTIVE',
      role: 'SUPER_ADMIN',
      name: 'Super Administrator (Swalih KPM)',
    },
    create: {
      email: 'mswalihkpm@gmail.com',
      name: 'Super Administrator (Swalih KPM)',
      passwordHash: admin2PasswordHash,
      role: 'SUPER_ADMIN',
      mustChangePassword: false,
      status: 'ACTIVE',
    },
  });
  console.log('Super Admin 2 provisioned:', superAdmin2.email);

  const creativeHubPasswordHash = await bcrypt.hash('00074123', 10);
  const creativeHubAdmin = await prisma.user.upsert({
    where: { email: 'creativehub@gmail.com' },
    update: {
      passwordHash: creativeHubPasswordHash,
      mustChangePassword: false,
      status: 'ACTIVE',
      role: 'CREATIVE_HUB_ADMIN',
      name: 'Creative Hub Admin',
    },
    create: {
      email: 'creativehub@gmail.com',
      name: 'Creative Hub Admin',
      passwordHash: creativeHubPasswordHash,
      role: 'CREATIVE_HUB_ADMIN',
      mustChangePassword: false,
      status: 'ACTIVE',
    },
  });
  console.log('Creative Hub Admin provisioned:', creativeHubAdmin.email);

  // 3. Academic Year & Terms
  const academicYear = await prisma.academicYear.upsert({
    where: { name: '2025-2026' },
    update: { isCurrent: true },
    create: {
      name: '2025-2026',
      isCurrent: true,
      startDate: new Date('2025-06-01'),
      endDate: new Date('2026-03-31'),
    },
  });

  const term1 = await prisma.term.upsert({
    where: { id: 'term-1-2026' },
    update: {},
    create: {
      id: 'term-1-2026',
      name: 'Term 1',
      code: 'T1',
      academicYearId: academicYear.id,
      isCurrent: true,
    },
  });

  const term2 = await prisma.term.upsert({
    where: { id: 'term-2-2026' },
    update: {},
    create: {
      id: 'term-2-2026',
      name: 'Term 2',
      code: 'T2',
      academicYearId: academicYear.id,
      isCurrent: false,
    },
  });

  // 4. Schools
  const schoolsData = [
    { name: 'GBHS Malappuram', code: 'GBHS-MLP' },
    { name: 'GBHSS Malappuram', code: 'GBHSS-MLP' },
    { name: 'CM Academy', code: 'CMA' },
    { name: "Ma'din Higher Secondary School", code: 'MHSS' },
    { name: 'DUHSS Panakkad', code: 'DUHSS' },
  ];

  const schoolsMap: Record<string, string> = {};
  for (const s of schoolsData) {
    const record = await prisma.school.upsert({
      where: { code: s.code },
      update: {},
      create: { name: s.name, code: s.code },
    });
    schoolsMap[s.name] = record.id;
  }

  // 5. Classes
  const classesData = [
    { name: 'Class 8', numericGrade: 8 },
    { name: 'Class 9', numericGrade: 9 },
    { name: 'Class 10', numericGrade: 10 },
    { name: 'Class +1', numericGrade: 11 },
    { name: 'Class +2', numericGrade: 12 },
  ];

  const classesMap: Record<string, string> = {};
  for (const c of classesData) {
    const record = await prisma.academicClass.upsert({
      where: { name: c.name },
      update: {},
      create: { name: c.name, numericGrade: c.numericGrade },
    });
    classesMap[c.name] = record.id;
  }

  // 6. Levels
  const levelsData = [
    { name: 'Campus', code: 'CAMPUS', weightMultiplier: 1.0, displayOrder: 1 },
    { name: 'School', code: 'SCHOOL', weightMultiplier: 1.1, displayOrder: 2 },
    { name: 'Sub-district', code: 'SUB_DISTRICT', weightMultiplier: 1.2, displayOrder: 3 },
    { name: 'District', code: 'DISTRICT', weightMultiplier: 1.3, displayOrder: 4 },
    { name: 'State', code: 'STATE', weightMultiplier: 1.5, displayOrder: 5 },
    { name: 'National', code: 'NATIONAL', weightMultiplier: 1.8, displayOrder: 6 },
    { name: 'International', code: 'INTERNATIONAL', weightMultiplier: 2.0, displayOrder: 7 },
  ];

  const levelsMap: Record<string, string> = {};
  for (const l of levelsData) {
    const record = await prisma.level.upsert({
      where: { code: l.code },
      update: {},
      create: l,
    });
    levelsMap[l.code] = record.id;
  }

  // 7. Categories & Default Weights
  const categoriesData = [
    {
      code: 'ISLAMIC',
      name: 'Islamic Studies',
      description: 'Jamiathul Hind Al-Islamiyya & Ma’din curriculum',
      icon: 'BookOpen',
      isSystem: true,
      displayOrder: 1,
      defaultWeight: 25.0,
      includeInSPR: true,
    },
    {
      code: 'SCHOOL',
      name: 'School Studies',
      description: 'Kerala State Syllabus & NCERT curriculum',
      icon: 'GraduationCap',
      isSystem: true,
      displayOrder: 2,
      defaultWeight: 25.0,
      includeInSPR: true,
    },
    {
      code: 'PROGRAMS',
      name: 'Programs & Competitions',
      description: 'Campus, school and inter-institutional competitions',
      icon: 'Trophy',
      isSystem: true,
      displayOrder: 3,
      defaultWeight: 15.0,
      includeInSPR: true,
    },
    {
      code: 'CREATIVE_HUB',
      name: 'Creative Hub',
      description: 'Student literary publications, articles, poems, and creative works',
      icon: 'Sparkles',
      isSystem: true,
      displayOrder: 4,
      defaultWeight: 10.0,
      includeInSPR: true,
    },
    {
      code: 'LITERARY',
      name: 'Literary Programs',
      description: 'Sahityotsav, Jamia Maharjan, M-Lit Fest events',
      icon: 'Feather',
      isSystem: true,
      displayOrder: 5,
      defaultWeight: 15.0,
      includeInSPR: true,
    },
    {
      code: 'LIBRARY',
      name: 'Library / Reading',
      description: 'MSOE Kuthbakhana reading logs & comprehension assessments',
      icon: 'Library',
      isSystem: true,
      displayOrder: 6,
      defaultWeight: 10.0,
      includeInSPR: true,
    },
  ];

  const categoriesMap: Record<string, string> = {};
  for (const cat of categoriesData) {
    const record = await prisma.category.upsert({
      where: { code: cat.code },
      update: { defaultWeight: cat.defaultWeight, includeInSPR: cat.includeInSPR },
      create: cat,
    });
    categoriesMap[cat.code] = record.id;

    // Create CategoryWeight entry
    await prisma.categoryWeight.upsert({
      where: { id: `weight-${cat.code}-${academicYear.id}` },
      update: { weight: cat.defaultWeight, isActive: true, isIncludedInSPR: cat.includeInSPR },
      create: {
        id: `weight-${cat.code}-${academicYear.id}`,
        categoryId: record.id,
        academicYearId: academicYear.id,
        weight: cat.defaultWeight,
        isActive: true,
        isIncludedInSPR: cat.includeInSPR,
      },
    });
  }

  // 8. Academic Institutions & Boards
  const madinAcademy = await prisma.academicInstitution.upsert({
    where: { code: 'MADIN_ACADEMY' },
    update: {},
    create: { name: "Ma'din Academy", code: 'MADIN_ACADEMY' },
  });

  const jamiathulHind = await prisma.academicInstitution.upsert({
    where: { code: 'JAMIATHUL_HIND' },
    update: {},
    create: { name: 'Jamiathul Hind Al-Islamiyya', code: 'JAMIATHUL_HIND' },
  });

  const keralaBoard = await prisma.boardSyllabus.upsert({
    where: { code: 'KERALA_STATE' },
    update: {},
    create: { name: 'Kerala State Syllabus', code: 'KERALA_STATE' },
  });

  const ncertBoard = await prisma.boardSyllabus.upsert({
    where: { code: 'NCERT' },
    update: {},
    create: { name: 'NCERT / CBSE', code: 'NCERT' },
  });

  // 9. Exams
  const islamicExam = await prisma.exam.upsert({
    where: { id: 'exam-islamic-t1-2026' },
    update: {},
    create: {
      id: 'exam-islamic-t1-2026',
      name: 'First Term Islamic Assessment 2026',
      categoryId: categoriesMap['ISLAMIC'],
      termId: term1.id,
      academicYearId: academicYear.id,
    },
  });

  const schoolExam = await prisma.exam.upsert({
    where: { id: 'exam-school-t1-2026' },
    update: {},
    create: {
      id: 'exam-school-t1-2026',
      name: 'First Terminal Academic Examination 2026',
      categoryId: categoriesMap['SCHOOL'],
      termId: term1.id,
      academicYearId: academicYear.id,
    },
  });

  // 10. Subjects
  const islamicSubjects = [
    { name: 'Quran & Tajweed', code: 'QRN', institutionId: jamiathulHind.id },
    { name: 'Hadith Studies', code: 'HDT', institutionId: jamiathulHind.id },
    { name: 'Fiqh & Islamic Jurisprudence', code: 'FQH', institutionId: jamiathulHind.id },
    { name: 'Arabic Grammar (Nahw & Sarf)', code: 'ARB_GR', institutionId: madinAcademy.id },
    { name: 'Tareekh (Islamic History)', code: 'TRK', institutionId: madinAcademy.id },
  ];

  const islamicSubjectsMap: Record<string, string> = {};
  for (const sub of islamicSubjects) {
    const s = await prisma.subject.upsert({
      where: { id: `sub-islamic-${sub.code}` },
      update: {},
      create: {
        id: `sub-islamic-${sub.code}`,
        name: sub.name,
        code: sub.code,
        categoryId: categoriesMap['ISLAMIC'],
        institutionId: sub.institutionId,
        maxScore: 100,
      },
    });
    islamicSubjectsMap[sub.code] = s.id;
  }

  const schoolSubjects = [
    { name: 'Mathematics', code: 'MATH', boardId: keralaBoard.id },
    { name: 'Physics & Chemistry (Science)', code: 'SCI', boardId: keralaBoard.id },
    { name: 'English Language & Lit', code: 'ENG', boardId: ncertBoard.id },
    { name: 'Social Science', code: 'SOC', boardId: keralaBoard.id },
    { name: 'Malayalam', code: 'MAL', boardId: keralaBoard.id },
    { name: 'Computer Science & AI', code: 'CS', boardId: ncertBoard.id },
  ];

  const schoolSubjectsMap: Record<string, string> = {};
  for (const sub of schoolSubjects) {
    const s = await prisma.subject.upsert({
      where: { id: `sub-school-${sub.code}` },
      update: {},
      create: {
        id: `sub-school-${sub.code}`,
        name: sub.name,
        code: sub.code,
        categoryId: categoriesMap['SCHOOL'],
        boardId: sub.boardId,
        maxScore: 100,
      },
    });
    schoolSubjectsMap[sub.code] = s.id;
  }

  // 11. Programs & Competitions
  const program1 = await prisma.program.upsert({
    where: { id: 'prog-talent-2026' },
    update: {},
    create: {
      id: 'prog-talent-2026',
      name: 'Madin Excellence Talent Olympiad 2026',
      organizer: 'Madin School of Excellence',
      academicYearId: academicYear.id,
      levelId: levelsMap['CAMPUS'],
      date: new Date('2026-07-15'),
    },
  });

  const compElocution = await prisma.competition.upsert({
    where: { id: 'comp-elocution-2026' },
    update: {},
    create: {
      id: 'comp-elocution-2026',
      programId: program1.id,
      name: 'English Elocution & Public Speaking',
      maxScore: 50,
    },
  });

  const compQuiz = await prisma.competition.upsert({
    where: { id: 'comp-quiz-2026' },
    update: {},
    create: {
      id: 'comp-quiz-2026',
      programId: program1.id,
      name: 'General Science & Knowledge Quiz',
      maxScore: 50,
    },
  });

  // 12. Creative Hub Categories
  const creativeHubCategories = [
    { name: 'Poem', code: 'POEM' },
    { name: 'Story', code: 'STORY' },
    { name: 'Article', code: 'ARTICLE' },
    { name: 'Letter', code: 'LETTER' },
    { name: 'Response', code: 'RESPONSE' },
    { name: 'Others', code: 'OTHERS' },
  ];

  const creativeHubMap: Record<string, string> = {};
  for (const c of creativeHubCategories) {
    const cat = await prisma.creativeHubCategory.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
    creativeHubMap[c.code] = cat.id;
  }

  // 13. Literary Events & Competitions
  const salityotsav = await prisma.literaryEvent.upsert({
    where: { code: 'SAHITYOTSAV_2026' },
    update: {},
    create: {
      name: 'Sahityotsav 2026',
      code: 'SAHITYOTSAV_2026',
      academicYearId: academicYear.id,
      date: new Date('2026-08-10'),
    },
  });

  const litCompEssay = await prisma.literaryCompetition.upsert({
    where: { id: 'lit-comp-essay-2026' },
    update: {},
    create: {
      id: 'lit-comp-essay-2026',
      eventId: salityotsav.id,
      name: 'Malayalam Essay Writing',
      levelId: levelsMap['DISTRICT'],
      maxScore: 50,
    },
  });

  const litCompArabicPoem = await prisma.literaryCompetition.upsert({
    where: { id: 'lit-comp-arabic-poem-2026' },
    update: {},
    create: {
      id: 'lit-comp-arabic-poem-2026',
      eventId: salityotsav.id,
      name: 'Arabic Poem Recitation & Analysis',
      levelId: levelsMap['STATE'],
      maxScore: 50,
    },
  });

  // 14. Library Integration Record
  await prisma.libraryIntegration.upsert({
    where: { id: 'msoe-library-main' },
    update: {},
    create: {
      id: 'msoe-library-main',
      endpointUrl: 'https://msoelibrary.vercel.app/',
      isConnected: true,
      syncStatus: 'CONNECTED',
      lastSyncAt: new Date(),
      autoSync: true,
    },
  });

  // 15. Realistic Demo Students (24 students spanning classes & schools)
  const studentsList = [
    { id: 'MSOE-2026-001', name: 'Muhammed Sinan K', class: 'Class 10', school: 'GBHSS Malappuram', div: 'A' },
    { id: 'MSOE-2026-002', name: 'Ahmad Raihan P', class: 'Class 10', school: 'GBHSS Malappuram', div: 'A' },
    { id: 'MSOE-2026-003', name: 'Favas Rahman C', class: 'Class +2', school: "Ma'din Higher Secondary School", div: 'A' },
    { id: 'MSOE-2026-004', name: 'Zayan Bilal T', class: 'Class +2', school: "Ma'din Higher Secondary School", div: 'A' },
    { id: 'MSOE-2026-005', name: 'Nihad Abdullah', class: 'Class +1', school: 'DUHSS Panakkad', div: 'A' },
    { id: 'MSOE-2026-006', name: 'Bilal Farhan M', class: 'Class +1', school: 'DUHSS Panakkad', div: 'B' },
    { id: 'MSOE-2026-007', name: 'Ameen Shafi K', class: 'Class 9', school: 'CM Academy', div: 'A' },
    { id: 'MSOE-2026-008', name: 'Ihsanul Haque P', class: 'Class 9', school: 'CM Academy', div: 'A' },
    { id: 'MSOE-2026-009', name: 'Salmanul Faris T', class: 'Class 8', school: 'GBHS Malappuram', div: 'A' },
    { id: 'MSOE-2026-010', name: 'Adil Mansoor V', class: 'Class 8', school: 'GBHS Malappuram', div: 'A' },
    { id: 'MSOE-2026-011', name: 'Shakir Hussain K', class: 'Class 10', school: 'CM Academy', div: 'B' },
    { id: 'MSOE-2026-012', name: 'Mazin Rayan A', class: 'Class +1', school: 'GBHSS Malappuram', div: 'A' },
    { id: 'MSOE-2026-013', name: 'Hashim Ali M', class: 'Class +2', school: 'DUHSS Panakkad', div: 'A' },
    { id: 'MSOE-2026-014', name: 'Nabeel Shan P', class: 'Class 9', school: "Ma'din Higher Secondary School", div: 'B' },
    { id: 'MSOE-2026-015', name: 'Junaid Ahmed K', class: 'Class 8', school: 'CM Academy', div: 'A' },
    { id: 'MSOE-2026-016', name: 'Hafiz Swalih C', class: 'Class 10', school: "Ma'din Higher Secondary School", div: 'A' },
    { id: 'MSOE-2026-017', name: 'Irfan Habib T', class: 'Class +1', school: 'GBHS Malappuram', div: 'B' },
    { id: 'MSOE-2026-018', name: 'Rashid Ansar V', class: 'Class +2', school: 'GBHSS Malappuram', div: 'B' },
    { id: 'MSOE-2026-019', name: 'Danish Farhan K', class: 'Class 9', school: 'DUHSS Panakkad', div: 'A' },
    { id: 'MSOE-2026-020', name: 'Zakir Hussain M', class: 'Class 8', school: "Ma'din Higher Secondary School", div: 'B' },
  ];

  console.log('Creating demo students and performance scores...');

  for (let idx = 0; idx < studentsList.length; idx++) {
    const item = studentsList[idx];
    const student = await prisma.student.upsert({
      where: { studentId: item.id },
      update: {},
      create: {
        studentId: item.id,
        fullName: item.name,
        classId: classesMap[item.class],
        schoolId: schoolsMap[item.school],
        division: item.div,
        academicYearId: academicYear.id,
        status: 'ACTIVE',
      },
    });

    // Generate balanced realistic scores tailored for top tiers
    // Top 3 students will have scores around 95-97%
    const baseAbility = 95 - idx * 0.9 + (Math.sin(idx) * 2);

    // 1. Islamic Studies Records
    for (const subCode of ['QRN', 'HDT', 'FQH', 'ARB_GR', 'TRK']) {
      const subScore = Math.min(Math.max(Math.round(baseAbility + (Math.random() * 6 - 3)), 65), 99);
      await prisma.performanceRecord.create({
        data: {
          studentId: student.id,
          categoryId: categoriesMap['ISLAMIC'],
          examId: islamicExam.id,
          subjectId: islamicSubjectsMap[subCode],
          termId: term1.id,
          academicYearId: academicYear.id,
          obtainedScore: subScore,
          maxScore: 100,
          percentage: subScore,
          date: new Date('2026-07-20'),
          createdById: superAdmin1.id,
        },
      });
    }

    // 2. School Studies Records
    for (const subCode of ['MATH', 'SCI', 'ENG', 'SOC', 'MAL', 'CS']) {
      const subScore = Math.min(Math.max(Math.round(baseAbility - 1 + (Math.random() * 6 - 3)), 60), 98);
      await prisma.performanceRecord.create({
        data: {
          studentId: student.id,
          categoryId: categoriesMap['SCHOOL'],
          examId: schoolExam.id,
          subjectId: schoolSubjectsMap[subCode],
          termId: term1.id,
          academicYearId: academicYear.id,
          obtainedScore: subScore,
          maxScore: 100,
          percentage: subScore,
          date: new Date('2026-07-25'),
          createdById: superAdmin1.id,
        },
      });
    }

    // 3. Programs & Competitions
    const progObtained = Math.round((baseAbility / 100) * 50);
    await prisma.performanceRecord.create({
      data: {
        studentId: student.id,
        categoryId: categoriesMap['PROGRAMS'],
        competitionId: compElocution.id,
        levelId: levelsMap['CAMPUS'],
        termId: term1.id,
        academicYearId: academicYear.id,
        obtainedScore: progObtained,
        maxScore: 50,
        percentage: Number(((progObtained / 50) * 100).toFixed(1)),
        date: new Date('2026-07-16'),
        remarks: 'Demonstrated exceptional articulation and stage presence',
        createdById: superAdmin1.id,
      },
    });

    // 4. Creative Hub Work
    const creativeScore = Math.min(Math.max(Math.round(baseAbility + (Math.random() * 4 - 2)), 70), 99);
    await prisma.creativeHubSubmission.create({
      data: {
        studentId: student.id,
        categoryId: creativeHubMap[idx % 2 === 0 ? 'ARTICLE' : 'POEM'],
        title: idx % 2 === 0 ? `The Radiance of Knowledge: An Essay on Ethics in Science` : `Echoes of the Valley: A Poem on Hope`,
        date: new Date('2026-08-01'),
        score: creativeScore,
        maxScore: 100,
        percentage: creativeScore,
        reviewer: 'Chief Editor, MSOE Creative Wing',
        remarks: 'Published in Madin Weekly & MSOE Wall Magazine',
        publicationStatus: idx < 5 ? 'FEATURED' : 'PUBLISHED',
        publicationLink: 'https://msoe-creative.edu.in/works/' + student.studentId,
      },
    });

    // 5. Literary Programs
    const litScore = Math.round((baseAbility / 100) * 50);
    await prisma.performanceRecord.create({
      data: {
        studentId: student.id,
        categoryId: categoriesMap['LITERARY'],
        literaryCompetitionId: litCompEssay.id,
        levelId: levelsMap['DISTRICT'],
        termId: term1.id,
        academicYearId: academicYear.id,
        obtainedScore: litScore,
        maxScore: 50,
        percentage: Number(((litScore / 50) * 100).toFixed(1)),
        date: new Date('2026-08-11'),
        remarks: 'Sahityotsav District level A-Grade winner',
        createdById: superAdmin1.id,
      },
    });

    // 6. Library / Reading Log
    const booksRead = Math.round(10 + (idx % 12));
    const readingScore = Math.min(Math.round(baseAbility + (idx % 5)), 99);
    await prisma.libraryRecord.create({
      data: {
        studentId: student.id,
        booksRead: booksRead,
        readingScore: readingScore,
        readingRank: idx + 1,
        readingPeriod: 'Term 1 2026',
      },
    });
  }

  console.log('Seeding completed successfully! Demo data is ready.');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
