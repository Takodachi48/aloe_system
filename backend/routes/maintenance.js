const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { isAdmin } = require('../middleware/auth');
const { MongoClient, ObjectId } = require('mongodb');

// Get maintenance history
router.get('/history', isAdmin, async (req, res) => {
    try {
        const db = req.app.locals.db;
        const maintenanceHistory = await db.collection('maintenance')
            .find()
            .sort({ startTime: -1 })
            .toArray();

        res.json(maintenanceHistory);
    } catch (error) {
        console.error('Error fetching maintenance history:', error);
        res.status(500).json({ error: 'Failed to fetch maintenance history' });
    }
});

// Schedule maintenance
router.post('/schedule', 
    isAdmin,
    [
        body('startTime').isISO8601().withMessage('Start time must be a valid ISO 8601 date'),
        body('endTime').isISO8601().withMessage('End time must be a valid ISO 8601 date'),
        body('type').isIn(['quick', 'custom']).withMessage('Invalid maintenance type'),
        body('description').trim().notEmpty().withMessage('Description is required'),
        body('severity').isIn(['low', 'normal', 'high']).withMessage('Invalid severity level'),
    ],
    async (req, res) => {
        // Validate request
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        try {
            const { startTime, endTime, type, description, severity } = req.body;
            
            // Validate start time is not in the past
            if (new Date(startTime) < new Date()) {
                return res.status(400).json({ error: 'Start time cannot be in the past' });
            }

            // Validate end time is after start time
            if (new Date(endTime) <= new Date(startTime)) {
                return res.status(400).json({ error: 'End time must be after start time' });
            }

            const db = req.app.locals.db;

            // Check for overlapping maintenance
            const overlapping = await db.collection('maintenance').findOne({
                status: 'SCHEDULED',
                $or: [
                    {
                        startTime: { $lt: endTime },
                        endTime: { $gt: startTime }
                    }
                ]
            });

            if (overlapping) {
                return res.status(409).json({ error: 'Maintenance window overlaps with existing schedule' });
            }

            // Create maintenance record
            const maintenance = {
                startTime: new Date(startTime),
                endTime: new Date(endTime),
                type,
                description,
                severity,
                status: 'SCHEDULED',
                createdBy: req.session.user.username,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await db.collection('maintenance').insertOne(maintenance);
            res.status(201).json({ id: result.insertedId, ...maintenance });
        } catch (error) {
            console.error('Error scheduling maintenance:', error);
            res.status(500).json({ error: 'Failed to schedule maintenance' });
        }
    }
);

// Cancel maintenance
router.post('/:id/cancel', isAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const db = req.app.locals.db;

        // Find and update maintenance status
        const result = await db.collection('maintenance').findOneAndUpdate(
            { 
                _id: new ObjectId(id),
                status: 'SCHEDULED' // Only allow cancellation of scheduled maintenance
            },
            {
                $set: {
                    status: 'CANCELLED',
                    updatedAt: new Date(),
                    cancelledBy: req.session.user.username
                }
            },
            { returnDocument: 'after' }
        );

        if (!result.value) {
            return res.status(404).json({ error: 'Maintenance not found or already cancelled' });
        }

        res.json(result.value);
    } catch (error) {
        console.error('Error cancelling maintenance:', error);
        res.status(500).json({ error: 'Failed to cancel maintenance' });
    }
});

// Get upcoming maintenance
router.get('/upcoming', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const upcomingMaintenance = await db.collection('maintenance')
            .find({
                status: 'SCHEDULED',
                startTime: { $gt: new Date() }
            })
            .sort({ startTime: 1 })
            .limit(1)
            .toArray();

        res.json(upcomingMaintenance[0] || null);
    } catch (error) {
        console.error('Error fetching upcoming maintenance:', error);
        res.status(500).json({ error: 'Failed to fetch upcoming maintenance' });
    }
});

// Update maintenance status (for system use)
router.post('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['IN_PROGRESS', 'COMPLETED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const db = req.app.locals.db;
        const result = await db.collection('maintenance').findOneAndUpdate(
            { _id: new ObjectId(id) },
            {
                $set: {
                    status,
                    updatedAt: new Date()
                }
            },
            { returnDocument: 'after' }
        );

        if (!result.value) {
            return res.status(404).json({ error: 'Maintenance not found' });
        }

        res.json(result.value);
    } catch (error) {
        console.error('Error updating maintenance status:', error);
        res.status(500).json({ error: 'Failed to update maintenance status' });
    }
});

module.exports = router;
