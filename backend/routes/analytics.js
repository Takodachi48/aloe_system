const express = require('express');
const router = express.Router();
const { getDb } = require('../database/database');
const { authMiddleware } = require('../middleware/auth');
const fs = require('fs').promises;
const path = require('path');

// Get dataset statistics
router.get('/dataset-stats', authMiddleware, async (req, res) => {
    try {
        // Path to the datasets directory (adjust as needed)
        const datasetsPath = path.join(__dirname, '..', 'ml_service', 'datasets');
        
        // Initialize result object
        const result = {
            train: {},
            validation: {}
        };

        // Function to count images in a directory
        async function countImages(dirPath) {
            try {
                const files = await fs.readdir(dirPath, { withFileTypes: true });
                // Count only files with image extensions
                return files.filter(file => 
                    file.isFile() && 
                    /\.(jpg|jpeg|png|gif|bmp)$/i.test(file.name)
                ).length;
            } catch (error) {
                console.error(`Error reading directory ${dirPath}:`, error);
                return 0;
            }
        }

        // Process train and validation directories
        const trainPath = path.join(datasetsPath, 'train');
        const valPath = path.join(datasetsPath, 'validation');
        
        try {
            // Process train directory
            const trainDirs = await fs.readdir(trainPath, { withFileTypes: true });
            for (const dir of trainDirs) {
                if (dir.isDirectory()) {
                    const dirPath = path.join(trainPath, dir.name);
                    const imageCount = await countImages(dirPath);
                    if (imageCount > 0) {
                        result.train[dir.name] = imageCount;
                    }
                }
            }
            
            // Process validation directory
            const valDirs = await fs.readdir(valPath, { withFileTypes: true });
            for (const dir of valDirs) {
                if (dir.isDirectory()) {
                    const dirPath = path.join(valPath, dir.name);
                    const imageCount = await countImages(dirPath);
                    if (imageCount > 0) {
                        result.validation[dir.name] = imageCount;
                    }
                }
            }
            
            res.json({
                success: true,
                data: result
            });
            
        } catch (error) {
            console.error('Error reading dataset directories:', error);
            // Return empty data if there's an error reading directories
            res.json({
                success: true,
                data: result
            });
        }
        
    } catch (error) {
        console.error('Error fetching dataset statistics:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching dataset statistics',
            error: error.message
        });
    }
});

module.exports = router;
