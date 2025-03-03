require('dotenv').config({ path: '../.env' });
const dbHandler = require('./dbHandler');
const TransactionManager = require('./transactionManager');

const transactionManager = new TransactionManager();

async function runTaggingTests() {
    try {
        console.log('Starting tagging tests...');

        // Reset and populate the database
        console.log('Resetting and populating the database...');
        await dbHandler.populateDatabase();
        console.log('Database populated.');

        // Check initial city tags
        console.log('Checking initial city tags...');
        let cities = await dbHandler.pool.query('SELECT id, name, tags FROM cities');
        console.log('Initial City Tags:', cities.rows);

        // Add random tags to cities
        console.log('Adding random tags to cities...');
        await dbHandler.addRandomTagsToCities();
        console.log('Random tags added.');

        console.log('Adding random tags to cities...');
        await dbHandler.addRandomTagsToCities();
        console.log('Random tags added.');

        // Check city tags after adding random tags
        console.log('Checking city tags after adding random tags...');
        cities = await dbHandler.pool.query('SELECT id, name, tags FROM cities');
        console.log('City Tags after adding random tags:', cities.rows);

        // Remove random tags from cities
        console.log('Removing random tags from cities...');
        await dbHandler.removeRandomTagsFromCities();
        console.log('Random tags removed.');

        // Remove random tags from cities
        console.log('Removing random tags from cities...');
        await dbHandler.removeRandomTagsFromCities();
        console.log('Random tags removed.');

        // Check city tags after removing random tags
        console.log('Checking city tags after removing random tags...');
        cities = await dbHandler.pool.query('SELECT id, name, tags FROM cities');
        console.log('City Tags after removing random tags:', cities.rows);

    } catch (e) {
        console.error('Error running tagging tests:', e);
    } finally {
        await dbHandler.poolClose();
        console.log('Tagging tests completed.');
    }
}

runTaggingTests();