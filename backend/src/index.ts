import dotenv from 'dotenv';
// Load environment configuration immediately
const envResult = dotenv.config();
if (envResult.error) {
  console.warn('Warning: Could not load .env file. Relying on environment variables.');
} else {
  console.log('Environment configuration successfully loaded from .env');
}

import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db';
import apiRouter from './routes/api';
import { initCronJobs } from './services/cronService';

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to MongoDB
connectDB();

// Initialize Cron Jobs
initCronJobs();

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman, health checks)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin matches localhost origins
    const isLocal = origin.startsWith('http://localhost:') || 
                    origin.startsWith('http://127.0.0.1:');
                    
    // Check if origin matches FRONTEND_URL from environment variable
    const frontendUrl = process.env.FRONTEND_URL;
    let isAllowedEnv = false;
    if (frontendUrl) {
      const urls = frontendUrl.split(',').map(url => url.trim());
      isAllowedEnv = urls.includes(origin);
    }
    
    if (isLocal || isAllowedEnv || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
import path from 'path';
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api', apiRouter);

// Basic health check route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ message: 'Internal server error occurred' });
});

// Start Server
const server = app.listen(PORT);

server.on('listening', () => {
  const env = process.env.NODE_ENV || 'development';
  const isProd = env === 'production';
  const apiUrl = isProd 
    ? 'https://ai-peering-machine.onrender.com/api' 
    : `http://localhost:${PORT}/api`;

  console.log(`=========================================`);
  console.log(`Server started successfully!`);
  console.log(`Current Port : ${PORT}`);
  console.log(`Environment  : ${env}`);
  console.log(`API URL      : ${apiUrl}`);
  console.log(`=========================================`);
});

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`=========================================`);
    console.error(`Error: Port ${PORT} is already in use.`);
    console.error(`Another instance of the backend server is likely running.`);
    console.info(`Suggested next available port: ${Number(PORT) + 1}`);
    console.error(`=========================================`);
    process.exit(1);
  } else {
    console.error('Server startup error:', err);
    process.exit(1);
  }
});
