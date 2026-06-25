import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User, StudentProfile, TeacherProfile, Subject, Doubt, Answer, Badge, Escalation, AIAnalysis, FacultyAnalytics } from './models/Schemas';

dotenv.config();

const subjectsData = [
  { name: 'Mathematics', code: 'MATH101', description: 'Calculus, Algebra, and Discrete Math' },
  { name: 'Computer Science', code: 'CS101', description: 'Data Structures, Databases, and Programming' },
  { name: 'Physics', code: 'PHYS101', description: 'Classical Mechanics, Electromagnetism, and Optics' },
  { name: 'Chemistry', code: 'CHEM101', description: 'Organic, Inorganic, and Physical Chemistry' },
  { name: 'Biology', code: 'BIOL101', description: 'Cell Biology, Genetics, and Physiology' }
];

const badgesData = [
  { badgeId: 'first_solve', name: 'First Solver', description: 'Resolved your first peer doubt!', icon: 'shield-check', criteria: 'Solve 1 peer doubt' },
  { badgeId: 'expert_solver', name: 'Expert Solver', description: 'Resolved 5 or more peer doubts!', icon: 'sparkles', criteria: 'Solve 5 peer doubts' },
  { badgeId: 'streak_master', name: 'Streak Master', description: 'Maintained a 5-day activity streak!', icon: 'fire', criteria: '5-day active streak' },
  { badgeId: 'level_5', name: 'Level 5 Achiever', description: 'Reached level 5!', icon: 'academic-cap', criteria: 'Reach level 5' },
  { badgeId: 'teacher_verified', name: 'Teacher Verified Solver', description: 'Had an answer verified by faculty!', icon: 'badge-check', criteria: 'Answer verified by a teacher' }
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sss-db');
    console.log('Connected to MongoDB. Starting database seeding...');

    // Clean up current database
    await Promise.all([
      User.deleteMany({}),
      StudentProfile.deleteMany({}),
      TeacherProfile.deleteMany({}),
      Subject.deleteMany({}),
      Doubt.deleteMany({}),
      Answer.deleteMany({}),
      Badge.deleteMany({}),
      Escalation.deleteMany({}),
      AIAnalysis.deleteMany({}),
      FacultyAnalytics.deleteMany({})
    ]);
    console.log('Cleared existing database records.');

    // 1. Insert Subjects and Badges
    const subjects = await Subject.insertMany(subjectsData);
    await Badge.insertMany(badgesData);
    console.log('Seeded subjects and badges.');

    // 2. Insert Users (Password: password123)
    const passwordHash = await bcrypt.hash('password123', 10);

    // Create Teacher
    const teacherUser = new User({
      name: 'Dr. Sarah Carter',
      email: 'teacher@school.edu',
      passwordHash,
      role: 'teacher'
    });
    await teacherUser.save();

    const teacherProfile = new TeacherProfile({
      userId: teacherUser._id,
      department: 'Science & Engineering'
    });
    await teacherProfile.save();

    // Create Students
    const student1 = new User({ name: 'Alex Johnson', email: 'alex@school.edu', passwordHash, role: 'student' });
    const student2 = new User({ name: 'Jane Smith', email: 'jane@school.edu', passwordHash, role: 'student' });
    const student3 = new User({ name: 'Sam Wilson', email: 'sam@school.edu', passwordHash, role: 'student' });
    
    await Promise.all([student1.save(), student2.save(), student3.save()]);

    // Create Student Profiles
    const mathSub = subjects.find(s => s.code === 'MATH101')!;
    const csSub = subjects.find(s => s.code === 'CS101')!;
    const physSub = subjects.find(s => s.code === 'PHYS101')!;

    const profile1 = new StudentProfile({
      userId: student1._id,
      xp: 1250,
      level: 3,
      streak: 4,
      resolvedDoubtsCount: 8,
      participationCount: 5,
      subjectReputation: new Map([
        [mathSub._id.toString(), 300],
        [csSub._id.toString(), 150]
      ]),
      badges: [{ badgeId: 'first_solve', earnedAt: new Date() }]
    });

    const profile2 = new StudentProfile({
      userId: student2._id,
      xp: 800,
      level: 2,
      streak: 3,
      resolvedDoubtsCount: 4,
      participationCount: 2,
      subjectReputation: new Map([
        [csSub._id.toString(), 200],
        [physSub._id.toString(), 100]
      ]),
      badges: [{ badgeId: 'first_solve', earnedAt: new Date() }]
    });

    const profile3 = new StudentProfile({
      userId: student3._id,
      xp: 150,
      level: 1,
      streak: 1,
      resolvedDoubtsCount: 0,
      participationCount: 1,
      subjectReputation: new Map()
    });

    await Promise.all([profile1.save(), profile2.save(), profile3.save()]);
    console.log('Seeded teachers, students, and user profiles.');

    // 3. Seed Doubts & Answers
    // Doubt 1: Calculus Limit Doubt by Student 3, Solved by Student 1
    const doubt1 = new Doubt({
      title: 'Finding the limit of sin(x)/x as x approaches 0',
      description: 'Can someone explain the conceptual proof of why the limit of sin(x)/x equals 1 as x approaches 0? I know the formula but don\'t understand the geometric intuition.',
      askerId: student3._id,
      subjectId: mathSub._id,
      topic: 'Calculus',
      difficulty: 'medium',
      status: 'peer_solved',
      resolvedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      resolvedBy: 'peer',
      timeToResolve: 45,
      peerResponderIds: [student1._id, student2._id]
    });
    await doubt1.save();

    const analysis1 = new AIAnalysis({
      doubtId: doubt1._id,
      topic: 'Calculus Limits',
      difficulty: 'medium',
      isPeerAnswerable: true,
      explanation: 'Asker is looking for a geometric proof of the fundamental trigonometric limit.'
    });
    await analysis1.save();

    const answer1 = new Answer({
      doubtId: doubt1._id,
      solverId: student1._id,
      content: 'This can be proved geometrically using the Squeeze Theorem and a unit circle. If you draw a sector of a circle with angle x, you can bound the area of the inner triangle (1/2 * sin x), the sector itself (1/2 * x), and the outer triangle (1/2 * tan x). This gives: sin x < x < tan x. Dividing by sin x gives: 1 < x/sin x < 1/cos x. Inverting this gives: cos x < sin x/x < 1. As x -> 0, cos x -> 1. By the Squeeze Theorem, sin x/x must also approach 1.',
      aiEvaluation: {
        correctness: 98,
        clarity: 95,
        completeness: 95,
        usefulness: 100,
        score: 97,
        feedback: 'Superb and mathematically rigorous explanation using the Squeeze Theorem and geometric bounding.'
      },
      pointsAwarded: 150,
      isAccepted: true
    });
    await answer1.save();

    // Doubt 2: SQL Join Doubt by Student 1, Solved by Student 2
    const doubt2 = new Doubt({
      title: 'Difference between LEFT JOIN and RIGHT JOIN in SQL',
      description: 'I am building a database schema and I get confused between LEFT JOIN and RIGHT JOIN. When would I choose RIGHT JOIN over LEFT JOIN? Aren\'t they functionally the same just inverted?',
      askerId: student1._id,
      subjectId: csSub._id,
      topic: 'Databases',
      difficulty: 'easy',
      status: 'peer_solved',
      resolvedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      resolvedBy: 'peer',
      timeToResolve: 30,
      peerResponderIds: [student2._id]
    });
    await doubt2.save();

    const analysis2 = new AIAnalysis({
      doubtId: doubt2._id,
      topic: 'Database Joins',
      difficulty: 'easy',
      isPeerAnswerable: true,
      explanation: 'Queries around SQL relational joins, specifically left vs right outer joins.'
    });
    await analysis2.save();

    const answer2 = new Answer({
      doubtId: doubt2._id,
      solverId: student2._id,
      content: 'Yes, they are functionally identical but inverted. A LEFT JOIN returns all records from the left table, and the matched records from the right table. A RIGHT JOIN does the exact opposite: all records from the right table, and matched records from the left. Usually, developers prefer LEFT JOIN because we read left-to-right, making the query easier to read. `SELECT * FROM A LEFT JOIN B` is the exact same as `SELECT * FROM B RIGHT JOIN A`.',
      aiEvaluation: {
        correctness: 95,
        clarity: 90,
        completeness: 85,
        usefulness: 90,
        score: 90,
        feedback: 'Correct and logical. Clearly points out that LEFT JOIN is preferred for readability.'
      },
      pointsAwarded: 100,
      isAccepted: true
    });
    await answer2.save();

    // Doubt 3: Physics Doubt (Open)
    const doubt3 = new Doubt({
      title: 'Why is static friction higher than kinetic friction?',
      description: 'I understand that friction opposes motion, but why is the coefficient of static friction always higher than the coefficient of kinetic friction? What happens at the microscopic level?',
      askerId: student2._id,
      subjectId: physSub._id,
      topic: 'Classical Mechanics',
      difficulty: 'medium',
      status: 'open',
      peerResponderIds: [student1._id]
    });
    await doubt3.save();

    const analysis3 = new AIAnalysis({
      doubtId: doubt3._id,
      topic: 'Friction Dynamics',
      difficulty: 'medium',
      isPeerAnswerable: true,
      explanation: 'Microscopic inquiry on static vs kinetic friction coefficients.'
    });
    await analysis3.save();

    // Doubt 4: High-difficulty Escalated Doubt
    const doubt4 = new Doubt({
      title: 'Deriving the Schrödinger equation from classical wave equations',
      description: 'Can we formally derive the time-dependent Schrödinger equation starting purely from classical wave equations and de Broglie relation? I tried but got stuck on why the imaginary unit i is necessary.',
      askerId: student1._id,
      subjectId: physSub._id,
      topic: 'Quantum Mechanics',
      difficulty: 'hard',
      status: 'escalated',
      escalatedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
      peerResponderIds: []
    });
    await doubt4.save();

    const analysis4 = new AIAnalysis({
      doubtId: doubt4._id,
      topic: 'Quantum Mechanics',
      difficulty: 'hard',
      isPeerAnswerable: false,
      explanation: 'Highly complex quantum derivation. Requires teacher level expertise.'
    });
    await analysis4.save();

    const escalation = new Escalation({
      doubtId: doubt4._id,
      reason: 'low-confidence',
      status: 'pending',
      priority: 'high'
    });
    await escalation.save();

    // 4. Seed FacultyAnalytics weekly metrics for historical charts
    const analyticsData = [
      { weekNumber: 1, year: 2026, totalDoubts: 15, peerSolved: 5, aiHinted: 2, escalated: 8, teacherSolved: 7, workloadReductionPercent: 46.7, minutesSaved: 35 },
      { weekNumber: 2, year: 2026, totalDoubts: 18, peerSolved: 8, aiHinted: 4, escalated: 6, teacherSolved: 5, workloadReductionPercent: 66.7, minutesSaved: 60 },
      { weekNumber: 3, year: 2026, totalDoubts: 25, peerSolved: 12, aiHinted: 7, escalated: 6, teacherSolved: 5, workloadReductionPercent: 76.0, minutesSaved: 95 },
      { weekNumber: 4, year: 2026, totalDoubts: 28, peerSolved: 15, aiHinted: 9, escalated: 4, teacherSolved: 3, workloadReductionPercent: 85.7, minutesSaved: 120 },
      { weekNumber: 5, year: 2026, totalDoubts: 32, peerSolved: 18, aiHinted: 12, escalated: 2, teacherSolved: 2, workloadReductionPercent: 93.8, minutesSaved: 150 },
      { weekNumber: 6, year: 2026, totalDoubts: 38, peerSolved: 22, aiHinted: 14, escalated: 2, teacherSolved: 2, workloadReductionPercent: 94.7, minutesSaved: 180 }
    ];
    await FacultyAnalytics.insertMany(analyticsData);
    console.log('Seeded FacultyAnalytics weekly trend data.');

    console.log('Seeded doubt threads, AI analyses, answers, and escalations.');
    console.log('Database seeding successfully finished!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
