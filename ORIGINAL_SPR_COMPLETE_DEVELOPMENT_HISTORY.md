# ORIGINAL SPR (STUDENT PERFORMANCE RATING) APPLICATION
## Complete Development History, Architectural Blueprint & Specification Recovery

> **Authoritative Technical Documentation & Historical Archive**  
> **Target Institution:** Madin School of Excellence  
> **Primary Workspace:** `c:\Users\DELL\Downloads\SPR`  
> **Source Repository:** `mswalihkpm/spr` (Branch: `main`)  
> **Date of Compilation:** October 15, 2026  
> **Compiler:** Antigravity AI Pair Programming Agent  

---

## TABLE OF CONTENTS
1. [The Complete Project Overview](#1-the-complete-project-overview)
2. [All Features and Requirements Discussed](#2-all-features-and-requirements-discussed)
3. [Complete Database History](#3-complete-database-history)
4. [All SPR Scoring and Calculation Rules](#4-all-spr-scoring-and-calculation-rules)
5. [Complete Student Management History](#5-complete-student-management-history)
6. [All UI, Design, and Navigation Changes](#6-all-ui-design-and-navigation-changes)
7. [All Modules and Their Current Status](#7-all-modules-and-their-current-status)
8. [Security and User Roles](#8-security-and-user-roles)
9. [Performance, Database Egress, and Optimization](#9-performance-database-egress-and-optimization)
10. [Imports, Integrations, and Deployment](#10-imports-integrations-and-deployment)
11. [Complete Chronological Changelog](#11-complete-chronological-changelog)
12. [Current State of the Original Project](#12-current-state-of-the-original-project)
13. [Final Consolidated Requirements for the Rebuilt Application](#13-final-consolidated-requirements-for-the-rebuilt-application)

---

# 1. THE COMPLETE PROJECT OVERVIEW

### 1.1 Original Purpose & Institutional Mission
The **Student Performance Rating (SPR)** application was conceived and engineered for the **Madin School of Excellence** (Malappuram, Kerala, India) as an institution-wide, enterprise-grade academic and extracurricular rating platform. The core objective was to eliminate fragmented mark sheets, manual competition logs, and separate reading records by uniting all facets of student development into a single, permanent, verifiable student profile.

The system evaluates students across a multi-dimensional framework:
1. **Islamic Studies:** Curricular studies under the Islamic academic stream governed by **Jamiathul Hind Al-Islamiyya** and **Ma'din Academy**.
2. **School Studies:** General curricular school education governed by the **Kerala State Board Syllabus** and **NCERT**.
3. **Qualification:** Co-curricular and foundational Islamic qualifications (e.g., Hifz, Qira'at, specialized certificates).
4. **Creative Hub:** A multi-wing literary and creative publishing platform tracking published student works (Poems, Stories, Articles, Research Papers, Letters, Reviews) across varied print and digital media.
5. **Literary Programmes:** Annual multi-tier arts and literary festivals, specifically **Sahityotsav**, **Jamia Maharjan**, **M-Lit Fest**, and **Kerala School Kalotsav**.
6. **Library & Reading:** Reading telemetry tracking books and pages read, borrowing history, and reading comprehension scores, integrating data directly from the **Makthabathul Imthiyaaz Library** platform (`msoelibrary.vercel.app`) as well as the classical **Kuthbkhana** Islamic manuscript reading tradition.
7. **Programmes & Competitions:** Campus, inter-school, and external leadership, sports, and cultural events.

### 1.2 Institution and School Structure
The application models a federated educational structure where **Madin School of Excellence** serves as the central administrative hub, while students may be formally enrolled in or associated with affiliated partner/feeder schools across Malappuram:
* **Madin School of Excellence** (Central / Parent Institution)
* **GBHS Malappuram** (Government Boys Higher Secondary School, Malappuram)
* **GBHSS Malappuram**
* **CM Academy**
* **Ma'din Higher Secondary School**
* **DUHSS Panakkad**

Students are distributed across five primary academic classes:
* **Class 8** (Numeric Grade: 8)
* **Class 9** (Numeric Grade: 9)
* **Class 10** (Numeric Grade: 10)
* **Class +1** (Plus One / Higher Secondary First Year, Numeric Grade: 11)
* **Class +2** (Plus Two / Higher Secondary Second Year, Numeric Grade: 12)
* Divisions: **A**, **B**, etc.

### 1.3 Technology Stack & Development Tools
* **Core Framework:** Next.js 14.2.10 (React Server Components, App Router architecture, Server Actions / Route Handlers)
* **Frontend Library:** React 18.3.1
* **Language:** TypeScript 5.6.2 (Strict type-checking)
* **Styling Engine:** Tailwind CSS 3.4.11 with custom responsive breakpoints, PostCSS 8.4.45, Autoprefixer 10.4.20
* **Database & ORM:** PostgreSQL hosted on Supabase; Prisma ORM 5.19.1 (`@prisma/client` and Prisma CLI)
* **Database Connection Strategy:** Dual-connection configuration via Supabase:
  * Transaction Connection Pooler (`DATABASE_URL`, port 6543 with PgBouncer) for fast serverless queries
  * Direct Connection (`DIRECT_URL`, port 5432) for schema pushes, migrations, and DDL operations
* **Authentication & Cryptography:** 
  * Cookie-based stateless sessions (`spr_auth_token`)
  * `jsonwebtoken` (v9.0.2) & `jose` (v5.8.0)
  * `bcryptjs` (v2.4.3) with salt rounds = 10
* **Data Processing & File Handling:**
  * SheetJS (`xlsx` v0.20.3) for client-side and server-side Excel/CSV parsing and validation
  * `sharp` (v0.33.5) for server-side WebP image compression, dimension normalization, and EXIF orientation
  * `react-dropzone` (v14.2.3) for drag-and-drop file ingestion
* **Icons & Visualization:**
  * `lucide-react` (v0.439.0) for iconography
  * `recharts` (v2.12.7) for analytics and historical performance charts
* **Email & Communications:**
  * `nodemailer` (v10.0.0) configured with Gmail App Password or custom SMTP
* **Deployment & Hosting:**
  * Production Platform: Vercel (`sprmsoe.vercel.app`)
  * Git Host: GitHub (`mswalihkpm/spr`)
  * PWA Engine: Custom Service Worker, Web App Manifest, offline splash screens, iOS standalone support

### 1.4 Evolution of Application Architecture
1. **Initial Monolithic Phase (Early September 2026):**
   * Heavy client-side API requests on every route change.
   * Full database scans executed on page load.
   * Student photos stored as massive Base64 strings directly inside PostgreSQL `Student.photoUrl` column.
2. **First Optimization & Storage Migration Phase (Mid-September 2026):**
   * Identified severe database payload bloat (queries returning 10MB+ per request).
   * Extracted Base64 images to Supabase Storage bucket (`student-photos`) and generated tokenized public CDN URLs.
   * Omitted subcategory Base64 logos from public categories queries.
   * Built lightweight rank calculation (`calculateFastStudentRanks`) to avoid recomputing the full 115-student cohort for a single student profile.
3. **Egress Crisis & Database Migration Phase (Early October 2026):**
   * Supabase Free Plan monthly egress quota (5GB) was rapidly exhausted on project `sprmsoe`.
   * Supabase restricted project access.
   * Executed zero-data-loss emergency migration of all 31 tables via validated CSV batch scripts to a fresh Supabase project: `msoerate`.
4. **Google Drive CDN & Unified Bootstrap Phase (Mid-October 2026):**
   * Migrated student profile photos away from Supabase Storage entirely to **Google Drive direct CDN URLs** (`lh3.googleusercontent.com/d/FILE_ID=s360`).
   * Cleaned all avatar binaries from Supabase Storage and database to drop egress to near zero.
   * Introduced `AppBootstrapContext` parallel preloading and a 60-second in-memory TTL caching layer in `spr-engine.ts`.

---

# 2. ALL FEATURES AND REQUIREMENTS DISCUSSED

### 2.1 Public Master Portal & Leaderboards (`/`, `/leaderboard`)
* **Hero Section:** Executive branding with institutional emblems, school title, and an integrated **secret triple-click dark mode toggle** embedded directly into the hero sky area (triggered without a visible toggle button).
* **Live Overall Podium:** Visual display of 1st, 2nd, and 3rd rank podium cards with dynamic laurel badges, trophy emblems, joint-rank tie badges, and direct links to student dossiers.
* **Master Leaderboard Table:**
  * Displays Rank, Student Avatar, Full Name, Permanent SPR Student ID, Class, School, Category Points breakdown, and Total SPR Points.
  * Real-time search by Student Name, Student ID, or SPR ID.
  * Filters for Academic Class, School, Category, Subcategory, Stream (Jamiathul Hind vs Ma'din Academy), and Festival (Sahityotsav, Kalotsav, M-Lit, Jamia Maharjan).
* **Horizontal Scroll Navigation Ribbon (`HorizontalScrollRibbon.tsx`):**
  * Smooth drag-to-scroll mouse gesture support.
  * Dynamic left and right gradient edge masks that fade in/out based on scroll position.
  * Floating chevron scroll buttons.
  * Auto-centers the actively selected category or filter item.
* **Public Category Directory (`/categories`, `/categories/[id]`):**
  * Categorized hub showcasing all performance wings.
  * Displays primary emblems and dual logos (e.g., Ma'din Academy + Jamiathul Hind calligraphy for Islamic Studies; Library + Kuthbkhana emblems for Library).
  * Direct deep-linking to subcategory leaderboards.
* **News & Announcements (`/updates`):**
  * Interactive preview cards displaying image, title, subtitle, and publication date.
  * Click-to-read full modal view (`NewsDetailModal.tsx`) with scrollable body text and full-resolution graphics.
* **Public Student Issue Reporting Modal (`StudentReportModal.tsx`):**
  * Allows public users, teachers, or students to report an inaccuracy or request score verification.
  * Captures student name, reporter name, message, rank, and score.
  * Logged in admin dashboard as `StudentReport` with status `PENDING`, `REVIEWED`, or `RESOLVED`.

### 2.2 Student Dossier & Performance Scorecard (`/student/[id]`)
* **Permanent Identity Card:** Student photo, full legal name, permanent SPR Student ID, class, school, academic year, division, overall SPR points, overall rank, class rank, and school rank.
* **Interactive Category Breakdown:** Cards for each active category displaying total earned points, number of records, and itemized calculations.
* **Collapsible Assessment Drawers:** For Islamic and School studies, individual subjects are neatly grouped under their respective Assessment/Exam title (e.g., "Term 1 Examination - 130 Actual Max"). Clicking the header expands or collapses the itemized subject marks.
* **A4 Print Studio Modal (`Advanced A4 Print Studio`):**
  * Built-in browser-based report generator formatted precisely for A4 paper.
  * Three selectable presets: **OFFICIAL** (institutional transcript), **COMPACT** (single-page summary), and **CUSTOM** (granular checkboxes).
  * Checkbox controls for: Official Header Banner, Ranks & Percentiles, Category Summary Table, Library Reading Card, Itemized Records, Point Contributions, Signature Lines (Principal & Controller of Examinations).
  * Single-page vs multi-page print layout modes.

### 2.3 TV & Public Display Mode (`/display`)
* Purpose-built broadcast mode optimized for 16:9 large TVs, projectors, and event screens.
* **High-Visibility Typography & Dark Aesthetics:** High-contrast text, gold/silver/bronze rank badges, and live digital clock.
* **Gentle Auto-Scrolling:** Smooth 2px auto-scroll ticker every 50ms that reaches the bottom, pauses, and smoothly resets to top.
* **Data Sanitization & Privacy:** Excludes internal audit notes, reporter names, passwords, and private remarks; delivers only public-safe fields (Rank, Student Name, Student ID, Class, School, SPR Points).
* **Auto-Refresh:** Silent background polling every 60 seconds with server-side caching (`/api/display`).

### 2.4 Administrative Modules & Back-Office Workflows
* **Admin Dashboard (`/dashboard`):** Real-time KPI statistics (Total Students, Active Categories, Total Performance Records, Books Read, Creative Works), performance distribution charts, quick-action shortcuts.
* **Student Administration (`/students`):**
  * Complete student registry sorted **A–Z ascending** by default.
  * Real-time search, class/school filters, and pagination.
  * Modal for creating/editing student records with auto-generated SPR ID preview.
  * Bulk delete with confirmation modal.
  * **Bulk Excel Import (`/students/import`):**
    * Downloadable `.xlsx` template (`Student Name | Class | School | Division`).
    * Pre-upload client-side validation detecting empty names, unmapped classes, invalid schools, or duplicate records.
    * Validation issues table showing row number, field name, error severity (`ERROR` vs `WARNING`), and rejection explanation.
    * Administrator confirmation before committing to PostgreSQL.
* **Academic Evaluation Hubs:**
  * **Islamic Studies (`/academics/islamic`):** Tabbed interface (`ENTRY`, `EXAMS`, `HISTORY`), stream selection (Jamiathul Hind vs Ma'din Academy), exam term configuration with **Actual Maximum Mark** vs **Target Mark** scaling, dynamic subject columns, bulk Excel import and export.
  * **School Studies (`/academics/school`):** Identical enterprise feature set tailored for Kerala State and NCERT syllabuses.
* **Creative Hub Management (`/creative-hub`):**
  * Submissions registry with filters for creative wing and published media.
  * Submission modal capturing Student, Creative Form (Article, Story, Poem, etc.), Published Media (Newspaper, Magazine, Wall Magazine, etc.), URL link, and Score.
  * Master settings tab to create, edit, or set weights for published media platforms.
* **Literary Programmes Management (`/literary`):**
  * Festival event creation (Sahityotsav, Jamia Maharjan, M-Lit Fest, Kalotsav).
  * Competition setup with Level selection (Campus to International).
  * Score entry with automated prize multiplier assignment (1st = 2x, 2nd = 1.5x, 3rd = 1x).
  * Bulk score import via Excel.
* **Classical Kuthbkhana Reading (`/kuthbkhana`):**
  * Dedicated module for classical Islamic text reading.
  * Type selection: **Muthala** (Classical Text Study) and **Point Picking** (Research / Thesis Analysis).
  * Pre-populated autocomplete suggestions for classical Islamic masterworks (Fathul Mueen, Safinathun-Naja, Ihya Uloomiddin, Minhajut-Thalibeen, Tafseer Al-Jalalayn, Riyadus-Saliheen, Bulughul Maram, etc.).
* **Library Integration & Sync (`/library`):**
  * Live status dashboard displaying connection health, endpoint URL, and last sync timestamp.
  * **Sync Now Button:** Executes real-time scraping and synchronization from the live library platform (`msoelibrary.vercel.app`).
  * Enforces **Strict SPR ID Matching** (only readers with a pre-existing valid SPR ID are synced; unmatched names are safely excluded).
* **SPR Weight & Scoring Management (`/weights`):**
  * Master weight editor for all 7 primary categories.
  * Festival & Competition Level Multipliers editor (Campus 1.0x to International 5.0x).
  * Prize Base Score configuration (1st = 100, 2nd = 75, 3rd = 50).
  * Missing Data Rule selector (`IGNORE_NORMALIZE`, `TREAT_AS_ZERO`, `REQUIRE_COMPLETE`).
* **System Settings & Master Data (`/settings`):**
  * Multi-tab management for Institutions, Schools, Classes, Academic Years, Boards, Exams, Terms, Subjects, Categories, Subcategories, Levels, User Accounts, and Audit Logs.
  * Forced password reset trigger for teachers and staff.

### 2.5 Deferred or Unimplemented Features
* **Granular Multi-Tenant School Data Isolation:** While partner schools exist as foreign key entities, all schools currently share the unified global leaderboard rather than completely isolated sub-domains.
* **Automated Cron Sync for Library:** Library sync was engineered as an on-demand administrator trigger rather than a background scheduled Vercel Cron job (to avoid unexpected serverless invocation charges).
* **Native Offline Database Sync:** The PWA caches static shell assets and pages, but offline offline score editing with sync-queue reconciliation was deferred.

---

# 3. COMPLETE DATABASE HISTORY

### 3.1 Complete Relational Database Schema
The database is defined in `prisma/schema.prisma` and deployed to PostgreSQL via Supabase. It comprises **31 relational models** with foreign key constraints, cascading deletes where appropriate, and composite performance indexes:

```prisma
// Core Authentication & Access
model User {
  id                 String              @id @default(cuid())
  email              String              @unique
  name               String
  passwordHash       String
  role               String              @default("ADMIN") // SUPER_ADMIN, ADMIN, CREATIVE_HUB_ADMIN, KUTHBKHANA_ADMIN, TEACHER, VIEWER
  mustChangePassword Boolean             @default(false)
  status             String              @default("ACTIVE") // ACTIVE, INACTIVE, SUSPENDED
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  sessions           Session[]
  passwordResetTokens PasswordResetToken[]
  createdRecords     PerformanceRecord[] @relation("CreatedRecords")
  updatedRecords     PerformanceRecord[] @relation("UpdatedRecords")
  auditLogs          AuditLog[]
  importHistories    ImportHistory[]
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
}

model PasswordResetToken {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  token     String   @unique
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())
}

// Institutional Structure
model School {
  id        String    @id @default(cuid())
  name      String    @unique
  code      String    @unique
  active    Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  students  Student[]
}

model AcademicClass {
  id           String    @id @default(cuid())
  name         String    @unique // Class 8, Class 9, Class 10, Class +1, Class +2
  numericGrade Int       @default(0)
  active       Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  students     Student[]
}

model AcademicYear {
  id                 String             @id @default(cuid())
  name               String             @unique // 2025-2026, 2026-2027
  isCurrent          Boolean            @default(false)
  startDate          DateTime?
  endDate            DateTime?
  createdAt          DateTime           @default(now())
  updatedAt          DateTime           @updatedAt
  students           Student[]
  terms              Term[]
  exams              Exam[]
  programs           Program[]
  literaryEvents     LiteraryEvent[]
  performanceRecords PerformanceRecord[]
  categoryWeights    CategoryWeight[]
}

// Student Master Registry
model Student {
  id                 String                  @id @default(cuid())
  studentId          String                  @unique // e.g. MSOE-2026-001
  sprStudentId       String?                 @unique // e.g. SPR0001
  fullName           String
  classId            String
  class              AcademicClass           @relation(fields: [classId], references: [id])
  schoolId           String
  school             School                  @relation(fields: [schoolId], references: [id])
  division           String                  @default("A")
  academicYearId     String
  academicYear       AcademicYear            @relation(fields: [academicYearId], references: [id])
  status             String                  @default("ACTIVE") // ACTIVE, INACTIVE, ALUMNI
  photoUrl           String?
  notes              String?
  createdAt          DateTime                @default(now())
  updatedAt          DateTime                @updatedAt
  performanceRecords PerformanceRecord[]
  creativeWorks      CreativeHubSubmission[]
  libraryRecords     LibraryRecord[]

  @@index([classId])
  @@index([schoolId])
  @@index([academicYearId])
  @@index([status])
  @@index([fullName])
}

// Categories, Subcategories & Levels
model Category {
  id                 String              @id @default(cuid())
  code               String              @unique // ISLAMIC, SCHOOL, PROGRAMS, CREATIVE_HUB, LITERARY, LIBRARY, QUALIFICATION
  name               String
  description        String?
  icon               String?             @default("award")
  isSystem           Boolean             @default(false)
  active             Boolean             @default(true)
  displayOrder       Int                 @default(0)
  defaultWeight      Float               @default(10.0)
  includeInSPR       Boolean             @default(true)
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  subcategories      Subcategory[]
  exams              Exam[]
  subjects           Subject[]
  performanceRecords PerformanceRecord[]
  categoryWeights    CategoryWeight[]
}

model Subcategory {
  id                 String              @id @default(cuid())
  categoryId         String
  category           Category            @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  name               String
  code               String
  logoUrl            String?
  hasLevels          Boolean             @default(false)
  levelGroup         String?             @default("ALL")
  allowedLevelIds    String?
  hasMaxScore        Boolean             @default(true)
  maxScore           Float               @default(100.0)
  weight             Float               @default(1.0)
  displayOrder       Int                 @default(0)
  active             Boolean             @default(true)
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  performanceRecords PerformanceRecord[]

  @@index([categoryId])
}

model Level {
  id                   String                @id @default(cuid())
  name                 String                @unique // Campus, School, Sub-district, District, State, National, International
  code                 String                @unique
  weightMultiplier     Float                 @default(1.0)
  displayOrder         Int                   @default(0)
  active               Boolean               @default(true)
  createdAt            DateTime              @default(now())
  updatedAt            DateTime              @updatedAt
  programs             Program[]
  literaryCompetitions LiteraryCompetition[]
  performanceRecords   PerformanceRecord[]
}

// Academic Curricular Models
model AcademicInstitution {
  id        String    @id @default(cuid())
  name      String    @unique // Ma'din Academy, Jamiathul Hind Al-Islamiyya
  code      String    @unique
  active    Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  subjects  Subject[]
}

model BoardSyllabus {
  id        String    @id @default(cuid())
  name      String    @unique // Kerala State Syllabus, NCERT
  code      String    @unique
  active    Boolean   @default(true)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  subjects  Subject[]
}

model Term {
  id                 String              @id @default(cuid())
  name               String // Term 1, Term 2, Term 3, Annual
  code               String
  academicYearId     String
  academicYear       AcademicYear        @relation(fields: [academicYearId], references: [id])
  isCurrent          Boolean             @default(false)
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  exams              Exam[]
  performanceRecords PerformanceRecord[]
}

model Exam {
  id                 String              @id @default(cuid())
  name               String // Term 1 Examination, Mid-term, Annual
  categoryId         String
  category           Category            @relation(fields: [categoryId], references: [id])
  termId             String
  term               Term                @relation(fields: [termId], references: [id])
  academicYearId     String
  academicYear       AcademicYear        @relation(fields: [academicYearId], references: [id])
  maxScore           Float               @default(100.0) // Actual Maximum Mark (e.g. 130)
  targetScore        Float               @default(100.0) // Target Standardized Mark (e.g. 100)
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  performanceRecords PerformanceRecord[]

  @@index([categoryId])
  @@index([termId])
  @@index([academicYearId])
}

model Subject {
  id                 String               @id @default(cuid())
  name               String
  code               String
  categoryId         String
  category           Category             @relation(fields: [categoryId], references: [id])
  institutionId      String?
  institution        AcademicInstitution? @relation(fields: [institutionId], references: [id])
  boardId            String?
  board              BoardSyllabus?       @relation(fields: [boardId], references: [id])
  maxScore           Float                @default(100.0)
  createdAt          DateTime             @default(now())
  updatedAt          DateTime             @updatedAt
  performanceRecords PerformanceRecord[]

  @@index([categoryId])
  @@index([institutionId])
  @@index([boardId])
}

// Programs & Co-Curricular
model Program {
  id                 String        @id @default(cuid())
  name               String
  organizer          String?
  academicYearId     String
  academicYear       AcademicYear  @relation(fields: [academicYearId], references: [id])
  levelId            String?
  level              Level?        @relation(fields: [levelId], references: [id])
  date               DateTime      @default(now())
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt
  competitions       Competition[]

  @@index([academicYearId])
  @@index([levelId])
}

model Competition {
  id                 String              @id @default(cuid())
  programId          String
  program            Program             @relation(fields: [programId], references: [id], onDelete: Cascade)
  name               String
  maxScore           Float               @default(100.0)
  date               DateTime            @default(now())
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  performanceRecords PerformanceRecord[]

  @@index([programId])
}

// Creative Hub Models
model CreativeHubCategory {
  id          String                  @id @default(cuid())
  name        String                  @unique // Poem, Story, Article, Letter, Response, Others
  code        String                  @unique
  weight      Float                   @default(1.0)
  displayOrder Int                  @default(0)
  active      Boolean                 @default(true)
  createdAt   DateTime                @default(now())
  updatedAt   DateTime                @updatedAt
  submissions CreativeHubSubmission[]
}

model PublishedMedia {
  id          String                  @id @default(cuid())
  name        String                  @unique // Newspaper, Magazine, Wall Magazine, Digital Portal, Journal
  code        String?
  weight      Float                   @default(1.0)
  active      Boolean                 @default(true)
  createdAt   DateTime                @default(now())
  updatedAt   DateTime                @updatedAt
  submissions CreativeHubSubmission[]
}

model CreativeHubSubmission {
  id                String              @id @default(cuid())
  studentId         String
  student           Student             @relation(fields: [studentId], references: [id], onDelete: Cascade)
  categoryId        String
  category          CreativeHubCategory @relation(fields: [categoryId], references: [id])
  publishedMediaId  String?
  publishedMedia    PublishedMedia?     @relation(fields: [publishedMediaId], references: [id])
  publishedMediaName String?
  title             String              @default("Creative Submission")
  content           String?
  date              DateTime            @default(now())
  score             Float               @default(0.0)
  maxScore          Float               @default(100.0)
  percentage        Float               @default(0.0)
  reviewer          String?
  remarks           String?
  publicationStatus String              @default("PUBLISHED")
  publicationLink   String?
  attachmentUrl     String?
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt

  @@index([studentId])
  @@index([categoryId])
  @@index([publishedMediaId])
}

// Literary Festivals
model LiteraryEvent {
  id           String                @id @default(cuid())
  name         String // Sahityotsav, Jamia Maharjan, M-Lit Fest
  code         String                @unique
  academicYearId String
  academicYear AcademicYear          @relation(fields: [academicYearId], references: [id])
  date         DateTime              @default(now())
  createdAt    DateTime              @default(now())
  updatedAt    DateTime              @updatedAt
  competitions LiteraryCompetition[]
}

model LiteraryCompetition {
  id                 String              @id @default(cuid())
  eventId            String
  event              LiteraryEvent       @relation(fields: [eventId], references: [id], onDelete: Cascade)
  name               String
  levelId            String?
  level              Level?              @relation(fields: [levelId], references: [id])
  maxScore           Float               @default(100.0)
  date               DateTime            @default(now())
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  performanceRecords PerformanceRecord[]

  @@index([eventId])
  @@index([levelId])
}

// Library & Classical Reading
model LibraryIntegration {
  id           String    @id @default(cuid())
  endpointUrl  String    @default("https://msoelibrary.vercel.app/")
  apiKey       String?
  isConnected  Boolean   @default(false)
  lastSyncAt   DateTime?
  syncStatus   String    @default("NOT_CONNECTED")
  syncError    String?
  autoSync     Boolean   @default(false)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model LibraryRecord {
  id            String   @id @default(cuid())
  studentId     String
  student       Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  booksRead     Int      @default(0)
  readingScore  Float    @default(0.0)
  readingRank   Int?
  readingPeriod String?
  syncBatchId   String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([studentId])
  @@index([readingPeriod])
}

// Generic Universal Performance Record
model PerformanceRecord {
  id                     String               @id @default(cuid())
  studentId              String
  student                Student              @relation(fields: [studentId], references: [id], onDelete: Cascade)
  categoryId             String
  category               Category             @relation(fields: [categoryId], references: [id])
  subcategoryId          String?
  subcategory            Subcategory?         @relation(fields: [subcategoryId], references: [id])
  eventId                String?
  examId                 String?
  exam                   Exam?                @relation(fields: [examId], references: [id])
  subjectId              String?
  subject                Subject?             @relation(fields: [subjectId], references: [id])
  competitionId          String?
  competition            Competition?         @relation(fields: [competitionId], references: [id])
  literaryCompetitionId  String?
  literaryCompetition    LiteraryCompetition? @relation(fields: [literaryCompetitionId], references: [id])
  levelId                String?
  level                  Level?               @relation(fields: [levelId], references: [id])
  termId                 String?
  term                   Term?                @relation(fields: [termId], references: [id])
  academicYearId         String?
  academicYear           AcademicYear?        @relation(fields: [academicYearId], references: [id])
  obtainedScore          Float
  maxScore               Float                @default(100.0)
  percentage             Float
  position               String?              // "1st", "2nd", "3rd", "Participated"
  grade                  String?
  date                   DateTime             @default(now())
  remarks                String?
  createdById            String?
  createdBy              User?                @relation("CreatedRecords", fields: [createdById], references: [id])
  updatedById            String?
  updatedBy              User?                @relation("UpdatedRecords", fields: [updatedById], references: [id])
  createdAt              DateTime             @default(now())
  updatedAt              DateTime             @updatedAt

  @@index([studentId])
  @@index([categoryId])
  @@index([subcategoryId])
  @@index([academicYearId])
  @@index([termId])
  @@index([examId])
  @@index([subjectId])
  @@index([competitionId])
  @@index([literaryCompetitionId])
  @@index([levelId])
  @@index([date])
  @@index([studentId, categoryId])
  @@index([subcategoryId, studentId])
}

// Configuration & Operations
model CategoryWeight {
  id             String        @id @default(cuid())
  categoryId     String
  category       Category      @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  academicYearId String?
  academicYear   AcademicYear? @relation(fields: [academicYearId], references: [id])
  weight         Float         @default(10.0)
  isActive       Boolean       @default(true)
  isIncludedInSPR Boolean      @default(true)
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@index([categoryId])
  @@index([academicYearId])
}

model SystemSetting {
  id          String   @id @default(cuid())
  key         String   @unique
  value       String
  description String?
  updatedAt   DateTime @updatedAt
}

model AuditLog {
  id            String   @id @default(cuid())
  userId        String?
  user          User?    @relation(fields: [userId], references: [id])
  userName      String?
  action        String   // CREATE, UPDATE, DELETE, IMPORT, LOGIN, SYNC
  entity        String
  entityId      String?
  previousValue String?
  newValue      String?
  ipAddress     String?
  userAgent     String?
  createdAt     DateTime @default(now())

  @@index([userId])
  @@index([entity])
  @@index([createdAt])
}

model ImportHistory {
  id           String   @id @default(cuid())
  fileName     String
  fileType     String   @default("EXCEL")
  recordsCount Int      @default(0)
  successCount Int      @default(0)
  errorCount   Int      @default(0)
  errorsJson   String?
  uploadedById String?
  uploadedBy   User?    @relation(fields: [uploadedById], references: [id])
  createdAt    DateTime @default(now())
}

model StudentReport {
  id           String   @id @default(cuid())
  studentId    String?
  studentName  String
  className    String?
  rank         Int?
  sprScore     Float?
  reporterName String
  message      String
  status       String   @default("PENDING")
  adminNotes   String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([status])
  @@index([createdAt])
}

model News {
  id          String    @id @default(cuid())
  title       String
  subtitle    String?
  body        String
  imageUrl    String?
  publishedAt DateTime  @default(now())
  active      Boolean   @default(true)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([publishedAt])
  @@index([active])
}
```

### 3.2 Permanent SPR Student ID Generation & Validation Rules
Defined strictly in `src/lib/spr-id.ts`:
1. **Canonical Format:** Must match regex `/^SPR\d{4,}$/i` (e.g., `SPR0001`, `SPR0002`, ... `SPR0117`, `SPR10000`).
2. **Case Normalization:** Stored strictly uppercase trimmed: `normalizeSprId(" spr0001 ") === "SPR0001"`.
3. **Sequential Auto-Generation (`generateNextSprId`):** Scans all assigned `Student.sprStudentId` values in the database, extracts the highest numeric integer suffix (`parseInt(match[1], 10)`), increments by 1, and zero-pads to a minimum of 4 digits (`String(nextNumber).padStart(4, '0')`).
4. **Availability & Collision Check (`checkSprIdAvailable`):** Validates format and executes case-insensitive check to guarantee absolute uniqueness across the student body.
5. **A–Z Student Name Sorting Rule:** The initial 115 students were ordered alphabetically by student name (A–Z) and assigned sequential SPR IDs (`SPR0001` through `SPR0115`). Existing IDs are immutable and cannot be silently reassigned.

---

# 4. ALL SPR SCORING AND CALCULATION RULES

### 4.1 Historical Weighting System vs Final Approved System

| Feature | System 1: Obsolete Weightage (Early Sept 2026) | System 2: Final Approved Engine (`spr-engine.ts`) |
| :--- | :--- | :--- |
| **Output Metric** | Clamped percentage (0.00% to 100.00%) | **Unlimited Numerical Points** (e.g., 5,650.00 Points) |
| **Category Weights** | Static relative weights (summing to 100 or 155) | Direct point accumulation or configurable category weight |
| **Academic Marks** | Normalized to 0–100% across all exams | **Actual Max Mark vs Target Mark** assessment scaling |
| **Prizes (1st, 2nd, 3rd)** | Fixed point rank assignment | **Prize Multipliers (2.0x, 1.5x, 1.0x)** on base prize score |
| **Festival Levels** | Flat weights | **Level Multipliers (1.0x up to 5.0x)** |
| **Creative Hub** | Normalized percentage | **Direct points** based on creative form base + published media |
| **Library Reading** | Capped at 100% (500 pts = 100%) | **Raw earned points preserved** directly in leaderboard |
| **Leaderboard Filter** | 0% students shown on all leaderboards | **0% students excluded** from category leaderboards |

### 4.2 Detailed Final Scoring Formulas by Category

#### 1. Islamic Studies (`cat.code === 'ISLAMIC'`)
* Assessments are grouped by unique Exam Name.
* For each exam group:
  $$\text{Assessment Percentage} = \left( \frac{\sum \text{Obtained Marks}}{\sum \text{Max Marks}} \right) \times 100$$
  $$\text{Exam Scaled Score} = \left( \frac{\text{Assessment Percentage}}{100} \right) \times \text{Exam Actual Max Score (default 100)}$$
* Total Islamic Points = Sum of Exam Scaled Scores across all assessments.

#### 2. School Studies (`cat.code === 'SCHOOL'`)
* Operates on the identical assessment scaling engine:
  $$\text{Assessment Percentage} = \left( \frac{\sum \text{Obtained Marks}}{\sum \text{Max Marks}} \right) \times 100$$
  $$\text{Exam Scaled Score} = \left( \frac{\text{Assessment Percentage}}{100} \right) \times \text{Exam Actual Max Score (default 130)}$$
* Example: A student obtaining 90% in an examination with an Actual Maximum Mark of 130 earns:
  $$\frac{90}{100} \times 130 = 117.00 \text{ SPR Points}$$

#### 3. Literary Programmes (`cat.code === 'LITERARY'`) & Programmes (`cat.code === 'PROGRAMS'`)
$$\text{Earned Points} = \text{Base Score} \times \text{Prize Multiplier} \times \text{Level Multiplier}$$
* **Prize Multipliers:**
  * 1st Place / First Prize: **2.0×**
  * 2nd Place / Second Prize: **1.5×**
  * 3rd Place / Third Prize: **1.0×**
  * Other / Participation: **1.0×**
* **Configurable Prize Base Scores (`SystemSetting`):**
  * 1st Prize: 100
  * 2nd Prize: 75
  * 3rd Prize: 50
* **Festival Level Multipliers:**
  * Campus: **1.00×**
  * School: **1.00×**
  * Division / Sub-district / Kulliya: **2.00×**
  * District: **2.50×**
  * Da'eera: **3.00×**
  * State / Jamia: **4.00×**
  * National: **4.50×**
  * International: **5.00×**
* *Example:* District 1st Prize = $100 \times 2.0 \times 2.50 = 500.00 \text{ Points}$.

#### 4. Qualification (`cat.code === 'QUALIFICATION'`)
$$\text{Earned Points} = \text{Base Score} \times \text{Subcategory Weight} \times \text{Level Multiplier} \times \text{Prize Multiplier}$$

#### 5. Creative Hub (`cat.code === 'CREATIVE_HUB'`)
* Direct points entered on the submission, or derived from the Creative Form base score multiplied by the Published Media weight.
* **Form Base Scores:**
  * Research Paper: 100
  * Story: 75
  * Article / Poem / Book Review: 50
  * Response: 40
  * Letter / Others: 30

#### 6. Library & Classical Reading (`cat.code === 'LIBRARY'`)
* **Imthiyaaz Library Live Synchronization:**
  * Synchronized from `msoelibrary.vercel.app` using reading rate versions per 10 pages:
    * Full Read: $\frac{\text{Pages}}{10} \times \text{Rate}$
    * Half Read: $\text{Full Points} \div 2$
    * Custom Page Read: $\frac{\text{Pages Read}}{10} \times \text{Rate}$
    * Review Points added directly.
* **Classical Kuthbkhana Reading:**
  $$\text{Earned Points} = \text{Base Score} \times \text{Subcategory Weight}$$
* Total Library Points = Sum of Imthiyaaz Library points + Kuthbkhana classical points.

#### 7. Overall SPR Calculation
$$\text{Total SPR Points} = \sum_{\text{Included Active Categories}} \text{Category Earned Points}$$

### 4.3 Ranking & Tie-Breaking Engine
Implemented in `calculateAllLeaderboards` and tested in `test_tie_ranking.ts`:
1. **Primary Sort:** `spr` (Total SPR Points) descending.
2. **Secondary Sort:** `recordsCount` (Total participation/evaluation records) descending.
3. **Tertiary Sort:** `name` ascending (alphabetical tie-breaker).
4. **Standard Competition Ranking (1224 style):**
   * If Student A and Student B both have 5,000 points, both receive **Rank 1** (`isTied: true`, `tiedCount: 2`).
   * The next student with 4,800 points receives **Rank 3** (not Rank 2).
5. **Zero-Point Exclusion Rule:**
   * On category-specific leaderboards, students with 0 earned points are completely excluded from the ranking table.
   * On the Overall Master Leaderboard, all active students are ranked.

---

# 5. COMPLETE STUDENT MANAGEMENT HISTORY

### 5.1 Student Profile Structure
Every student record in `Student` contains:
* `id` (CUID Primary Key)
* `studentId` (Institutional ID, e.g., `MSOE-2026-001`)
* `sprStudentId` (Permanent sequential SPR ID, e.g., `SPR0001`)
* `fullName` (Student name in uppercase English)
* `classId` & `division` (Class 8, 9, 10, +1, +2; Division A)
* `schoolId` (School affiliation)
* `academicYearId` (Current academic year)
* `photoUrl` (Direct image URL)
* `status` (`ACTIVE`, `INACTIVE`, `ALUMNI`)

### 5.2 Photo Storage Evolution: From Base64 to Google Drive CDN
The photo subsystem underwent three major architectural revisions to solve critical performance and bandwidth issues:
1. **Phase 1: Base64 Strings in PostgreSQL (Original)**
   * Photos uploaded as raw Base64 data strings (`data:image/jpeg;base64,...`) stored in `Student.photoUrl`.
   * **Problem:** Each student profile was 200KB–800KB. A leaderboard query for 115 students fetched 40MB–80MB of raw data over the database wire, causing query timeouts and extreme latency.
2. **Phase 2: Supabase Storage Buckets (`student-photos`)**
   * Migration script `migrate_photos_to_supabase.ts` extracted all Base64 strings, converted them to lightweight WebP buffers (360x360 cover at quality 85) using `sharp`, and uploaded them to Supabase Storage with tokenized unguessable paths (`avatars/st_<uuid>_<timestamp>.webp`).
   * **Problem:** While query payloads dropped, the public requests fetching images from Supabase Storage counted against Supabase Free Tier **Bandwidth / Egress Quotas**. This triggered account restrictions.
3. **Phase 3: Google Drive High-Performance Edge CDN (Final Implementation)**
   * Completely purged legacy photo binaries from Supabase Storage and database (`cleanup_student_photos.ts`).
   * Architected Google Drive URL parsing (`src/lib/google-drive.ts`):
     * Standard sharing links (`drive.google.com/file/d/FILE_ID/view`) are automatically transformed into direct image CDN URLs:
       $$\text{https://lh3.googleusercontent.com/d/}\text{FILE\_ID}\text{=s360}$$
     * The `=s360` parameter instructs Google's edge CDN to resize the image dynamically on delivery, preventing high-resolution photo data waste.
   * Streaming avatar route `/api/avatar/[id]` serves a 307 temporary redirect with `Cache-Control: public, max-age=86400, s-maxage=86400`.
   * **Result:** Supabase egress for photo delivery was reduced to **0 bytes**, offloading all image bandwidth to Google infrastructure.

### 5.3 Authoritative Student Matching Rule for External Sync
Documented in `src/lib/library-sync.ts`:
* **Exact SPR ID Match Only:** When syncing data between external platforms (like the Library system) and SPR, matching is permitted **exclusively via exact SPR Student ID**.
* Matching by name, phonetic similarity, fuzzy matching, class, or guessed identity is **strictly prohibited** because of duplicate names, spelling variations (e.g., "Muhammed" vs "Muhammad"), and class mismatches.

---

# 6. ALL UI, DESIGN, AND NAVIGATION CHANGES

### 6.1 Design Language & Aesthetic Philosophy
* Built using an **executive institutional design system**:
  * Clean, high-density dashboard layouts.
  * Deep Madin Navy (`#0f172a`, `#1e293b`), Slate neutral scales, Emerald and Teal accents for Islamic/Academic prestige.
  * Subtle 1px borders (`border-slate-200` / `border-slate-800`), refined shadows (`shadow-sm`, `shadow-md`), and rounded corners (`rounded-2xl`).
* Modern typography via clean sans-serif stacks (Inter, Outfit style).

### 6.2 Key UI Components & Micro-Interactions
1. **Application Video Intro (`VideoLoader.tsx`, `AppIntro.tsx`):**
   * Premium 2.3-second animated institutional brand video (`public/ploo.mp4`) that plays seamlessly on initial entry.
   * Real 0–100% animated loading progress bar tracking actual DOM/bootstrap hydration.
2. **Horizontal Scroll Navigation Ribbon (`HorizontalScrollRibbon.tsx`):**
   * Replaced rigid wrapping button rows with a touch-friendly, drag-scrollable navigation ribbon.
   * Includes floating chevron buttons, edge fade masks, and auto-centering for the active tab.
3. **Secret Triple-Click Dark Mode:**
   * Embedded in `src/app/page.tsx` within the hero banner sky area.
   * Clicking three times rapidly toggles between light and dark modes without cluttering the public header with a jarring switch button.
   * Persisted in `localStorage` (`spr_theme`) and coordinated through `ThemeContext.tsx`.
4. **Custom Styled Select Popover (`CustomSelect.tsx`):**
   * Replaced generic browser `<select>` dropdowns with custom floating popover menus that respect dark mode and support keyboard navigation.
5. **Mobile-Specific Layouts:**
   * Public bottom navigation bar (`PublicMobileNav.tsx`) for mobile visitors.
   * Sticky save/cancel button footers inside mobile admin modals to prevent buttons from being hidden below the keyboard viewport.
6. **Scroll-Driven HUD (`ScrollToTopHUD.tsx` & `ScrollProgressBar.tsx`):**
   * Thin reading progress bar fixed to the top edge showing percentage scrolled.
   * Floating "Back to Top" button that fades in once scrolled past 400px.

---

# 7. ALL MODULES AND THEIR CURRENT STATUS

| Module | Route / File | Originally Requested | Current Implementation Status |
| :--- | :--- | :--- | :--- |
| **Public Landing & Leaderboard** | `src/app/page.tsx`, `/leaderboard` | Public portal showing top winners and overall leaderboard | **100% Working:** Top 15 podium, search, filters, tied ranks, secret dark mode, report modal. |
| **Student Dossier** | `src/app/student/[id]/page.tsx` | Comprehensive student profile with category scores | **100% Working:** Collapsible assessment drawers, itemized marks, A4 Print Studio modal. |
| **Public Categories Directory** | `src/app/categories/page.tsx` | Visual directory of all performance wings | **100% Working:** Dual logos, subcategory badges, deep-linked filtering. |
| **Public News & Updates** | `src/app/updates/page.tsx` | Chronological institutional announcements | **100% Working:** Card previews, modal news reader. |
| **TV Display Mode** | `src/app/display/page.tsx` | Full-screen broadcast view for TVs | **100% Working:** 16:9 layout, top 3 podium, gentle auto-scroll, 60s cache. |
| **Admin Dashboard** | `src/app/dashboard/page.tsx` | Central overview with KPIs and shortcuts | **100% Working:** Statistics, charts, quick action menus. |
| **Student Management** | `src/app/students/page.tsx` | Registry, CRUD, bulk Excel import | **100% Working:** A–Z sort, sequential SPR ID generation, Excel template validator. |
| **Islamic Studies Hub** | `src/app/academics/islamic/page.tsx` | Islamic evaluation for Jamiathul Hind / Ma'din | **100% Working:** Stream filters, exam max scaling, dynamic subject table, Excel bulk entry. |
| **School Studies Hub** | `src/app/academics/school/page.tsx` | Academic evaluation for State / NCERT | **100% Working:** Identical structure to Islamic Studies, exam max scaling. |
| **Creative Hub** | `src/app/creative-hub/page.tsx` | Published student writing management | **100% Working:** Form base scores, media weights, monthly links, direct points entry. |
| **Literary Programmes** | `src/app/literary/page.tsx` | Multi-tier arts festival management | **100% Working:** Sahityotsav, Kalotsav, etc., prize multipliers (2x, 1.5x, 1x), level multipliers. |
| **Library Sync (Imthiyaaz)** | `src/app/library/page.tsx` | Integration with `msoelibrary.vercel.app` | **100% Working:** Real-time web scraping, page-rate point calculations, strict SPR ID matching. |
| **Kuthbkhana Classical** | `src/app/kuthbkhana/page.tsx` | Classical Islamic reading evaluation | **100% Working:** Muthala and Point Picking, classical book suggestions. |
| **Subcategories Hub** | `src/app/subcategories/page.tsx` | Management of subcategory definitions | **100% Working:** Logo URLs, max score, level group toggles. |
| **Weight Management** | `src/app/weights/page.tsx` | Master weight and multiplier control | **100% Working:** 7 main categories, prize base scores, level multipliers, calculation preview. |
| **System Settings** | `src/app/settings/page.tsx` | Comprehensive master data management | **100% Working:** 14 configuration tabs, master entities, password reset modals. |
| **Global Search** | `GlobalSearchModal.tsx` | Fast universal search modal | **100% Working:** Ctrl+K keyboard shortcut, grouped results. |
| **Progressive Web App (PWA)** | `PWAInstallPrompt.tsx` | Installable mobile/desktop app | **100% Working:** Android & iOS prompts, manifest, service worker caching. |

---

# 8. SECURITY AND USER ROLES

### 8.1 Authentication Architecture
* **Cookie-Based Stateless JWT:** Uses `spr_auth_token` set as an HTTP-only, secure, `SameSite=Lax` cookie with a 7-day lifespan.
* **Password Security:** Salted and hashed using `bcryptjs` (salt rounds: 10). Passwords are never returned in API payloads or logged in audit trails.
* **Mandatory First-Login Password Change:** Bootstrap administrator accounts (e.g., initial email `excellence@madin.edu.in` with temporary password `159159`) have `mustChangePassword: true`. The application middleware and `AdminLayout` intercept all requests and force a redirect to `/auth/change-password` before granting panel access.
* **Audit Logging (`AuditLog`):** Sensitive mutations (CREATE, UPDATE, DELETE, IMPORT, SYNC) record the acting user, target entity, entity ID, serialized previous value, new value, IP address, and user agent.

### 8.2 Role-Based Access Control (RBAC)
Configured in `src/lib/auth.ts`:
1. `SUPER_ADMIN`: Unrestricted system access across all 31 models, settings, weights, and user creation.
2. `ADMIN`: Full access to student management, academic evaluation, marks, and leaderboards; restricted from altering master system settings.
3. `CREATIVE_HUB_ADMIN`: Dedicated role restricted exclusively to the Creative Hub module (`/creative-hub`) and viewable leaderboards.
4. `KUTHBKHANA_ADMIN`: Dedicated role restricted exclusively to the Kuthbkhana Classical Reading module (`/kuthbkhana`) and viewable leaderboards.
5. `TEACHER`: Access to enter and edit marks for assigned academic classes and subjects.
6. `VIEWER`: Read-only access to view dossiers, reports, and leaderboards.

---

# 9. PERFORMANCE, DATABASE EGRESS, AND OPTIMIZATION

### 9.1 Root Causes of the Supabase Egress Overrun
1. **Base64 Photo Ingestion in Database Records:** Storing images as Base64 strings in `Student.photoUrl` and `Subcategory.logoUrl` bloated single row sizes from a few bytes to 800KB. A query fetching 115 students transferred 50MB–80MB over the wire per page visit.
2. **Redundant Cohort Recalculation:** The public student dossier route (`/api/public/student/[id]`) previously invoked `calculateAllLeaderboards()`, fetching all 115 students and 1,219 performance records from PostgreSQL simply to calculate the rank of one student.
3. **Aggressive Public Polling:** Public display and leaderboard pages initially polled every 15–30 seconds without caching, repeatedly scanning the entire database.

### 9.2 Optimizations Implemented & Verified
1. **Elimination of Database Image Payloads:**
   * Purged all Base64 and Supabase Storage photo blobs.
   * Migrated to **Google Drive direct edge CDN URLs** with `=s360` thumbnail parameters.
   * Omitted `logoUrl` from high-frequency subcategory queries.
2. **Unified App Bootstrap Architecture (`AppBootstrapContext.tsx`):**
   * On initial app hydration, master metadata (categories, subcategories, classes, schools) is fetched once in parallel and shared across client components via React Context.
3. **Server-Side In-Memory Engine Cache (`CACHE_TTL_MS = 60000`):**
   * Added module-level caching in `src/lib/spr-engine.ts` for:
     * `leaderboardCache`
     * `studentSPRProfileCache`
     * `studentRanksCache`
     * `cachedActiveStudentsSnapshot`
     * `cachedCategories`, `cachedLevels`, `cachedSettings`
   * Request deduplication via in-flight promises (`inFlightLeaderboardPromises`, `inFlightActiveStudentsPromise`) prevents multiple concurrent incoming web requests from triggering duplicate database queries.
4. **Lightweight Rank Projection (`calculateFastStudentRanks`):**
   * Replaced full recalculation on student profiles with cached leaderboard lookups.

---

# 10. IMPORTS, INTEGRATIONS, AND DEPLOYMENT

### 10.1 Production Deployment & Repositories
* **GitHub Repository:** `mswalihkpm/spr` (Branch: `main`)
* **Vercel Project:** `sprmsoe` (`https://sprmsoe.vercel.app`)
* **Node.js Runtime:** 20.x

### 10.2 External Integrations
1. **Makthabathul Imthiyaaz Library Platform:**
   * **Base URL:** `https://msoelibrary.vercel.app`
   * **Database:** Supabase REST endpoint (`https://lezoaunsbfgrbcskedoq.supabase.co`)
   * **Integration Method:** Server-side synchronization fetching reading rate versions, book catalogs, and borrow records. Dynamically extracts API credentials from the library website bundle. Matches strictly by exact SPR Student ID.
2. **Google Drive Image CDN:**
   * Parses sharing links and delivers photos via Google's edge cache (`lh3.googleusercontent.com/d/FILE_ID=s360`).

### 10.3 Required Environment Variables
```env
# Supabase Transaction Pooler (Port 6543, PgBouncer)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase Direct Connection (Port 5432, Migrations)
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"

# Authentication Secrets (Min 32 characters)
JWT_SECRET="your_secure_jwt_secret_min_32_characters"
NEXTAUTH_SECRET="your_nextauth_secret_key"

# Application Public Endpoints
NEXT_PUBLIC_APP_URL="https://sprmsoe.vercel.app"
NEXT_PUBLIC_LIBRARY_URL="https://msoelibrary.vercel.app/"

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT_REF].supabase.co"
SUPABASE_STORAGE_BUCKET="student-photos"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_secret_key"

# Email SMTP Credentials (Optional / OTP Verification)
GMAIL_USER="your.institution@gmail.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
```

---

# 11. COMPLETE CHRONOLOGICAL CHANGELOG

* **2026-09-01 to 2026-09-04:**
  * Initial exploratory prototyping under Arts Fiesta projects (`excellentia26.vercel.app`).
* **2026-09-05:**
  * Receipt of the foundational, production specification for the **SPR (Students Performance Rate)** platform for Madin School of Excellence.
* **2026-09-06 (`cb12686`):**
  * Complete Madin School of Excellence SPR platform built and deployed with Next.js, Prisma, and Supabase integration.
  * Search option debugging and direct leaderboard row click-to-profile navigation implemented (`6fb0c1b8`, `c1362a06`).
  * 2.3-second video intro animation (`public/ploo.mp4`) integrated (`20c27c9d`).
* **2026-09-09 (`325eac07`):**
  * Rule established: Exclude students with 0% score from category leaderboards while retaining them on the Overall Leaderboard.
  * Added subcategory navigation directly from category cards.
* **2026-09-11 (`d38c2d50`):**
  * **Major Architectural Pivot:** Complete replacement of the obsolete weightage/percentage system with the **pure numerical points accumulation engine**.
  * Replaced flat festival weights with **Level Multipliers** (Campus 1.0x to International 5.0x).
  * Implemented **Prize Base Scores** (100, 75, 50).
* **2026-09-11 (`6a503f16`):**
  * Removed percentage conversion from Creative Hub; transitioned to direct point entry based on creative form and published media.
  * Added subcategories for Literary Programmes (Sahityotsav, Jamia Maharjan, M-Lit Fest, Kalotsav).
* **2026-09-11 (`5a2ceea`):**
  * Fixed joint 1st rank tie-breaking using standard competition ranking (1224 style); updated podium card styling.
* **2026-09-12 to 2026-09-13 (`72ba3021`):**
  * Implemented Exam **Actual Maximum Mark** (e.g., 130) vs **Target Mark** (e.g., 100) conversion for academic assessments.
  * Added prize multipliers: 1st (2x), 2nd (1.5x), 3rd (1x).
  * Replaced native browser dropdowns with `CustomSelect` popovers.
* **2026-09-13 (`b59d785`):**
  * Performance overhaul: Migrated Base64 photo storage to Supabase Storage WebP blobs.
  * Introduced `calculateFastStudentRanks` to eliminate cohort-wide recalculation on individual student profiles.
  * Omitted 3.69MB Base64 logoUrl from category queries.
* **2026-09-13 to 2026-09-14 (`6b267f1`, `2c08fdd`, `c29f564`):**
  * Added smooth 0–100% animated progress bar across all in-app loading screens.
  * Enhanced PWA installation prompt for Android and iOS standalone modes.
* **2026-09-17 (`77689fb`):**
  * Redesigned news announcements: simplified card preview with image, title, subtitle, and full reader modal (`NewsDetailModal.tsx`).
* **2026-09-19 (`60c8b0f`, `65717e6`):**
  * Fixed mobile admin layout: implemented sticky save/action buttons inside modals.
  * Added client-side image compression (`compressImageClientSide`) for news uploads.
* **2026-09-26 to 2026-09-27 (`6400852`, `ddf359e`, `d6ed4db`):**
  * Implemented unified `AppBootstrapContext` parallel preloading.
  * Added 60-second in-memory engine cache with in-flight request deduplication.
* **2026-10-01 (`b5dfbdd7`, `effba7b`, `056e997`):**
  * Assigned permanent sequential SPR IDs (`SPR0001` through `SPR0115`) sorted alphabetically by student name (A–Z).
  * Enforced **Strict SPR ID Matching** on Library synchronization (skipping any reader without a valid SPR ID).
* **2026-10-03 (`c4f44a35`):**
  * Addressed Supabase egress quota restriction on project `sprmsoe`.
  * Executed non-destructive database export and migrated all 31 tables to new Supabase project `msoerate`.
* **2026-10-05 (`51bccacc`, `8233dfd`):**
  * Aligned Islamic Studies administration layout to match School Studies with full dynamic subject management and bulk entry.
* **2026-10-13 (`a2f3cd4`):**
  * Synced Library leaderboard valuation points matching the live library update.
  * Added secret 3-click dark mode toggle in the hero sky area.
* **2026-10-14 (`35948088`, `b81f168`):**
  * Cleaned up legacy student profile photos from Supabase Storage and database to slash egress.
  * Migrated student avatar pipeline to **Google Drive direct edge CDN URLs** (`lh3.googleusercontent.com/d/FILE_ID=s360`).
* **2026-10-14 (`2e8a6e0`):**
  * Added `HorizontalScrollRibbon` with mouse drag-to-scroll, chevron controls, and dynamic edge gradient masks.
* **2026-10-15 (`21208ab`):**
  * Reduced Supabase egress by delivering direct avatar URLs and optimizing polling frequencies.

---

# 12. CURRENT STATE OF THE ORIGINAL PROJECT

### 12.1 Verified Production Database Record Counts
Audited and verified via `scripts/verify_cleanup_and_readiness.ts`:
* **Total Active Students:** Exactly **115**
* **Total Performance Records (Academic / Marks / Points):** Exactly **1,219**
* **Creative Hub Submissions:** Exactly **44**
* **Library Reading Records:** Exactly **70**
* **News Updates:** Exactly **3**
* **Subcategories:** Exactly **11**
* **Supabase Storage `student-photos` Bucket:** Exactly **0** objects (fully cleaned)
* **Local `public/uploads` Student Photos:** Exactly **0** files (fully cleaned)
* **Permanent SPR Student IDs:** 100% intact across all 115 students (`SPR0001` through `SPR0115`).
* **Safety Backups Verified on Disk:**
  * `backups/pre_cleanup_full_database_backup_2026-10-14T09-19-27-593Z.json` (8.12 MB)
  * `backups/pre_cleanup_student_photos_backup_2026-10-14T09-19-27-593Z.json` (80.2 KB)

### 12.2 Known Outstanding Items & Technical Debt
1. **Google Drive Photo URL Mapping Pending:** All 115 `Student.photoUrl` columns are currently set to `NULL` following the safe cleanup of legacy Base64/Supabase Storage photos. The application is ready for the bulk CSV/mapping script to populate the Google Drive sharing links.
2. **Serverless Cache Isolation on Vercel:** While server-side in-memory caching is active, Vercel spins up separate isolated serverless lambda instances across global edge regions. Cold instances still perform the initial database snapshot before caching, contributing to small residual egress.

---

# 13. FINAL CONSOLIDATED REQUIREMENTS FOR THE REBUILT APPLICATION

### 13.1 Confirmed Final Requirements (Non-Negotiables)
1. **Scoring Philosophy:** Use **Unlimited Numerical Points** for all leaderboards and student ratings. Never regress to a clamped 100% percentage system for overall SPR.
2. **Permanent SPR Student ID:** Sequential alphanumeric format (`SPR0001`, `SPR0002`, etc.), uppercase, minimum 4 digits. Once assigned, an SPR ID must remain permanently immutable.
3. **External Sync Identity Key:** When syncing external systems (Library, Sports, Competitions), matching must be performed **exclusively via exact SPR Student ID**. Never use name or class matching.
4. **Assessment Mark Conversion:** Support Exam **Actual Maximum Mark** (e.g., 130) vs **Target Mark** (e.g., 100) conversion on academic subjects.
5. **Prize Multipliers:** 1st Prize = 2.0x, 2nd Prize = 1.5x, 3rd Prize = 1.0x applied to configurable base scores (100, 75, 50).
6. **Festival Level Multipliers:** Configurable scale ranging from Campus (1.0x) to International (5.0x).
7. **Tie-Breaking Rule:** Standard competition ranking (1224 style); joint ranks display tied badges, and subsequent ranks skip accordingly.
8. **Zero-Point Ranking Rule:** Students with 0 points are hidden on category leaderboards but included at the bottom of the Overall Master Leaderboard.
9. **Image Pipeline:** Never store Base64 photos in PostgreSQL. Use Google Drive direct CDN links (`lh3.googleusercontent.com/d/FILE_ID=s360`) or external CDN storage to protect Supabase database egress.
10. **A4 Print Studio:** Maintain the advanced modal with selectable presets (OFFICIAL, COMPACT, CUSTOM) and granular section toggles.
11. **Responsive & Mobile Experience:** Sticky modal save buttons on mobile, horizontal scroll ribbons with drag-to-scroll, and responsive public bottom navigation.
12. **Secret 3-Click Dark Mode:** Hidden triple-click trigger in the hero sky area coordinated via `ThemeContext`.

### 13.2 Obsolete / Historical Requirements (Do NOT Carry Forward)
* ❌ The initial 0–100% normalized weighted percentage system (Category Weight / 155).
* ❌ Storing Base64 image strings directly inside database tables.
* ❌ Fuzzy name-matching or class-matching for Library synchronization.
* ❌ Recomputing the entire 115-student cohort leaderboard during single student dossier requests.
* ❌ Displaying 0-point students on individual category leaderboards.

### 13.3 Planned Next-Generation Enhancements for the Rebuilt Project
* Implementation of bulk Google Drive URL import tool via CSV mapping (`SPR_ID | GOOGLE_DRIVE_URL`).
* Shared Redis / Upstash caching layer across Vercel serverless lambdas to eliminate cold-start database queries and achieve zero Supabase egress.
* Automated webhook-based synchronization for library updates instead of manual button triggering.
