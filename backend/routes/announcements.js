const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { database } = require('../database/database');

// GET /api/announcements
router.get('/', auth, async function(req, res) {
    console.log('GET /api/announcements received');
    try {
        console.log('Authenticated user:', req.user);
        
        const db = await database.connect();
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
        console.error('Error fetching announcements:', error);
        res.status(500).json({ 
            error: 'Failed to fetch announcements', 
            details: error.message 
        });
    }
});

module.exports = router;