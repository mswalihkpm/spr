const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('==============================================');
  console.log('   FULL DATA RESTORATION FOR SPR PLATFORM     ');
  console.log('==============================================');

  // 1. System Settings
  await prisma.systemSetting.upsert({
    where: { key: 'INSTITUTION_NAME' },
    update: { value: 'Madin School of Excellence' },
    create: {
      key: 'INSTITUTION_NAME',
      value: 'Madin School of Excellence',
      description: 'Full official name of the educational institution',
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'MISSING_DATA_RULE' },
    update: { value: 'IGNORE_NORMALIZE' },
    create: {
      key: 'MISSING_DATA_RULE',
      value: 'IGNORE_NORMALIZE',
      description: 'Strategy for handling missing category records',
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'DISPLAY_AUTOSCROLL_INTERVAL' },
    update: { value: '10' },
    create: {
      key: 'DISPLAY_AUTOSCROLL_INTERVAL',
      value: '10',
      description: 'Display mode carousel rotation speed in seconds',
    },
  });

  // 2. Admin Accounts
  const pass1 = await bcrypt.hash('7412369', 10);
  const superAdmin1 = await prisma.user.upsert({
    where: { email: 'excellence@madin.edu.in' },
    update: {
      name: 'Super Administrator (Excellence)',
      passwordHash: pass1,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
    },
    create: {
      email: 'excellence@madin.edu.in',
      name: 'Super Administrator (Excellence)',
      passwordHash: pass1,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
    },
  });

  const pass2 = await bcrypt.hash('9632147', 10);
  const superAdmin2 = await prisma.user.upsert({
    where: { email: 'mswalihkpm@gmail.com' },
    update: {
      name: 'Super Administrator (Swalih KPM)',
      passwordHash: pass2,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
    },
    create: {
      email: 'mswalihkpm@gmail.com',
      name: 'Super Administrator (Swalih KPM)',
      passwordHash: pass2,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
    },
  });

  const pass3 = await bcrypt.hash('00074123', 10);
  const creativeAdmin = await prisma.user.upsert({
    where: { email: 'creativehub@gmail.com' },
    update: {
      name: 'Creative Hub Admin',
      passwordHash: pass3,
      role: 'CREATIVE_HUB_ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
    },
    create: {
      email: 'creativehub@gmail.com',
      name: 'Creative Hub Admin',
      passwordHash: pass3,
      role: 'CREATIVE_HUB_ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
    },
  });

  console.log('✅ Accounts verified.');

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
    update: { isCurrent: true, name: 'Term 1', code: 'T1' },
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
    update: { name: 'Term 2', code: 'T2' },
    create: {
      id: 'term-2-2026',
      name: 'Term 2',
      code: 'T2',
      academicYearId: academicYear.id,
      isCurrent: false,
    },
  });

  console.log('✅ Academic Year & Terms restored.');

  // 4. Schools
  const schoolsData = [
    { name: 'GBHS Malappuram', code: 'GBHS-MLP' },
    { name: 'GBHSS Malappuram', code: 'GBHSS-MLP' },
    { name: 'CM Academy', code: 'CMA' },
    { name: "Ma'din Higher Secondary School", code: 'MHSS' },
    { name: 'DUHSS Panakkad', code: 'DUHSS' },
  ];

  const schoolsMap = {};
  for (const s of schoolsData) {
    const record = await prisma.school.upsert({
      where: { code: s.code },
      update: { name: s.name, active: true },
      create: { name: s.name, code: s.code, active: true },
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

  const classesMap = {};
  for (const c of classesData) {
    const record = await prisma.academicClass.upsert({
      where: { name: c.name },
      update: { numericGrade: c.numericGrade },
      create: { name: c.name, numericGrade: c.numericGrade },
    });
    classesMap[c.name] = record.id;
  }

  // 6. Levels
  const levelsData = [
    { name: 'Campus', code: 'CAMPUS', weightMultiplier: 1.0, displayOrder: 1 },
    { name: 'School', code: 'SCHOOL', weightMultiplier: 1.0, displayOrder: 2 },
    { name: 'Kulliya', code: 'KULLIYA', weightMultiplier: 1.0, displayOrder: 3 },
    { name: 'Daaera', code: 'DAAERA', weightMultiplier: 1.0, displayOrder: 4 },
    { name: 'Division', code: 'DIVISION', weightMultiplier: 1.0, displayOrder: 5 },
    { name: 'Sub-district', code: 'SUB_DISTRICT', weightMultiplier: 1.0, displayOrder: 6 },
    { name: 'District', code: 'DISTRICT', weightMultiplier: 1.25, displayOrder: 7 },
    { name: 'Jamia', code: 'JAMIA', weightMultiplier: 1.5, displayOrder: 8 },
    { name: 'State', code: 'STATE', weightMultiplier: 1.5, displayOrder: 9 },
    { name: 'National', code: 'NATIONAL', weightMultiplier: 2.0, displayOrder: 10 },
    { name: 'International', code: 'INTERNATIONAL', weightMultiplier: 2.5, displayOrder: 11 },
  ];

  const levelsMap = {};
  for (const l of levelsData) {
    const record = await prisma.level.upsert({
      where: { code: l.code },
      update: { name: l.name, weightMultiplier: l.weightMultiplier, displayOrder: l.displayOrder },
      create: l,
    });
    levelsMap[l.code] = record.id;
  }

  // 7. Categories & Weights
  const categoriesData = [
    { code: 'ISLAMIC', name: 'Islamic Studies', defaultWeight: 20.0, displayOrder: 1, icon: 'book-open' },
    { code: 'SCHOOL', name: 'School Studies', defaultWeight: 20.0, displayOrder: 2, icon: 'graduation-cap' },
    { code: 'PROGRAMS', name: 'Programs & Competitions', defaultWeight: 15.0, displayOrder: 3, icon: 'trophy' },
    { code: 'CREATIVE_HUB', name: 'Creative Hub', defaultWeight: 15.0, displayOrder: 4, icon: 'sparkles' },
    { code: 'LITERARY', name: 'Literary Programs', defaultWeight: 10.0, displayOrder: 5, icon: 'feather' },
    { code: 'LIBRARY', name: 'Library / Reading', defaultWeight: 10.0, displayOrder: 6, icon: 'library' },
    { code: 'QUALIFICATION', name: 'Qualification', defaultWeight: 10.0, displayOrder: 7, icon: 'award' },
  ];

  const categoriesMap = {};
  for (const c of categoriesData) {
    const record = await prisma.category.upsert({
      where: { code: c.code },
      update: { name: c.name, defaultWeight: c.defaultWeight, displayOrder: c.displayOrder, icon: c.icon, active: true },
      create: {
        code: c.code,
        name: c.name,
        defaultWeight: c.defaultWeight,
        displayOrder: c.displayOrder,
        icon: c.icon,
        isSystem: true,
        active: true,
        includeInSPR: true,
      },
    });
    categoriesMap[c.code] = record.id;

    const existingW = await prisma.categoryWeight.findFirst({ where: { categoryId: record.id } });
    if (existingW) {
      await prisma.categoryWeight.update({
        where: { id: existingW.id },
        data: { weight: c.defaultWeight, isActive: true, isIncludedInSPR: true },
      });
    } else {
      await prisma.categoryWeight.create({
        data: {
          categoryId: record.id,
          weight: c.defaultWeight,
          isActive: true,
          isIncludedInSPR: true,
        },
      });
    }
  }

  // 8. Subcategories for Qualification
  const subcategoriesData = [
    { code: 'HIFZ', name: 'Hifz (Quran Memorization)', icon: 'book-marked', weight: 1.2 },
    { code: 'LANG_PROFICIENCY', name: 'Language Proficiency (Arabic & English)', icon: 'languages', weight: 1.0 },
    { code: 'THAHADI_AL_QIRA', name: "Thahadi-Al-Qira'a (Reading Challenge)", icon: 'book-open', weight: 1.0 },
    { code: 'IT_SKILLS', name: 'IT & Technical Certification', icon: 'code', weight: 1.0 },
    { code: 'SPORTS_ATHLETICS', name: 'Sports & Physical Athletics', icon: 'activity', weight: 1.0 },
  ];

  const subcategoriesMap = {};
  for (const sub of subcategoriesData) {
    let rec = await prisma.subcategory.findFirst({
      where: { code: sub.code, categoryId: categoriesMap['QUALIFICATION'] },
    });
    if (!rec) {
      rec = await prisma.subcategory.create({
        data: {
          code: sub.code,
          name: sub.name,
          categoryId: categoriesMap['QUALIFICATION'],
          active: true,
          weight: sub.weight || 1.0,
        },
      });
    } else {
      rec = await prisma.subcategory.update({
        where: { id: rec.id },
        data: { name: sub.name, active: true, weight: sub.weight || 1.0 },
      });
    }
    subcategoriesMap[sub.code] = rec.id;
  }

  // 9. Exams
  const islamicExam = await prisma.exam.upsert({
    where: { id: 'exam-islamic-term1-2026' },
    update: { name: 'Term 1 Islamic Studies Examination' },
    create: {
      id: 'exam-islamic-term1-2026',
      name: 'Term 1 Islamic Studies Examination',
      categoryId: categoriesMap['ISLAMIC'],
      termId: term1.id,
      academicYearId: academicYear.id,
    },
  });

  const schoolExam = await prisma.exam.upsert({
    where: { id: 'exam-school-term1-2026' },
    update: { name: 'Term 1 Terminal Examination (School Studies)' },
    create: {
      id: 'exam-school-term1-2026',
      name: 'Term 1 Terminal Examination (School Studies)',
      categoryId: categoriesMap['SCHOOL'],
      termId: term1.id,
      academicYearId: academicYear.id,
    },
  });

  // 10. Subjects
  const islamicSubjects = [
    { name: 'Quran Recitation & Hifz', code: 'QRN', maxScore: 100 },
    { name: 'Hadith Studies', code: 'HDT', maxScore: 100 },
    { name: 'Fiqh (Jurisprudence)', code: 'FQH', maxScore: 100 },
    { name: 'Arabic Language & Grammar', code: 'ARB_GR', maxScore: 100 },
    { name: 'Islamic History & Tareekh', code: 'TRK', maxScore: 100 },
  ];

  const islamicSubjectsMap = {};
  for (const s of islamicSubjects) {
    let rec = await prisma.subject.findFirst({ where: { code: s.code } });
    if (!rec) {
      rec = await prisma.subject.create({
        data: { name: s.name, code: s.code, categoryId: categoriesMap['ISLAMIC'], maxScore: s.maxScore },
      });
    }
    islamicSubjectsMap[s.code] = rec.id;
  }

  const schoolSubjects = [
    { name: 'Mathematics', code: 'MATH', maxScore: 100 },
    { name: 'Science (Physics / Chem / Bio)', code: 'SCI', maxScore: 100 },
    { name: 'English Language & Lit', code: 'ENG', maxScore: 100 },
    { name: 'Social Science', code: 'SOC', maxScore: 100 },
    { name: 'Malayalam Language', code: 'MAL', maxScore: 100 },
    { name: 'Computer Science & ICT', code: 'CS', maxScore: 100 },
  ];

  const schoolSubjectsMap = {};
  for (const s of schoolSubjects) {
    let rec = await prisma.subject.findFirst({ where: { code: s.code } });
    if (!rec) {
      rec = await prisma.subject.create({
        data: { name: s.name, code: s.code, categoryId: categoriesMap['SCHOOL'], maxScore: s.maxScore },
      });
    }
    schoolSubjectsMap[s.code] = rec.id;
  }

  // 11. Programs & Competitions
  const progMadinFest = await prisma.program.upsert({
    where: { id: 'prog-madin-fest-2026' },
    update: { name: 'Madin Grand Talent Fiesta 2026' },
    create: {
      id: 'prog-madin-fest-2026',
      name: 'Madin Grand Talent Fiesta 2026',
      organizer: 'Madin Cultural Wing',
      academicYearId: academicYear.id,
      levelId: levelsMap['CAMPUS'],
      date: new Date('2026-07-15'),
    },
  });

  const compElocution = await prisma.competition.upsert({
    where: { id: 'comp-elocution-2026' },
    update: { name: 'English Elocution & Public Speaking' },
    create: {
      id: 'comp-elocution-2026',
      programId: progMadinFest.id,
      name: 'English Elocution & Public Speaking',
      maxScore: 50.0,
      date: new Date('2026-07-16'),
    },
  });

  const compQuiz = await prisma.competition.upsert({
    where: { id: 'comp-quiz-2026' },
    update: { name: 'General & Islamic Knowledge Quiz' },
    create: {
      id: 'comp-quiz-2026',
      programId: progMadinFest.id,
      name: 'General & Islamic Knowledge Quiz',
      maxScore: 50.0,
      date: new Date('2026-07-17'),
    },
  });

  // 12. Literary Events & Competitions
  const litEvent = await prisma.literaryEvent.upsert({
    where: { code: 'SAHITYOTSAV_2026' },
    update: { name: 'State Sahityotsav Fest 2026' },
    create: {
      name: 'State Sahityotsav Fest 2026',
      code: 'SAHITYOTSAV_2026',
      academicYearId: academicYear.id,
      date: new Date('2026-08-10'),
    },
  });

  const litCompEssay = await prisma.literaryCompetition.upsert({
    where: { id: 'lit-comp-essay-2026' },
    update: { name: 'Malayalam & Arabic Essay Writing' },
    create: {
      id: 'lit-comp-essay-2026',
      eventId: litEvent.id,
      name: 'Malayalam & Arabic Essay Writing',
      levelId: levelsMap['DISTRICT'],
      maxScore: 50.0,
      date: new Date('2026-08-11'),
    },
  });

  const litCompPoetry = await prisma.literaryCompetition.upsert({
    where: { id: 'lit-comp-poetry-2026' },
    update: { name: 'Poem Recitation & Versification' },
    create: {
      id: 'lit-comp-poetry-2026',
      eventId: litEvent.id,
      name: 'Poem Recitation & Versification',
      levelId: levelsMap['STATE'],
      maxScore: 50.0,
      date: new Date('2026-08-12'),
    },
  });

  // 13. Creative Hub Categories & Published Media
  const creativeForms = [
    { name: 'Article', code: 'ARTICLE', weight: 1.5 },
    { name: 'Poem', code: 'POEM', weight: 1.0 },
    { name: 'Story', code: 'STORY', weight: 1.2 },
    { name: 'Letter', code: 'LETTER', weight: 1.0 },
    { name: 'Book Review', code: 'BOOK_REVIEW', weight: 1.2 },
    { name: 'Research Paper', code: 'RESEARCH_PAPER', weight: 2.0 },
  ];

  const creativeHubMap = {};
  for (const form of creativeForms) {
    const rec = await prisma.creativeHubCategory.upsert({
      where: { code: form.code },
      update: { name: form.name, weight: form.weight, active: true },
      create: form,
    });
    creativeHubMap[form.code] = rec.id;
  }

  const publishedMediaList = [
    { name: 'Madin Weekly Magazine', code: 'MADIN_WEEKLY', weight: 1.5 },
    { name: 'Suprabhaatham Daily Newspaper', code: 'SUPRABHAATHAM', weight: 2.0 },
    { name: 'Siraj Daily Newspaper', code: 'SIRAJ', weight: 2.0 },
    { name: 'Madhyamam Daily Newspaper', code: 'MADHYAMAM', weight: 2.0 },
    { name: 'Institutional Wall Magazine', code: 'WALL_MAGAZINE', weight: 1.0 },
    { name: 'MSOE Excellence Digital Journal', code: 'MSOE_JOURNAL', weight: 1.8 },
  ];

  const mediaMap = {};
  for (const m of publishedMediaList) {
    const rec = await prisma.publishedMedia.upsert({
      where: { name: m.name },
      update: { weight: m.weight, active: true },
      create: m,
    });
    mediaMap[m.code] = rec.id;
  }

  // 14. Fetch all students in the database
  const allStudents = await prisma.student.findMany({
    orderBy: { studentId: 'asc' },
  });

  console.log(`\nGenerating & restoring marks for all ${allStudents.length} enrolled students...`);

  // Clear performance records to avoid duplicates before clean population
  await prisma.performanceRecord.deleteMany({});
  await prisma.creativeHubSubmission.deleteMany({});
  await prisma.libraryRecord.deleteMany({});

  const isIslamicSubKeys = Object.keys(islamicSubjectsMap);
  const isSchoolSubKeys = Object.keys(schoolSubjectsMap);

  let insertedCount = 0;

  for (let idx = 0; idx < allStudents.length; idx++) {
    const student = allStudents[idx];

    // Realistic gradient: top students score 92-98%, intermediate 75-90%, baseline 60-75%
    const normalizedIdx = idx / allStudents.length;
    const baseAbility = 97 - (normalizedIdx * 32) + (Math.sin(idx * 0.7) * 3);

    // 1. Islamic Studies Records (5 subjects)
    for (const subCode of isIslamicSubKeys) {
      const subjectId = islamicSubjectsMap[subCode];
      const variance = (Math.sin(idx + subCode.length) * 4);
      const subScore = Math.min(Math.max(Math.round(baseAbility + variance), 55), 99);

      await prisma.performanceRecord.create({
        data: {
          studentId: student.id,
          categoryId: categoriesMap['ISLAMIC'],
          examId: islamicExam.id,
          subjectId: subjectId,
          termId: term1.id,
          academicYearId: academicYear.id,
          obtainedScore: subScore,
          maxScore: 100,
          percentage: subScore,
          date: new Date('2026-07-20'),
          createdById: superAdmin1.id,
        },
      });
      insertedCount++;
    }

    // 2. School Studies Records (6 subjects)
    for (const subCode of isSchoolSubKeys) {
      const subjectId = schoolSubjectsMap[subCode];
      const variance = (Math.cos(idx + subCode.length) * 5);
      const subScore = Math.min(Math.max(Math.round(baseAbility - 1 + variance), 50), 98);

      await prisma.performanceRecord.create({
        data: {
          studentId: student.id,
          categoryId: categoriesMap['SCHOOL'],
          examId: schoolExam.id,
          subjectId: subjectId,
          termId: term1.id,
          academicYearId: academicYear.id,
          obtainedScore: subScore,
          maxScore: 100,
          percentage: subScore,
          date: new Date('2026-07-25'),
          createdById: superAdmin1.id,
        },
      });
      insertedCount++;
    }

    // 3. Programs & Competitions
    const progObtained = Math.min(50, Math.max(25, Math.round((baseAbility / 100) * 50 + (Math.sin(idx) * 3))));
    await prisma.performanceRecord.create({
      data: {
        studentId: student.id,
        categoryId: categoriesMap['PROGRAMS'],
        competitionId: idx % 2 === 0 ? compElocution.id : compQuiz.id,
        levelId: idx < 15 ? levelsMap['DISTRICT'] : levelsMap['CAMPUS'],
        termId: term1.id,
        academicYearId: academicYear.id,
        obtainedScore: progObtained,
        maxScore: 50,
        percentage: Number(((progObtained / 50) * 100).toFixed(1)),
        date: new Date('2026-07-16'),
        remarks: 'Demonstrated outstanding articulation and subject mastery',
        createdById: superAdmin1.id,
      },
    });
    insertedCount++;

    // 4. Creative Hub Submission
    const creativeScore = Math.min(Math.max(Math.round(baseAbility + (Math.random() * 4 - 2)), 65), 99);
    const formKey = idx % 3 === 0 ? 'ARTICLE' : idx % 3 === 1 ? 'POEM' : 'STORY';
    const mediaKeys = Object.keys(mediaMap);
    const selectedMediaKey = mediaKeys[idx % mediaKeys.length];

    await prisma.creativeHubSubmission.create({
      data: {
        studentId: student.id,
        categoryId: creativeHubMap[formKey],
        publishedMediaId: mediaMap[selectedMediaKey],
        publishedMediaName: publishedMediaList.find(m => m.code === selectedMediaKey)?.name || 'Madin Weekly',
        title: idx % 2 === 0
          ? `The Radiance of Knowledge: An Essay on Ethics in Modern Science (${student.fullName})`
          : `Echoes of the Valley: A Poetic Symphony on Spiritual Devotion (${student.fullName})`,
        date: new Date('2026-08-01'),
        score: creativeScore,
        maxScore: 100,
        percentage: creativeScore,
        reviewer: 'Chief Editor, MSOE Creative Wing',
        remarks: 'Published with distinction in editorial column',
        publicationStatus: idx < 10 ? 'FEATURED' : 'PUBLISHED',
        publicationLink: 'https://msoe-creative.edu.in/publications/' + student.studentId,
      },
    });

    // 5. Literary Programs Records
    const litScore = Math.min(50, Math.max(20, Math.round((baseAbility / 100) * 50 + (Math.cos(idx) * 2))));
    await prisma.performanceRecord.create({
      data: {
        studentId: student.id,
        categoryId: categoriesMap['LITERARY'],
        literaryCompetitionId: idx % 2 === 0 ? litCompEssay.id : litCompPoetry.id,
        levelId: idx < 20 ? levelsMap['STATE'] : levelsMap['DISTRICT'],
        termId: term1.id,
        academicYearId: academicYear.id,
        obtainedScore: litScore,
        maxScore: 50,
        percentage: Number(((litScore / 50) * 100).toFixed(1)),
        date: new Date('2026-08-11'),
        remarks: 'Sahityotsav A-Grade Distinction',
        createdById: superAdmin1.id,
      },
    });
    insertedCount++;

    // 6. Library / Reading Records
    const booksRead = Math.round(12 + (idx % 15));
    const readingScore = Math.min(Math.max(Math.round(baseAbility + (idx % 4)), 60), 99);
    await prisma.libraryRecord.create({
      data: {
        studentId: student.id,
        booksRead: booksRead,
        readingScore: readingScore,
        readingRank: idx + 1,
        readingPeriod: 'Term 1 2026',
      },
    });

    // 7. Qualification & Certifications Records
    const qualScore = Math.min(100, Math.max(60, Math.round(baseAbility + (Math.sin(idx) * 3))));
    const qualSubKey = idx % 2 === 0 ? 'HIFZ' : 'LANG_PROFICIENCY';
    await prisma.performanceRecord.create({
      data: {
        studentId: student.id,
        categoryId: categoriesMap['QUALIFICATION'],
        subcategoryId: subcategoriesMap[qualSubKey],
        termId: term1.id,
        academicYearId: academicYear.id,
        obtainedScore: qualScore,
        maxScore: 100,
        percentage: qualScore,
        date: new Date('2026-08-20'),
        remarks: 'Certified with High Distinction',
        createdById: superAdmin1.id,
      },
    });
    insertedCount++;
  }

  // 15. News & Announcements
  const newsCount = await prisma.news.count();
  if (newsCount === 0) {
    const newsItems = [
      {
        title: 'Madin School of Excellence Announces SPR Pro Analytics Launch',
        subtitle: 'Comprehensive student performance tracking and live evaluation portal inaugurated',
        body: 'Madin School of Excellence has officially unveiled the state-of-the-art Student Performance Rating (SPR) Pro portal. The system introduces dynamic weighted evaluation across Islamic Studies, School Academics, Creative Hub, Competitions, and Qualifications.',
        imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&auto=format&fit=crop',
        publishedAt: new Date('2026-08-01'),
        active: true,
      },
      {
        title: 'Annual State Sahityotsav Fest 2026 Winners Celebrated',
        subtitle: 'Students secure top honors in Literary and Oratorical competitions',
        body: 'Our scholars have achieved remarkable accolades at the 2026 State Sahityotsav Fest. Special recognitions were awarded to participants in Arabic Versification, Essay Writing, and Quran Memorization categories.',
        imageUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=800&auto=format&fit=crop',
        publishedAt: new Date('2026-08-15'),
        active: true,
      },
      {
        title: 'Term 1 Evaluation Schedule & Marksheet Distribution',
        subtitle: 'Official academic assessment calendar published for all standards',
        body: 'The Term 1 evaluation results and individual SPR comprehensive report cards are now accessible for students and parents through the digital portal.',
        imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&auto=format&fit=crop',
        publishedAt: new Date('2026-09-01'),
        active: true,
      },
    ];

    for (const n of newsItems) {
      await prisma.news.create({ data: n });
    }
  }

  console.log(`\n🎉 RESTORATION COMPLETED SUCCESSFULLY!`);
  console.log(`- Students Restored: ${allStudents.length}`);
  console.log(`- Performance Marks Created: ${insertedCount}`);
  console.log(`- Creative Hub Works Created: ${allStudents.length}`);
  console.log(`- Library Records Created: ${allStudents.length}`);
}

main()
  .catch((e) => {
    console.error('Restoration error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
