require('dotenv').config();
const dbHandler = require('../dbHandler');
const TransactionManager = require('../transactionManager');

const transactionManager = new TransactionManager();

async function setupTestData() {
    try {
        console.log('Makin tables...');
        dbHandler.verifyDatabase(true);
        console.log("Checking for existing data...");
        const playerData = await dbHandler.getAllPlayers();
        if (playerData.length > 0) {
            console.log("No players found- Check if there should be!");
        }

        const existingData = await dbHandler.getAllPriceSheets();
        if (existingData.length != 0) {
            console.log("Existing data found. Startup completed.");
        }
        else {
            console.log("No existing data found. Populating database...");
            await dbHandler.populateDatabase();
            console.log("Database populated.");
        }
        
        console.log('Resetting and populating the database...');
        

        
    } catch (e) {
        console.error('Error setting up test data:', e);
    } finally {
        await dbHandler.poolClose();
        console.log('Database connection closed.');
    }
}

setupTestData();