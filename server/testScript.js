require('dotenv').config({ path: '../.env' });
const dbHandler = require('./dbHandler');
const TransactionManager = require('./transactionManager');

const transactionManager = new TransactionManager();

async function runFactoryTests() {
    try {
        console.log('Starting factory tests...');

        // Reset and populate the database
        console.log('Resetting and populating the database...');
        await dbHandler.populateDatabase();
        console.log('Database populated.');

        // Create test player
        console.log('Creating test player...');
        const playerId = await dbHandler.createPlayer('testPlayer', 'password123');
        console.log('Player created with ID:', playerId);

        // Add initial goods to player's inventory
        console.log('Adding initial goods to player\'s inventory...');
        await dbHandler.addItemToInventory(playerId, 'Grain', 10);
        await dbHandler.addItemToInventory(playerId, 'Livestock', 5);
        await dbHandler.addItemToInventory(playerId, 'Water', 20);
        console.log('Initial goods added.');

        // Check initial player inventory
        console.log('Checking initial player inventory...');
        let playerInventory = await dbHandler.returnInventory(playerId);
        console.log('Initial Player Inventory:', playerInventory);

        // Define production sheet for the factory
        const prodSheet = {
            price: [
                { good: 'Grain', quantity: 1 },
                { good: 'Livestock', quantity: 1 },
                { good: 'Water', quantity: 1 }
            ],
            output: [
                { good: 'Rations', quantity: 2 }
            ]
        };

        // Add factory to player
        console.log('Adding factory to player...');
        const factoryId = await dbHandler.addFactory('Ration Factory', playerId, prodSheet);
        console.log('Factory added with ID:', factoryId);

        // Add another factory with insufficient goods
        console.log('Adding another factory with insufficient goods...');
        const insufficientProdSheet = {
            price: [
                { good: 'Grain', quantity: 100 }, // Insufficient quantity
                { good: 'Livestock', quantity: 1 },
                { good: 'Water', quantity: 1 }
            ],
            output: [
                { good: 'Rations', quantity: 2 }
            ]
        };
        const insufficientFactoryId = await dbHandler.addFactory('Insufficient Factory', playerId, insufficientProdSheet);
        console.log('Factory with insufficient goods added with ID:', insufficientFactoryId);

        // Run processFactories to process the factory production
        console.log('Processing factories...');
        await dbHandler.processFactories();
        console.log('Factories processed.');

        // Check player inventory after processing factories
        console.log('Checking player inventory after processing factories...');
        playerInventory = await dbHandler.returnInventory(playerId);
        console.log('Player Inventory after processing factories:', playerInventory);

    } catch (e) {
        console.error('Error running factory tests:', e);
    } finally {
        await dbHandler.poolClose();
        console.log('Factory tests completed.');
    }
}

runFactoryTests();