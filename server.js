import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import mongoose from 'mongoose';

import connectDB from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import leadRoutes from './routes/leadRoutes.js';
import errorHandler from './middleware/errorHandler.js';

// Load environment variables
dotenv.config();

/**
 * Validate that all required environment variables are defined.
 * Exits the process immediately if any critical configuration is missing.
 */
const checkRequiredEnvVars = () => {
  const required = ['MONGODB_URI', 'JWT_SECRET', 'PORT'];
  const missing = [];

  required.forEach((varName) => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  if (missing.length > 0) {
    console.error(`CRITICAL BOOT ERROR: The following environment variables are missing: ${missing.join(', ')}`);
    process.exit(1);
  }
};

const app = express();

// Set security HTTP headers
app.use(helmet());

// Configure and mount Request Logging Middleware
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined')); // Verbose Apache-style logging for production analysis
} else {
  app.use(morgan('dev')); // Concise color-coded logging for rapid development diagnostics
}

// Enable CORS with dynamic origin authorization for production safety
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'https://startup-crm-lite-harshith94.vercel.app',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

// Rate Limiting Middlewares to prevent Brute-Force and DoS attacks
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests, please try again later.',
  standardHeaders: true, // Return rate limit info in standard headers
  legacyHeaders: false, // Disable legacy X-RateLimit headers
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 10, // Limit each IP to 10 authentication requests per window
  message: 'Too many auth attempts.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters before routing
app.use('/api/', generalLimiter);
app.use('/api/auth/', authLimiter);

// Body parser, reading data from body into req.body (limit payload to 10kb to avoid DoS)
app.use(express.json({ limit: '10kb' }));

// URL-encoded data parser
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// MongoDB injection protection middleware to sanitize input keys
app.use(mongoSanitize());

// API health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date(),
  });
});

// Mounting main routes
app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);

// Global Error Handling Middleware (must be registered after routes)
app.use(errorHandler);

let server;

// Establish database connection and start Express server listener
const startServer = async () => {
  try {
    // Validate configurations before establishing external connections
    checkRequiredEnvVars();

    await connectDB();
    
    const PORT = process.env.PORT || 5000;
    const MODE = process.env.NODE_ENV || 'development';
    
    server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT} in ${MODE} mode`);
    });
  } catch (error) {
    console.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();

/**
 * Handle graceful shutdown of the HTTP server and database connections.
 * Prevents dropping in-flight requests and releases system connections cleanly.
 * @param {string} signal - System signal received
 */
const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  
  if (server) {
    server.close(async () => {
      console.log('HTTP server closed.');
      try {
        await mongoose.connection.close();
        console.log('MongoDB connection closed cleanly.');
        console.log('Server shutting down gracefully.');
        process.exit(0);
      } catch (err) {
        console.error(`Error during database disconnection: ${err.message}`);
        process.exit(1);
      }
    });
  } else {
    mongoose.connection.close()
      .then(() => {
        console.log('MongoDB connection closed.');
        process.exit(0);
      })
      .catch((err) => {
        console.error(`Error during MongoDB close: ${err.message}`);
        process.exit(1);
      });
  }
};

// Listen for termination and interrupt signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
