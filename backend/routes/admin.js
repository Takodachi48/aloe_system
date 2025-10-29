const express = require('express');
const router = express.Router();
const { ObjectId } = require('mongodb');
const { getDb } = require('../database/database');
const { authMiddleware } = require('../middleware/auth');

// Initialize system state in database if not exists
async function initializeSystemState(db) {
    const systemState = await db.collection('system_state').findOne({ _id: 'maintenance' });
    if (!systemState) {
        await db.collection('system_state').insertOne({
            _id: 'maintenance',
            lastMaintenance: null,
            history: []
        });
    }
}

// Get system state from database
async function getSystemState(db) {
    return await db.collection('system_state').findOne({ _id: 'maintenance' }) || 
        { _id: 'maintenance', lastMaintenance: null, history: [] };
}

// Update system state in database
async function updateSystemState(db, update) {
    // If the update contains MongoDB operators ($set, $push, etc.), use it directly
    // Otherwise, treat it as a $set operation for backward compatibility
    const updateOperation = Object.keys(update).some(key => key.startsWith('$')) 
        ? update 
        : { $set: update };
        
    await db.collection('system_state').updateOne(
        { _id: 'maintenance' },
        updateOperation,
        { upsert: true }
    );
}

// Maintenance state and SSE clients
let maintenanceState = {
    active: false,
    startDate: null,
    endDate: null,
    message: null,
    lastMaintenance: null,
    history: [],
    announcementCreated: false,
    completionAnnouncementCreated: false
};

// Initialize system state when the server starts
const { waitForConnection } = require('../database/database');

async function initializeAdminModule() {
    try {
        // Wait for database connection
        await waitForConnection();
        const db = getDb();
        
        // Initialize system state
        await initializeSystemState(db);
        const systemState = await getSystemState(db);
        maintenanceState.lastMaintenance = systemState.lastMaintenance;
        maintenanceState.history = systemState.history || [];
        
        console.log('Admin module initialized successfully');
    } catch (error) {
        console.error('Error initializing admin module:', error);
    }
}

// Start initialization
initializeAdminModule();

// Store connected SSE clients
const sseClients = new Set();

// Function to notify all connected clients of maintenance state changes
function notifyMaintenanceUpdate() {
    const data = JSON.stringify({ type: 'maintenanceUpdate', data: maintenanceState });
    for (const client of sseClients) {
        try {
            client.res.write(`data: ${data}\n\n`);
        } catch (error) {
            console.error('Error sending SSE update:', error);
            // Remove the client if there's an error
            sseClients.delete(client);
        }
    }
}

// Clean up disconnected clients
function cleanupSSEClients() {
    for (const client of sseClients) {
        if (client.req.socket.destroyed) {
            sseClients.delete(client);
        }
    }
}

// Helper function to create maintenance announcements
async function createMaintenanceAnnouncement(title, content, endDate, isImportant = false, maintenanceStartDate = null) {
    try {
        const db = getDb();
        const announcementsCollection = db.collection('announcements');
        
        // Check if announcement with this title already exists for this maintenance period
        if (maintenanceStartDate && title.includes('Scheduled Maintenance')) {
            const existingAnnouncement = await announcementsCollection.findOne({
                title: title,
                isMaintenance: true,
                content: content,
                isActive: true
            });
            
            if (existingAnnouncement) {
                console.log(`Maintenance announcement already exists: ${title}`);
                return existingAnnouncement;
            }
        }
        
        // Check if recent "Maintenance Completed" announcement already exists
        if (title === 'Maintenance Completed') {
            const recentCompleted = await announcementsCollection.findOne({
                title: 'Maintenance Completed',
                isMaintenance: true,
                isActive: true,
                createdAt: { $gte: new Date(Date.now() - 60000) }
            });
            
            if (recentCompleted) {
                console.log(`Maintenance Completed announcement already exists (created ${Math.round((Date.now() - recentCompleted.createdAt.getTime()) / 1000)}s ago)`);
                return recentCompleted;
            }
        }
        
        const announcement = {
            title,
            content,
            type: 'important',
            priority: 'high',  // Always high priority for maintenance
            startDate: new Date().toISOString(),
            endDate,
            isActive: true,
            isMaintenance: true,  // Flag to identify maintenance-related announcements
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        await announcementsCollection.insertOne(announcement);
        console.log(`Created maintenance announcement: ${title} (expires: ${endDate})`);
        return announcement;
    } catch (error) {
        console.error('Error creating maintenance announcement:', error);
        throw error;
    }
}

// Run cleanup every 30 seconds
setInterval(cleanupSSEClients, 30000);

// Export maintenance state getter and notifier
function getMaintenanceState() {
    return maintenanceState;
}

module.exports.getMaintenanceState = getMaintenanceState;
module.exports.notifyMaintenanceUpdate = notifyMaintenanceUpdate;

// Get maintenance status
router.get('/maintenance/status', authMiddleware, (req, res) => {
    try {
        res.json({
            success: true,
            data: maintenanceState
        });
    } catch (error) {
        console.error('Error getting maintenance status:', error);
        res.status(500).json({
            success: false,
            message: 'Error getting maintenance status'
        });
    }
});

// Update maintenance state periodically
async function checkMaintenanceSchedule() {
    const now = new Date();
    let stateChanged = false;
    
    if (maintenanceState.startDate && maintenanceState.endDate) {
        const startDate = new Date(maintenanceState.startDate);
        const endDate = new Date(maintenanceState.endDate);
        
        // Check if we need to create a scheduled announcement (for future maintenance)
        if (now < startDate && !maintenanceState.announcementCreated) {
            maintenanceState.announcementCreated = true;
            const durationMinutes = Math.round((endDate - startDate) / (1000 * 60));
            try {
                await createMaintenanceAnnouncement(
                    'Scheduled Maintenance',
                    maintenanceState.message || `The system will undergo scheduled maintenance from ${startDate.toLocaleString()} to ${endDate.toLocaleString()}. We apologize for any inconvenience.`,
                    endDate.toISOString(),
                    true,
                    maintenanceState.startDate
                );
            } catch (error) {
                console.error('Error creating scheduled maintenance announcement:', error);
            }
        }
        
        // Check if maintenance should start
        if (now >= startDate && now <= endDate && !maintenanceState.active) {
            maintenanceState.active = true;
            stateChanged = true;
            console.log('Maintenance mode activated');
            
            // Only create a "now active" announcement if we haven't already created a scheduled one
            if (!maintenanceState.announcementCreated) {
                try {
                    await createMaintenanceAnnouncement(
                        'Scheduled Maintenance',
                        maintenanceState.message || `The system is currently undergoing scheduled maintenance. We expect to be back online by ${endDate.toLocaleString()}.`,
                        endDate.toISOString(),
                        true,
                        maintenanceState.startDate
                    );
                } catch (error) {
                    console.error('Error creating maintenance start announcement:', error);
                }
            }
            maintenanceState.announcementCreated = true;
        }
        
        // Check if maintenance should end
        if (now > endDate && maintenanceState.active) {
            maintenanceState.active = false;
            maintenanceState.lastMaintenance = endDate.toISOString();
            const maintenanceRecord = {
                startDate: maintenanceState.startDate,
                endDate: maintenanceState.endDate,
                message: maintenanceState.message,
                timestamp: new Date().toISOString()
            };
            
            maintenanceState.history.push(maintenanceRecord);
            
            // Update the database with the new state
            try {
                const db = getDb();
                await updateSystemState(db, {
                    $set: { lastMaintenance: maintenanceState.lastMaintenance },
                    $push: { history: { $each: [maintenanceRecord], $slice: -100 } } // Keep last 100 records
                });
            } catch (error) {
                console.error('Error updating maintenance history in database:', error);
            }
            // Create maintenance end announcement (expires in 5 minutes) - only if not already created
            if (!maintenanceState.completionAnnouncementCreated) {
                createMaintenanceAnnouncement(
                    'Maintenance Completed',
                    'The scheduled maintenance has been completed. All systems are now operational.',
                    new Date(Date.now() + 5 * 60 * 1000).toISOString() // Show for 5 minutes
                ).catch(console.error);
                maintenanceState.completionAnnouncementCreated = true;
            }
            
            maintenanceState.startDate = null;
            maintenanceState.endDate = null;
            maintenanceState.message = null;
            maintenanceState.announcementCreated = false;
            maintenanceState.completionAnnouncementCreated = false;
            stateChanged = true;
            console.log('Maintenance mode deactivated');
        }
    }
    
    // Notify clients if state changed
    if (stateChanged) {
        notifyMaintenanceUpdate();
    }
    
    return stateChanged;
}

// Check maintenance schedule every minute
setInterval(() => {
    checkMaintenanceSchedule().catch(error => {
        console.error('Error in maintenance schedule check:', error);
    });
}, 60000);

// Initial check
checkMaintenanceSchedule().catch(error => {
    console.error('Error in initial maintenance check:', error);
});

// SSE endpoint for maintenance updates
router.get('/maintenance/updates', authMiddleware, (req, res) => {
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx
    
    // Send initial state
    const data = JSON.stringify({ type: 'init', data: maintenanceState });
    res.write(`data: ${data}\n\n`);
    
    // Add client to the set
    const clientId = Date.now();
    const client = { id: clientId, req, res };
    sseClients.add(client);
    
    // Remove client on connection close
    req.on('close', () => {
        sseClients.delete(client);
    });
    
    // Send a ping every 30 seconds to keep the connection alive
    const pingInterval = setInterval(() => {
        try {
            res.write(':ping\n\n');
        } catch (error) {
            clearInterval(pingInterval);
            sseClients.delete(client);
        }
    }, 30000);
    
    // Clean up on client disconnect
    req.on('close', () => {
        clearInterval(pingInterval);
        sseClients.delete(client);
    });
});

// Admin middleware
const adminMiddleware = async (req, res, next) => {
    try {
        const db = getDb();
        const usersCollection = db.collection('users');
        
        const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
        
        if (!user || !user.isAdmin) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.'
            });
        }
        
        next();
    } catch (error) {
        console.error('Admin middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking admin privileges'
        });
    }
};

// Get all users
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const usersCollection = db.collection('users');
        
        const users = await usersCollection
            .find({})
            .project({ password: 0 })
            .sort({ createdAt: -1 })
            .toArray();
        
        res.json({
            success: true,
            data: {
                users,
                total: users.length
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching users'
        });
    }
});

// Update user role
router.put('/users/:userId/role', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const { isAdmin } = req.body;
        
        const db = getDb();
        const usersCollection = db.collection('users');
        
        // Prevent removing admin role from the last admin
        if (!isAdmin) {
            const adminCount = await usersCollection.countDocuments({ isAdmin: true });
            if (adminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot remove admin role from the last administrator'
                });
            }
        }
        
        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { 
                $set: { 
                    isAdmin: Boolean(isAdmin),
                    updatedAt: new Date()
                } 
            }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            message: 'User role updated successfully'
        });
    } catch (error) {
        console.error('Update role error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user role'
        });
    }
});

// Toggle user active status
router.put('/users/:userId/status', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        const { isActive } = req.body;
        
        // Prevent deactivating yourself
        if (userId === req.user.userId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot deactivate your own account'
            });
        }
        
        const db = getDb();
        const usersCollection = db.collection('users');
        
        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { 
                $set: { 
                    isActive: Boolean(isActive),
                    updatedAt: new Date()
                } 
            }
        );
        
        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`
        });
    } catch (error) {
        console.error('Update status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating user status'
        });
    }
});

// Delete user
router.delete('/users/:userId', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Prevent deleting yourself
        if (userId === req.user.userId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete your own account'
            });
        }
        
        const db = getDb();
        const usersCollection = db.collection('users');
        
        // Check if user is admin and if they're the last admin
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        if (user && user.isAdmin) {
            const adminCount = await usersCollection.countDocuments({ isAdmin: true });
            if (adminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete the last administrator'
                });
            }
        }
        
        const result = await usersCollection.deleteOne({ _id: new ObjectId(userId) });
        
        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        
        res.json({
            success: true,
            message: 'User deleted successfully'
        });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting user'
        });
    }
});

// Get all announcements
router.get('/announcements', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const announcementsCollection = db.collection('announcements');

        const announcements = await announcementsCollection
            .find({})
            .sort({ createdAt: -1 })
            .toArray();

        res.json({
            success: true,
            data: {
                announcements,
                total: announcements.length
            }
        });
    } catch (error) {
        console.error('Get announcements error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching announcements'
        });
    }
});

// Create new announcement
router.post('/announcements', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { title, content, type, priority, startDate, endDate, isActive } = req.body;

        // Validation
        if (!title || !content) {
            return res.status(400).json({
                success: false,
                message: 'Title and content are required'
            });
        }

        const db = getDb();
        const announcementsCollection = db.collection('announcements');

        const announcement = {
            title: title.trim(),
            content: content.trim(),
            type: type || 'info',
            priority: priority || 'medium',
            isActive: Boolean(isActive),
            startDate: startDate ? new Date(startDate) : new Date(),
            endDate: endDate ? new Date(endDate) : null,
            createdBy: req.user.userId,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await announcementsCollection.insertOne(announcement);

        res.status(201).json({
            success: true,
            message: 'Announcement created successfully',
            data: {
                id: result.insertedId,
                ...announcement
            }
        });
    } catch (error) {
        console.error('Create announcement error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating announcement'
        });
    }
});

// Update announcement
router.put('/announcements/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { title, content, type, priority, startDate, endDate, isActive } = req.body;

        const db = getDb();
        const announcementsCollection = db.collection('announcements');

        const updateData = {
            ...(title !== undefined && { title: title.trim() }),
            ...(content !== undefined && { content: content.trim() }),
            ...(type !== undefined && { type }),
            ...(priority !== undefined && { priority }),
            ...(isActive !== undefined && { isActive: Boolean(isActive) }),
            ...(startDate !== undefined && { startDate: new Date(startDate) }),
            ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
            updatedAt: new Date()
        };

        const result = await announcementsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found'
            });
        }

        res.json({
            success: true,
            message: 'Announcement updated successfully'
        });
    } catch (error) {
        console.error('Update announcement error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating announcement'
        });
    }
});

// Toggle announcement status
router.put('/announcements/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        const db = getDb();
        const announcementsCollection = db.collection('announcements');

        const result = await announcementsCollection.updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    isActive: Boolean(isActive),
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found'
            });
        }

        res.json({
            success: true,
            message: `Announcement ${isActive ? 'activated' : 'deactivated'} successfully`
        });
    } catch (error) {
        console.error('Update announcement status error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating announcement status'
        });
    }
});

// Delete announcement
router.delete('/announcements/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { id } = req.params;

        const db = getDb();
        const announcementsCollection = db.collection('announcements');

        const result = await announcementsCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Announcement not found'
            });
        }

        res.json({
            success: true,
            message: 'Announcement deleted successfully'
        });
    } catch (error) {
        console.error('Delete announcement error:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting announcement'
        });
    }
});

// Get system stats
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const usersCollection = db.collection('users');
        const analysisCollection = db.collection('analysis_history');
        const announcementsCollection = db.collection('announcements');

        const totalUsers = await usersCollection.countDocuments();
        const adminUsers = await usersCollection.countDocuments({ isAdmin: true });
        const totalAnalyses = await analysisCollection.countDocuments();
        const totalAnnouncements = await announcementsCollection.countDocuments();
        const activeAnnouncements = await announcementsCollection.countDocuments({ isActive: true });

        res.json({
            success: true,
            data: {
                totalUsers,
                adminUsers,
                totalAnalyses,
                totalAnnouncements,
                activeAnnouncements
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics'
        });
    }
});

// Get maintenance status
router.get('/maintenance/status', authMiddleware, adminMiddleware, (req, res) => {
    // Run a check before sending status
    checkMaintenanceSchedule();
    res.json({
        success: true,
        data: {
            active: maintenanceState.active,
            startDate: maintenanceState.startDate,
            endDate: maintenanceState.endDate,
            message: maintenanceState.message,
            lastMaintenance: maintenanceState.lastMaintenance
        }
    });
});

// Get maintenance history
router.get('/maintenance/history', authMiddleware, adminMiddleware, (req, res) => {
    res.json({
        success: true,
        data: maintenanceState.history
    });
});

// Schedule maintenance
router.post('/maintenance', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const { startDate, endDate, message } = req.body;
        
        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        const now = new Date();
        
        if (end <= start) {
            return res.status(400).json({
                success: false,
                message: 'End date must be after start date'
            });
        }
        

        
        // Check for overlapping maintenance
        if (maintenanceState.startDate && maintenanceState.endDate) {
            const existingStart = new Date(maintenanceState.startDate);
            const existingEnd = new Date(maintenanceState.endDate);
            
            if ((start >= existingStart && start <= existingEnd) ||
                (end >= existingStart && end <= existingEnd) ||
                (start <= existingStart && end >= existingEnd)) {
                return res.status(400).json({
                    success: false,
                    message: 'New maintenance period overlaps with existing schedule'
                });
            }
        }
        
        // Update maintenance state
        maintenanceState.startDate = startDate;
        maintenanceState.endDate = endDate;
        maintenanceState.message = message;
        maintenanceState.announcementCreated = false;
        maintenanceState.completionAnnouncementCreated = false;
        
        // Check if maintenance should start immediately and create announcement
        await checkMaintenanceSchedule();
        
        // Ensure active flag is set if start time is now or in the past
        if (now >= new Date(startDate) && now <= new Date(endDate)) {
            maintenanceState.active = true;
        }
        
        res.json({
            success: true,
            data: {
                active: maintenanceState.active,
                startDate: maintenanceState.startDate,
                endDate: maintenanceState.endDate,
                message: maintenanceState.message,
                lastMaintenance: maintenanceState.lastMaintenance
            }
        });
    } catch (error) {
        console.error('Schedule maintenance error:', error);
        res.status(500).json({
            success: false,
            message: 'Error scheduling maintenance'
        });
    }
});

// End maintenance early
router.post('/maintenance/end-early', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        if (!maintenanceState.active) {
            return res.status(400).json({
                success: false,
                message: 'No active maintenance to end'
            });
        }

        const endTime = new Date().toISOString();
        const maintenanceRecord = {
            startDate: maintenanceState.startDate,
            endDate: endTime,
            message: maintenanceState.message,
            endedEarly: true,
            timestamp: new Date().toISOString()
        };

        // Update maintenance state
        maintenanceState.active = false;
        maintenanceState.lastMaintenance = endTime;
        maintenanceState.history.push(maintenanceRecord);

        // Update the database
        try {
            const db = getDb();
            // Update the system state with the new maintenance record
            const update = {
                $set: { lastMaintenance: endTime },
                $push: { 
                    history: {
                        $each: [maintenanceRecord],
                        $slice: -100
                    }
                }
            };
            await updateSystemState(db, update);
        } catch (error) {
            console.error('Error updating maintenance history in database:', error);
            return res.status(500).json({
                success: false,
                message: 'Error updating maintenance history'
            });
        }

        // Notify all connected clients
        notifyMaintenanceUpdate();

        // Create maintenance end announcement
        await createMaintenanceAnnouncement(
            'Maintenance Completed',
            'The scheduled maintenance has been completed. All systems are now operational.',
            new Date(Date.now() + 5 * 60 * 1000).toISOString() // Show for 5 minutes
        ).catch(console.error);
        maintenanceState.completionAnnouncementCreated = true;

        // Reset maintenance state
        maintenanceState.startDate = null;
        maintenanceState.endDate = null;
        maintenanceState.message = null;
        maintenanceState.announcementCreated = false;
        maintenanceState.completionAnnouncementCreated = false;

        res.json({
            success: true,
            data: {
                active: maintenanceState.active,
                startDate: maintenanceState.startDate,
                endDate: maintenanceState.endDate
            },
            message: 'Maintenance ended successfully'
        });
    } catch (error) {
        console.error('Error ending maintenance early:', error);
        res.status(500).json({
            success: false,
            message: 'Error ending maintenance early'
        });
    }
});

// Cancel maintenance
router.post('/maintenance/cancel', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        if (!maintenanceState.active && !maintenanceState.startDate) {
            return res.status(400).json({
                success: false,
                message: 'No maintenance scheduled'
            });
        }
        
        // If maintenance was active, add to history
        if (maintenanceState.active) {
            const maintenanceRecord = {
                startDate: maintenanceState.startDate,
                endDate: new Date().toISOString(),
                message: maintenanceState.message,
                canceled: true,
                timestamp: new Date().toISOString()
            };
            
            maintenanceState.history.push(maintenanceRecord);
            maintenanceState.lastMaintenance = new Date().toISOString();
            
            // Update the database with the new state
            try {
                const db = getDb();
                await updateSystemState(db, {
                    $set: { lastMaintenance: maintenanceState.lastMaintenance },
                    $push: { history: { $each: [maintenanceRecord], $slice: -100 } } // Keep last 100 records
                });
            } catch (error) {
                console.error('Error updating maintenance history in database:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error updating maintenance history'
                });
            }
        }
        
        // Reset maintenance state
        maintenanceState.active = false;
        maintenanceState.startDate = null;
        maintenanceState.endDate = null;
        maintenanceState.message = null;
        maintenanceState.announcementCreated = false;
        maintenanceState.completionAnnouncementCreated = false;
        
        res.json({
            success: true,
            data: {
                active: maintenanceState.active,
                startDate: maintenanceState.startDate,
                endDate: maintenanceState.endDate
            },
            message: 'Maintenance canceled successfully'
        });
    } catch (error) {
        console.error('Cancel maintenance error:', error);
        res.status(500).json({
            success: false,
            message: 'Error canceling maintenance'
        });
    }
});

// Analytics endpoints
// Get AI & Detection Performance Metrics
router.get('/analytics/disease-stats', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const analysisCollection = db.collection('analysis_history');
        
        const stats = await analysisCollection.aggregate([
            {
                $group: {
                    _id: '$disease_key',
                    diseaseName: { $first: '$disease_name' },
                    count: { $sum: 1 },
                    avgConfidence: { $avg: '$confidence' },
                    minConfidence: { $min: '$confidence' },
                    maxConfidence: { $max: '$confidence' }
                }
            },
            {
                $sort: { count: -1 }
            }
        ]).toArray();

        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error('Error fetching disease stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching disease statistics'
        });
    }
});

// Get processing time data per scan
router.get('/analytics/processing-time', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const analysisCollection = db.collection('analysis_history');
        
        const data = await analysisCollection.find({})
            .project({
                _id: 0,
                analysis_id: 1,
                disease_name: 1,
                created_at: 1,
                processing_time: { 
                    $cond: { 
                        if: { $ne: ['$processing_time', undefined] },
                        then: '$processing_time',
                        else: 1500
                    }
                }
            })
            .sort({ created_at: -1 })
            .limit(100)
            .toArray();

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Error fetching processing time:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching processing time data'
        });
    }
});

// Get server response time metrics (simulated)
router.get('/analytics/response-time', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const responseTimesCollection = db.collection('response_times');
        const tzOffset = parseInt(req.query.tzOffset) || 0;
        
        const collectionCount = await responseTimesCollection.countDocuments();
        
        const oneDayAgo = new Date();
        oneDayAgo.setUTCHours(oneDayAgo.getUTCHours() - 24);
        
        const responseTimeData = await responseTimesCollection.aggregate([
            {
                $match: {
                    timestamp: { $gte: oneDayAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { 
                            format: '%Y-%m-%dT%H:00:00Z', 
                            date: { $add: ['$timestamp', tzOffset] }
                        }
                    },
                    avgTime: { $avg: '$duration_ms' },
                    minTime: { $min: '$duration_ms' },
                    maxTime: { $max: '$duration_ms' },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]).toArray();
        

        
        const dataMap = {};
        responseTimeData.forEach(item => {
            dataMap[item._id] = {
                date: item._id,
                avgTime: Math.round(item.avgTime),
                minTime: item.minTime,
                maxTime: item.maxTime,
                requestCount: item.count
            };
        });
        
        const data = [];
        const now = new Date(Date.now() + tzOffset);
        
        for (let i = 23; i >= 0; i--) {
            const hoursBack = i;
            const hourMs = hoursBack * 60 * 60 * 1000;
            const adjustedTime = new Date(now.getTime() - hourMs);
            
            const year = adjustedTime.getUTCFullYear();
            const month = String(adjustedTime.getUTCMonth() + 1).padStart(2, '0');
            const day = String(adjustedTime.getUTCDate()).padStart(2, '0');
            const hour = String(adjustedTime.getUTCHours()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}T${hour}:00:00Z`;
            
            data.push(dataMap[dateStr] || {
                date: dateStr,
                avgTime: 0,
                minTime: 0,
                maxTime: 0,
                requestCount: 0
            });
        }

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Error fetching response time:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching response time data'
        });
    }
});

// Get system uptime/downtime stats
router.get('/analytics/uptime', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const uptimeEventsCollection = db.collection('uptime_events');
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const uptimeEvents = await uptimeEventsCollection
            .find({ timestamp: { $gte: thirtyDaysAgo } })
            .sort({ timestamp: -1 })
            .toArray();
        
        const isMaintenanceActive = maintenanceState.active || false;
        const maintenanceStart = maintenanceState.startDate || null;
        
        const downEvents = uptimeEvents.filter(e => e.event_type === 'down' || e.status === 'down');
        let downtime = downEvents.reduce((total, event) => {
            const nextEvent = uptimeEvents.find(e => e.timestamp > event.timestamp);
            if (nextEvent) {
                return total + (nextEvent.timestamp - event.timestamp);
            }
            return total;
        }, 0);
        
        if (isMaintenanceActive && maintenanceStart) {
            downtime += Date.now() - new Date(maintenanceStart).getTime();
        }
        
        const uptimePercentage = uptimeEvents.length > 0 ? 99.9 : 100;
        const currentStatus = isMaintenanceActive ? 'maintenance' : (downEvents.length > 0 && downEvents[0].timestamp > new Date(Date.now() - 60000) ? 'down' : 'active');
        
        res.json({
            success: true,
            data: {
                uptime: isMaintenanceActive ? 0 : uptimePercentage,
                status: currentStatus,
                lastDowntime: maintenanceStart || maintenanceState.lastMaintenance || null,
                totalUptime: '45 days',
                mtbf: '450 hours',
                downtimeMs: Math.round(downtime)
            }
        });
    } catch (error) {
        console.error('Error fetching uptime stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching uptime data'
        });
    }
});

// Get daily scans (last 30 days)
router.get('/analytics/daily-scans', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const analysisCollection = db.collection('analysis_history');
        
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const data = await analysisCollection.aggregate([
            {
                $match: {
                    created_at: { $gte: thirtyDaysAgo }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$created_at' }
                    },
                    scans: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]).toArray();

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Error fetching daily scans:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching daily scans data'
        });
    }
});

// Get hourly activity (24-hour)
router.get('/analytics/hourly-activity', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        const db = getDb();
        const analysisCollection = db.collection('analysis_history');
        
        const tzOffset = parseInt(req.query.tzOffset) || 0;
        
        const data = await analysisCollection.aggregate([
            {
                $group: {
                    _id: {
                        $dateToString: { 
                            format: '%H', 
                            date: { $add: ['$created_at', tzOffset] }
                        }
                    },
                    scans: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]).toArray();

        const hourlyData = Array(24).fill(0);
        data.forEach(item => {
            const hour = parseInt(item._id);
            if (hour >= 0 && hour < 24) {
                hourlyData[hour] = item.scans;
            }
        });

        res.json({
            success: true,
            data: hourlyData
        });
    } catch (error) {
        console.error('Error fetching hourly activity:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching hourly activity data'
        });
    }
});

module.exports = router;
