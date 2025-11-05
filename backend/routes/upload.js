const express = require('express');
const { 
    analysisUpload, 
    profileUpload, 
    documentUpload,
    createThumbnail, 
    deleteImage, 
    getImageInfo 
} = require('../services/cloudinary');
const { authMiddleware } = require('../middleware/auth');
const { getDb } = require('../database/database');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Analysis upload endpoint - requires authentication
router.post('/analysis', authMiddleware, analysisUpload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded',
                message: 'Please select an image file to upload'
            });
        }

        const file = req.file;
        const fileId = uuidv4();
        const userId = req.user.userId;
        
        // Debug logging
        console.log('Cloudinary file object:', JSON.stringify(file, null, 2));
        
        // Extract public_id from filename or path if not directly available
        const publicId = file.public_id || file.filename || fileId;
        
        // Create thumbnail URL
        const thumbnailUrl = createThumbnail(publicId);

        // Store upload record in database
        const db = getDb();
        const uploadsCollection = db.collection('uploads');
        
        const uploadRecord = {
            fileId: fileId,
            userId: userId,
            context: 'analysis', // Upload context
            originalName: file.originalname,
            filename: file.filename || fileId,
            publicId: publicId,
            cloudinaryUrl: file.path || file.secure_url,
            thumbnailUrl: thumbnailUrl,
            size: file.size,
            mimetype: file.mimetype,
            width: file.width,
            height: file.height,
            format: file.format,
            uploadedAt: new Date(),
            isActive: true
        };

        await uploadsCollection.insertOne(uploadRecord);

        // Prepare response data
        const uploadData = {
            fileId: fileId,
            originalName: file.originalname,
            filename: file.filename,
            publicId: file.public_id,
            size: file.size,
            mimetype: file.mimetype,
            path: file.path, // This is the Cloudinary URL
            thumbnailPath: thumbnailUrl,
            width: file.width,
            height: file.height,
            format: file.format,
            uploadedAt: uploadRecord.uploadedAt.toISOString()
        };

        res.json({
            success: true,
            message: 'Image uploaded successfully to Cloudinary',
            data: uploadData
        });

    } catch (error) {
        console.error('Upload error:', error);
        
        res.status(500).json({
            error: 'Upload failed',
            message: error.message || 'An error occurred while uploading the image'
        });
    }
});

// Profile upload endpoint
router.post('/profile', authMiddleware, profileUpload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                error: 'No file uploaded',
                message: 'Please select an image file to upload'
            });
        }

        const file = req.file;
        const fileId = uuidv4();
        const userId = req.user.userId;
        
        const publicId = file.public_id || file.filename || fileId;
        const thumbnailUrl = createThumbnail(publicId);

        const db = getDb();
        const uploadsCollection = db.collection('uploads');
        
        const uploadRecord = {
            fileId: fileId,
            userId: userId,
            context: 'profile',
            originalName: file.originalname,
            filename: file.filename || fileId,
            publicId: publicId,
            cloudinaryUrl: file.path || file.secure_url,
            thumbnailUrl: thumbnailUrl,
            size: file.size,
            mimetype: file.mimetype,
            width: file.width,
            height: file.height,
            format: file.format,
            uploadedAt: new Date(),
            isActive: true
        };

        // Save upload record to database
        await uploadsCollection.insertOne(uploadRecord);

        // Update user's profile picture in the users collection
        const usersCollection = db.collection('users');
        const { ObjectId } = require('mongodb');
        const userIdObj = new ObjectId(userId);
        
        await usersCollection.updateOne(
            { _id: userIdObj },
            { 
                $set: { 
                    profilePicture: file.path || file.secure_url,
                    updatedAt: new Date() 
                } 
            }
        );

        const uploadData = {
            fileId: fileId,
            originalName: file.originalname,
            filename: file.filename,
            publicId: publicId,
            size: file.size,
            profilePictureUrl: file.path || file.secure_url,
            mimetype: file.mimetype,
            path: file.path,
            thumbnailPath: thumbnailUrl,
            width: file.width,
            height: file.height,
            format: file.format,
            uploadedAt: uploadRecord.uploadedAt.toISOString()
        };

        res.json({
            success: true,
            message: 'Profile image uploaded successfully to Cloudinary',
            data: uploadData
        });

    } catch (error) {
        console.error('Profile upload error:', error);
        res.status(500).json({
            error: 'Upload failed',
            message: error.message || 'An error occurred while uploading the profile image'
        });
    }
});


// Get uploads by context
router.get('/context/:context', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const context = req.params.context;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        const db = getDb();
        const uploadsCollection = db.collection('uploads');
        
        const uploads = await uploadsCollection
            .find({ userId: userId, context: context, isActive: true })
            .sort({ uploadedAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();
            
        const totalCount = await uploadsCollection.countDocuments({ 
            userId: userId, 
            context: context,
            isActive: true 
        });
        
        res.json({
            success: true,
            data: {
                context: context,
                uploads: uploads,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalCount / limit),
                    totalCount: totalCount,
                    hasNextPage: page < Math.ceil(totalCount / limit),
                    hasPreviousPage: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Get context uploads error:', error);
        res.status(500).json({
            error: 'Failed to get uploads',
            message: 'An error occurred while retrieving uploads for this context'
        });
    }
});

// Delete uploaded file endpoint - requires authentication and ownership
router.delete('/:publicId', authMiddleware, async (req, res) => {
    try {
        const publicId = req.params.publicId;
        const userId = req.user.userId;
        
        // Check if user owns this upload
        const db = getDb();
        const uploadsCollection = db.collection('uploads');
        const uploadRecord = await uploadsCollection.findOne({ 
            publicId: publicId, 
            userId: userId,
            isActive: true 
        });
        
        if (!uploadRecord) {
            return res.status(404).json({
                error: 'File not found',
                message: 'The specified file does not exist or you do not have permission to delete it'
            });
        }
        
        // Delete from Cloudinary
        const result = await deleteImage(publicId);
        
        if (result.result === 'ok') {
            // Mark as deleted in database
            await uploadsCollection.updateOne(
                { publicId: publicId, userId: userId },
                { $set: { isActive: false, deletedAt: new Date() } }
            );
            
            res.json({
                success: true,
                message: 'File deleted successfully from Cloudinary'
            });
        } else {
            res.status(404).json({
                error: 'File not found',
                message: 'The specified file does not exist in Cloudinary'
            });
        }

    } catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({
            error: 'Delete failed',
            message: 'An error occurred while deleting the file from Cloudinary'
        });
    }
});

// Get file info endpoint - requires authentication and ownership
router.get('/info/:publicId', authMiddleware, async (req, res) => {
    try {
        const publicId = req.params.publicId;
        const userId = req.user.userId;
        
        // Check if user owns this upload
        const db = getDb();
        const uploadsCollection = db.collection('uploads');
        const uploadRecord = await uploadsCollection.findOne({ 
            publicId: publicId, 
            userId: userId,
            isActive: true 
        });
        
        if (!uploadRecord) {
            return res.status(404).json({
                error: 'File not found',
                message: 'The specified file does not exist or you do not have permission to access it'
            });
        }
        
        // Get image info from Cloudinary
        const imageInfo = await getImageInfo(publicId);

        res.json({
            success: true,
            data: {
                publicId: imageInfo.public_id,
                format: imageInfo.format,
                width: imageInfo.width,
                height: imageInfo.height,
                size: imageInfo.bytes,
                uploadedAt: imageInfo.created_at,
                url: imageInfo.secure_url,
                version: imageInfo.version,
                // Include database info
                fileId: uploadRecord.fileId,
                originalName: uploadRecord.originalName,
                thumbnailUrl: uploadRecord.thumbnailUrl
            }
        });

    } catch (error) {
        console.error('Get file info error:', error);
        res.status(500).json({
            error: 'Failed to get file info',
            message: 'An error occurred while retrieving file information from Cloudinary'
        });
    }
});

// Get user's uploads endpoint
router.get('/my-uploads', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        
        const db = getDb();
        const uploadsCollection = db.collection('uploads');
        
        // Get user's uploads
        const uploads = await uploadsCollection
            .find({ userId: userId, isActive: true })
            .sort({ uploadedAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();
            
        // Get total count
        const totalCount = await uploadsCollection.countDocuments({ 
            userId: userId, 
            isActive: true 
        });
        
        res.json({
            success: true,
            data: {
                uploads: uploads,
                pagination: {
                    currentPage: page,
                    totalPages: Math.ceil(totalCount / limit),
                    totalCount: totalCount,
                    hasNextPage: page < Math.ceil(totalCount / limit),
                    hasPreviousPage: page > 1
                }
            }
        });

    } catch (error) {
        console.error('Get uploads error:', error);
        res.status(500).json({
            error: 'Failed to get uploads',
            message: 'An error occurred while retrieving your uploads'
        });
    }
});

module.exports = router;
