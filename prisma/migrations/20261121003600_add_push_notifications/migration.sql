-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "fcmToken" TEXT NOT NULL,
    "deviceType" TEXT NOT NULL DEFAULT 'WEB',
    "userAgent" TEXT,
    "studentAccountId" TEXT,
    "userId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationLog" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "targetType" TEXT NOT NULL DEFAULT 'ALL',
    "targetClassId" TEXT,
    "targetStudentId" TEXT,
    "deepLink" TEXT,
    "senderId" TEXT NOT NULL,
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "fcmAcceptedCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "studentAccountId" TEXT NOT NULL,
    "academicAlerts" BOOLEAN NOT NULL DEFAULT true,
    "examAlerts" BOOLEAN NOT NULL DEFAULT true,
    "taskAlerts" BOOLEAN NOT NULL DEFAULT true,
    "announcements" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_fcmToken_key" ON "PushSubscription"("fcmToken");

-- CreateIndex
CREATE INDEX "PushSubscription_studentAccountId_idx" ON "PushSubscription"("studentAccountId");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "PushSubscription_isActive_idx" ON "PushSubscription"("isActive");

-- CreateIndex
CREATE INDEX "NotificationLog_targetType_idx" ON "NotificationLog"("targetType");

-- CreateIndex
CREATE INDEX "NotificationLog_category_idx" ON "NotificationLog"("category");

-- CreateIndex
CREATE INDEX "NotificationLog_senderId_idx" ON "NotificationLog"("senderId");

-- CreateIndex
CREATE INDEX "NotificationLog_createdAt_idx" ON "NotificationLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_studentAccountId_key" ON "NotificationPreference"("studentAccountId");

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_studentAccountId_fkey" FOREIGN KEY ("studentAccountId") REFERENCES "StudentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_targetClassId_fkey" FOREIGN KEY ("targetClassId") REFERENCES "AcademicClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_targetStudentId_fkey" FOREIGN KEY ("targetStudentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationLog" ADD CONSTRAINT "NotificationLog_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_studentAccountId_fkey" FOREIGN KEY ("studentAccountId") REFERENCES "StudentAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CheckConstraint
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_exactly_one_owner_check" CHECK (
    ("studentAccountId" IS NOT NULL AND "userId" IS NULL) OR
    ("studentAccountId" IS NULL AND "userId" IS NOT NULL)
);
