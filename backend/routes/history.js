const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const database = require('../database/database');

const router = express.Router();

// Get user's analysis history with pagination
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Validate pagination parameters
        if (page < 1 || limit < 1 || limit > 100) {
            return res.status(400).json({
                error: 'Invalid pagination parameters',
                message: 'Page must be >= 1 and limit must be between 1 and 100'
            });
        }

        // Get user's history only
        const collection = database.db.collection('analysis_history');
        const history = await collection
            .find({ user_id: userId })
            .project({
                analysis_id: 1,
                original_filename: 1,
                disease_name: 1,
                confidence: 1,
                status: 1,
                severity: 1,
                created_at: 1,
                thumbnail_path: 1
            })
            .sort({ created_at: -1 })
            .skip(offset)
            .limit(limit)
            .toArray();

        // Get total count for this user
        const totalCount = await collection.countDocuments({ user_id: userId });

        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            success: true,
            data: {
                analyses: history,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalItems: totalCount,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({
            error: 'Failed to retrieve history',
            message: 'An error occurred while retrieving analysis history'
        });
    }
});

// Get analysis history filtered by disease type
router.get('/disease/:diseaseKey', async (req, res) => {
    try {
        const { diseaseKey } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Validate pagination parameters
        if (page < 1 || limit < 1 || limit > 100) {
            return res.status(400).json({
                error: 'Invalid pagination parameters',
                message: 'Page must be >= 1 and limit must be between 1 and 100'
            });
        }

        const collection = database.db.collection('analysis_history');
        
        const history = await collection
            .find({ disease_key: diseaseKey })
            .project({
                analysis_id: 1,
                original_filename: 1,
                disease_name: 1,
                confidence: 1,
                status: 1,
                severity: 1,
                created_at: 1,
                thumbnail_path: 1
            })
            .sort({ created_at: -1 })
            .skip(offset)
            .limit(limit)
            .toArray();

        // Get total count for this disease type
        const totalCount = await collection.countDocuments({ disease_key: diseaseKey });

        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            success: true,
            data: {
                diseaseKey: diseaseKey,
                analyses: history,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalItems: totalCount,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Get disease history error:', error);
        res.status(500).json({
            error: 'Failed to retrieve disease history',
            message: 'An error occurred while retrieving disease-specific history'
        });
    }
});

// Get analysis history filtered by status (healthy, warning, danger)
router.get('/status/:status', async (req, res) => {
    try {
        const { status } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Validate status parameter
        const validStatuses = ['healthy', 'warning', 'danger'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Invalid status',
                message: 'Status must be one of: healthy, warning, danger'
            });
        }

        // Validate pagination parameters
        if (page < 1 || limit < 1 || limit > 100) {
            return res.status(400).json({
                error: 'Invalid pagination parameters',
                message: 'Page must be >= 1 and limit must be between 1 and 100'
            });
        }

        const collection = database.db.collection('analysis_history');
        
        const history = await collection
            .find({ status: status })
            .project({
                analysis_id: 1,
                original_filename: 1,
                disease_name: 1,
                confidence: 1,
                status: 1,
                severity: 1,
                created_at: 1,
                thumbnail_path: 1
            })
            .sort({ created_at: -1 })
            .skip(offset)
            .limit(limit)
            .toArray();

        // Get total count for this status
        const totalCount = await collection.countDocuments({ status: status });

        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            success: true,
            data: {
                status: status,
                analyses: history,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalItems: totalCount,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Get status history error:', error);
        res.status(500).json({
            error: 'Failed to retrieve status history',
            message: 'An error occurred while retrieving status-specific history'
        });
    }
});

// Get analysis history within date range
router.get('/date-range', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        // Validate date parameters
        if (!startDate || !endDate) {
            return res.status(400).json({
                error: 'Missing date parameters',
                message: 'Both startDate and endDate are required (YYYY-MM-DD format)'
            });
        }

        // Validate date format (basic check)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
            return res.status(400).json({
                error: 'Invalid date format',
                message: 'Dates must be in YYYY-MM-DD format'
            });
        }

        // Validate pagination parameters
        if (page < 1 || limit < 1 || limit > 100) {
            return res.status(400).json({
                error: 'Invalid pagination parameters',
                message: 'Page must be >= 1 and limit must be between 1 and 100'
            });
        }

        const collection = database.db.collection('analysis_history');
        
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Include the entire end date
        
        const history = await collection
            .find({
                created_at: {
                    $gte: start,
                    $lte: end
                }
            })
            .project({
                analysis_id: 1,
                original_filename: 1,
                disease_name: 1,
                confidence: 1,
                status: 1,
                severity: 1,
                created_at: 1,
                thumbnail_path: 1
            })
            .sort({ created_at: -1 })
            .skip(offset)
            .limit(limit)
            .toArray();

        // Get total count for this date range
        const totalCount = await collection.countDocuments({
            created_at: {
                $gte: start,
                $lte: end
            }
        });

        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            success: true,
            data: {
                dateRange: { startDate, endDate },
                analyses: history,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalItems: totalCount,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Get date range history error:', error);
        res.status(500).json({
            error: 'Failed to retrieve date range history',
            message: 'An error occurred while retrieving history for the specified date range'
        });
    }
});

// Search analysis history
router.get('/search/:query', async (req, res) => {
    try {
        const { query } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        if (!query || query.trim().length < 2) {
            return res.status(400).json({
                error: 'Invalid search query',
                message: 'Search query must be at least 2 characters long'
            });
        }

        // Validate pagination parameters
        if (page < 1 || limit < 1 || limit > 100) {
            return res.status(400).json({
                error: 'Invalid pagination parameters',
                message: 'Page must be >= 1 and limit must be between 1 and 100'
            });
        }

        const collection = database.db.collection('analysis_history');
        
        const searchRegex = new RegExp(query, 'i'); // Case-insensitive search
        
        const history = await collection
            .find({
                $or: [
                    { original_filename: searchRegex },
                    { disease_name: searchRegex },
                    { description: searchRegex }
                ]
            })
            .project({
                analysis_id: 1,
                original_filename: 1,
                disease_name: 1,
                confidence: 1,
                status: 1,
                severity: 1,
                created_at: 1,
                thumbnail_path: 1
            })
            .sort({ created_at: -1 })
            .skip(offset)
            .limit(limit)
            .toArray();

        // Get total count for search results
        const totalCount = await collection.countDocuments({
            $or: [
                { original_filename: searchRegex },
                { disease_name: searchRegex },
                { description: searchRegex }
            ]
        });

        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            success: true,
            data: {
                searchQuery: query,
                analyses: history,
                pagination: {
                    currentPage: page,
                    totalPages: totalPages,
                    totalItems: totalCount,
                    itemsPerPage: limit,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Search history error:', error);
        res.status(500).json({
            error: 'Search failed',
            message: 'An error occurred while searching analysis history'
        });
    }
});

module.exports = router;
