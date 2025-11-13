const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME || 'aloe-sys-db';

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

            // Create indexes for response_times
            const responseTimesCollection = this.db.collection('response_times');
            await responseTimesCollection.createIndex({ timestamp: -1 });
            await responseTimesCollection.createIndex({ endpoint: 1, timestamp: -1 });
            await responseTimesCollection.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // Auto-delete after 90 days

            // Create indexes for uptime_events
            const uptimeEventsCollection = this.db.collection('uptime_events');
            await uptimeEventsCollection.createIndex({ timestamp: -1 });
            await uptimeEventsCollection.createIndex({ event_type: 1, timestamp: -1 });
            await uptimeEventsCollection.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // Auto-delete after 90 days

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
                pot_name: analysisData.potName || 'Unnamed Pot',
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

    // Treatment plan methods
    async createTreatmentPlan(plan) {
        const collection = this.db.collection('treatment_plans');
        const doc = {
            plan_id: plan.planId,
            user_id: plan.userId,
            analysis_id: plan.analysisId,
            disease_key: plan.diseaseKey,
            disease_name: plan.diseaseName,
            pot_name: plan.potName || 'Unnamed Pot',
            cycle: plan.cycle,
            status: plan.status, // active | completed_success | leaf_removal_recommended
            before_photo_url: plan.beforePhotoUrl,
            after_photo_url: plan.afterPhotoUrl,
            days: plan.days,
            progression: plan.progression,
            evaluations: [],
            reminders_enabled: !!plan.remindersEnabled,
            created_at: plan.createdAt,
            updated_at: plan.updatedAt,
            cycle_started_at: plan.cycleStartedAt
        };
        await collection.createIndex({ plan_id: 1 }, { unique: true });
        await collection.createIndex({ user_id: 1, created_at: -1 });
        await collection.createIndex({ analysis_id: 1 });
        await collection.insertOne(doc);
        return { planId: plan.planId };
    }

    async getTreatmentPlansByUser(userId, status) {
        const collection = this.db.collection('treatment_plans');
        const query = { user_id: userId };
        if (status) query.status = status;
        return await collection.find(query).sort({ created_at: -1 }).toArray();
    }

    async getTreatmentPlansByAnalysis(userId, analysisId) {
        const collection = this.db.collection('treatment_plans');
        return await collection.find({ user_id: userId, analysis_id: analysisId }).sort({ created_at: -1 }).toArray();
    }

    async getTreatmentPlanById(userId, planId) {
        const collection = this.db.collection('treatment_plans');
        return await collection.findOne({ user_id: userId, plan_id: planId });
    }

    async toggleTreatmentTask(userId, planId, dayNumber, taskId) {
        const collection = this.db.collection('treatment_plans');
        const plan = await collection.findOne({ user_id: userId, plan_id: planId });
        if (!plan) throw new Error('Plan not found');
        const dayIndex = dayNumber - 1;
        if (!plan.days[dayIndex]) throw new Error('Day not found');
        const task = plan.days[dayIndex].tasks.find(t => t.id === taskId);
        if (!task) throw new Error('Task not found');
        task.completed = !task.completed;
        plan.days[dayIndex].completed = plan.days[dayIndex].tasks.every(t => t.completed);
        plan.days[dayIndex].completedAt = plan.days[dayIndex].completed ? new Date() : null;
        plan.updated_at = new Date();
        await collection.updateOne({ plan_id: planId }, { $set: { days: plan.days, updated_at: plan.updated_at } });
        return plan;
    }

    async setTreatmentAfterPhoto(userId, planId, imageUrl) {
        const collection = this.db.collection('treatment_plans');
        const result = await collection.findOneAndUpdate(
            { user_id: userId, plan_id: planId },
            { $set: { after_photo_url: imageUrl, updated_at: new Date() } },
            { returnDocument: 'after' }
        );
        return result.value;
    }

    async completeTreatmentPlan(userId, planId, status, evaluation) {
        const collection = this.db.collection('treatment_plans');
        const result = await collection.findOneAndUpdate(
            { user_id: userId, plan_id: planId },
            {
                $set: { status, updated_at: new Date() },
                $push: { evaluations: evaluation }
            },
            { returnDocument: 'after' }
        );
        return result.value;
    }

    async startSecondCycle(userId, planId, newDays, evaluation) {
        const collection = this.db.collection('treatment_plans');
        const result = await collection.findOneAndUpdate(
            { user_id: userId, plan_id: planId },
            {
                $set: { cycle: 2, days: newDays, updated_at: new Date(), after_photo_url: null, cycle_started_at: new Date() },
                $push: { evaluations: evaluation }
            },
            { returnDocument: 'after' }
        );
        return result.value;
    }

    async appendEvaluation(userId, planId, evaluation) {
        const collection = this.db.collection('treatment_plans');
        const result = await collection.findOneAndUpdate(
            { user_id: userId, plan_id: planId },
            {
                $set: { updated_at: new Date() },
                $push: { evaluations: evaluation }
            },
            { returnDocument: 'after' }
        );
        return result.value;
    }

    async saveTreatmentDayNotes(userId, planId, dayNumber, notes) {
        const collection = this.db.collection('treatment_plans');
        const plan = await collection.findOne({ user_id: userId, plan_id: planId });
        if (!plan) throw new Error('Plan not found');
        const dayIndex = dayNumber - 1;
        if (!plan.days[dayIndex]) throw new Error('Day not found');
        plan.days[dayIndex].notes = notes;
        plan.updated_at = new Date();
        await collection.updateOne({ plan_id: planId }, { $set: { days: plan.days, updated_at: plan.updated_at } });
        return plan;
    }

    async setTreatmentReminders(userId, planId, enabled) {
        const collection = this.db.collection('treatment_plans');
        const result = await collection.findOneAndUpdate(
            { user_id: userId, plan_id: planId },
            { $set: { reminders_enabled: !!enabled, updated_at: new Date() } },
            { returnDocument: 'after' }
        );
        return result.value;
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
