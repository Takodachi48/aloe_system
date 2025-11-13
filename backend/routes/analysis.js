const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { authMiddleware } = require('../middleware/auth');
const database = require('../database/database');
const mlService = require('../services/mlService');

const router = express.Router();

const DiseaseDatabase = {
    'healthy': {
        name: 'Healthy',
        severity: 'low',
        riskCategory: 'Healthy',
        riskDescription: 'Plant appears to be in good condition.',
        description: 'Plant appears healthy with no visible signs of disease or stress.',
        causes: [],
        treatments: ['Maintain current watering schedule', 'Ensure adequate sunlight', 'Monitor regularly'],
        prevention: ['Regular inspection', 'Proper watering', 'Good drainage']
    },
    'light_leaf_spot': {
        name: 'Light Leaf Spot',
        severity: 'low',
        riskCategory: 'Minor / Easily Treatable',
        riskDescription: 'Responds well to basic treatment or isolation.',
        description: 'Early fungal infection causing light spots on leaves. Easily manageable with quick intervention.',
        causes: ['High humidity', 'Poor air circulation', 'Minor water stress'],
        treatments: ['Remove affected leaves', 'Apply mild fungicide', 'Improve ventilation'],
        prevention: ['Avoid overhead watering', 'Ensure good air circulation', 'Remove fallen debris']
    },

    'root_rot': {
        name: 'Root Rot',
        severity: 'high',
        riskCategory: 'Difficult / Severe',
        riskDescription: 'Hard to treat, often requires continuous management.',
        description: 'Root system damage from excessive moisture. Severe condition requiring immediate intervention and ongoing monitoring.',
        causes: ['Prolonged overwatering', 'Very poor drainage', 'Contaminated soil'],
        treatments: ['Significantly reduce watering', 'Repot with fresh soil', 'Remove dead root tissue', 'Consider root treatment fungicide'],
        prevention: ['Well-draining soil', 'Strict watering schedule', 'Continuous soil moisture monitoring']
    },
    'aloe_rust': {
        name: 'Aloe Rust',
        severity: 'high',
        riskCategory: 'Persistent / Recurrent',
        riskDescription: 'Commonly reappears even after treatment.',
        description: 'Fungal disease causing rust-colored pustules. Known for recurring even after treatment, especially in humid climates.',
        causes: ['High humidity', 'Poor ventilation', 'Infected plant material', 'Warm temperatures'],
        treatments: ['Isolate affected plant', 'Apply strong fungicide', 'Remove infected tissue', 'Maintain low humidity'],
        prevention: ['Quarantine new plants', 'Regular inspection', 'Excellent air circulation', 'Climate control']
    },
    'bacterial_soft_rot': {
        name: 'Bacterial Soft Rot',
        severity: 'high',
        riskCategory: 'Difficult / Severe',
        riskDescription: 'Hard to treat, often requires continuous management.',
        description: 'Bacterial infection causing rapid tissue breakdown. Severe condition with high risk of plant loss.',
        causes: ['Wounds or damage to plant', 'High moisture levels', 'Poor sanitation practices'],
        treatments: ['Immediately remove damaged tissue', 'Reduce humidity significantly', 'Improve air circulation greatly', 'Apply bactericide'],
        prevention: ['Avoid physical damage', 'Sanitize all tools', 'Maintain strict hygiene', 'Monitor for entry wounds']
    }
};

// Analyze image endpoint - requires authentication
router.post('/analyze', authMiddleware, async (req, res) => {
    try {
        const { filename, originalName, fileSize, mimeType, potName } = req.body;

        if (!filename) {
            return res.status(400).json({
                error: 'Missing filename',
                message: 'Filename is required for analysis'
            });
        }

        // Get upload record from database to verify ownership
        const { getDb } = require('../database/database');
        const db = getDb();
        const uploadsCollection = db.collection('uploads');
        
        const uploadRecord = await uploadsCollection.findOne({
            filename: filename,
            userId: req.user.userId,
            isActive: true
        });

        if (!uploadRecord) {
            return res.status(404).json({
                error: 'File not found',
                message: 'The specified image file was not found or you do not have permission to analyze it'
            });
        }

        const fileMetadata = {
            size: uploadRecord.size,
            uploadedAt: uploadRecord.uploadedAt
        };

        let analysisResult;
        
        try {
            analysisResult = await mlService.predictFromUrl(uploadRecord.cloudinaryUrl);
            console.log('Analysis result received:', JSON.stringify(analysisResult));
        } catch (mlError) {
            console.error('ML service error:', mlError.message);
            analysisResult = mlService.getFallbackPrediction();
            console.log('Using fallback prediction:', JSON.stringify(analysisResult));
        }

        // Generate unique analysis ID
        const analysisId = `analysis_${uuidv4()}`;

        // Prepare analysis data for database
        const analysisData = {
            analysisId: analysisId,
            userId: req.user.userId,
            filename: filename,
            originalFilename: originalName || filename,
            fileSize: fileSize || uploadRecord.size,
            fileType: mimeType || 'image/jpeg',
            diseaseKey: analysisResult.diseaseKey,
            diseaseName: analysisResult.disease,
            confidence: analysisResult.confidence,
            status: analysisResult.status,
            severity: analysisResult.severity,
            description: analysisResult.description,
            causes: analysisResult.causes,
            treatments: analysisResult.treatments,
            prevention: analysisResult.prevention,
            imagePath: uploadRecord.cloudinaryUrl,
            thumbnailPath: uploadRecord.thumbnailUrl,
            potName: potName || 'Unnamed Pot'
        };
        
        console.log('Analysis data to save:', JSON.stringify(analysisData));

        // Save to database
        const savedAnalysis = await database.saveAnalysis(analysisData);

        // Prepare response
        const response = {
            success: true,
            message: 'Analysis completed successfully',
            data: {
                analysisId: analysisId,
                potName: analysisData.potName || 'Unnamed Pot',
                ...analysisResult,
                timestamp: new Date().toISOString(),
                imagePath: analysisData.imagePath,
                thumbnailPath: analysisData.thumbnailPath,
                fileInfo: {
                    originalName: analysisData.originalFilename,
                    size: analysisData.fileSize,
                    type: analysisData.fileType
                }
            }
        };

        console.log('Response being sent:', JSON.stringify(response.data));
        res.json(response);

    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({
            error: 'Analysis failed',
            message: 'An error occurred during image analysis'
        });
    }
});

// Get analysis by ID - requires authentication and ownership
router.get('/:analysisId', authMiddleware, async (req, res) => {
    try {
        const { analysisId } = req.params;
        const userId = req.user.userId;

        // Check if user owns this analysis
        const { getDb } = require('../database/database');
        const db = getDb();
        const collection = db.collection('analysis_history');
        
        const analysis = await collection.findOne({
            analysis_id: analysisId,
            user_id: userId
        });

        if (!analysis) {
            return res.status(404).json({
                error: 'Analysis not found',
                message: 'The specified analysis was not found or you do not have permission to access it'
            });
        }

        res.json({
            success: true,
            data: analysis
        });

    } catch (error) {
        console.error('Get analysis error:', error);
        res.status(500).json({
            error: 'Failed to retrieve analysis',
            message: 'An error occurred while retrieving the analysis'
        });
    }
});

// Delete analysis and associated image
router.delete('/:analysisId', authMiddleware, async (req, res) => {
    try {
        const { analysisId } = req.params;
        const userId = req.user.userId;

        console.log('Delete attempt - analysisId:', analysisId, 'userId:', userId);

        // Get analysis record first
        const { getDb } = require('../database/database');
        const db = getDb();
        const analysisCollection = db.collection('analysis_history');
        
        // Try to find analysis with exact match first
        let analysis = await analysisCollection.findOne({
            analysis_id: analysisId,
            user_id: userId
        });

        // If not found, try without user_id check (debug)
        if (!analysis) {
            console.log('Analysis not found with user_id restriction, searching without user check');
            analysis = await analysisCollection.findOne({
                analysis_id: analysisId
            });
            
            if (analysis) {
                console.log('Analysis found but user_id mismatch. Stored user_id:', analysis.user_id, 'JWT userId:', userId);
                return res.status(403).json({
                    error: 'Permission denied',
                    message: 'You do not have permission to delete this analysis'
                });
            }
        }

        if (!analysis) {
            console.log('Analysis not found in database for analysisId:', analysisId);
            return res.status(404).json({
                error: 'Analysis not found',
                message: 'The specified analysis was not found'
            });
        }

        console.log('Analysis found, proceeding with deletion');

        // Get the upload record to find the Cloudinary public_id
        const uploadsCollection = db.collection('uploads');
        const uploadRecord = await uploadsCollection.findOne({
            filename: analysis.filename,
            userId: userId,
            isActive: true
        });

        // Delete from Cloudinary if upload record exists
        if (uploadRecord && uploadRecord.publicId) {
            const { deleteImage } = require('../services/cloudinary');
            try {
                await deleteImage(uploadRecord.publicId);
                console.log('Image deleted from Cloudinary:', uploadRecord.publicId);
            } catch (cloudinaryError) {
                console.error('Error deleting from Cloudinary:', cloudinaryError.message);
                // Continue with database deletion even if Cloudinary fails
            }

            // Mark upload as deleted
            await uploadsCollection.updateOne(
                { _id: uploadRecord._id },
                { $set: { isActive: false, deletedAt: new Date() } }
            );
        } else {
            console.log('No active upload record found for this analysis');
        }

        // Delete analysis record
        const deleteResult = await analysisCollection.deleteOne({
            analysis_id: analysisId,
            user_id: userId
        });

        console.log('Analysis deleted successfully, deletedCount:', deleteResult.deletedCount);

        res.json({
            success: true,
            message: 'Analysis and associated image deleted successfully'
        });

    } catch (error) {
        console.error('Delete analysis error:', error);
        res.status(500).json({
            error: 'Failed to delete analysis',
            message: 'An error occurred while deleting the analysis: ' + error.message
        });
    }
});

// Get disease information
router.get('/diseases/info', (req, res) => {
    try {
        const diseaseInfo = Object.entries(DiseaseDatabase).map(([key, disease]) => ({
            key: key,
            name: disease.name,
            severity: disease.severity,
            riskCategory: disease.riskCategory,
            riskDescription: disease.riskDescription,
            description: disease.description,
            causes: disease.causes,
            treatments: disease.treatments,
            prevention: disease.prevention
        }));

        res.json({
            success: true,
            data: diseaseInfo
        });

    } catch (error) {
        console.error('Get disease info error:', error);
        res.status(500).json({
            error: 'Failed to retrieve disease information',
            message: 'An error occurred while retrieving disease information'
        });
    }
});

// Get analysis statistics
router.get('/stats/summary', async (req, res) => {
    try {
        const stats = await database.getAnalysisStats();

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            error: 'Failed to retrieve statistics',
            message: 'An error occurred while retrieving analysis statistics'
        });
    }
});

// Update pot name for existing analysis
router.patch('/:analysisId/pot-name', authMiddleware, async (req, res) => {
    try {
        const { analysisId } = req.params;
        const { potName } = req.body;
        const userId = req.user.userId;

        if (!potName || potName.trim() === '') {
            return res.status(400).json({
                error: 'Invalid pot name',
                message: 'Pot name cannot be empty'
            });
        }

        // Check if user owns this analysis
        const { getDb } = require('../database/database');
        const db = getDb();
        const collection = db.collection('analysis_history');

        const analysis = await collection.findOne({
            analysis_id: analysisId,
            user_id: userId
        });

        if (!analysis) {
            return res.status(404).json({
                error: 'Analysis not found',
                message: 'The specified analysis was not found or you do not have permission to update it'
            });
        }

        // Update pot name
        const result = await collection.updateOne(
            { analysis_id: analysisId, user_id: userId },
            {
                $set: {
                    pot_name: potName.trim(),
                    updated_at: new Date()
                }
            }
        );

        if (result.modifiedCount === 0) {
            return res.status(500).json({
                error: 'Update failed',
                message: 'Failed to update pot name'
            });
        }

        res.json({
            success: true,
            message: 'Pot name updated successfully',
            data: {
                analysisId: analysisId,
                potName: potName.trim()
            }
        });

    } catch (error) {
        console.error('Update pot name error:', error);
        res.status(500).json({
            error: 'Update failed',
            message: 'An error occurred while updating the pot name'
        });
    }
});

module.exports = router;
