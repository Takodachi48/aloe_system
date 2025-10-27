const { getDb } = require('../database/database');

class HealthCheckService {
    constructor() {
        this.lastStatus = 'active';
        this.lastCheckTime = null;
        this.checkInterval = 60000; // Check every 60 seconds
        this.healthCheckJob = null;
    }

    async recordStatusChange(status, reason = null) {
        try {
            const db = getDb();
            const uptimeEventsCollection = db.collection('uptime_events');
            
            const event = {
                event_type: status,
                status: status === 'up' ? 'active' : 'down',
                reason: reason,
                timestamp: new Date(),
                recorded_at: new Date().toISOString()
            };
            
            await uptimeEventsCollection.insertOne(event);
            console.log(`Health check recorded: ${status} at ${event.recorded_at}`);
        } catch (error) {
            console.error('Error recording status change:', error.message);
        }
    }

    async performHealthCheck() {
        try {
            const db = getDb();
            
            if (!db) {
                throw new Error('Database connection unavailable');
            }

            const now = new Date();
            
            if (this.lastCheckTime && now - this.lastCheckTime < 1000) {
                return this.lastStatus;
            }

            this.lastCheckTime = now;
            
            try {
                await db.collection('uptime_events').findOne({});
                
                if (this.lastStatus !== 'active') {
                    console.log('System recovered to active state');
                    await this.recordStatusChange('up', 'System recovered');
                    this.lastStatus = 'active';
                }
                
                return 'active';
            } catch (dbError) {
                if (this.lastStatus !== 'down') {
                    console.log('System health check failed:', dbError.message);
                    await this.recordStatusChange('down', dbError.message);
                    this.lastStatus = 'down';
                }
                return 'down';
            }
        } catch (error) {
            console.error('Error in health check:', error.message);
            return this.lastStatus;
        }
    }

    startHealthCheckJob() {
        if (this.healthCheckJob) {
            return;
        }

        console.log('Starting health check service...');
        
        this.performHealthCheck().catch(console.error);
        
        this.healthCheckJob = setInterval(() => {
            this.performHealthCheck().catch(console.error);
        }, this.checkInterval);
    }

    stopHealthCheckJob() {
        if (this.healthCheckJob) {
            clearInterval(this.healthCheckJob);
            this.healthCheckJob = null;
            console.log('Health check job stopped');
        }
    }

    getStatus() {
        return {
            status: this.lastStatus,
            lastCheck: this.lastCheckTime,
            checkInterval: this.checkInterval
        };
    }
}

module.exports = new HealthCheckService();
