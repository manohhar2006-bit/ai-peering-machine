import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User, StudentProfile, TeacherProfile } from '../models/Schemas';

dotenv.config();

const usersToSeed = [
  {
    name: 'Demo Student',
    email: 'student@demo.com',
    password: 'student123',
    role: 'student'
  },
  {
    name: 'Demo Teacher',
    email: 'teacher@demo.com',
    password: 'teacher123',
    role: 'teacher'
  },
  {
    name: 'Manohhar',
    email: 'manohhar@demo.com',
    password: 'manohhar123',
    role: 'student'
  }
];

const seedDemoUsers = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sss-db';
    console.log(`Connecting to MongoDB at: ${mongoUri}`);
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB. Starting demo users seeding...');

    for (const u of usersToSeed) {
      console.log(`Processing user: ${u.email} (${u.role})`);
      const passwordHash = await bcrypt.hash(u.password, 10);
      
      let user = await User.findOne({ email: u.email });
      if (!user) {
        user = new User({
          name: u.name,
          email: u.email,
          passwordHash,
          role: u.role
        });
        await user.save();
        console.log(`Created new user: ${u.email}`);
      } else {
        user.name = u.name;
        user.passwordHash = passwordHash;
        user.role = u.role as 'student' | 'teacher';
        await user.save();
        console.log(`Updated existing user: ${u.email}`);
      }

      // Check and create profiles
      if (u.role === 'student') {
        const profileExists = await StudentProfile.findOne({ userId: user._id });
        if (!profileExists) {
          const profile = new StudentProfile({
            userId: user._id
          });
          await profile.save();
          console.log(`Created student profile for: ${u.email}`);
        }
      } else if (u.role === 'teacher') {
        const profileExists = await TeacherProfile.findOne({ userId: user._id });
        if (!profileExists) {
          const profile = new TeacherProfile({
            userId: user._id,
            department: 'General'
          });
          await profile.save();
          console.log(`Created teacher profile for: ${u.email}`);
        }
      }
    }

    console.log('Demo users seeding successfully completed!');
  } catch (error) {
    console.error('Error during demo users seeding:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }
};

seedDemoUsers();
