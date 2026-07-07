import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { 
  User, 
  StudentProfile, 
  TeacherProfile, 
  Subject, 
  Doubt, 
  Answer, 
  Badge, 
  Escalation, 
  AIAnalysis, 
  FacultyAnalytics, 
  FocusRoom, 
  FocusRoomMember, 
  FocusRoomResource, 
  FocusRoomDiscussion, 
  FocusRoomAnalytics 
} from './models/Schemas';

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
      FacultyAnalytics.deleteMany({}),
      FocusRoom.deleteMany({}),
      FocusRoomMember.deleteMany({}),
      FocusRoomResource.deleteMany({}),
      FocusRoomDiscussion.deleteMany({}),
      FocusRoomAnalytics.deleteMany({})
    ]);
    console.log('Cleared existing database records.');

    // 1. Insert Subjects and Badges
    const subjects = await Subject.insertMany(subjectsData);
    await Badge.insertMany(badgesData);
    console.log('Seeded subjects and badges.');

    // 2. Insert Users
    const passwordHashStudent = await bcrypt.hash('student123', 10);
    const passwordHashTeacher = await bcrypt.hash('teacher123', 10);
    const passwordHashManohhar = await bcrypt.hash('manohhar123', 10);

    // Create Teacher Prof. Meena
    const teacherUser = new User({
      name: 'Prof. Meena',
      email: 'teacher@demo.com',
      passwordHash: passwordHashTeacher,
      role: 'teacher',
      sections: ['CSE-A', 'CSE-B'],
      subjects: ['DBMS', 'OS', 'CN'],
      department: 'Computer Science'
    });
    await teacherUser.save();

    const teacherProfile = new TeacherProfile({
      userId: teacherUser._id,
      department: 'Computer Science'
    });
    await teacherProfile.save();

    // Create 8 Students
    const studentsData = [
      { name: "Ravi Kumar", email: "ravi@demo.com", passwordHash: passwordHashStudent, section: "CSE-A", rollNumber: "CS001", performanceLevel: "slow" as const, isSlowLearner: true, weakTopics: ["Pointers", "Recursion"] },
      { name: "Priya Sharma", email: "priya@demo.com", passwordHash: passwordHashStudent, section: "CSE-A", rollNumber: "CS002", performanceLevel: "good" as const, isSlowLearner: false, weakTopics: ["Normalization"] },
      { name: "Arjun Patel", email: "arjun@demo.com", passwordHash: passwordHashStudent, section: "CSE-B", rollNumber: "CS003", performanceLevel: "excellent" as const, isSlowLearner: false, weakTopics: [] },
      { name: "Sneha Reddy", email: "sneha@demo.com", passwordHash: passwordHashStudent, section: "CSE-A", rollNumber: "CS004", performanceLevel: "slow" as const, isSlowLearner: true, weakTopics: ["Deadlock", "Scheduling"] },
      { name: "Karan Singh", email: "karan@demo.com", passwordHash: passwordHashStudent, section: "CSE-B", rollNumber: "CS005", performanceLevel: "average" as const, isSlowLearner: false, weakTopics: ["SQL Joins"] },
      { name: "Ananya Das", email: "ananya@demo.com", passwordHash: passwordHashStudent, section: "CSE-B", rollNumber: "CS006", performanceLevel: "slow" as const, isSlowLearner: true, weakTopics: ["Trees", "Graphs"] },
      { name: "Manohhar", email: "manohhar@demo.com", passwordHash: passwordHashManohhar, section: "CSE-A", rollNumber: "CS007", performanceLevel: "excellent" as const, isSlowLearner: false, weakTopics: [] },
      { name: "Demo Student", email: "student@demo.com", passwordHash: passwordHashStudent, section: "CSE-A", rollNumber: "CS008", performanceLevel: "average" as const, isSlowLearner: false, weakTopics: ["OS Concepts"] }
    ];

    const studentUsers = [];
    for (const s of studentsData) {
      const student = new User({
        name: s.name,
        email: s.email,
        passwordHash: s.passwordHash,
        role: 'student',
        section: s.section,
        rollNumber: s.rollNumber,
        branch: 'Computer Science',
        performanceLevel: s.performanceLevel,
        isSlowLearner: s.isSlowLearner,
        weakTopics: s.weakTopics,
        assignedTeacher: teacherUser._id,
        batch: '2022-2026',
        department: 'Computer Science'
      });
      await student.save();
      studentUsers.push(student);

      // Create profile
      const profile = new StudentProfile({
        userId: student._id,
        xp: s.performanceLevel === 'excellent' ? 1200 : s.performanceLevel === 'good' ? 800 : s.performanceLevel === 'average' ? 400 : 150,
        level: s.performanceLevel === 'excellent' ? 3 : s.performanceLevel === 'good' ? 2 : 1,
        streak: s.isSlowLearner ? 1 : 4,
        resolvedDoubtsCount: s.performanceLevel === 'excellent' ? 10 : 3,
        participationCount: 5
      });
      await profile.save();
    }

    const raviUser = studentUsers[0];
    const priyaUser = studentUsers[1];
    const arjunUser = studentUsers[2];
    const snehaUser = studentUsers[3];
    const karanUser = studentUsers[4];
    const ananyaUser = studentUsers[5];
    const manohharUser = studentUsers[6];
    const demoStudentUser = studentUsers[7];

    // 3. Seed Doubt threads
    const dbmsSub = subjects.find(s => s.code === 'CS101') || subjects[0];
    
    const doubt1 = new Doubt({
      title: 'Pointers memory allocation',
      description: 'Struggling with pointer allocation and dynamic array declarations.',
      askerId: raviUser._id,
      subjectId: dbmsSub._id,
      topic: 'Pointers',
      difficulty: 'easy',
      status: 'open',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
    });
    await doubt1.save();

    const doubt2 = new Doubt({
      title: 'Deadlocks Bankers Safety Condition',
      description: 'Why do we need safety condition check in Bankers algorithm?',
      askerId: snehaUser._id,
      subjectId: dbmsSub._id,
      topic: 'Deadlock',
      difficulty: 'medium',
      status: 'escalated',
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
    });
    await doubt2.save();

    const escalation2 = new Escalation({
      doubtId: doubt2._id,
      reason: 'timeout',
      status: 'pending',
      priority: 'high',
      escalatedAt: new Date()
    });
    await escalation2.save();

    // 4. Seed FacultyAnalytics weekly trend data
    const analyticsData = [
      { weekNumber: 20, year: 2026, totalDoubts: 15, peerSolved: 10, aiHinted: 3, escalated: 2, teacherSolved: 0, workloadReductionPercent: 86.7, minutesSaved: 300 },
      { weekNumber: 21, year: 2026, totalDoubts: 18, peerSolved: 12, aiHinted: 4, escalated: 2, teacherSolved: 0, workloadReductionPercent: 88.9, minutesSaved: 360 },
      { weekNumber: 22, year: 2026, totalDoubts: 25, peerSolved: 18, aiHinted: 5, escalated: 2, teacherSolved: 0, workloadReductionPercent: 92.0, minutesSaved: 540 },
      { weekNumber: 23, year: 2026, totalDoubts: 30, peerSolved: 22, aiHinted: 6, escalated: 2, teacherSolved: 0, workloadReductionPercent: 93.3, minutesSaved: 660 },
      { weekNumber: 24, year: 2026, totalDoubts: 35, peerSolved: 28, aiHinted: 5, escalated: 2, teacherSolved: 0, workloadReductionPercent: 94.3, minutesSaved: 840 }
    ];
    await FacultyAnalytics.insertMany(analyticsData);
    console.log('Seeded FacultyAnalytics weekly trend data.');

    // 5. Seed Focus Room
    const focusRoom = new FocusRoom({
      name: 'Slow Learners - OS Batch',
      description: 'Targeted focus room for Deadlock and Scheduling reinforcement.',
      subjectId: dbmsSub._id,
      topic: 'Deadlock and Scheduling',
      learningObjectives: ['Understand Deadlocks', 'Resource Allocation Conditions', 'Scheduling Algorithms'],
      creatorId: teacherUser._id,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      visibility: 'public',
      teacher: teacherUser._id,
      subject: 'Operating Systems',
      students: [raviUser._id, snehaUser._id, ananyaUser._id],
      isActive: true,
      roomType: 'slow_learner',
      questions: [
        {
          questionText: "What is deadlock?",
          subject: "Operating Systems",
          difficulty: "easy",
          addedBy: "teacher",
          topic: "Deadlocks",
          hint: "Process circular waiting block.",
          expectedAnswer: "A deadlock happens when processes wait on resources held by each other."
        },
        {
          questionText: "Explain the four conditions for deadlock",
          subject: "Operating Systems",
          difficulty: "medium",
          addedBy: "teacher",
          topic: "Deadlocks",
          hint: "Mutual exclusion, Hold & wait, No preemption, Circular wait.",
          expectedAnswer: "The four conditions are Mutual exclusion, Hold & wait, No preemption, and Circular wait."
        }
      ]
    });
    await focusRoom.save();

    // Enroll students in Focus Room
    const member1 = new FocusRoomMember({ roomId: focusRoom._id, userId: raviUser._id, progress: 50, xpEarned: 100 });
    const member2 = new FocusRoomMember({ roomId: focusRoom._id, userId: snehaUser._id, progress: 0, xpEarned: 0 });
    const member3 = new FocusRoomMember({ roomId: focusRoom._id, userId: ananyaUser._id, progress: 25, xpEarned: 50 });
    await Promise.all([member1.save(), member2.save(), member3.save()]);

    // Seed room analytics
    const roomAnalytics = new FocusRoomAnalytics({
      roomId: focusRoom._id,
      completionRate: 25,
      averageScore: 90,
      hintsUsed: 1,
      questionsSolved: 1,
      questionsPending: 1,
      teacherInterventions: 1,
      peerLearningSuccessRate: 100
    });
    await roomAnalytics.save();

    console.log('Seeded Focus Rooms data.');
    console.log('Seeded doubt threads, AI analyses, answers, and escalations.');
    console.log('Database seeding successfully finished!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
