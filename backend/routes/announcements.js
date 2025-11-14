const express = require('express');
const router = express.Router();
const database = require('../database/database');

// GET /api/announcements
router.get('/', async (req, res) => {
    try {
        console.log('GET /api/announcements received');
        console.log('Request headers:', req.headers);
        console.log('Session ID:', req.sessionID);
        console.log('Session data:', req.session);
        console.log('Authenticated user:', req.user);
        
        // Wait for database connection
        await database.waitForConnection();
        const db = database.getDb();
        
        if (!db) {
            throw new Error('Database connection not available');
        }

        const query = { 
            isActive: true,
            $or: [
                { endDate: { $gt: new Date() } },
                { endDate: null }
            ]
        };
        console.log('Executing query:', query);

        const announcements = await db.collection('announcements').find(query).toArray();
        console.log('Found announcements:', announcements);

        // Send JSON response with explicit headers
        res.setHeader('Content-Type', 'application/json');
        res.json(announcements);
    } catch (error) {
        console.error('Error in /api/announcements:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Failed to fetch announcements', 
                details: error.message 
            });
        }
    }
});

module.exports = router;