const database = require('./database/database');

async function updateExistingAnalyses() {
    try {
        await database.waitForConnection();
        const db = database.db;
        const collection = db.collection('analysis_history');
        
        // Find all analyses that don't have a pot_name field
        const analysesWithoutPotName = await collection.find({
            pot_name: { $exists: false }
        }).toArray();
        
        console.log(`Found ${analysesWithoutPotName.length} analyses without pot names`);
        
        // Update them to have a default pot name
        for (const analysis of analysesWithoutPotName) {
            await collection.updateOne(
                { _id: analysis._id },
                { 
                    $set: { 
                        pot_name: 'Unnamed Pot',
                        updated_at: new Date()
                    }
                }
            );
            console.log(`Updated analysis ${analysis.analysis_id} with default pot name`);
        }
        
        console.log('Finished updating analyses');
        process.exit(0);
    } catch (error) {
        console.error('Error updating analyses:', error);
        process.exit(1);
    }
}

updateExistingAnalyses();