const express = require('express');
const router = express.Router();
const { getDb } = require('../database/database');
const adminRoutes = require('./admin');

// Public status endpoint
router.get('/', async (req, res) => {
    try {
        let maintenanceActive = false;
        let maintenanceData = null;
        const now = new Date();
        
        // First check the in-memory maintenance state
        if (adminRoutes.getMaintenanceState) {
            const maintenanceState = adminRoutes.getMaintenanceState();
            if (maintenanceState && maintenanceState.active) {
                maintenanceActive = true;
                maintenanceData = {
                    status: 'maintenance',
                    maintenance: true,
                    message: maintenanceState.message || 'System is under maintenance',
                    startDate: maintenanceState.startDate,
                    estimatedEnd: maintenanceState.endDate,
                    timestamp: now.toISOString()
                };
            }
        }
        
        // If not in maintenance mode in memory, check database
        if (!maintenanceActive) {
            const db = getDb();
            const systemState = await db.collection('system_state').findOne({ _id: 'maintenance' });
            
            // Check if there's an active maintenance in the database
            if (systemState && systemState.scheduledMaintenance) {
                const { active, startDate, endDate, message } = systemState.scheduledMaintenance;
                const start = new Date(startDate);
                const end = new Date(endDate);
                
                // If current time is within maintenance window
                if (active && now >= start && now <= end) {
                    maintenanceActive = true;
                    maintenanceData = {
                        status: 'maintenance',
                        maintenance: true,
                        message: message || 'System is under maintenance',
                        startDate: startDate,
                        estimatedEnd: endDate,
                        timestamp: now.toISOString()
                    };
                }
            }
        }
        
        // Return maintenance status if active
        if (maintenanceActive && maintenanceData) {
            console.log('Maintenance mode active, returning status:', maintenanceData);
            return res.status(200).json(maintenanceData);
        }
        
        // No active maintenance
        const status = {
            status: 'operational',
            maintenance: false,
            timestamp: now.toISOString()
        };
        
        console.log('System operational, status:', status);
        res.status(200).json(status);
        
    } catch (error) {
        console.error('Status check error:', error);
        // In case of error, assume operational status
        res.status(200).json({
            status: 'operational',
            maintenance: false,
            timestamp: new Date().toISOString(),
            error: 'Error checking system status',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;
