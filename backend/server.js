const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const database = require('./database/database');
const { getDb } = require('./database/database');
const { maintenanceMiddleware } = require('./middleware/maintenance');

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes (now within backend/routes)
const analysisRoutes = require('./routes/analysis');
const historyRoutes = require('./routes/history');
const uploadRoutes = require('./routes/upload');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const weatherRoutes = require('./routes/weather');
const healthCheckService = require('./services/healthCheck');

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://*.cloudinary.com", "https://openweathermap.org"],
            scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
            connectSrc: ["'self'", "https://res.cloudinary.com", "https://*.cloudinary.com", "https://cdn.jsdelivr.net", "https://api.openweathermap.org"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// Rate limiting configuration
const isDevelopment = process.env.NODE_ENV === 'development';

// More lenient rate limiting for development
const apiRateLimit = isDevelopment ? 
    rateLimit({
        windowMs: 5 * 60 * 1000, // 5 minutes
        max: 1000, // 1000 requests per 5 minutes
        message: 'Too many requests, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
    }) : 
    rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // 100 requests per 15 minutes
        message: 'Too many requests, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
    });

// Apply rate limiting to API routes
app.use('/api/', apiRateLimit);

// More lenient rate limiting for authentication endpoints
const authRateLimit = rateLimit({
    windowMs: isDevelopment ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 min in dev, 15 in prod
    max: isDevelopment ? 20 : 10, // More attempts allowed in development
    message: 'Too many login attempts, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true // Only count failed login attempts
});

// Apply auth rate limiting to login endpoint
app.use('/api/auth/login', authRateLimit);

// File upload rate limiting
const uploadLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: isDevelopment ? 50 : 20, // More lenient in development
    message: 'Too many uploads, please try again later.'
});
app.use('/api/upload', uploadLimiter);

// Middleware
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Response time tracking middleware
app.use((req, res, next) => {
    const startTime = Date.now();
    const originalPath = req.originalUrl.split('?')[0];
    
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        
        if (originalPath.startsWith('/api/') && res.statusCode >= 200 && res.statusCode < 400) {
            setImmediate(async () => {
                try {
                    const db = getDb();
                    const responseTimesCollection = db.collection('response_times');
                    await responseTimesCollection.insertOne({
                        endpoint: originalPath,
                        method: req.method,
                        status_code: res.statusCode,
                        duration_ms: duration,
                        timestamp: new Date(),
                        query_params: Object.keys(req.query).length > 0 ? req.query : null
                    });
                } catch (dbError) {
                    console.error(`[Response Tracking Error] ${req.method} ${originalPath}: ${dbError.message}`);
                }
            });
        }
    });
    
    next();
});

// API Routes - MUST come before static files and catch-all
console.log('Registering API routes...');
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/cloudinary', require('./routes/cloudinary'));

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});
console.log('API routes registered');

// Serve static files from frontend folder
const frontendDir = path.join(__dirname, '../frontend');
app.use(express.static(frontendDir));

// Serve frontend - catch-all route for SPA (after API routes and static files)
app.get('*', (req, res) => {
    // Only serve index.html for non-API routes
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(frontendDir, 'index.html'));
    } else {
        res.status(404).json({
            success: false,
            message: 'API endpoint not found'
        });
    }
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(frontendDir, 'login.html'));
});

app.get('/admin.html', (req, res) => {
    res.sendFile(path.join(frontendDir, 'admin.html'));
});

// Catch-all for SPA routing - MUST be last
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDir, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            error: 'File too large',
            message: 'File size must be less than 10MB'
        });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({
            error: 'Invalid file',
            message: 'Only image files are allowed'
        });
    }
    
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Initialize database and start server
async function startServer() {
    try {
        // Connect to database
        await database.connect();
        console.log('Connected to MongoDB database');
        console.log('Database indexes created');
        
        // Start health check service
        healthCheckService.startHealthCheckJob();
        
        // Start server
        app.listen(PORT, () => {
            console.log(`AloeShield server running on port ${PORT}`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Health check: http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error('Failed to connect to database:', error.message);
        console.log('\n🔧 Database Connection Troubleshooting:');
        console.log('1. Check if your MongoDB Atlas connection string is correct in .env');
        console.log('2. Verify your IP address is whitelisted in MongoDB Atlas');
        console.log('3. Ensure your MongoDB Atlas cluster is running');
        console.log('4. Check your network connection');
        console.log('\n⚠️  Starting server without database connection...');
        
        // Start server anyway for development
        app.listen(PORT, () => {
            console.log(`AloeShield server running on port ${PORT} (DATABASE OFFLINE)`);
            console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
            console.log(`Health check: http://localhost:${PORT}/api/health`);
        });
    }
}

// Start the server
startServer();

module.exports = app;
