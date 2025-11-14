const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer with Cloudinary storage - dynamic folder based on context
const createStorage = (context = 'general') => {
    console.log(`[Cloudinary] Creating storage for context: ${context}`);
    
    return new CloudinaryStorage({
        cloudinary: cloudinary,
        params: {
            folder: (req, file) => {
                const requestId = req.requestId || 'no-request-id';
                const log = (...args) => console.log(`[Cloudinary][${requestId}]`, ...args);
                
                // Log request and file info for debugging
                log('Processing file upload:', {
                    originalname: file.originalname,
                    mimetype: file.mimetype,
                    size: file.size,
                    fieldname: file.fieldname,
                    userId: req.user?.userId || 'anonymous'
                });
                
                // Get user ID from request or default to 'anonymous'
                const userId = req.user?.userId || 'anonymous';
                const contextFolder = getContextFolder(context);
                const folderPath = `aloeshield/${contextFolder}/${userId}`;
                
                log('Generated folder path:', folderPath);
                log('User from request:', {
                    userId: req.user?.userId,
                    email: req.user?.email,
                    isAdmin: req.user?.isAdmin || false
                });
                
                // Log session information if available
                if (req.session) {
                    log('Session info:', {
                        sessionId: req.session.id,
                        userId: req.session.passport?.user
                    });
                }
                
                return folderPath;
            },
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
            transformation: [
                { width: 1200, height: 1200, crop: 'limit', quality: 'auto' }
            ],
            public_id: (req, file) => {
                // Generate unique filename with context prefix
                const timestamp = Date.now();
                const random = Math.random().toString(36).substring(2, 8);
                const contextPrefix = getContextPrefix(context);
                const publicId = `${contextPrefix}_${timestamp}_${random}`;
                
                console.log(`[Cloudinary] Generated public ID: ${publicId}`);
                return publicId;
            }
        }
    });
};

// Helper function to get folder name based on context
const getContextFolder = (context) => {
    const folderMap = {
        'analysis': 'analysis_uploads',
        'profile': 'profiles',
        'document': 'documents',
        'general': 'general'
    };
    return folderMap[context] || 'general';
};

// Helper function to get filename prefix based on context
const getContextPrefix = (context) => {
    const prefixMap = {
        'analysis': 'analysis',
        'profile': 'profile',
        'document': 'doc',
        'general': 'img'
    };
    return prefixMap[context] || 'img';
};

// Default storage for analysis uploads
const storage = createStorage('analysis');

// Create thumbnail transformation
const createThumbnail = (publicId) => {
    return cloudinary.url(publicId, {
        width: 300,
        height: 200,
        crop: 'fill',
        quality: 'auto',
        format: 'webp'
    });
};

// Create context-specific upload middleware
const createUpload = (context = 'analysis', options = {}) => {
    const contextStorage = createStorage(context);
    
    const defaultOptions = {
        fileSize: 10 * 1024 * 1024, // 10MB default
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    };
    
    const uploadOptions = { ...defaultOptions, ...options };
    
    return multer({
        storage: contextStorage,
        limits: {
            fileSize: uploadOptions.fileSize
        },
        fileFilter: (req, file, cb) => {
            if (uploadOptions.allowedTypes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new Error(`Invalid file type. Only ${uploadOptions.allowedTypes.join(', ')} are allowed.`), false);
            }
        }
    });
};

// Context-specific upload instances
const analysisUpload = createUpload('analysis');
const profileUpload = createUpload('profile', { fileSize: 5 * 1024 * 1024 }); // 5MB for profiles
const documentUpload = createUpload('document', { 
    fileSize: 20 * 1024 * 1024, // 20MB for documents
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
});

// Default upload (for backward compatibility)
const upload = analysisUpload;

// Delete image from Cloudinary
const deleteImage = async (publicId) => {
    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (error) {
        console.error('Error deleting image from Cloudinary:', error);
        throw error;
    }
};

// Get image info
const getImageInfo = async (publicId) => {
    try {
        const result = await cloudinary.api.resource(publicId);
        return result;
    } catch (error) {
        console.error('Error getting image info from Cloudinary:', error);
        throw error;
    }
};

module.exports = {
    cloudinary,
    upload, // Default analysis upload
    analysisUpload,
    profileUpload,
    documentUpload,
    createUpload, // For creating custom uploads
    createThumbnail,
    deleteImage,
    getImageInfo,
    getContextFolder,
    getContextPrefix
};
