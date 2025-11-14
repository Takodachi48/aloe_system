// Helper function to format bytes
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

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
            
            // Check if the detected plant is aloe vera
            const aloeDiseases = ['healthy', 'leaf_spot', 'root_rot', 'sunburn'];
            const diseaseKey = analysisResult.diseaseKey || '';
            const confidence = analysisResult.confidence || 0;
            const predictions = analysisResult.all_predictions || {};
            
            // Get top two predictions
            const sortedPredictions = Object.entries(predictions).sort((a, b) => b[1] - a[1]);
            const topPrediction = sortedPredictions[0] || [];
            const secondPrediction = sortedPredictions[1] || [];
            const confidenceGap = (topPrediction[1] || 0) - (secondPrediction[1] || 0);
            
            // Set thresholds
            const isRootRot = diseaseKey === 'root_rot';
            const isSunburn = diseaseKey === 'sunburn';
            const isHealthy = diseaseKey === 'healthy';
            
            const minConfidence = isRootRot ? 85 : (
                isSunburn ? 65 : (
                    isHealthy ? 75 : 80
                )
            );
            const minGap = isRootRot ? 25 : (
                isSunburn ? 10 : 20
            );
            
            const isConfidentEnough = confidence >= minConfidence;
            const hasSignificantGap = confidenceGap >= minGap;
            const isAloeDisease = aloeDiseases.includes(diseaseKey);
            const isAloeVera = isAloeDisease && isConfidentEnough && hasSignificantGap;
            
            console.log('Aloe verification:', {
                diseaseKey,
                confidence,
                isAloeDisease,
                minConfidence,
                minGap,
                confidenceCheck: isConfidentEnough,
                confidenceGap,
                hasSignificantGap,
                isAloeVera,
                predictions: sortedPredictions
            });
            
            if (!isAloeVera) {
                return res.status(400).json({
                    success: false,
                    error: 'Not an Aloe Vera plant',
                    message: 'The uploaded image does not appear to be an Aloe Vera plant. Please upload a clear photo of an Aloe Vera leaf.',
                    analysisData: {
                        ...analysisResult,
                        isAloeVera: false
                    }
                });
            }
        } catch (mlError) {
            console.error('ML service error:', mlError.message);
            if (process.env.NODE_ENV === 'development') {
                // Only use fallback in development for testing
                analysisResult = mlService.getFallbackPrediction();
                console.log('Using fallback prediction in development mode:', JSON.stringify(analysisResult));
            } else {
                throw new Error('Failed to analyze the image. Please try again with a clearer photo.');
            }
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
// Export all images sorted by disease type
const archiver = require('archiver');
const fetch = require('node-fetch');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const { cloudinary } = require('../services/cloudinary');
const { getDb } = require('../database/database');
const { ObjectId } = require('mongodb');

// Generate PDF Report
router.post('/export/report', authMiddleware, async (req, res) => {
    try {
        const { startDate, endDate, period } = req.body;
        
        // Set date range based on period if specific dates not provided
        let query = {};
        const now = new Date();
        
        if (startDate && endDate) {
            query.created_at = {
                $gte: new Date(startDate),
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
            };
        } else if (period) {
            const start = new Date();
            if (period === 'daily') {
                start.setDate(now.getDate() - 1);
            } else if (period === 'weekly') {
                start.setDate(now.getDate() - 7);
            } else if (period === 'monthly') {
                start.setMonth(now.getMonth() - 1);
            }
            query.created_at = { $gte: start, $lte: now };
        }

        const db = getDb();
        
        // Create date filter for all queries
        const dateFilter = query.created_at ? { 
            created_at: { 
                $gte: query.created_at.$gte,
                $lte: query.created_at.$lte
            } 
        } : {};

        // Fetch all required data in parallel
        const [
            analyses,
            diseaseStats,
            responseTimeData,
            uptimeData,
            dailyScansData,
            hourlyActivityData,
            cloudinaryStats
        ] = await Promise.all([
            // Get analysis data
            db.collection('analysis_history').find(dateFilter).toArray(),
            
            // Get disease statistics
            db.collection('analysis_history').aggregate([
                {
                    $match: dateFilter
                },
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
                { $sort: { count: -1 } }
            ]).toArray(),
            
            // Get response time data
            db.collection('response_times')
                .find(query.created_at ? { 
                    timestamp: { 
                        $gte: query.created_at.$gte, 
                        $lte: query.created_at.$lte 
                    } 
                } : {})
                .sort({ timestamp: -1 })
                .limit(1000)
                .toArray(),
            
            // Get uptime data
            db.collection('uptime_events')
                .find({})
                .sort({ timestamp: -1 })
                .toArray(),
            
            // Get daily scans
            db.collection('analysis_history').aggregate([
                {
                    $match: dateFilter
                },
                {
                    $group: {
                        _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]).toArray(),
            
            // Get hourly activity
            db.collection('analysis_history').aggregate([
                {
                    $match: dateFilter
                },
                {
                    $group: {
                        _id: { $hour: '$created_at' },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { _id: 1 } }
            ]).toArray(),
            
            // Get Cloudinary stats (simplified approach)
            db.collection('analysis_history').aggregate([
                {
                    $project: {
                        mimeType: 1,
                        fileSize: { $ifNull: ['$fileSize', 0] },
                        fileType: {
                            $cond: {
                                if: { $ifNull: ['$mimeType', false] },
                                then: { $arrayElemAt: [{ $split: ['$mimeType', '/'] }, 0] },
                                else: 'unknown'
                            }
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalFiles: { $sum: 1 },
                        totalSize: { $sum: '$fileSize' },
                        filesByType: {
                            $push: {
                                type: '$fileType',
                                size: '$fileSize'
                            }
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        totalFiles: 1,
                        totalSize: 1,
                        filesByType: {
                            $reduce: {
                                input: '$filesByType',
                                initialValue: [],
                                in: {
                                    $let: {
                                        vars: {
                                            existingIndex: {
                                                $indexOfArray: [
                                                    '$$value.type',
                                                    '$$this.type'
                                                ]
                                            },
                                            currentItem: '$$this'
                                        },
                                        in: {
                                            $cond: [
                                                { $ne: ['$$existingIndex', -1] },
                                                {
                                                    $map: {
                                                        input: '$$value',
                                                        as: 'item',
                                                        in: {
                                                            $cond: [
                                                                { $eq: ['$$item.type', '$$currentItem.type'] },
                                                                {
                                                                    type: '$$item.type',
                                                                    count: { $add: ['$$item.count', 1] },
                                                                    size: { $add: ['$$item.size', '$$currentItem.size'] }
                                                                },
                                                                '$$item'
                                                            ]
                                                        }
                                                    }
                                                },
                                                {
                                                    $concatArrays: [
                                                        '$$value',
                                                        [{
                                                            type: '$$currentItem.type',
                                                            count: 1,
                                                            size: '$$currentItem.size'
                                                        }]
                                                    ]
                                                }
                                            ]
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            ]).toArray()
        ]);
        
        // Process response time data
        const responseTimes = responseTimeData.map(rt => rt.duration_ms);
        const avgResponseTime = responseTimes.length > 0 ? 
            responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0;
        const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
        const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
        
        // Process uptime data
        const uptimeEvents = uptimeData || [];
        const downEvents = uptimeEvents.filter(e => e.event_type === 'down' || e.status === 'down');
        let downtime = downEvents.reduce((total, event, index, array) => {
            const nextEvent = array[index + 1];
            if (nextEvent) {
                return total + (new Date(nextEvent.timestamp) - new Date(event.timestamp));
            }
            return total;
        }, 0);
        
        // Process daily scans
        const dailyScans = {};
        dailyScansData.forEach(item => {
            dailyScans[item._id] = item.count;
        });
        
        // Process hourly activity
        const hourlyActivity = Array(24).fill(0);
        hourlyActivityData.forEach(item => {
            const hour = parseInt(item._id);
            if (hour >= 0 && hour < 24) {
                hourlyActivity[hour] = item.count;
            }
        });
        
        // Process Cloudinary stats - use the Cloudinary API directly for accurate storage info
        let cloudinaryInfo = { totalFiles: 0, totalSize: 0, filesByType: [] };
        let storageUsedMB = 0;
        
        try {
            // Get Cloudinary usage data
            const cloudinary = require('../services/cloudinary').cloudinary;
            const allResources = await cloudinary.api.resources({
                max_results: 500,
                type: 'upload'
            });
            
            // Calculate total storage used
            const totalBytesUsed = allResources.resources.reduce((sum, resource) => {
                return sum + (resource.bytes || 0);
            }, 0);
            
            storageUsedMB = (totalBytesUsed / (1024 * 1024)).toFixed(2);
            
            // Group by file type
            const filesByType = allResources.resources.reduce((acc, resource) => {
                const type = resource.format || 'unknown';
                if (!acc[type]) {
                    acc[type] = { count: 0, size: 0 };
                }
                acc[type].count += 1;
                acc[type].size += resource.bytes || 0;
                return acc;
            }, {});
            
            // Convert to array format
            cloudinaryInfo = {
                totalFiles: allResources.resources.length,
                totalSize: totalBytesUsed,
                filesByType: Object.entries(filesByType).map(([type, data]) => ({
                    type,
                    count: data.count,
                    size: data.size
                }))
            };
            
            console.log('Cloudinary storage info:', {
                totalFiles: cloudinaryInfo.totalFiles,
                totalSize: formatBytes(cloudinaryInfo.totalSize),
                filesByType: cloudinaryInfo.filesByType.map(f => ({
                    type: f.type,
                    count: f.count,
                    size: formatBytes(f.size)
                }))
            });
            
        } catch (error) {
            console.error('Error fetching Cloudinary storage info:', error);
            // Fall back to database if Cloudinary API fails
            cloudinaryInfo = cloudinaryStats[0] || { totalFiles: 0, totalSize: 0, filesByType: [] };
            storageUsedMB = cloudinaryInfo.totalSize ? (cloudinaryInfo.totalSize / (1024 * 1024)).toFixed(2) : 0;
        }
        
        // Create PDF
        const doc = new PDFDocument({ margin: 50 });
        
        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="aloe-report-${new Date().toISOString().split('T')[0]}.pdf"`);
        
        // Pipe PDF to response
        doc.pipe(res);
        
        // Add content to PDF
        doc.fontSize(20).text('AloeShield Analytics Report', { align: 'center' });
        
        // Date range
        const dateRange = startDate && endDate 
            ? `${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`
            : period ? `Last ${period}` : 'All Time';
            
        doc.fontSize(12).text(`Report Period: ${dateRange}`, { align: 'center' });
        doc.moveDown();
        
        // 1. Summary Section
        doc.fontSize(16).text('1. Summary', { underline: true });
        doc.moveDown(0.5);
        
        doc.fontSize(12).text('Total Scans: ' + analyses.length, { continued: true });
        doc.text(` (${analyses.length > 0 ? (analyses.reduce((sum, a) => sum + (a.confidence || 0), 0) / analyses.length).toFixed(2) : 0}% avg confidence)`, { underline: false });
        
        doc.text(`Detected Categories: ${new Set(analyses.map(a => a.disease_name)).size} unique diseases`);
        doc.text(`Cloudinary Storage: ${storageUsedMB} MB used (${cloudinaryInfo.totalFiles || 0} files)`);
        doc.moveDown();
        
        // 2. Disease Statistics
        doc.addPage().fontSize(16).text('2. Disease Statistics', { underline: true });
        doc.moveDown(0.5);
        
        if (diseaseStats.length > 0) {
            // Define table layout
            const tableTop = doc.y + 20;
            const tableLeft = 50;
            const rowHeight = 25;
            const colWidths = [200, 70, 100, 70, 70];
            const headerHeight = 25;
            
            // Draw table headers with background
            doc.rect(tableLeft, tableTop, colWidths.reduce((a, b) => a + b, 0), headerHeight)
               .fillAndStroke('#f0f0f0', '#333333');
            
            let x = tableLeft;
            const headers = ['Disease', 'Scans', 'Avg Confidence', 'Min', 'Max'];
            
            // Draw header text
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
            headers.forEach((header, i) => {
                doc.text(header, x + 5, tableTop + 7, {
                    width: colWidths[i] - 10,
                    align: i > 0 ? 'right' : 'left',
                    lineGap: 2,
                    ellipsis: true
                });
                x += colWidths[i];
            });
            
            // Draw table rows
            doc.font('Helvetica').fontSize(10).fillColor('#000000');
            diseaseStats.forEach((disease, index) => {
                const y = tableTop + headerHeight + (index * rowHeight);
                
                // Alternate row background for better readability
                if (index % 2 === 0) {
                    doc.rect(tableLeft, y, colWidths.reduce((a, b) => a + b, 0), rowHeight)
                       .fillAndStroke('#f9f9f9', '#dddddd');
                } else {
                    // Ensure odd rows have white background
                    doc.rect(tableLeft, y, colWidths.reduce((a, b) => a + b, 0), rowHeight)
                       .fillAndStroke('#ffffff', '#dddddd');
                }
                
                // Prepare cell values
                const diseaseName = disease.diseaseName || 'Unknown';
                const count = disease.count.toString();
                const avgConf = disease.avgConfidence ? `${disease.avgConfidence.toFixed(2)}%` : 'N/A';
                const minConf = disease.minConfidence ? `${disease.minConfidence.toFixed(2)}%` : 'N/A';
                const maxConf = disease.maxConfidence ? `${disease.maxConfidence.toFixed(2)}%` : 'N/A';
                
                // Draw cell content with explicit colors
                x = tableLeft;
                [diseaseName, count, avgConf, minConf, maxConf].forEach((text, i) => {
                    // Ensure text is black for visibility
                    doc.fillColor('#000000');
                    doc.text(text, x + 5, y + 7, {
                        width: colWidths[i] - 10,
                        align: i > 0 ? 'right' : 'left',
                        lineGap: 2,
                        ellipsis: true
                    });
                    x += colWidths[i];
                });
                
                // Draw horizontal line
                doc.moveTo(tableLeft, y + rowHeight)
                   .lineTo(tableLeft + colWidths.reduce((a, b) => a + b, 0), y + rowHeight)
                   .stroke();
            });
            
            // Add some space after the table
            doc.moveDown(2);
            
            // Add summary statistics with better formatting
            const totalScans = diseaseStats.reduce((sum, d) => sum + d.count, 0);
            const summaryY = doc.y + 10;
            
            // Draw a subtle background for the summary
            doc.rect(tableLeft, summaryY - 5, colWidths.reduce((a, b) => a + b, 0), 30)
               .fillAndStroke('#f8f9fa', '#e9ecef');
            
            // Add summary text with better spacing
            doc.font('Helvetica-Bold').fontSize(12).fillColor('#2c3e50');
            doc.text('Summary Statistics', tableLeft + 5, summaryY, {
                width: colWidths.reduce((a, b) => a + b, 0) - 10,
                align: 'left',
                lineGap: 5
            });
            
            // Add stats with proper alignment
            doc.font('Helvetica').fontSize(11).fillColor('#495057');
            doc.text(`• Total Diseases: ${diseaseStats.length}`, tableLeft + 10, summaryY + 15);
            doc.text(`• Total Scans: ${totalScans}`, tableLeft + 200, summaryY + 15, {
                width: 150,
                align: 'left'
            });
            
            // Add some space after the summary
            doc.moveDown(2);
        } else {
            doc.fontSize(12).text('No disease data available for the selected period.');
        }
        
        // 3. System Performance
        doc.addPage().fontSize(16).text('3. System Performance', { underline: true });
        doc.moveDown(0.5);
        
        doc.fontSize(12).text('Server Response Time (ms):');
        doc.text(`  • Average: ${avgResponseTime.toFixed(2)}`);
        doc.text(`  • Minimum: ${minResponseTime.toFixed(2)}`);
        doc.text(`  • Maximum: ${maxResponseTime.toFixed(2)}`);
        doc.moveDown();
        
        doc.text('Uptime/Downtime:');
        doc.text(`  • Total Downtime: ${(downtime / (1000 * 60)).toFixed(2)} minutes`);
        doc.text(`  • Last Downtime: ${downEvents[0] ? new Date(downEvents[0].timestamp).toLocaleString() : 'Never'}`);
        doc.moveDown();
        
        
        // 5. Storage Information
        doc.addPage().fontSize(16).text('5. Storage Information', { underline: true });
        doc.moveDown(0.5);
        
        // Calculate total storage used from filesByType if available
        const totalStorageBytes = cloudinaryInfo.filesByType?.reduce((sum, type) => sum + (type.size || 0), 0) || 0;
        const totalStorageMB = (totalStorageBytes / (1024 * 1024)).toFixed(2);
        
        // Draw storage info in a clean layout
        const storageLeft = 50;
        const storageWidth = 250;
        let storageY = doc.y;
        
        // Total files and storage
        doc.font('Helvetica-Bold').fontSize(12).fillColor('#2c3e50');
        doc.text('Storage Summary', storageLeft, storageY);
        
        doc.font('Helvetica').fontSize(11).fillColor('#495057');
        storageY += 20;
        doc.text(`• Total Files: ${cloudinaryInfo.totalFiles || 0}`, storageLeft, storageY);
        doc.text(`• Total Storage Used: ${totalStorageMB} MB`, storageLeft, storageY + 20);
        
        // Files by type section
        if (cloudinaryInfo.filesByType?.length > 0) {
            storageY += 50;
            doc.font('Helvetica-Bold').fontSize(12).fillColor('#2c3e50');
            doc.text('Files by Type:', storageLeft, storageY);
            
            // Draw files by type in a table
            const tableTop = storageY + 20;
            const colWidths = [150, 80, 100];
            const rowHeight = 20;
            
            // Table header
            doc.rect(storageLeft, tableTop, colWidths.reduce((a, b) => a + b, 0), 20)
               .fillAndStroke('#f0f0f0', '#333333');
            
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
            doc.text('File Type', storageLeft + 5, tableTop + 5, { width: colWidths[0] - 10 });
            doc.text('Count', storageLeft + colWidths[0], tableTop + 5, { width: colWidths[1] - 10, align: 'right' });
            doc.text('Size', storageLeft + colWidths[0] + colWidths[1], tableTop + 5, { width: colWidths[2] - 10, align: 'right' });
            
            // Table rows
            doc.font('Helvetica').fontSize(10);
            cloudinaryInfo.filesByType.forEach((typeInfo, index) => {
                const y = tableTop + 20 + (index * rowHeight);
                const sizeMB = (typeInfo.size / (1024 * 1024)).toFixed(2);
                
                // Alternate row background
                if (index % 2 === 0) {
                    doc.rect(storageLeft, y, colWidths.reduce((a, b) => a + b, 0), rowHeight)
                       .fillAndStroke('#f9f9f9', '#eeeeee');
                }
                
                // Draw row content
                doc.fillColor('#000000');
                doc.text(typeInfo.type || 'Unknown', storageLeft + 5, y + 5, { width: colWidths[0] - 10 });
                doc.text(typeInfo.count.toString(), storageLeft + colWidths[0], y + 5, { width: colWidths[1] - 10, align: 'right' });
                doc.text(`${sizeMB} MB`, storageLeft + colWidths[0] + colWidths[1], y + 5, { width: colWidths[2] - 10, align: 'right' });
                
                // Draw bottom border
                doc.moveTo(storageLeft, y + rowHeight)
                   .lineTo(storageLeft + colWidths.reduce((a, b) => a + b, 0), y + rowHeight)
                   .stroke();
            });
        }
        
        // Add footer
        doc.addPage()
           .fontSize(10)
           .text('Report generated on: ' + new Date().toLocaleString(), 50, doc.page.height - 100, {
               align: 'center',
               width: 500
           });
        
        // Finalize the PDF
        doc.end();
        
    } catch (error) {
        console.error('Error generating PDF report:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to generate report',
            error: error.message 
        });
    }
    
    // Helper function to draw tables
    function drawTable(doc, table, x, y, options = {}) {
        const { width = 500, padding = 10 } = options;
        const colWidth = width / table.headers.length;
        const rowHeight = 20;
        
        // Draw headers
        doc.font('Helvetica-Bold');
        table.headers.forEach((header, i) => {
            doc.text(header, x + (i * colWidth) + padding, y, {
                width: colWidth - (padding * 2),
                align: 'left'
            });
        });
        
        // Draw rows
        doc.font('Helvetica');
        table.rows.forEach((row, rowIndex) => {
            const rowY = y + ((rowIndex + 1) * rowHeight);
            row.forEach((cell, colIndex) => {
                doc.text(cell, x + (colIndex * colWidth) + padding, rowY, {
                    width: colWidth - (padding * 2),
                    align: 'left'
                });
            });
            
            // Add horizontal line
            doc.moveTo(x, rowY + rowHeight - 5)
               .lineTo(x + width, rowY + rowHeight - 5)
               .stroke();
        });
        
        // Add border
        doc.rect(x, y, width, (table.rows.length + 1) * rowHeight).stroke();
        
        // Add vertical lines between columns
        for (let i = 1; i < table.headers.length; i++) {
            doc.moveTo(x + (i * colWidth), y)
               .lineTo(x + (i * colWidth), y + ((table.rows.length + 1) * rowHeight))
               .stroke();
        }
    }
});

// Get all analysis records with their corresponding Cloudinary resources
async function getAnalysisWithImages() {
    try {
        const db = getDb();
        const analysisCollection = db.collection('analysis_history');
        
        // Get all analysis records with required fields
        const analyses = await analysisCollection.find({}, {
            projection: {
                _id: 0,
                analysis_id: 1,
                disease_name: 1,
                filename: 1,
                image_path: 1,
                created_at: 1
            }
        }).sort({ created_at: -1 }).toArray();
        
        if (!analyses || analyses.length === 0) {
            console.log('No analysis records found in database');
            return [];
        }
        
        console.log(`Found ${analyses.length} analysis records`);
        
        // Get all resources from Cloudinary
        const cloudinaryResources = [];
        let nextCursor = null;
        
        do {
            const result = await cloudinary.api.resources({
                type: 'upload',
                resource_type: 'image',
                max_results: 500,
                next_cursor: nextCursor
            });
            
            if (result.resources && result.resources.length > 0) {
                cloudinaryResources.push(...result.resources);
            }
            
            nextCursor = result.next_cursor;
        } while (nextCursor);
        
        console.log(`Found ${cloudinaryResources.length} images in Cloudinary`);
        
        // Create a map of public_id to analysis for quick lookup
        const analysisMap = new Map();
        console.log('Analysis records filenames:');
        analyses.forEach(analysis => {
            if (analysis.filename) {
                // Store both prefixed and non-prefixed versions in the map
                const cleanFilename = analysis.filename.replace(/^aloeshield\//, '');
                const prefixedFilename = analysis.filename.startsWith('aloeshield/') ? analysis.filename : `aloeshield/${analysis.filename}`;
                
                console.log(`- ${cleanFilename} (disease: ${analysis.disease_name || 'Unknown'})`);
                
                // Map both versions to the same analysis
                analysisMap.set(cleanFilename, analysis);
                analysisMap.set(prefixedFilename, analysis);
            }
        });
        
        // Group resources by disease name
        const groupedByDisease = new Map();
        let matchCount = 0;
        
        console.log('Cloudinary resources:');
        for (const resource of cloudinaryResources) {
            try {
                // Get the public_id and create a version without the 'aloeshield/' prefix
                let publicId = resource.public_id;
                const cleanPublicId = publicId.replace(/^aloeshield\//, '');
                
                console.log(`- ${publicId} (type: ${resource.resource_type})`);
                
                // Try to find a match with both prefixed and non-prefixed versions
                const analysis = analysisMap.get(publicId) || analysisMap.get(cleanPublicId);
                
                // If still no match, try to match just the filename part
                const filename = publicId.split('/').pop();
                const analysisByFilename = analysis || Array.from(analysisMap.values())
                    .find(a => a.filename.includes(filename));
                    
                if (analysisByFilename && !analysis) {
                    console.log(`  ✓ Matched by filename: ${filename}`);
                }
                
                const matchedAnalysis = analysis || analysisByFilename;
                if (matchedAnalysis) {
                    matchCount++;
                    const diseaseName = matchedAnalysis.disease_name || 'Unknown';
                    if (!groupedByDisease.has(diseaseName)) {
                        groupedByDisease.set(diseaseName, []);
                    }
                    // Create a clean directory name from the disease name
                    const cleanDiseaseName = diseaseName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    // Get just the filename part for the output
                    const outputFilename = publicId.split('/').pop();
                    
                    groupedByDisease.get(diseaseName).push({
                        resource,
                        analysis: matchedAnalysis,
                        filename: `${cleanDiseaseName}/${outputFilename}`
                    });
                    console.log(`  ✓ Matched with analysis record (disease: ${diseaseName})`);
                    console.log(`  ✓ Matched with analysis record (disease: ${diseaseName})`);
                } else {
                    console.log(`  ✗ No matching analysis record found`);
                }
            } catch (error) {
                console.error('Error processing resource:', error);
            }
        }
        
        const result = Array.from(groupedByDisease.entries())
            .sort(([diseaseA], [diseaseB]) => diseaseA.localeCompare(diseaseB));
            
        console.log(`Matching complete. Found ${matchCount} matches across ${result.length} disease types.`);
        if (matchCount === 0 && analyses.length > 0 && cloudinaryResources.length > 0) {
            console.log('Debug info - Sample analysis filenames:', analyses.slice(0, 3).map(a => a.filename));
            console.log('Debug info - Sample Cloudinary public_ids:', cloudinaryResources.slice(0, 3).map(r => r.public_id));
        }
        
        return result;
            
    } catch (error) {
        console.error('Error in getAnalysisWithImages:', {
            message: error.message,
            stack: error.stack
        });
        throw error;
    }
}

router.post('/export/images', authMiddleware, async (req, res) => {
    let archive;
    let output;
    let zipPath;
    
    try {
        const userId = req.user.userId;
        console.log('Starting export for user:', userId);
        
        // Get all analysis data with images, grouped by disease
        const diseaseGroups = await getAnalysisWithImages();
        
        if (diseaseGroups.length === 0) {
            console.log('No analysis data with images found');
            return res.status(404).json({
                error: 'No data found',
                message: 'No analysis data with images found'
            });
        }
        
        // Create a temporary directory for the zip file
        const tempDir = path.join(__dirname, '../../temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        
        zipPath = path.join(tempDir, `export_${Date.now()}.zip`);
        output = fs.createWriteStream(zipPath);
        archive = archiver('zip', { zlib: { level: 9 } });
        
        // Set up the archive
        archive.pipe(output);
        
        // Process each disease group
        console.log(`Processing ${diseaseGroups.length} disease groups...`);
        
        for (const [diseaseName, items] of diseaseGroups) {
            console.log(`Processing ${items.length} images for disease: ${diseaseName}`);
            
            for (const { resource, filename } of items) {
                try {
                    const ext = resource.format || 'jpg';
                    const destPath = filename.endsWith(`.${ext}`) ? filename : `${filename}.${ext}`;
                    
                    console.log(`Adding ${destPath} to archive...`);
                    
                    // Fetch the image and add it to the archive
                    const response = await fetch(resource.secure_url);
                    if (!response.ok) {
                        console.error(`Failed to fetch ${resource.secure_url}: ${response.statusText}`);
                        continue;
                    }
                    
                    const buffer = await response.buffer();
                    archive.append(buffer, { name: destPath });
                    
                } catch (error) {
                    console.error(`Error processing file ${resource.public_id}:`, error);
                }
            }
        }
        
        // Finalize the archive
        await archive.finalize();
        
        // Set up the response
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="export_${Date.now()}.zip"`);
        
        // Stream the file
        const fileStream = fs.createReadStream(zipPath);
        fileStream.pipe(res);
        
        // Clean up the temporary file after sending
        fileStream.on('end', () => {
            fs.unlink(zipPath, (err) => {
                if (err) console.error('Error deleting temporary zip file:', err);
            });
        });
        
        console.log('Export completed successfully');
        
    } catch (error) {
        console.error('Export error:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data
        });
        
        // Clean up any partially created files
        if (archive) {
            try { await archive.finalize(); } catch (e) {}
        }
        
        if (!res.headersSent) {
            res.status(500).json({
                error: 'Export failed',
                message: error.message || 'An error occurred while exporting the images',
                details: process.env.NODE_ENV === 'development' ? error.stack : undefined
            });
        }
    }
});

module.exports = router;
