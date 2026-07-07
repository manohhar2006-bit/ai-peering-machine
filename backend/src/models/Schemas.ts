import mongoose, { Schema, Document } from 'mongoose';

// User Schema
export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'student' | 'teacher';
  createdAt: Date;
  rollNumber?: string;
  branch?: string;
  section?: string;

  // Student specific fields
  assignedTeacher?: mongoose.Types.ObjectId | null;
  batch?: string;
  department?: string;
  performanceLevel?: 'excellent' | 'good' | 'average' | 'slow';
  isSlowLearner?: boolean;
  weakTopics?: string[];

  // Teacher specific fields
  assignedStudents?: mongoose.Types.ObjectId[];
  sections?: string[];
  subjects?: string[];
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher'], required: true },
  createdAt: { type: Date, default: Date.now },
  rollNumber: { type: String, unique: true, sparse: true },
  branch: { type: String, default: '' },
  section: { type: String, default: '' },

  // Student specific fields
  assignedTeacher: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  batch: { type: String, default: '' },
  department: { type: String, default: '' },
  performanceLevel: { type: String, enum: ['excellent', 'good', 'average', 'slow'], default: 'average' },
  isSlowLearner: { type: Boolean, default: false },
  weakTopics: { type: [String], default: [] },

  // Teacher specific fields
  assignedStudents: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  sections: { type: [String], default: [] },
  subjects: { type: [String], default: [] }
});

export const User = mongoose.model<IUser>('User', UserSchema);

// Student Profile Schema
export interface IStudentProfile extends Document {
  userId: mongoose.Types.ObjectId;
  xp: number;
  level: number;
  streak: number;
  lastActive: Date;
  badges: Array<{ badgeId: string; earnedAt: Date }>;
  subjectReputation: Map<string, number>; // subjectId -> points
  resolvedDoubtsCount: number;
  participationCount: number;
}

const StudentProfileSchema = new Schema<IStudentProfile>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  streak: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
  badges: [{
    badgeId: { type: String, required: true },
    earnedAt: { type: Date, default: Date.now }
  }],
  subjectReputation: { type: Map, of: Number, default: new Map() },
  resolvedDoubtsCount: { type: Number, default: 0 },
  participationCount: { type: Number, default: 0 }
});

export const StudentProfile = mongoose.model<IStudentProfile>('StudentProfile', StudentProfileSchema);

// Teacher Profile Schema
export interface ITeacherProfile extends Document {
  userId: mongoose.Types.ObjectId;
  department: string;
  activeModerationCount: number;
}

const TeacherProfileSchema = new Schema<ITeacherProfile>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  department: { type: String, required: true },
  activeModerationCount: { type: Number, default: 0 }
});

export const TeacherProfile = mongoose.model<ITeacherProfile>('TeacherProfile', TeacherProfileSchema);

// Subject Schema
export interface ISubject extends Document {
  name: string;
  code: string;
  description: string;
}

const SubjectSchema = new Schema<ISubject>({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  description: { type: String, required: true }
});

export const Subject = mongoose.model<ISubject>('Subject', SubjectSchema);

// Doubt Schema
export interface IDoubt extends Document {
  title: string;
  description: string;
  fileUrl?: string;
  askerId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  status: 'open' | 'peer_solved' | 'ai_hinted' | 'escalated' | 'teacher_solved';
  resolvedAt?: Date | null;
  escalatedAt?: Date | null;
  timeToResolve?: number | null;
  resolvedBy?: 'peer' | 'ai' | 'teacher' | null;
  hintsUsed?: number;
  peerResponderIds: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const DoubtSchema = new Schema<IDoubt>({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  fileUrl: { type: String },
  askerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject', required: true },
  topic: { type: String, default: 'General' },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  status: {
    type: String,
    enum: ['open', 'peer_solved', 'ai_hinted', 'escalated', 'teacher_solved'],
    default: 'open'
  },
  resolvedAt: { type: Date, default: null },
  escalatedAt: { type: Date, default: null },
  timeToResolve: { type: Number, default: null },
  resolvedBy: { type: String, enum: ['peer', 'ai', 'teacher', null], default: null },
  hintsUsed: { type: Number, default: 0 },
  peerResponderIds: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const Doubt = mongoose.model<IDoubt>('Doubt', DoubtSchema);

// Answer Schema
export interface IAnswer extends Document {
  doubtId: mongoose.Types.ObjectId;
  solverId: mongoose.Types.ObjectId;
  content: string;
  aiEvaluation?: {
    correctness: number; // 0-100
    clarity: number; // 0-100
    completeness: number; // 0-100
    usefulness: number; // 0-100
    score: number; // overall 0-100
    feedback: string;
  };
  pointsAwarded: number;
  isAccepted: boolean;
  isTeacherVerified: boolean;
  hintsUsedCount: number;
  createdAt: Date;
}

const AnswerSchema = new Schema<IAnswer>({
  doubtId: { type: Schema.Types.ObjectId, ref: 'Doubt', required: true },
  solverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  content: { type: String, required: true },
  aiEvaluation: {
    correctness: { type: Number },
    clarity: { type: Number },
    completeness: { type: Number },
    usefulness: { type: Number },
    score: { type: Number },
    feedback: { type: String }
  },
  pointsAwarded: { type: Number, default: 0 },
  isAccepted: { type: Boolean, default: false },
  isTeacherVerified: { type: Boolean, default: false },
  hintsUsedCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const Answer = mongoose.model<IAnswer>('Answer', AnswerSchema);

// Hint Schema
export interface IHint extends Document {
  doubtId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId; // student who is viewing/requesting the hint
  hintLadderIndex: number; // 0 for first hint, 1 for second, etc.
  hintContent: string;
  revealedAt: Date;
}

const HintSchema = new Schema<IHint>({
  doubtId: { type: Schema.Types.ObjectId, ref: 'Doubt', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  hintLadderIndex: { type: Number, required: true },
  hintContent: { type: String, required: true },
  revealedAt: { type: Date, default: Date.now }
});

export const Hint = mongoose.model<IHint>('Hint', HintSchema);

// Point Transaction Schema
export interface IPointTransaction extends Document {
  userId: mongoose.Types.ObjectId;
  points: number;
  type: 'ask' | 'solve' | 'bonus_accepted' | 'bonus_first_correct' | 'streak';
  reason: string;
  createdAt: Date;
}

const PointTransactionSchema = new Schema<IPointTransaction>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  points: { type: Number, required: true },
  type: { type: String, enum: ['ask', 'solve', 'bonus_accepted', 'bonus_first_correct', 'streak'], required: true },
  reason: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const PointTransaction = mongoose.model<IPointTransaction>('PointTransaction', PointTransactionSchema);

// Badge Schema
export interface IBadge extends Document {
  badgeId: string;
  name: string;
  description: string;
  icon: string;
  criteria: string;
}

const BadgeSchema = new Schema<IBadge>({
  badgeId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  icon: { type: String, required: true },
  criteria: { type: String, required: true }
});

export const Badge = mongoose.model<IBadge>('Badge', BadgeSchema);

// Escalation Schema
export interface IEscalation extends Document {
  doubtId: mongoose.Types.ObjectId;
  reason: 'timeout' | 'low-confidence' | 'contradictory';
  status: 'pending' | 'resolved';
  priority?: 'low' | 'medium' | 'high';
  escalatedAt: Date;
  resolvedAt?: Date;
}

const EscalationSchema = new Schema<IEscalation>({
  doubtId: { type: Schema.Types.ObjectId, ref: 'Doubt', required: true },
  reason: { type: String, enum: ['timeout', 'low-confidence', 'contradictory'], required: true },
  status: { type: String, enum: ['pending', 'resolved'], default: 'pending' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  escalatedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date }
});

export const Escalation = mongoose.model<IEscalation>('Escalation', EscalationSchema);

// AI Analysis Schema
export interface IAIAnalysis extends Document {
  doubtId: mongoose.Types.ObjectId;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isPeerAnswerable: boolean;
  explanation: string;
  createdAt: Date;
}

const AIAnalysisSchema = new Schema<IAIAnalysis>({
  doubtId: { type: Schema.Types.ObjectId, ref: 'Doubt', required: true },
  topic: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  isPeerAnswerable: { type: Boolean, required: true },
  explanation: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

export const AIAnalysis = mongoose.model<IAIAnalysis>('AIAnalysis', AIAnalysisSchema);

// Faculty Workload Metrics Schema
export interface IFacultyWorkloadMetrics extends Document {
  date: Date;
  totalDoubts: number;
  doubtsSolvedByPeers: number;
  doubtsEscalated: number;
  timeSavedMinutes: number;
}

const FacultyWorkloadMetricsSchema = new Schema<IFacultyWorkloadMetrics>({
  date: { type: Date, required: true, unique: true },
  totalDoubts: { type: Number, default: 0 },
  doubtsSolvedByPeers: { type: Number, default: 0 },
  doubtsEscalated: { type: Number, default: 0 },
  timeSavedMinutes: { type: Number, default: 0 }
});

export const FacultyWorkloadMetrics = mongoose.model<IFacultyWorkloadMetrics>('FacultyWorkloadMetrics', FacultyWorkloadMetricsSchema);

// HintHistory Schema
export interface IHintHistory extends Document {
  doubtId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  ladderIndex: number;
  queryText?: string;
  hintContent: string;
  revealedAt: Date;
}

const HintHistorySchema = new Schema<IHintHistory>({
  doubtId: { type: Schema.Types.ObjectId, ref: 'Doubt', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  ladderIndex: { type: Number, required: true },
  queryText: { type: String, default: '' },
  hintContent: { type: String, required: true },
  revealedAt: { type: Date, default: Date.now }
});

export const HintHistory = mongoose.model<IHintHistory>('HintHistory', HintHistorySchema);

// AnswerEvaluation Schema — upgraded with 5 dimensions + qualitative feedback
export interface IAnswerEvaluation extends Document {
  answerId: mongoose.Types.ObjectId;
  doubtId: mongoose.Types.ObjectId;
  // 5 dimension scores (0-100)
  correctness: number;
  clarity: number;
  completeness: number;
  logicalThinking: number;
  presentation: number;
  // Aggregated
  overallScore: number;
  usefulness: number;   // legacy alias for overallScore
  score: number;        // legacy alias
  // Verdict
  verdict?: 'correct' | 'partially_correct' | 'incorrect';
  // Qualitative feedback
  feedback: string;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  missingConcepts: string[];
  xpAwarded: number;
  createdAt: Date;
}

const AnswerEvaluationSchema = new Schema<IAnswerEvaluation>({
  answerId: { type: Schema.Types.ObjectId, ref: 'Answer' },
  doubtId: { type: Schema.Types.ObjectId, ref: 'Doubt', required: true },
  correctness: { type: Number, default: 0 },
  clarity: { type: Number, default: 0 },
  completeness: { type: Number, default: 0 },
  logicalThinking: { type: Number, default: 0 },
  presentation: { type: Number, default: 0 },
  overallScore: { type: Number, default: 0 },
  usefulness: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  verdict: { type: String, enum: ['correct', 'partially_correct', 'incorrect'] },
  feedback: { type: String, default: '' },
  strengths: { type: [String], default: [] },
  weaknesses: { type: [String], default: [] },
  suggestions: { type: [String], default: [] },
  missingConcepts: { type: [String], default: [] },
  xpAwarded: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const AnswerEvaluation = mongoose.model<IAnswerEvaluation>('AnswerEvaluation', AnswerEvaluationSchema);

// EscalationRecord Schema
export interface IEscalationRecord extends Document {
  doubtId: mongoose.Types.ObjectId;
  reason: 'timeout' | 'low-confidence' | 'contradictory';
  status: 'pending' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  escalatedAt: Date;
  resolvedAt?: Date;
}

const EscalationRecordSchema = new Schema<IEscalationRecord>({
  doubtId: { type: Schema.Types.ObjectId, ref: 'Doubt', required: true },
  reason: { type: String, enum: ['timeout', 'low-confidence', 'contradictory'], required: true },
  status: { type: String, enum: ['pending', 'resolved'], default: 'pending' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  escalatedAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date }
});

export const EscalationRecord = mongoose.model<IEscalationRecord>('EscalationRecord', EscalationRecordSchema);

// Faculty Analytics Schema
export interface IFacultyAnalytics extends Document {
  weekNumber: number;
  year: number;
  totalDoubts: number;
  peerSolved: number;
  aiHinted: number;
  escalated: number;
  teacherSolved: number;
  workloadReductionPercent: number;
  minutesSaved: number;
  createdAt: Date;
}

const FacultyAnalyticsSchema = new Schema<IFacultyAnalytics>({
  weekNumber: { type: Number, required: true },
  year: { type: Number, required: true },
  totalDoubts: { type: Number, default: 0 },
  peerSolved: { type: Number, default: 0 },
  aiHinted: { type: Number, default: 0 },
  escalated: { type: Number, default: 0 },
  teacherSolved: { type: Number, default: 0 },
  workloadReductionPercent: { type: Number, default: 0 },
  minutesSaved: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const FacultyAnalytics = mongoose.model<IFacultyAnalytics>('FacultyAnalytics', FacultyAnalyticsSchema);

// Focus Room Schema
export interface IFocusRoom extends Document {
  name: string;
  teacher: mongoose.Types.ObjectId;
  students: mongoose.Types.ObjectId[];
  subject: string;
  topic: string;
  description: string;
  isActive: boolean;
  roomType: 'slow_learner' | 'advanced' | 'general';
  questions: Array<{
    questionText: string;
    subject: string;
    difficulty: string;
    addedBy: 'teacher' | 'ai';
    topic?: string;
    hint?: string;
    expectedAnswer?: string;
    createdAt: Date;
  }>;
  createdAt: Date;

  // Compatibility fields
  subjectId: mongoose.Types.ObjectId;
  learningObjectives: string[];
  creatorId: mongoose.Types.ObjectId;
  deadline: Date;
  visibility: 'public' | 'private';
  updatedAt?: Date;
}

const FocusRoomSchema = new Schema<IFocusRoom>({
  name: { type: String, required: true },
  teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  students: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  subject: { type: String, required: true },
  topic: { type: String, default: '' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  roomType: { type: String, enum: ['slow_learner', 'advanced', 'general'], default: 'slow_learner' },
  questions: [{
    questionText: { type: String, required: true },
    subject: { type: String, required: true },
    difficulty: { type: String, required: true },
    addedBy: { type: String, enum: ['teacher', 'ai'], required: true },
    topic: { type: String },
    hint: { type: String },
    expectedAnswer: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now },

  // Compatibility fields
  subjectId: { type: Schema.Types.ObjectId, ref: 'Subject' },
  learningObjectives: [{ type: String }],
  creatorId: { type: Schema.Types.ObjectId, ref: 'User' },
  deadline: { type: Date },
  visibility: { type: String, enum: ['public', 'private'], default: 'public' }
}, { timestamps: true });

export const FocusRoom = mongoose.model<IFocusRoom>('FocusRoom', FocusRoomSchema);

// Focus Room Member Schema
export interface IFocusRoomMember extends Document {
  roomId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  joinedAt: Date;
  progress: number; // 0-100% completion of activities
  xpEarned: number; // XP earned inside this focus room
  addedBy?: mongoose.Types.ObjectId;
  status: string; // 'active' | 'invited' | 'inactive'
}

const FocusRoomMemberSchema = new Schema<IFocusRoomMember>({
  roomId: { type: Schema.Types.ObjectId, ref: 'FocusRoom', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  joinedAt: { type: Date, default: Date.now },
  progress: { type: Number, default: 0 },
  xpEarned: { type: Number, default: 0 },
  addedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, default: 'active' }
});

// Compound index to ensure uniqueness of membership
FocusRoomMemberSchema.index({ roomId: 1, userId: 1 }, { unique: true });

export const FocusRoomMember = mongoose.model<IFocusRoomMember>('FocusRoomMember', FocusRoomMemberSchema);

// Focus Room Resource Schema
export interface IFocusRoomResource extends Document {
  roomId: mongoose.Types.ObjectId;
  uploaderId: mongoose.Types.ObjectId;
  uploaderRole: 'student' | 'teacher';
  title: string;
  description: string;
  fileType: string;
  fileUrl?: string;
  completedStudents: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const FocusRoomResourceSchema = new Schema<IFocusRoomResource>({
  roomId: { type: Schema.Types.ObjectId, ref: 'FocusRoom', required: true },
  uploaderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  uploaderRole: { type: String, enum: ['student', 'teacher'], required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  fileType: { type: String, required: true }, // e.g. PDF, PPT, DOC, DOCX, Notes, Doubts, Video etc
  fileUrl: { type: String },
  completedStudents: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

export const FocusRoomResource = mongoose.model<IFocusRoomResource>('FocusRoomResource', FocusRoomResourceSchema);

// Focus Room Discussion Schema (Comments/Doubts in Resource threads)
export interface IFocusRoomDiscussion extends Document {
  roomId: mongoose.Types.ObjectId;
  resourceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userRole: 'student' | 'teacher';
  content: string;
  parentId?: mongoose.Types.ObjectId; // For nested replies
  upvotes: mongoose.Types.ObjectId[];
  isDoubt: boolean;
  status: 'open' | 'peer_solved' | 'ai_hinted' | 'escalated' | 'teacher_solved';
  resolvedAt?: Date | null;
  resolvedBy?: mongoose.Types.ObjectId | null;
  hintsUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

const FocusRoomDiscussionSchema = new Schema<IFocusRoomDiscussion>({
  roomId: { type: Schema.Types.ObjectId, ref: 'FocusRoom', required: true },
  resourceId: { type: Schema.Types.ObjectId, ref: 'FocusRoomResource', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userRole: { type: String, enum: ['student', 'teacher'], required: true },
  content: { type: String, required: true },
  parentId: { type: Schema.Types.ObjectId, ref: 'FocusRoomDiscussion' },
  upvotes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  isDoubt: { type: Boolean, default: false },
  status: { 
    type: String, 
    enum: ['open', 'peer_solved', 'ai_hinted', 'escalated', 'teacher_solved'], 
    default: 'open' 
  },
  resolvedAt: { type: Date, default: null },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  hintsUsed: { type: Number, default: 0 }
}, { timestamps: true });

export const FocusRoomDiscussion = mongoose.model<IFocusRoomDiscussion>('FocusRoomDiscussion', FocusRoomDiscussionSchema);

// Focus Room Analytics Schema
export interface IFocusRoomAnalytics extends Document {
  roomId: mongoose.Types.ObjectId;
  completionRate: number;
  averageScore: number;
  hintsUsed: number;
  questionsSolved: number;
  questionsPending: number;
  teacherInterventions: number;
  peerLearningSuccessRate: number;
  createdAt: Date;
  updatedAt: Date;
}

const FocusRoomAnalyticsSchema = new Schema<IFocusRoomAnalytics>({
  roomId: { type: Schema.Types.ObjectId, ref: 'FocusRoom', required: true, unique: true },
  completionRate: { type: Number, default: 0 },
  averageScore: { type: Number, default: 0 },
  hintsUsed: { type: Number, default: 0 },
  questionsSolved: { type: Number, default: 0 },
  questionsPending: { type: Number, default: 0 },
  teacherInterventions: { type: Number, default: 0 },
  peerLearningSuccessRate: { type: Number, default: 0 }
}, { timestamps: true });

export const FocusRoomAnalytics = mongoose.model<IFocusRoomAnalytics>('FocusRoomAnalytics', FocusRoomAnalyticsSchema);

// Notification Schema
export interface INotification extends Document {
  recipientId: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'badge' | 'escalation';
  roomId?: mongoose.Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  recipientId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['info', 'success', 'warning', 'badge', 'escalation'], default: 'info' },
  roomId: { type: Schema.Types.ObjectId, ref: 'FocusRoom' },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);

// Student Progress Schema
export interface IStudentProgress extends Document {
  student: mongoose.Types.ObjectId;
  teacher: mongoose.Types.ObjectId;
  weekNumber: number;
  year: number;
  doubtsPosted: number;
  doubtsResolved: number;
  answersGiven: number;
  correctAnswers: number;
  hintsUsed: number;
  xpEarned: number;
  streakDays: number;
  weakTopics: string[];
  strongTopics: string[];
  performanceScore: number;
  improvementPercent: number;
  aiGeneratedReport: string;
  createdAt: Date;
}

const StudentProgressSchema = new Schema<IStudentProgress>({
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  teacher: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  weekNumber: { type: Number, required: true },
  year: { type: Number, required: true },
  doubtsPosted: { type: Number, default: 0 },
  doubtsResolved: { type: Number, default: 0 },
  answersGiven: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  hintsUsed: { type: Number, default: 0 },
  xpEarned: { type: Number, default: 0 },
  streakDays: { type: Number, default: 0 },
  weakTopics: [{ type: String }],
  strongTopics: [{ type: String }],
  performanceScore: { type: Number, default: 0 },
  improvementPercent: { type: Number, default: 0 },
  aiGeneratedReport: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

export const StudentProgress = mongoose.model<IStudentProgress>('StudentProgress', StudentProgressSchema);

// ─── RefereeEvaluation Schema ────────────────────────────────────────────────
// Stores each AI Referee run for a doubt including per-answer rubric scores
// and optional teacher approval / override
export interface IPerAnswerScore {
  index: number;
  answerId?: mongoose.Types.ObjectId;
  solverName?: string;
  correctness: number;     // 0-100
  clarity: number;         // 0-100
  completeness: number;    // 0-100
  originality: number;     // 0-100
  overallScore: number;    // weighted composite
  strengths: string;
  weaknesses: string;
}

export interface IRefereeEvaluation extends Document {
  doubtId: mongoose.Types.ObjectId;
  triggeredBy: mongoose.Types.ObjectId;       // user who ran the referee
  perAnswerScores: IPerAnswerScore[];
  bestAnswerIndex: number;                    // index into perAnswerScores
  bestAnswerId?: mongoose.Types.ObjectId;     // actual Answer document id
  ranking: number[];
  winner: string;
  comparison: string;
  missingInAll: string[];
  confidenceScore: number;                    // AI confidence 0-100
  // Teacher decision
  teacherApproved: boolean;
  teacherOverriddenBestIndex?: number;        // if teacher chose a different best
  teacherOverriddenBestAnswerId?: mongoose.Types.ObjectId;
  teacherNote?: string;
  overriddenBy?: mongoose.Types.ObjectId;
  overriddenAt?: Date;
  createdAt: Date;
}

const PerAnswerScoreSchema = new Schema<IPerAnswerScore>({
  index: { type: Number, required: true },
  answerId: { type: Schema.Types.ObjectId, ref: 'Answer' },
  solverName: { type: String },
  correctness: { type: Number, default: 0 },
  clarity: { type: Number, default: 0 },
  completeness: { type: Number, default: 0 },
  originality: { type: Number, default: 0 },
  overallScore: { type: Number, default: 0 },
  strengths: { type: String, default: '' },
  weaknesses: { type: String, default: '' }
}, { _id: false });

const RefereeEvaluationSchema = new Schema<IRefereeEvaluation>({
  doubtId: { type: Schema.Types.ObjectId, ref: 'Doubt', required: true },
  triggeredBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  perAnswerScores: { type: [PerAnswerScoreSchema], default: [] },
  bestAnswerIndex: { type: Number, default: 0 },
  bestAnswerId: { type: Schema.Types.ObjectId, ref: 'Answer' },
  ranking: { type: [Number], default: [] },
  winner: { type: String, default: '' },
  comparison: { type: String, default: '' },
  missingInAll: { type: [String], default: [] },
  confidenceScore: { type: Number, default: 0 },
  // Teacher decision
  teacherApproved: { type: Boolean, default: false },
  teacherOverriddenBestIndex: { type: Number },
  teacherOverriddenBestAnswerId: { type: Schema.Types.ObjectId, ref: 'Answer' },
  teacherNote: { type: String },
  overriddenBy: { type: Schema.Types.ObjectId, ref: 'User' },
  overriddenAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

export const RefereeEvaluation = mongoose.model<IRefereeEvaluation>('RefereeEvaluation', RefereeEvaluationSchema);
