const express = require('express');
const { ObjectId } = require('mongodb');
const { 
    analysisUpload, 
    profileUpload, 
    documentUpload,
    createThumbnail, 
    deleteImage, 
    getImageInfo 
} = require('../services/cloudinary');
const { authMiddleware } = require('../middleware/auth');
const { getDb, waitForConnection } = require('../database/database');
const { v4: uuidv4 } = require('uuid');

// Ensure database connection is established before handling any requests
const ensureDbConnection = async (req, res, next) => {
    try {
        await waitForConnection();
        next();
    } catch (error) {
        console.error('Database connection error:', error);
        res.status(503).json({
            error: 'Service Unavailable',
            message: 'Database connection not available',
            details: error.message
        });
    }
};

const router = express.Router();

// Analysis upload endpoint - requires authentication
router.post('/analysis', ensureDbConnection, authMiddleware, analysisUpload.single('image'), async (req, res) => {
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
router.post('/profile', ensureDbConnection, authMiddleware, profileUpload.single('image'), async (req, res) => {
    const requestId = req.requestId || 'no-request-id';
    const log = (...args) => console.log(`[Upload][${requestId}]`, ...args);
    
    log('=== STARTING PROFILE PICTURE UPLOAD ===');
    log('Request headers:', {
        'content-type': req.headers['content-type'],
        'authorization': req.headers['authorization'] ? 'Bearer [HIDDEN]' : 'Not provided',
        'x-request-id': req.headers['x-request-id'] || 'Not provided'
    });
    
    log('Authenticated user from JWT:', {
        userId: req.user?.userId,
        email: req.user?.email,
        isAdmin: req.user?.isAdmin || false
    });
    
    // Log request body (excluding file data)
    log('Request body (non-file fields):', Object.keys(req.body).filter(k => k !== 'file'));
    
    try {
        log('Starting profile picture upload');
        log('Authenticated user:', {
            userId: req.user?.userId,
            email: req.user?.email,
            isAdmin: req.user?.isAdmin || false
        });
        
        // Verify the user making the request matches the session user
        const sessionToken = req.headers.authorization?.split(' ')[1];
        if (sessionToken) {
            try {
                const db = getDb();
                const session = await db.collection('sessions').findOne({
                    'session.token': sessionToken
                });
                
                if (session && session.session?.passport?.user) {
                    const sessionUserId = session.session.passport.user.toString();
                    const tokenUserId = req.user.userId.toString();
                    
                    log('Session verification:', {
                        sessionUserId,
                        tokenUserId,
                        match: sessionUserId === tokenUserId
                    });
                    
                    if (sessionUserId !== tokenUserId) {
                        log('WARNING: User ID mismatch between token and session!', {
                            tokenUserId,
                            sessionUserId
                        });
                    }
                } else {
                    log('No valid session found for token');
                }
            } catch (error) {
                log('Error verifying session:', error.message);
            }
        }
        
        if (!req.file) {
            console.error('[Upload] No file was uploaded');
            return res.status(400).json({
                error: 'No file uploaded',
                message: 'Please select an image file to upload'
            });
        }

        const file = req.file;
        const fileId = uuidv4();
        const userId = req.user.userId;
        
        console.log('[Upload] File info:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path,
            filename: file.filename,
            fieldname: file.fieldname
        });
        
        const publicId = file.public_id || file.filename || fileId;
        console.log('[Upload] Generated public ID:', publicId);
        
        const thumbnailUrl = createThumbnail(publicId);
        console.log('[Upload] Thumbnail URL:', thumbnailUrl);
        
        // Get the Cloudinary URL - this is the key fix
        const cloudinaryUrl = file.path || file.secure_url || (file.location ? file.location.href : null);
        console.log('[Upload] Cloudinary URL:', cloudinaryUrl);
        
        if (!cloudinaryUrl) {
            console.error('[Upload] No Cloudinary URL found in file object:', file);
            throw new Error('Failed to get Cloudinary URL for the uploaded file');
        }

        const db = getDb();
        const uploadsCollection = db.collection('uploads');
        
        const uploadRecord = {
            fileId: fileId,
            userId: userId,
            context: 'profile',
            originalName: file.originalname,
            filename: file.filename || fileId,
            publicId: publicId,
            cloudinaryUrl: cloudinaryUrl,
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
        
        // Log before update
        log('Attempting to update user profile picture in database', {
            userId: userId,
            cloudinaryUrl: cloudinaryUrl ? `${cloudinaryUrl.substring(0, 50)}...` : 'null'
        });
        
        // Verify the user exists before updating
        const userIdObj = new ObjectId(userId);
        const userBeforeUpdate = await usersCollection.findOne(
            { _id: userIdObj },
            { projection: { _id: 1, email: 1, profilePicture: 1 } }
        );
        
        if (!userBeforeUpdate) {
            log('ERROR: User not found in database', { userId });
            throw new Error('User not found');
        }
        
        log('User found in database. Current profile picture:', {
            currentProfilePic: userBeforeUpdate.profilePicture || 'Not set'
        });
        
        // Perform the update
        const updateResult = await usersCollection.updateOne(
            { _id: userIdObj },
            { 
                $set: { 
                    profilePicture: cloudinaryUrl,
                    updatedAt: new Date() 
                } 
            }
        );
        
        log('Database update result:', {
            matchedCount: updateResult.matchedCount,
            modifiedCount: updateResult.modifiedCount,
            acknowledged: updateResult.acknowledged
        });
        
        if (updateResult.matchedCount === 0) {
            throw new Error('Failed to update user profile - user not found');
        }
        
        if (updateResult.modifiedCount === 0) {
            log('WARNING: User found but profile picture was not updated');
        }

        // Get updated user data to return
        const updatedUser = await usersCollection.findOne(
            { _id: userIdObj },
            { 
                projection: { 
                    _id: 1, 
                    name: 1, 
                    email: 1, 
                    profilePicture: 1,
                    updatedAt: 1
                } 
            }
        );
        
        log('Updated user data from database:', {
            userId: updatedUser?._id?.toString(),
            email: updatedUser?.email,
            hasNewProfilePic: !!updatedUser?.profilePicture,
            updatedAt: updatedUser?.updatedAt
        });

        // Prepare response data
        const responseData = {
            success: true,
            message: 'Profile image uploaded successfully to Cloudinary',
            data: {
                fileId: fileId,
                originalName: file.originalname,
                filename: file.filename,
                publicId: publicId,
                size: file.size,
                profilePictureUrl: cloudinaryUrl,
                mimetype: file.mimetype,
                path: cloudinaryUrl,
                thumbnailPath: thumbnailUrl,
                width: file.width,
                height: file.height,
                format: file.format,
                uploadedAt: uploadRecord.uploadedAt.toISOString()
            },
            user: {
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
                profilePicture: cloudinaryUrl
            }
        };
        
        log('Sending success response to client');
        log('Response data:', {
            userIdInResponse: responseData.user?.id?.toString(),
            profilePictureInResponse: responseData.user?.profilePicture ? 'Set' : 'Not set',
            responseDataKeys: Object.keys(responseData)
        });
        
        res.json(responseData);

    } catch (error) {
        const errorId = Math.random().toString(36).substr(2, 8);
        const errorMessage = error.message || 'An error occurred while uploading the profile image';
        
        // Log detailed error information
        log(`[ERROR ${errorId}] Profile upload failed:`, {
            name: error.name,
            message: error.message,
            code: error.code,
            stack: error.stack,
            request: {
                method: req.method,
                url: req.originalUrl,
                headers: {
                    'content-type': req.headers['content-type'],
                    'authorization': req.headers['authorization'] ? 'Bearer [HIDDEN]' : 'Not provided',
                    'x-request-id': req.headers['x-request-id'] || 'Not provided'
                },
                body: Object.keys(req.body).filter(k => k !== 'file')
            },
            user: req.user || 'No user in request'
        });
        
        // If this is a database error, log additional context
        if (error.name === 'MongoError' || error.name === 'MongoServerError') {
            log(`[ERROR ${errorId}] MongoDB Error Details:`, {
                code: error.code,
                codeName: error.codeName,
                keyPattern: error.keyPattern,
                keyValue: error.keyValue
            });
        }
        
        // Send error response with error ID for correlation
        res.status(500).json({
            error: 'Upload failed',
            message: `${errorMessage} (Error ID: ${errorId})`,
            requestId: requestId,
            errorId: errorId
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
    const log = (...args) => console.log(`[DeleteFile][${req.id || 'no-request-id'}]`, ...args);
    
    try {
        const publicId = decodeURIComponent(req.params.publicId);
        const userId = req.user.userId;
        
        log(`Processing delete request for publicId: ${publicId}`);
        
        // Check if this is a profile picture (starts with 'aloeshield/profiles/')
        if (publicId.includes('aloeshield/profiles/')) {
            log('Detected profile picture deletion');
            const usersCollection = db.collection('users');
            const user = await usersCollection.findOne(
                { _id: new ObjectId(userId) },
                { projection: { profilePicture: 1 } }
            );
            
            if (!user) {
                log('User not found');
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            
            // Verify the publicId matches the user's current profile picture
            if (user.profilePicture && user.profilePicture.includes(publicId)) {
                log('Deleting profile picture from Cloudinary');
                const result = await deleteImage(publicId);
                
                // Update user's profile picture to null
                await usersCollection.updateOne(
                    { _id: new ObjectId(userId) },
                    { $set: { profilePicture: null } }
                );
                
                log('Successfully deleted profile picture');
                return res.json({
                    success: true,
                    message: 'Profile picture deleted successfully',
                    data: result
                });
            } else {
                log('User does not own this profile picture');
                return res.status(403).json({
                    success: false,
                    message: 'You do not have permission to delete this image'
                });
            }
        }
        
        // Handle regular uploads
        log('Processing regular upload deletion');
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
