const { getMaintenanceState } = require('../routes/admin');

// Middleware to check maintenance mode
const maintenanceMiddleware = async (req, res, next) => {
    // Skip maintenance check for admin routes and maintenance status endpoint
    if (req.path.startsWith('/api/admin') || 
        req.path === '/api/auth/verify' ||
        req.path === '/api/auth/login') {
        return next();
    }

    const maintenanceState = getMaintenanceState();
    
    if (maintenanceState.active) {
        return res.status(503).json({
            success: false,
            message: maintenanceState.message || 'System is under maintenance. Please try again later.',
            maintenance: true,
            endTime: maintenanceState.endDate
        });
    }

    next();
};

module.exports = {
    maintenanceMiddleware
};