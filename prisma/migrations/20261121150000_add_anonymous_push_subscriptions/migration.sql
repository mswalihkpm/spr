BEGIN;

-- AlterTable: Add isAnonymous flag with safe default of false
ALTER TABLE "PushSubscription" ADD COLUMN "isAnonymous" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex: Support efficient lookup for anonymous broadcast dispatch
CREATE INDEX "PushSubscription_isAnonymous_idx" ON "PushSubscription"("isAnonymous");

-- Drop existing two-owner check constraint
ALTER TABLE "PushSubscription" DROP CONSTRAINT "PushSubscription_exactly_one_owner_check";

-- Add updated mutually exclusive ownership or anonymous check constraint
-- Guarantees:
-- 1. If isAnonymous is false, exactly one of studentAccountId or userId MUST be present.
-- 2. If isAnonymous is true, both studentAccountId and userId MUST be null.
-- 3. Anonymous subscriptions cannot be owned, and owned subscriptions cannot be anonymous.
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_ownership_or_anonymous_check" CHECK (
    ("isAnonymous" IS FALSE AND "studentAccountId" IS NOT NULL AND "userId" IS NULL) OR
    ("isAnonymous" IS FALSE AND "studentAccountId" IS NULL AND "userId" IS NOT NULL) OR
    ("isAnonymous" IS TRUE AND "studentAccountId" IS NULL AND "userId" IS NULL)
);

COMMIT;
