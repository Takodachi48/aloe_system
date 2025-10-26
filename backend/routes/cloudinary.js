const express = require('express');
const router = express.Router();
const { cloudinary } = require('../services/cloudinary');
const { authMiddleware } = require('../middleware/auth');

/**
 * @route GET /api/cloudinary/usage
 * @description Get Cloudinary usage statistics
 * @access Private (Admin only)
 */
// Admin middleware to check if user is admin
const adminMiddleware = (req, res, next) => {
    if (!req.user || !req.user.isAdmin) {
        return res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'Admin privileges required to access this resource'
        });
    }
    next();
};

// Function to get all resources with their sizes
async function getAllResources(cloudinary, nextCursor = null, allResources = []) {
    try {
        const result = await cloudinary.api.resources({
            max_results: 500, // Maximum allowed by Cloudinary
            next_cursor: nextCursor || undefined,
            type: 'upload', // Only get uploaded files
            context: true   // Include context/metadata
        });

        // Add the new resources to our collection
        allResources = allResources.concat(result.resources || []);
        
        // If there are more results, fetch them recursively
        if (result.next_cursor) {
            return getAllResources(cloudinary, result.next_cursor, allResources);
        }
        
        return allResources;
    } catch (error) {
        console.error('Error fetching resources:', error);
        return allResources; // Return whatever we have so far
    }
}

router.get('/usage', authMiddleware, adminMiddleware, async (req, res) => {
    try {
        console.log('Fetching Cloudinary usage data for user:', req.user);
        
        // Log Cloudinary config for debugging (without secrets)
        console.log('Cloudinary config:', {
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY ? '***' + process.env.CLOUDINARY_API_KEY.slice(-4) : 'not set',
            api_secret: process.env.CLOUDINARY_API_SECRET ? '***' + process.env.CLOUDINARY_API_SECRET.slice(-4) : 'not set'
        });
        
        // Get detailed account info first to check permissions
        let accountInfo;
        try {
            accountInfo = await cloudinary.api.account();
            console.log('Cloudinary account info:', JSON.stringify({
                name: accountInfo.name,
                email: accountInfo.email,
                plan: accountInfo.plan,
                created_at: accountInfo.created_at
            }, null, 2));
        } catch (accountError) {
            console.error('Error fetching Cloudinary account info:', accountError);
            // Continue with default values if we can't get account info
            accountInfo = { plan: 'Free' };
        }
        
        // Get all resources with their sizes
        console.log('Fetching all Cloudinary resources...');
        const allResources = await getAllResources(cloudinary);
        const totalFiles = allResources.length;
        console.log(`Found ${totalFiles} total files in Cloudinary`);
        
        // Calculate total storage used by summing up all file sizes
        const totalBytesUsed = allResources.reduce((sum, resource) => {
            return sum + (resource.bytes || 0);
        }, 0);
        
        console.log(`Total storage used: ${formatBytes(totalBytesUsed)} (${totalBytesUsed} bytes)`);
        
        // For Free tier, we'll use the calculated storage
        // Cloudinary Free tier has a 25GB limit for total storage
        const freeTierLimit = 25 * 1024 * 1024 * 1024; // 25GB in bytes
        const storagePercentage = Math.min(100, Math.round((totalBytesUsed / freeTierLimit) * 100));
        
        console.log('Storage usage:', {
            used: totalBytesUsed,
            limit: freeTierLimit,
            percentage: storagePercentage,
            formatted: `${formatBytes(totalBytesUsed)} of ${formatBytes(freeTierLimit)}`
        });
        
        // Format the response with file count and storage info
        const usageData = {
            storage: {
                used: formatBytes(totalBytesUsed),
                limit: formatBytes(freeTierLimit),
                percentage: storagePercentage,
                remaining: formatBytes(Math.max(0, freeTierLimit - totalBytesUsed)),
                usedRaw: totalBytesUsed,
                limitRaw: freeTierLimit,
                formatted: `${formatBytes(totalBytesUsed)} of ${formatBytes(freeTierLimit)} (${storagePercentage}%)`
            },
            files: {
                count: totalFiles,
                formatted: totalFiles.toLocaleString() + (totalFiles === 1 ? ' file' : ' files'),
                averageSize: totalFiles > 0 ? formatBytes(totalBytesUsed / totalFiles) : '0 Bytes'
            },
            lastUpdated: new Date(),
            plan: 'Free', // Hardcoded since we're using free tier calculations
            accountInfo: accountInfo ? {
                name: accountInfo.name,
                email: accountInfo.email,
                createdAt: accountInfo.created_at,
                updatedAt: accountInfo.updated_at
            } : null
        };
        
        console.log('Processed usage data:', JSON.stringify(usageData, null, 2));

        res.json({
            success: true,
            data: usageData
        });
    } catch (error) {
        console.error('Error fetching Cloudinary usage:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch Cloudinary usage',
            message: error.message
        });
    }
});

// Helper function to format bytes to human-readable format
function formatBytes(bytes, decimals = 2) {
    // Check if bytes is a valid number
    const numBytes = parseFloat(bytes);
    if (isNaN(numBytes) || !isFinite(numBytes)) {
        console.warn('Invalid bytes value:', bytes);
        return '0 Bytes';
    }
    
    if (numBytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    
    const i = Math.floor(Math.log(numBytes) / Math.log(k));
    
    return parseFloat((numBytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

module.exports = router;
