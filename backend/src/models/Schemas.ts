import mongoose, { Schema, Document } from 'mongoose';

// User Schema
export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'student' | 'teacher';
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher'], required: true },
  createdAt: { type: Date, default: Date.now }
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
  status: 'open' | 'in-progress' | 'resolved' | 'escalated';
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
  status: { type: String, enum: ['open', 'in-progress', 'resolved', 'escalated'], default: 'open' },
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
  hintContent: string;
  revealedAt: Date;
}

const HintHistorySchema = new Schema<IHintHistory>({
  doubtId: { type: Schema.Types.ObjectId, ref: 'Doubt', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  ladderIndex: { type: Number, required: true },
  hintContent: { type: String, required: true },
  revealedAt: { type: Date, default: Date.now }
});

export const HintHistory = mongoose.model<IHintHistory>('HintHistory', HintHistorySchema);

// AnswerEvaluation Schema
export interface IAnswerEvaluation extends Document {
  answerId: mongoose.Types.ObjectId;
  doubtId: mongoose.Types.ObjectId;
  correctness: number;
  clarity: number;
  completeness: number;
  usefulness: number;
  score: number;
  feedback: string;
  createdAt: Date;
}

const AnswerEvaluationSchema = new Schema<IAnswerEvaluation>({
  answerId: { type: Schema.Types.ObjectId, ref: 'Answer' },
  doubtId: { type: Schema.Types.ObjectId, ref: 'Doubt', required: true },
  correctness: { type: Number, required: true },
  clarity: { type: Number, required: true },
  completeness: { type: Number, required: true },
  usefulness: { type: Number, required: true },
  score: { type: Number, required: true },
  feedback: { type: String, required: true },
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

