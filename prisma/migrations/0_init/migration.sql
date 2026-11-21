-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "School" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicClass" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "numericGrade" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sprStudentId" TEXT,
    "fullName" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "division" TEXT NOT NULL DEFAULT 'A',
    "academicYearId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "photoUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fatherName" TEXT,
    "motherName" TEXT,
    "houseName" TEXT,
    "guardianPhone" TEXT,
    "studentPhone" TEXT,
    "studentEmail" TEXT,
    "place" TEXT,
    "district" TEXT,
    "residentialStatus" TEXT,
    "preferredContact" TEXT,
    "isProfileLocked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT DEFAULT 'award',
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "defaultWeight" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "includeInSPR" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subcategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "logoUrl" TEXT,
    "hasLevels" BOOLEAN NOT NULL DEFAULT false,
    "levelGroup" TEXT DEFAULT 'ALL',
    "allowedLevelIds" TEXT,
    "hasMaxScore" BOOLEAN NOT NULL DEFAULT true,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Level" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "weightMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Level_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicInstitution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicInstitution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardSyllabus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BoardSyllabus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Term" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Term_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exam" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "targetScore" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Exam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "institutionId" TEXT,
    "boardId" TEXT,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Program" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizer" TEXT,
    "academicYearId" TEXT NOT NULL,
    "levelId" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Program_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeHubCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreativeHubCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublishedMedia" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublishedMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreativeHubSubmission" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "publishedMediaId" TEXT,
    "publishedMediaName" TEXT,
    "title" TEXT NOT NULL DEFAULT 'Creative Submission',
    "content" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "reviewer" TEXT,
    "remarks" TEXT,
    "publicationStatus" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "publicationLink" TEXT,
    "attachmentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreativeHubSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "News" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "News_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomepageNotification" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "text" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "duration" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomepageNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiteraryEvent" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiteraryEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiteraryCompetition" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "levelId" TEXT,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiteraryCompetition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryIntegration" (
    "id" TEXT NOT NULL,
    "endpointUrl" TEXT NOT NULL DEFAULT 'https://msoelibrary.vercel.app/',
    "apiKey" TEXT,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
    "syncError" TEXT,
    "autoSync" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LibraryRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "booksRead" INTEGER NOT NULL DEFAULT 0,
    "readingScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "readingRank" INTEGER,
    "readingPeriod" TEXT,
    "syncBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LibraryRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "subcategoryId" TEXT,
    "eventId" TEXT,
    "examId" TEXT,
    "subjectId" TEXT,
    "competitionId" TEXT,
    "literaryCompetitionId" TEXT,
    "levelId" TEXT,
    "termId" TEXT,
    "academicYearId" TEXT,
    "obtainedScore" DOUBLE PRECISION NOT NULL,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 100.0,
    "percentage" DOUBLE PRECISION NOT NULL,
    "position" TEXT,
    "grade" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PerformanceRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryWeight" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "academicYearId" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 10.0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isIncludedInSPR" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CategoryWeight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportHistory" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL DEFAULT 'EXCEL',
    "recordsCount" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "errorCount" INTEGER NOT NULL DEFAULT 0,
    "errorsJson" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentReport" (
    "id" TEXT NOT NULL,
    "studentId" TEXT,
    "studentName" TEXT NOT NULL,
    "className" TEXT,
    "rank" INTEGER,
    "sprScore" DOUBLE PRECISION,
    "reporterName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAccount" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "activationCode" TEXT,
    "isActivated" BOOLEAN NOT NULL DEFAULT false,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "activatedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentWallet" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "totalEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "totalTransferred" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "totalReceived" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "totalContributedToStore" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarningLedger" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sourceRecordId" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'PERFORMANCE_RECORD',
    "activityDate" TIMESTAMP(3) NOT NULL,
    "eligiblePoints" DECIMAL(10,2) NOT NULL,
    "categoryMultiplier" DECIMAL(6,3) NOT NULL,
    "calculatedAmount" DECIMAL(10,2) NOT NULL,
    "recognizedAmount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREDITED',
    "reference" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EarningLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balanceBefore" DECIMAL(12,2) NOT NULL,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "senderStudentId" TEXT,
    "recipientStudentId" TEXT,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreFundRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "totalContributed" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "totalUsed" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "availableFund" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreFundRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreFundUsage" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "actingAdminId" TEXT NOT NULL,
    "actingAdminEmail" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreFundUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "maxPoints" DECIMAL(10,2) NOT NULL,
    "maxFund" DECIMAL(10,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PUBLISHED',
    "instructions" TEXT,
    "targetAudience" TEXT NOT NULL DEFAULT 'ALL',
    "targetAudienceJson" JSONB,
    "rewardMode" TEXT NOT NULL DEFAULT 'EQUAL',
    "rewardConfig" JSONB,
    "closeWhenSlotsFilled" BOOLEAN NOT NULL DEFAULT false,
    "winnerSlots" INTEGER,
    "approvalMode" TEXT NOT NULL DEFAULT 'ADMIN_APPROVAL',
    "submissionType" TEXT NOT NULL DEFAULT 'LINK_ONLY',
    "targetClassId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskAssignment" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentTaskRecord" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "submissionNotes" TEXT,
    "submittedAt" TIMESTAMP(3),
    "approvedPercentage" DECIMAL(5,2),
    "awardedPoints" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "awardedAmount" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "adminRemarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentTaskRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskRewardLedger" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "studentTaskId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "transactionReference" TEXT NOT NULL,
    "approvedById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskRewardLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskPointsLedger" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "studentTaskId" TEXT NOT NULL,
    "points" DECIMAL(10,2) NOT NULL,
    "reference" TEXT NOT NULL,
    "approvedById" TEXT NOT NULL,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskPointsLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountDeletionRequest" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "studentIdentifier" TEXT NOT NULL,
    "matchedStudentId" TEXT,
    "requesterType" TEXT NOT NULL DEFAULT 'STUDENT',
    "requesterName" TEXT NOT NULL,
    "requesterContact" TEXT NOT NULL,
    "relationship" TEXT,
    "requestType" TEXT NOT NULL DEFAULT 'ACCOUNT_DELETION',
    "reason" TEXT,
    "parentalConsent" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "adminNotes" TEXT,
    "handledById" TEXT,
    "handledByName" TEXT,
    "handledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "executionSummary" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountDeletionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlyAttendance" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "categoryCode" TEXT NOT NULL,
    "calendarType" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "monthName" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "points" DOUBLE PRECISION NOT NULL,
    "academicYearId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MonthlyAttendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileCorrectionLog" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileCorrectionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Questionnaire" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Questionnaire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireQuestion" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "questionType" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB,
    "conditionalParentId" TEXT,
    "conditionalMatchValue" TEXT,
    "dynamicSource" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionnaireQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionnaireResponse" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "questionnaireId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'NOT_STARTED',
    "progressPercent" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "answers" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "lastSavedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionnaireResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentSavedFilter" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "matchType" TEXT NOT NULL DEFAULT 'ALL',
    "criteria" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentSavedFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentBriefNoteTemplate" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sections" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentBriefNoteTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointCorrectionReason" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "basePoint" DECIMAL(6,2) NOT NULL DEFAULT 1.00,
    "description" TEXT,
    "assignedAdminIds" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointCorrectionReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentPointAdjustment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "reasonId" TEXT NOT NULL,
    "points" DECIMAL(6,2) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentPointAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_token_key" ON "PasswordResetToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "School_name_key" ON "School"("name");

-- CreateIndex
CREATE UNIQUE INDEX "School_code_key" ON "School"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicClass_name_key" ON "AcademicClass"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_name_key" ON "AcademicYear"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Student_studentId_key" ON "Student"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_sprStudentId_key" ON "Student"("sprStudentId");

-- CreateIndex
CREATE INDEX "Student_classId_idx" ON "Student"("classId");

-- CreateIndex
CREATE INDEX "Student_schoolId_idx" ON "Student"("schoolId");

-- CreateIndex
CREATE INDEX "Student_academicYearId_idx" ON "Student"("academicYearId");

-- CreateIndex
CREATE INDEX "Student_status_idx" ON "Student"("status");

-- CreateIndex
CREATE INDEX "Student_status_classId_idx" ON "Student"("status", "classId");

-- CreateIndex
CREATE INDEX "Student_fullName_idx" ON "Student"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "Category_code_key" ON "Category"("code");

-- CreateIndex
CREATE INDEX "Subcategory_categoryId_idx" ON "Subcategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Level_name_key" ON "Level"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Level_code_key" ON "Level"("code");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicInstitution_name_key" ON "AcademicInstitution"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicInstitution_code_key" ON "AcademicInstitution"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BoardSyllabus_name_key" ON "BoardSyllabus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BoardSyllabus_code_key" ON "BoardSyllabus"("code");

-- CreateIndex
CREATE INDEX "Exam_categoryId_idx" ON "Exam"("categoryId");

-- CreateIndex
CREATE INDEX "Exam_termId_idx" ON "Exam"("termId");

-- CreateIndex
CREATE INDEX "Exam_academicYearId_idx" ON "Exam"("academicYearId");

-- CreateIndex
CREATE INDEX "Subject_categoryId_idx" ON "Subject"("categoryId");

-- CreateIndex
CREATE INDEX "Subject_institutionId_idx" ON "Subject"("institutionId");

-- CreateIndex
CREATE INDEX "Subject_boardId_idx" ON "Subject"("boardId");

-- CreateIndex
CREATE INDEX "Program_academicYearId_idx" ON "Program"("academicYearId");

-- CreateIndex
CREATE INDEX "Program_levelId_idx" ON "Program"("levelId");

-- CreateIndex
CREATE INDEX "Competition_programId_idx" ON "Competition"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "CreativeHubCategory_name_key" ON "CreativeHubCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CreativeHubCategory_code_key" ON "CreativeHubCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PublishedMedia_name_key" ON "PublishedMedia"("name");

-- CreateIndex
CREATE INDEX "CreativeHubSubmission_studentId_idx" ON "CreativeHubSubmission"("studentId");

-- CreateIndex
CREATE INDEX "CreativeHubSubmission_studentId_publicationStatus_idx" ON "CreativeHubSubmission"("studentId", "publicationStatus");

-- CreateIndex
CREATE INDEX "CreativeHubSubmission_categoryId_idx" ON "CreativeHubSubmission"("categoryId");

-- CreateIndex
CREATE INDEX "CreativeHubSubmission_publishedMediaId_idx" ON "CreativeHubSubmission"("publishedMediaId");

-- CreateIndex
CREATE INDEX "CreativeHubSubmission_publicationStatus_idx" ON "CreativeHubSubmission"("publicationStatus");

-- CreateIndex
CREATE INDEX "CreativeHubSubmission_date_idx" ON "CreativeHubSubmission"("date");

-- CreateIndex
CREATE INDEX "News_publishedAt_idx" ON "News"("publishedAt");

-- CreateIndex
CREATE INDEX "News_active_idx" ON "News"("active");

-- CreateIndex
CREATE INDEX "HomepageNotification_active_idx" ON "HomepageNotification"("active");

-- CreateIndex
CREATE INDEX "HomepageNotification_createdAt_idx" ON "HomepageNotification"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LiteraryEvent_code_key" ON "LiteraryEvent"("code");

-- CreateIndex
CREATE INDEX "LiteraryCompetition_eventId_idx" ON "LiteraryCompetition"("eventId");

-- CreateIndex
CREATE INDEX "LiteraryCompetition_levelId_idx" ON "LiteraryCompetition"("levelId");

-- CreateIndex
CREATE INDEX "LibraryRecord_studentId_idx" ON "LibraryRecord"("studentId");

-- CreateIndex
CREATE INDEX "LibraryRecord_readingPeriod_idx" ON "LibraryRecord"("readingPeriod");

-- CreateIndex
CREATE INDEX "PerformanceRecord_studentId_idx" ON "PerformanceRecord"("studentId");

-- CreateIndex
CREATE INDEX "PerformanceRecord_categoryId_idx" ON "PerformanceRecord"("categoryId");

-- CreateIndex
CREATE INDEX "PerformanceRecord_subcategoryId_idx" ON "PerformanceRecord"("subcategoryId");

-- CreateIndex
CREATE INDEX "PerformanceRecord_academicYearId_idx" ON "PerformanceRecord"("academicYearId");

-- CreateIndex
CREATE INDEX "PerformanceRecord_termId_idx" ON "PerformanceRecord"("termId");

-- CreateIndex
CREATE INDEX "PerformanceRecord_examId_idx" ON "PerformanceRecord"("examId");

-- CreateIndex
CREATE INDEX "PerformanceRecord_subjectId_idx" ON "PerformanceRecord"("subjectId");

-- CreateIndex
CREATE INDEX "PerformanceRecord_competitionId_idx" ON "PerformanceRecord"("competitionId");

-- CreateIndex
CREATE INDEX "PerformanceRecord_literaryCompetitionId_idx" ON "PerformanceRecord"("literaryCompetitionId");

-- CreateIndex
CREATE INDEX "PerformanceRecord_levelId_idx" ON "PerformanceRecord"("levelId");

-- CreateIndex
CREATE INDEX "PerformanceRecord_date_idx" ON "PerformanceRecord"("date");

-- CreateIndex
CREATE INDEX "PerformanceRecord_studentId_categoryId_idx" ON "PerformanceRecord"("studentId", "categoryId");

-- CreateIndex
CREATE INDEX "PerformanceRecord_studentId_academicYearId_idx" ON "PerformanceRecord"("studentId", "academicYearId");

-- CreateIndex
CREATE INDEX "PerformanceRecord_examId_subjectId_idx" ON "PerformanceRecord"("examId", "subjectId");

-- CreateIndex
CREATE INDEX "PerformanceRecord_subcategoryId_studentId_idx" ON "PerformanceRecord"("subcategoryId", "studentId");

-- CreateIndex
CREATE INDEX "CategoryWeight_categoryId_idx" ON "CategoryWeight"("categoryId");

-- CreateIndex
CREATE INDEX "CategoryWeight_academicYearId_idx" ON "CategoryWeight"("academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_key_key" ON "SystemSetting"("key");

-- CreateIndex
CREATE INDEX "StudentReport_status_idx" ON "StudentReport"("status");

-- CreateIndex
CREATE INDEX "StudentReport_createdAt_idx" ON "StudentReport"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAccount_studentId_key" ON "StudentAccount"("studentId");

-- CreateIndex
CREATE INDEX "StudentAccount_studentId_idx" ON "StudentAccount"("studentId");

-- CreateIndex
CREATE INDEX "StudentAccount_status_idx" ON "StudentAccount"("status");

-- CreateIndex
CREATE UNIQUE INDEX "StudentWallet_studentId_key" ON "StudentWallet"("studentId");

-- CreateIndex
CREATE INDEX "StudentWallet_studentId_idx" ON "StudentWallet"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "EarningLedger_reference_key" ON "EarningLedger"("reference");

-- CreateIndex
CREATE INDEX "EarningLedger_studentId_idx" ON "EarningLedger"("studentId");

-- CreateIndex
CREATE INDEX "EarningLedger_categoryId_idx" ON "EarningLedger"("categoryId");

-- CreateIndex
CREATE INDEX "EarningLedger_activityDate_idx" ON "EarningLedger"("activityDate");

-- CreateIndex
CREATE INDEX "EarningLedger_sourceRecordId_idx" ON "EarningLedger"("sourceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_reference_key" ON "WalletTransaction"("reference");

-- CreateIndex
CREATE INDEX "WalletTransaction_studentId_idx" ON "WalletTransaction"("studentId");

-- CreateIndex
CREATE INDEX "WalletTransaction_type_idx" ON "WalletTransaction"("type");

-- CreateIndex
CREATE INDEX "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoreFundRecord_studentId_key" ON "StoreFundRecord"("studentId");

-- CreateIndex
CREATE INDEX "StoreFundRecord_studentId_idx" ON "StoreFundRecord"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreFundUsage_reference_key" ON "StoreFundUsage"("reference");

-- CreateIndex
CREATE INDEX "StoreFundUsage_studentId_idx" ON "StoreFundUsage"("studentId");

-- CreateIndex
CREATE INDEX "StoreFundUsage_actingAdminId_idx" ON "StoreFundUsage"("actingAdminId");

-- CreateIndex
CREATE INDEX "StoreFundUsage_createdAt_idx" ON "StoreFundUsage"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Task_taskId_key" ON "Task"("taskId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_startDate_idx" ON "Task"("startDate");

-- CreateIndex
CREATE INDEX "Task_endDate_idx" ON "Task"("endDate");

-- CreateIndex
CREATE INDEX "Task_createdById_idx" ON "Task"("createdById");

-- CreateIndex
CREATE INDEX "Task_targetClassId_idx" ON "Task"("targetClassId");

-- CreateIndex
CREATE INDEX "TaskAssignment_taskId_idx" ON "TaskAssignment"("taskId");

-- CreateIndex
CREATE INDEX "TaskAssignment_studentId_idx" ON "TaskAssignment"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskAssignment_taskId_studentId_key" ON "TaskAssignment"("taskId", "studentId");

-- CreateIndex
CREATE INDEX "StudentTaskRecord_taskId_idx" ON "StudentTaskRecord"("taskId");

-- CreateIndex
CREATE INDEX "StudentTaskRecord_studentId_idx" ON "StudentTaskRecord"("studentId");

-- CreateIndex
CREATE INDEX "StudentTaskRecord_studentId_status_idx" ON "StudentTaskRecord"("studentId", "status");

-- CreateIndex
CREATE INDEX "StudentTaskRecord_status_idx" ON "StudentTaskRecord"("status");

-- CreateIndex
CREATE UNIQUE INDEX "StudentTaskRecord_taskId_studentId_key" ON "StudentTaskRecord"("taskId", "studentId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskRewardLedger_transactionReference_key" ON "TaskRewardLedger"("transactionReference");

-- CreateIndex
CREATE INDEX "TaskRewardLedger_studentId_idx" ON "TaskRewardLedger"("studentId");

-- CreateIndex
CREATE INDEX "TaskRewardLedger_taskId_idx" ON "TaskRewardLedger"("taskId");

-- CreateIndex
CREATE INDEX "TaskRewardLedger_studentTaskId_idx" ON "TaskRewardLedger"("studentTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskPointsLedger_reference_key" ON "TaskPointsLedger"("reference");

-- CreateIndex
CREATE INDEX "TaskPointsLedger_studentId_idx" ON "TaskPointsLedger"("studentId");

-- CreateIndex
CREATE INDEX "TaskPointsLedger_taskId_idx" ON "TaskPointsLedger"("taskId");

-- CreateIndex
CREATE INDEX "TaskPointsLedger_studentTaskId_idx" ON "TaskPointsLedger"("studentTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "AccountDeletionRequest_reference_key" ON "AccountDeletionRequest"("reference");

-- CreateIndex
CREATE INDEX "AccountDeletionRequest_status_idx" ON "AccountDeletionRequest"("status");

-- CreateIndex
CREATE INDEX "AccountDeletionRequest_studentIdentifier_idx" ON "AccountDeletionRequest"("studentIdentifier");

-- CreateIndex
CREATE INDEX "AccountDeletionRequest_matchedStudentId_idx" ON "AccountDeletionRequest"("matchedStudentId");

-- CreateIndex
CREATE INDEX "AccountDeletionRequest_createdAt_idx" ON "AccountDeletionRequest"("createdAt");

-- CreateIndex
CREATE INDEX "MonthlyAttendance_studentId_idx" ON "MonthlyAttendance"("studentId");

-- CreateIndex
CREATE INDEX "MonthlyAttendance_categoryCode_idx" ON "MonthlyAttendance"("categoryCode");

-- CreateIndex
CREATE INDEX "MonthlyAttendance_categoryCode_calendarType_year_month_idx" ON "MonthlyAttendance"("categoryCode", "calendarType", "year", "month");

-- CreateIndex
CREATE INDEX "MonthlyAttendance_calendarType_month_year_idx" ON "MonthlyAttendance"("calendarType", "month", "year");

-- CreateIndex
CREATE INDEX "MonthlyAttendance_academicYearId_idx" ON "MonthlyAttendance"("academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlyAttendance_studentId_categoryCode_calendarType_month_key" ON "MonthlyAttendance"("studentId", "categoryCode", "calendarType", "month", "year");

-- CreateIndex
CREATE INDEX "ProfileCorrectionLog_studentId_idx" ON "ProfileCorrectionLog"("studentId");

-- CreateIndex
CREATE INDEX "ProfileCorrectionLog_adminId_idx" ON "ProfileCorrectionLog"("adminId");

-- CreateIndex
CREATE INDEX "ProfileCorrectionLog_createdAt_idx" ON "ProfileCorrectionLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Questionnaire_code_key" ON "Questionnaire"("code");

-- CreateIndex
CREATE INDEX "Questionnaire_displayOrder_idx" ON "Questionnaire"("displayOrder");

-- CreateIndex
CREATE INDEX "Questionnaire_isActive_idx" ON "Questionnaire"("isActive");

-- CreateIndex
CREATE INDEX "QuestionnaireQuestion_questionnaireId_idx" ON "QuestionnaireQuestion"("questionnaireId");

-- CreateIndex
CREATE INDEX "QuestionnaireQuestion_displayOrder_idx" ON "QuestionnaireQuestion"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireQuestion_questionnaireId_questionId_key" ON "QuestionnaireQuestion"("questionnaireId", "questionId");

-- CreateIndex
CREATE INDEX "QuestionnaireResponse_studentId_idx" ON "QuestionnaireResponse"("studentId");

-- CreateIndex
CREATE INDEX "QuestionnaireResponse_questionnaireId_idx" ON "QuestionnaireResponse"("questionnaireId");

-- CreateIndex
CREATE INDEX "QuestionnaireResponse_status_idx" ON "QuestionnaireResponse"("status");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionnaireResponse_studentId_questionnaireId_key" ON "QuestionnaireResponse"("studentId", "questionnaireId");

-- CreateIndex
CREATE INDEX "StudentSavedFilter_createdById_idx" ON "StudentSavedFilter"("createdById");

-- CreateIndex
CREATE INDEX "StudentBriefNoteTemplate_createdById_idx" ON "StudentBriefNoteTemplate"("createdById");

-- CreateIndex
CREATE INDEX "StudentPointAdjustment_studentId_idx" ON "StudentPointAdjustment"("studentId");

-- CreateIndex
CREATE INDEX "StudentPointAdjustment_reasonId_idx" ON "StudentPointAdjustment"("reasonId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_classId_fkey" FOREIGN KEY ("classId") REFERENCES "AcademicClass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcategory" ADD CONSTRAINT "Subcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Term" ADD CONSTRAINT "Term_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "AcademicInstitution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "BoardSyllabus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Program" ADD CONSTRAINT "Program_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_programId_fkey" FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeHubSubmission" ADD CONSTRAINT "CreativeHubSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeHubSubmission" ADD CONSTRAINT "CreativeHubSubmission_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "CreativeHubCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreativeHubSubmission" ADD CONSTRAINT "CreativeHubSubmission_publishedMediaId_fkey" FOREIGN KEY ("publishedMediaId") REFERENCES "PublishedMedia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiteraryEvent" ADD CONSTRAINT "LiteraryEvent_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiteraryCompetition" ADD CONSTRAINT "LiteraryCompetition_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "LiteraryEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiteraryCompetition" ADD CONSTRAINT "LiteraryCompetition_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LibraryRecord" ADD CONSTRAINT "LibraryRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceRecord" ADD CONSTRAINT "PerformanceRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceRecord" ADD CONSTRAINT "PerformanceRecord_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceRecord" ADD CONSTRAINT "PerformanceRecord_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceRecord" ADD CONSTRAINT "PerformanceRecord_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceRecord" ADD CONSTRAINT "PerformanceRecord_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceRecord" ADD CONSTRAINT "PerformanceRecord_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceRecord" ADD CONSTRAINT "PerformanceRecord_literaryCompetitionId_fkey" FOREIGN KEY ("literaryCompetitionId") REFERENCES "LiteraryCompetition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceRecord" ADD CONSTRAINT "PerformanceRecord_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "Level"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceRecord" ADD CONSTRAINT "PerformanceRecord_termId_fkey" FOREIGN KEY ("termId") REFERENCES "Term"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceRecord" ADD CONSTRAINT "PerformanceRecord_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceRecord" ADD CONSTRAINT "PerformanceRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceRecord" ADD CONSTRAINT "PerformanceRecord_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryWeight" ADD CONSTRAINT "CategoryWeight_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryWeight" ADD CONSTRAINT "CategoryWeight_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportHistory" ADD CONSTRAINT "ImportHistory_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAccount" ADD CONSTRAINT "StudentAccount_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentWallet" ADD CONSTRAINT "StudentWallet_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarningLedger" ADD CONSTRAINT "EarningLedger_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarningLedger" ADD CONSTRAINT "EarningLedger_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_senderStudentId_fkey" FOREIGN KEY ("senderStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_recipientStudentId_fkey" FOREIGN KEY ("recipientStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreFundRecord" ADD CONSTRAINT "StoreFundRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreFundUsage" ADD CONSTRAINT "StoreFundUsage_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_targetClassId_fkey" FOREIGN KEY ("targetClassId") REFERENCES "AcademicClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskAssignment" ADD CONSTRAINT "TaskAssignment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTaskRecord" ADD CONSTRAINT "StudentTaskRecord_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTaskRecord" ADD CONSTRAINT "StudentTaskRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentTaskRecord" ADD CONSTRAINT "StudentTaskRecord_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRewardLedger" ADD CONSTRAINT "TaskRewardLedger_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRewardLedger" ADD CONSTRAINT "TaskRewardLedger_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskRewardLedger" ADD CONSTRAINT "TaskRewardLedger_studentTaskId_fkey" FOREIGN KEY ("studentTaskId") REFERENCES "StudentTaskRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskPointsLedger" ADD CONSTRAINT "TaskPointsLedger_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskPointsLedger" ADD CONSTRAINT "TaskPointsLedger_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskPointsLedger" ADD CONSTRAINT "TaskPointsLedger_studentTaskId_fkey" FOREIGN KEY ("studentTaskId") REFERENCES "StudentTaskRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountDeletionRequest" ADD CONSTRAINT "AccountDeletionRequest_matchedStudentId_fkey" FOREIGN KEY ("matchedStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountDeletionRequest" ADD CONSTRAINT "AccountDeletionRequest_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyAttendance" ADD CONSTRAINT "MonthlyAttendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlyAttendance" ADD CONSTRAINT "MonthlyAttendance_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileCorrectionLog" ADD CONSTRAINT "ProfileCorrectionLog_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileCorrectionLog" ADD CONSTRAINT "ProfileCorrectionLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireQuestion" ADD CONSTRAINT "QuestionnaireQuestion_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireResponse" ADD CONSTRAINT "QuestionnaireResponse_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionnaireResponse" ADD CONSTRAINT "QuestionnaireResponse_questionnaireId_fkey" FOREIGN KEY ("questionnaireId") REFERENCES "Questionnaire"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentSavedFilter" ADD CONSTRAINT "StudentSavedFilter_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentBriefNoteTemplate" ADD CONSTRAINT "StudentBriefNoteTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPointAdjustment" ADD CONSTRAINT "StudentPointAdjustment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentPointAdjustment" ADD CONSTRAINT "StudentPointAdjustment_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES "PointCorrectionReason"("id") ON DELETE CASCADE ON UPDATE CASCADE;

