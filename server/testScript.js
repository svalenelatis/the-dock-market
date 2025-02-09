require('dotenv').config({ path: '../.env' });
const dbHandler = require('./dbHandler');
const TransactionManager = require('./transactionManager');

const transactionManager = new TransactionManager();

async function runShipSchedulingTests() {
    try {
        console.log('Starting ship scheduling tests...');

        // Reset and populate the database
        console.log('Resetting and populating the database...');
        await dbHandler.populateDatabase();
        console.log('Database populated.');

        // Create test player and ship
        console.log('Creating test player and ship...');
        const playerId = await dbHandler.createPlayer('testPlayer', 'password123');
        const shipId = await dbHandler.addShip(playerId, 'Test Ship', 10, 100);
        console.log('Player and ship created with IDs:', playerId, shipId);

        // Add initial gold to player
        console.log('Adding initial gold to player...');
        await dbHandler.changeGold(playerId, 1000); // Add 1000 gold to player
        console.log('Initial gold added.');

        // Check initial player inventory and gold
        console.log('Checking initial player inventory and gold...');
        let playerInventory = await dbHandler.returnInventory(playerId);
        let playerGold = await dbHandler.getGold(playerId); // Get current gold
        console.log('Initial Player Inventory:', playerInventory);
        console.log('Initial Player Gold:', playerGold);

        prod = { 
            price : [
                {good: 'Grain',quantity: 1},
                {good: 'Livestock',quantity: 1},
                {good: 'Water',quantity: 1}
            ],
            output : [
                {good: 'Rations',quantity: 2}
            ]
        }

        console.log('Adding factory to player');
        let factoryId = await dbHandler.addFactory('Ration Factory',playerId,prod);

    } catch (e) {
        console.error('Error running ship scheduling tests:', e);
    } finally {
        await dbHandler.poolClose();
        console.log('Ship scheduling tests completed.');
    }
}

runShipSchedulingTests();