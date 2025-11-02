const admin = require('../routes/admin');
const getMaintenanceState = admin.getMaintenanceState;

const maintenanceMiddleware = async (req, res, next) => {

    const path = req.path.toLowerCase();

    // Always allow login & verify
    if (
        path.includes('/auth/login') ||
        path.includes('/auth/verify') ||
        path.includes('/status') ||
        path.includes('/admin') // for admin UI
    ) {
        return next();
    }

    const maintenanceState = getMaintenanceState();

    if (maintenanceState.active) {
        return res.status(503).json({
            success: true,
            maintenance: true,
            message: maintenanceState.message,
            startDate: maintenanceState.startDate,
            endTime: maintenanceState.endDate
        });
    }

    next();
};

module.exports = {
    maintenanceMiddleware
};