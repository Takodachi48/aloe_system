const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'aloeshield';

// Debug logging
console.log('MongoDB URI exists:', !!uri);
console.log('MongoDB DB Name:', dbName);
if (!uri) {
    console.error('MONGODB_URI is not defined in environment variables');
}

class Database {
    constructor() {
        this.client = null;
        this.db = null;
    }

    async connect() {
        try {
            if (!uri) {
                throw new Error('MongoDB URI is not defined in environment variables');
            }
            
            console.log('Attempting to connect to MongoDB...');
            this.client = new MongoClient(uri, {
                serverSelectionTimeoutMS: 10000, // Timeout after 10s
                socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
                maxPoolSize: 10, // Maintain up to 10 socket connections
                serverApi: {
                    version: '1',
                    strict: true,
                    deprecationErrors: true,
                }
            });
            
            await this.client.connect();
            console.log('MongoDB client connected successfully');
            
            this.db = this.client.db(dbName);
            console.log(`Connected to database: ${dbName}`);
            
            await this.createIndexes();
            return true;
        } catch (err) {
            console.error('Error connecting to database:', err.message);
            throw err;
        }
    }

    async createIndexes() {
        try {
            const analysisCollection = this.db.collection('analysis_history');
            const usersCollection = this.db.collection('users');
            const settingsCollection = this.db.collection('user_settings');
            const uploadsCollection = this.db.collection('uploads');
            const announcementsCollection = this.db.collection('announcements');

            // Create indexes for analysis_history
            await analysisCollection.createIndex({ analysis_id: 1 }, { unique: true });
            await analysisCollection.createIndex({ user_id: 1, created_at: -1 });
            await analysisCollection.createIndex({ created_at: -1 });
            await analysisCollection.createIndex({ disease_key: 1 });
            await analysisCollection.createIndex({ status: 1 });

            // Create indexes for users
            await usersCollection.createIndex({ email: 1 }, { unique: true });

            // Create indexes for user_settings
            await settingsCollection.createIndex({ user_id: 1, setting_key: 1 }, { unique: true });

            // Create indexes for uploads
            await uploadsCollection.createIndex({ fileId: 1 }, { unique: true });
            await uploadsCollection.createIndex({ publicId: 1 }, { unique: true, sparse: true }); // sparse allows null values
            await uploadsCollection.createIndex({ userId: 1, uploadedAt: -1 });
            await uploadsCollection.createIndex({ userId: 1, isActive: 1 });
            await uploadsCollection.createIndex({ userId: 1, context: 1, uploadedAt: -1 }); // For context-specific queries
            await uploadsCollection.createIndex({ context: 1 }); // For admin queries by context

            // Create indexes for announcements
            await announcementsCollection.createIndex({ createdAt: -1 });
            await announcementsCollection.createIndex({ isActive: 1, startDate: 1 });
            await announcementsCollection.createIndex({ endDate: 1 });
            await announcementsCollection.createIndex({ priority: 1 });
            await announcementsCollection.createIndex({ type: 1 });
            await announcementsCollection.createIndex({ createdBy: 1 });

            // Create indexes for maintenance
            const maintenanceCollection = this.db.collection('maintenance');
            await maintenanceCollection.createIndex({ startDate: -1 });
            await maintenanceCollection.createIndex({ endDate: 1 });
            await maintenanceCollection.createIndex({ cancelled: 1 });
            await maintenanceCollection.createIndex({ createdBy: 1 });

            console.log('Database indexes created');
        } catch (err) {
            console.error('Error creating indexes:', err.message);
        }
    }

    // Analysis methods
    async saveAnalysis(analysisData) {
        try {
            const collection = this.db.collection('analysis_history');
            const document = {
                analysis_id: analysisData.analysisId,
                user_id: analysisData.userId, // Add user association
                filename: analysisData.filename,
                original_filename: analysisData.originalFilename,
                file_size: analysisData.fileSize,
                file_type: analysisData.fileType,
                disease_key: analysisData.diseaseKey,
                disease_name: analysisData.diseaseName,
                confidence: analysisData.confidence,
                status: analysisData.status,
                severity: analysisData.severity,
                description: analysisData.description,
                causes: analysisData.causes || [],
                treatments: analysisData.treatments || [],
                prevention: analysisData.prevention || [],
                image_path: analysisData.imagePath,
                thumbnail_path: analysisData.thumbnailPath,
                created_at: new Date(),
                updated_at: new Date()
            };

            const result = await collection.insertOne(document);
            return { id: result.insertedId, analysisId: analysisData.analysisId };
        } catch (err) {
            throw err;
        }
    }

    async getAnalysisHistory(limit = 20, offset = 0) {
        try {
            const collection = this.db.collection('analysis_history');
            const results = await collection
                .find({})
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
            
            return results;
        } catch (err) {
            throw err;
        }
    }

    async getAnalysisById(analysisId) {
        try {
            const collection = this.db.collection('analysis_history');
            const result = await collection.findOne({ analysis_id: analysisId });
            return result;
        } catch (err) {
            throw err;
        }
    }

    async deleteAnalysis(analysisId) {
        try {
            const collection = this.db.collection('analysis_history');
            const result = await collection.deleteOne({ analysis_id: analysisId });
            return { deletedRows: result.deletedCount };
        } catch (err) {
            throw err;
        }
    }

    // Statistics methods
    async getAnalysisStats() {
        try {
            const collection = this.db.collection('analysis_history');
            const stats = await collection.aggregate([
                {
                    $group: {
                        _id: '$disease_key',
                        disease_key: { $first: '$disease_key' },
                        disease_count: { $sum: 1 },
                        avg_confidence: { $avg: '$confidence' }
                    }
                },
                {
                    $sort: { disease_count: -1 }
                }
            ]).toArray();

            return stats;
        } catch (err) {
            throw err;
        }
    }

    async close() {
        try {
            if (this.client) {
                await this.client.close();
                console.log('Database connection closed');
            }
        } catch (err) {
            throw err;
        }
    }
}

// Create singleton instance
const database = new Database();

// Track initialization
let isInitialized = false;
let initPromise = null;

// Initialize database connection
database.connect()
    .then(() => {
        isInitialized = true;
        console.log('Database connection established successfully');
    })
    .catch(err => {
        console.error('Failed to initialize database:', err);
        // Don't set isInitialized to true on error
    });

// Export both the database instance and a getDb function for compatibility
module.exports = database;

// Wait for database to be ready
module.exports.waitForConnection = async () => {
    if (isInitialized) return;
    
    if (!initPromise) {
        initPromise = new Promise((resolve, reject) => {
            const checkInitialized = () => {
                if (isInitialized) {
                    resolve();
                } else {
                    setTimeout(checkInitialized, 100);
                }
            };
            checkInitialized();
        });
    }
    
    return initPromise;
};

module.exports.getDb = () => {
    if (!isInitialized) {
        throw new Error('Database not initialized. Make sure to call waitForConnection() first.');
    }
    if (!database.db) {
        throw new Error('Database connection not available');
    }
    return database.db;
};
