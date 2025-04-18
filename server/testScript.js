require('dotenv').config();
const dbHandler = require('./dbHandler');
const TransactionManager = require('./transactionManager');

const transactionManager = new TransactionManager();

async function setupTestData() {
    try {
        console.log('Resetting and populating the database...');
        await dbHandler.populateDatabase();

        console.log('Creating test players...');
        const player1Id = await dbHandler.createPlayer('Player1', 'password1', 'Katu');
        const player2Id = await dbHandler.createPlayer('Player2', 'password2', 'Katu');

        console.log('Adding ships for players...');
        const ship1Id = await dbHandler.addShip(player1Id, 'Ship1', 1, 100);
        const ship2Id = await dbHandler.addShip(player2Id, 'Ship2', 1.5, 150);

        console.log('Adding factories for players...');
        const factory1Id = await dbHandler.addFactory('Factory1', player1Id, {
            price: [{ good: 'Grain', quantity: 5 }],
            output: [{ good: 'Rations', quantity: 2 }]
        });
        const factory2Id = await dbHandler.addFactory('Factory2', player2Id, {
            price: [{ good: 'Metal', quantity: 3 }],
            output: [{ good: 'Tools', quantity: 1 }]
        });


        console.log('Adding inventory for ships...');
        await dbHandler.addItemToInventory(ship1Id, 'Grain', 50, true);
        await dbHandler.addItemToInventory(ship2Id, 'Metal', 30, true);

        console.log('Creating test transactions...');

        // Transactions for today
        await transactionManager.addTransaction(player1Id, ship1Id, 'Katu', {
            action: [{ type: 'buy', itemName: 'Water', quantity: 10 }]
        }, true);

        await transactionManager.addTransaction(player2Id, ship2Id, 'Blue Harbor', {
            action: [{ type: 'sell', itemName: 'Metal', quantity: 5 }]
        }, true);

        // // Transactions for a couple of minutes later
        // await transactionManager.addTransaction(player1Id, ship1Id, 'Temikor', {
        //     action: [{ type: 'buy', itemName: 'Stone', quantity: 15 }]
        // }, true);

        // await transactionManager.addTransaction(player2Id, ship2Id, 'Capricorn', {
        //     action: [{ type: 'sell', itemName: 'Tools', quantity: 3 }]
        // }, true);

        console.log('Test data setup complete.');
    } catch (e) {
        console.error('Error setting up test data:', e);
    } finally {
        await dbHandler.poolClose();
        console.log('Database connection closed.');
    }
}

setupTestData();