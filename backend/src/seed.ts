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
        xp: 0,
        level: 1,
        streak: 0,
        resolvedDoubtsCount: 0,
        participationCount: 0
      });
      await profile.save();
    }

    console.log('Database seeding successfully finished!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
};

seed();
