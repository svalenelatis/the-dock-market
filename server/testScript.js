require('dotenv').config();
const dbHandler = require('./dbHandler');
const TransactionManager = require('./transactionManager');

const transactionManager = new TransactionManager();

async function setupTestData() {
    try {
        console.log('Resetting and populating the database...');
        await dbHandler.populateDatabase();

        console.log('Creating test players...');
        const player1Id = await dbHandler.createPlayer('Synn', 'password1', 'Katu');
        const player2Id = await dbHandler.createPlayer('Radnum', 'password2', 'Capricorn');

        console.log('Adding ships for players...');
        const ship1Id = await dbHandler.addShip(player1Id, 'The Brilliance', 1, 30);
        const ship2Id = await dbHandler.addShip(player2Id, 'Nightfang', 1.2, 25);

        console.log('Adding factories for players...');
        const factory1Id = await dbHandler.addFactory('Farm', player1Id, {
            price: [],
            output: [{ good: 'Grain', quantity: 1 }]
        });
        const factory1Id2 = await dbHandler.addFactory('Grain Mill', player1Id, {
            price: [{ good: 'Grain', quantity: 1 }],
            output: [{ good: 'Flour', quantity: 1 }]
        });
        const factory2Id = await dbHandler.addFactory('Iron Mine', player2Id, {
            price: [],
            output: [{ good: 'Iron Ore', quantity: 1 }]
        });
        const factory2Id2 = await dbHandler.addFactory('Iron Refinery', player2Id, {
            price: [{ good: 'Iron Ore', quantity: 1 }],
            output: [{ good: 'Iron', quantity: 1 }]
        });


        console.log('Adding inventory for ships...');
        await dbHandler.addItemToInventory(player1Id, 'Water', 20);
        await dbHandler.addItemToInventory(player2Id, 'Tools', 10);

        await dbHandler.addItemToInventory(ship1Id, 'Grain', 50, true);
        await dbHandler.addItemToInventory(ship2Id, 'Iron', 30, true);

        console.log('Creating test transactions...');

        // Transactions for today
        await transactionManager.addTransaction(player1Id, ship1Id, 'Katu', {
            action: [{ type: 'sell', itemName: 'Grain', quantity: 50 },
                { type: 'buy', itemName: 'Stone', quantity: 20 }]
        }, true);

        await transactionManager.addTransaction(player2Id, ship2Id, 'Blue Harbor', {
            action: [{ type: 'sell', itemName: 'Iron', quantity: 30 },
                { type: 'buy', itemName: 'Tools', quantity: 5 }]
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