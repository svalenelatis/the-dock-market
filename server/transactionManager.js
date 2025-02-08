const dbHandler = require('./dbHandler');

class TransactionManager {
    constructor() {
        this.transactions = [];
    }

    async addTransaction(playerId, shipId, portName, scheduledDate, actions) {
        try {
            const transactionId = await dbHandler.createTransaction(playerId, shipId, portName, scheduledDate, actions);
            console.log(`Transaction created with ID: ${transactionId}`);
        } catch (e) {
            console.error('Error creating transaction:', e);
        }
    }

    async processPendingTransactions() {
        try {
            const transactions = await dbHandler.getPendingTransactions();
            for (const transaction of transactions) {
                try {
                    await this.processTransaction(transaction);
                    await dbHandler.updateTransactionStatus(transaction.id, 'completed');
                } catch (e) {
                    console.error('Error processing transaction:', e);
                    await dbHandler.updateTransactionStatus(transaction.id, 'failed');
                }
            }
        } catch (e) {
            console.error('Error processing pending transactions:', e);
        }
    }

    async processTransaction(transaction) {
        const actions = transaction.actions;
        for (const action of actions) {
            switch (action.type) {
                case 'subtract':
                    await dbHandler.subtractItemFromInventory(transaction.player_id, action.itemName, action.quantity);
                    break;
                case 'add':
                    await dbHandler.addItemToInventory(transaction.player_id, action.itemName, action.quantity);
                    break;
                case 'changeGold':
                    await dbHandler.changeGold(transaction.player_id, action.amount);
                    break;
                // Add more cases as needed
                default:
                    throw new Error('Invalid action type');
            }
        }
    }

    async transferItem(playerId, targetPlayerId, itemName, quantity) {
        try {
            await dbHandler.subtractItemFromInventory(playerId, itemName, quantity);
            await dbHandler.addItemToInventory(targetPlayerId, itemName, quantity);
        } catch (e) {
            console.error('Error transferring item:', e);
            throw e;
        }
    }

    async tradeItems(playerId, targetPlayerId, itemName, quantity) {
        // Implement trade logic here, possibly involving gold transactions as well
        try {
            // Example trade logic
            await this.transferItem(playerId, targetPlayerId, itemName, quantity);
            // Add additional trade logic if needed
        } catch (e) {
            console.error('Error trading items:', e);
            throw e;
        }
    }
}

module.exports = TransactionManager;