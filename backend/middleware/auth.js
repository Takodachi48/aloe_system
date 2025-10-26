const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production';

/**
 * Authentication middleware to verify JWT tokens
 */
const authMiddleware = (req, res, next) => {
    try {
        let token;
        
        // Check for token in Authorization header first
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            // Extract token from header
            token = authHeader.substring(7); // Remove 'Bearer ' prefix
        } 
        // In development, also check for token in query parameters (for SSE)
        else if (process.env.NODE_ENV === 'development' && req.query.token) {
            token = req.query.token;
        }
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No token provided. Authentication required.'
            });
        }

        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Attach user info to request
        req.user = decoded;
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token has expired. Please login again.'
            });
        }
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token. Authentication failed.'
            });
        }

        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            message: 'Authentication error'
        });
    }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
const optionalAuthMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        }
        
        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};

module.exports = {
    authMiddleware,
    optionalAuthMiddleware
};
