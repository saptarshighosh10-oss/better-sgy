export type AssignmentStatus =
  | 'normal'
  | 'missing'
  | 'late'
  | 'excused'
  | 'submitted'
  | 'incomplete'

export type Assignment = {
  id: string
  name: string
  courseId: string
  categoryId: string
  categoryName: string
  score: number | null
  pointsPossible: number
  percent: number | null
  status: AssignmentStatus
  gradedDate: string
  dueDate: string
}

export type Category = {
  id: string
  courseId: string
  name: string
  weight: number
  assignments: Assignment[]
}

export type Course = {
  id: string
  name: string
  teacher: string
  period: number
  grade: number
  letterGrade: string
  color: string
  categories: Category[]
  trendData: number[]
}

export type Semester = {
  id: string
  label: string
  courses: Course[]
  startDate: string
  endDate: string
}

export type SchoolYear = {
  id: string
  yearLabel: string
  gradeLevel: string
  gradYear: number
  hasData: boolean
  isPartial: boolean
  semesters: Semester[]
}

export type MockEmail = {
  id: string
  sender: string
  senderEmail: string
  senderType: 'teacher' | 'friend' | 'spam'
  subject: string
  snippet: string
  date: string
  unread: boolean
  priority: 'High' | 'Med' | 'Low'
  detectedClass: string | null
  gmailLink: string
}

export type RecentUpdate = {
  id: string
  type: 'grade_updated' | 'assignment_added' | 'missing_flagged' | 'late_flagged' | 'score_dropped'
  courseId: string
  courseName: string
  description: string
  date: string
}

export type RefreshState = 'fresh' | 'stale' | 'failed'

export type AnalyticsSummary = {
  missingCount: number
  lateCount: number
  averageGrade: number
  bestYear: string
  bestYearNote: string
  hardestYear: string
  hardestYearNote: string
  easiestYear: string
  mostImproved: string
  bestClass: string
  hardestClass: string
  mostAssignmentHeavy: string
  firstGradeDate: string
  lastGradeDate: string
}
