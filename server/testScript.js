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

        // Create and process a transaction with multiple actions (buy and sell)
        console.log('Creating and processing a transaction with multiple actions...');
        const multiActionTransaction = {
            action: [
                {
                    type: 'buy',
                    itemName: 'Stone',
                    quantity: 50 // Assume price per unit is 10 gold, so 50 units will cost 500 gold
                },
                {
                    type: 'sell',
                    itemName: 'Grain',
                    quantity: 20 // Assume price per unit is 5 gold, so 20 units will earn 100 gold
                }
            ]
        };
        const multiActionTransactionId = await transactionManager.addTransaction(playerId, shipId, 'Katu', new Date(), multiActionTransaction);
        await transactionManager.processPendingTransactions();
        console.log('Multi-action transaction processed.');

        // Check player inventory and gold after multi-action transaction
        console.log('Checking player inventory and gold after multi-action transaction...');
        playerInventory = await dbHandler.returnInventory(playerId);
        let shipInventory = await dbHandler.returnInventory(shipId, true);
        playerGold = await dbHandler.getGold(playerId); // Get current gold
        console.log('Player Inventory:', playerInventory);
        console.log('Player Gold:', playerGold);
        console.log('Ship Inventory:', shipInventory);

        // Attempt to schedule another transaction while the ship is busy
        console.log('Attempting to schedule another transaction while the ship is busy...');
        const buyGrainActions = {
            action: [
                {
                    type: 'buy',
                    itemName: 'Grain',
                    quantity: 20
                }
            ]
        };
        try {
            const buyGrainTransactionId = await transactionManager.addTransaction(playerId, shipId, 'Katu', new Date(), buyGrainActions);
            console.log('Buy grain transaction scheduled while ship is busy (this should not happen).');
        } catch (e) {
            console.log('Failed to schedule buy grain transaction while ship is busy (expected behavior).');
        }

        // Simulate ship return by manually updating the ship status and return date
        console.log('Simulating ship return...');
        await dbHandler.updateShipStatus(shipId, 'ready');
        console.log('Ship status updated to ready.');

        // Attempt to schedule another transaction after the ship is available
        console.log('Attempting to schedule another transaction after the ship is available...');
        const buyIronActions = {
            action: [
                {
                    type: 'buy',
                    itemName: 'Zerikanium',
                    quantity: 10 // Assume price per unit is 20 gold, so 10 units will cost 200 gold
                }
            ]
        };
        const buyIronTransactionId = await transactionManager.addTransaction(playerId, shipId, 'Katu', new Date(), buyIronActions);
        await transactionManager.processPendingTransactions();
        console.log('Buy iron transaction scheduled and processed after ship is available.');

        // Check player inventory and gold after buy iron transaction
        console.log('Checking player inventory and gold after buy iron transaction...');
        playerInventory = await dbHandler.returnInventory(playerId);
        shipInventory = await dbHandler.returnInventory(shipId, true);
        playerGold = await dbHandler.getGold(playerId); // Get current gold
        console.log('Player Inventory after Buy Iron:', playerInventory);
        console.log('Player Gold after Buy Iron:', playerGold);
        console.log('Ship Inventory after Buy Iron:', shipInventory);

    } catch (e) {
        console.error('Error running ship scheduling tests:', e);
    } finally {
        await dbHandler.poolClose();
        console.log('Ship scheduling tests completed.');
    }
}

runShipSchedulingTests();