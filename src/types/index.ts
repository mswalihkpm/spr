export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'CREATIVE_HUB_ADMIN' | 'KUTHBKHANA_ADMIN' | 'TEACHER' | 'VIEWER';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export type MissingDataRule = 'IGNORE_NORMALIZE' | 'TREAT_AS_ZERO' | 'REQUIRE_COMPLETE';

export interface StudentWithRelations {
  id: string;
  studentId: string;
  sprStudentId?: string | null;
  fullName: string;
  division: string;
  status: string;
  photoUrl?: string | null;
  notes?: string | null;
  class: {
    id: string;
    name: string;
    numericGrade: number;
  };
  school: {
    id: string;
    name: string;
    code: string;
  };
  academicYear: {
    id: string;
    name: string;
    isCurrent: boolean;
  };
}

export interface CategorySummary {
  categoryId: string;
  categoryCode: string;
  categoryName: string;
  icon?: string | null;
  priority?: number;
  weight?: number;
  score?: number;
  percentage?: number;
  normalizedPercentage?: number;
  rawInput?: string;
  earnedPoints: number;
  basePoints?: number;
  multiplier?: number;
  normalizationRef?: number;
  weightedContribution?: number;
  formula?: string;
  recordsCount: number;
  isIncluded: boolean;
  records?: any[];
}

export interface StudentSPRProfile {
  student: StudentWithRelations;
  overallSPR: number; // e.g. 5650 (pure numerical points)
  totalPoints?: number;
  overallScore?: number;
  rank: number;
  classRank: number;
  schoolRank: number;
  totalStudentsInClass: number;
  totalStudentsInSchool: number;
  totalStudentsOverall: number;
  rawWeightedTotal?: number;
  maxWeightedTotal?: number;
  normalizedScore?: string;
  categoryScores: CategorySummary[];
  categoryBreakdown?: CategorySummary[];
  missingCategoriesCount: number;
  recentRecords: {
    id: string;
    categoryName: string;
    categoryCode?: string;
    eventName: string;
    obtainedScore: number;
    maxScore: number;
    percentage: number;
    date: string;
    levelName?: string | null;
  }[];
  subjectWiseRecords?: any[];
  programmeWiseRecords?: any[];
  allRecords?: any[];
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  studentCode: string;
  studentIdCode?: string;
  sprStudentId?: string | null;
  name: string;
  studentName?: string;
  className: string;
  schoolName: string;
  spr: number; // Total SPR Points (e.g. 8500)
  totalSprPoints?: number;
  overallScore?: number;
  photoUrl?: string | null;
  division?: string;
  categoryPoints?: Record<string, number>;
  categoryPercentages?: Record<string, number>;
  recordsCount: number;
}

export interface ExcelImportRow {
  studentName: string;
  class: string;
  school: string;
  studentId?: string;
  sprStudentId?: string;
  sprId?: string;
  division?: string;
}

export interface ExcelValidationIssue {
  rowNumber: number;
  field: string;
  value: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export interface ExcelImportResult {
  totalRows: number;
  validRows: number;
  errorRows: number;
  issues: ExcelValidationIssue[];
  validRecords: ExcelImportRow[];
}
