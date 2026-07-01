const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const stationRoutes = require('./routes/stations');
const categoryRoutes = require('./routes/categories');
const observationRoutes = require('./routes/observations');
const analyticsRoutes = require('./routes/analytics');
const reportRoutes = require('./routes/reports');
const auditRoutes = require('./routes/audit');

const seed = require('./seed');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*', // Allow all origins for dev simplicity, can be locked down in production
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files
const uploadPath = path.resolve(__dirname, '../', process.env.UPLOAD_PATH || 'uploads/');
app.use('/uploads', express.static(uploadPath));

// API Routes registration
app.use('/api/auth', authRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/observations', observationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'CUMTA Suburban Train QA & Validation API',
    version: '1.0.0',
    status: 'Running'
  });
});

// Start DB and Server
async function startServer() {
  try {
    // Connect to database and seed/check tables
    await db.initDb();
    
    // Automatically seed default users and stations if empty
    await seed();
    
    app.listen(PORT, () => {
      console.log(`========================================`);
      console.log(` CUMTA Server running on port ${PORT}   `);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'} `);
      console.log(` Upload Directory: ${uploadPath}       `);
      console.log(`========================================`);
    });
  } catch (err) {
    console.error('Fatal: Server failed to start due to database error:', err);
    process.exit(1);
  }
}

startServer();
