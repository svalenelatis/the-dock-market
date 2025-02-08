require('dotenv').config({ path: '../.env' });
const dbHandler = require('./dbHandler');
const TransactionManager = require('./transactionManager');

const transactionManager = new TransactionManager();

async function runTransactionTests() {
    try {
        console.log('Starting transaction manager tests...');

        // Reset and populate the database
        console.log('Resetting and populating the database...');
        await dbHandler.populateDatabase();
        console.log('Database populated.');

        // Create test player and ship
        console.log('Creating test player and ship...');
        const playerId = await dbHandler.createPlayer('testPlayer', 'password123');
        const shipId = await dbHandler.addShip(playerId, 'Test Ship', 10, 100);
        console.log('Player and ship created with IDs:', playerId, shipId);

        // Add items to ship inventory
        console.log('Adding items to ship inventory...');
        await dbHandler.addItemToInventory(shipId, 'Grain', 50, true);
        console.log('Items added to ship inventory.');

        await dbHandler.addItemToInventory(playerId,"Zerikanium",30)

        // Check initial player inventory and gold
        console.log('Checking initial player inventory and gold...');
        let playerInventory = await dbHandler.returnInventory(playerId);
        let playerGold = await dbHandler.getGold(playerId); // Get current gold
        console.log('Initial Player Inventory:', playerInventory);
        console.log('Initial Player Gold:', playerGold);

        // Create and process a buy transaction
        console.log('Creating and processing a buy transaction...');
        const buyActions = {
            action: [
                {
                    type: 'buy',
                    itemName: 'Grain',
                    quantity: 20,
                    pricePerUnit: 5
                }
            ]
        };
        const buyTransactionId = await transactionManager.addTransaction(playerId, shipId, 'Test City', new Date(), JSON.stringify(buyActions));
        await transactionManager.processPendingTransactions();
        console.log('Buy transaction processed.');

        // Check player inventory and gold after buy transaction
        console.log('Checking player inventory and gold after buy transaction...');
        playerInventory = await dbHandler.returnInventory(shipId,true);
        playerGold = await dbHandler.getGold(playerId); // Get current gold
        console.log('Player Inventory after Buy:', playerInventory);
        console.log('Player Gold after Buy:', playerGold);

        // Create and process a sell transaction
        console.log('Creating and processing a sell transaction...');
        const sellActions = {
            action: [
                {
                    type: 'sell',
                    itemName: 'Grain',
                    quantity: 10,
                    pricePerUnit: 5
                }
            ]
        };
        const sellTransactionId = await transactionManager.addTransaction(playerId, shipId, 'Test City', new Date(), JSON.stringify(sellActions));
        await transactionManager.processPendingTransactions();
        console.log('Sell transaction processed.');

        // Check ship inventory
        console.log('Checking ship inventory...');
        const shipInventory = await dbHandler.returnInventory(shipId, true);
        console.log('Ship Inventory:', shipInventory);

        // Check player gold
        console.log('Checking player gold...');
        playerGold = await dbHandler.getGold(playerId); // Get current gold
        inventory = await dbHandler.returnInventory(playerId)
        sinventory = await dbHandler.returnInventory(shipId,true)
        console.log('Player Gold:', playerGold);
        console.log('Ship Invent:',sinventory);
        console.log('Player inve:',inventory)

    } catch (e) {
        console.error('Error running transaction manager tests:', e);
    } finally {
        await dbHandler.poolClose();
        console.log('Transaction manager tests completed.');
    }
}

runTransactionTests();