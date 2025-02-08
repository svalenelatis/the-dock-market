const dbHandler = require('./dbHandler');

class TransactionManager {
    constructor() {
        this.transactions = [];
    }

    async addTransaction(playerId, shipId, cityName, scheduledDate, actions) {
        try {
            const transactionId = await dbHandler.createTransaction(playerId, shipId, cityName, scheduledDate, actions);
            console.log(`Transaction created with ID: ${transactionId}`);
        } catch (e) {
            console.error('Error creating transaction:', e);
        }
    }

    async processPendingTransactions() {
        try {
            console.log("doing it")
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
        const actions = transaction.actions.action;
        for (const action of actions) {
            try {
                switch (action.type) {
                    case 'buy':
                        await this.handleBuyAction(transaction, action);
                        break;
                    case 'sell':
                        await this.handleSellAction(transaction, action);
                        break;
                    case 'subtract':
                        await this.handleSubtractAction(transaction, action);
                        break;
                    case 'add':
                        await this.handleAddAction(transaction, action);
                        break;
                    case 'changeGold':
                        await this.handleChangeGoldAction(transaction, action);
                        break;
                    // Add more cases as needed
                    default:
                        throw new Error('Invalid action type');
                }
            } catch (e) {
                console.error(`Error processing action ${action.type}:`, e);
                throw e;
            }
        }
    }

    async handleBuyAction(transaction, action) {
        const { itemName, quantity, pricePerUnit } = action;
        const totalCost = pricePerUnit * quantity;
        //console.log(itemName,quantity,pricePerUnit);
        // Subtract gold from player
        const goldResult = await dbHandler.changeGold(transaction.player_id, -totalCost);
        if (!goldResult.success) {
            console.warn(`Not enough gold to buy ${quantity} ${itemName}. Deficit: ${goldResult.deficit}`);
            // Handle deficit case if needed
            return;
        }

        // Add item to ship inventory
        
        const addItemResult = await dbHandler.addItemToInventory(transaction.ship_id, itemName, quantity, true);
        //console.log(addItemResult)
        // Handle cases where there's not enough storage space if needed
    }

    async handleSellAction(transaction, action) {
        const { itemName, quantity, pricePerUnit } = action;
        const totalRevenue = pricePerUnit * quantity;

        // Subtract item from ship inventory
        const subtractItemResult = await dbHandler.subtractItemFromInventory(transaction.ship_id, itemName, quantity, true);
        if (!subtractItemResult.success) {
            console.warn(`Not enough ${itemName} to sell. Deficit: ${subtractItemResult.deficit}`);
            // Handle deficit case if needed
            return;
        }

        // Add gold to player
        const goldResult = await dbHandler.changeGold(transaction.player_id, totalRevenue);
        // Handle cases where there's not enough storage space if needed
    }

    async handleSubtractAction(transaction, action) {
        const result = await dbHandler.subtractItemFromInventory(transaction.ship_id, action.itemName, action.quantity, true);
        if (!result.success) {
            console.warn(`Not enough ${action.itemName} to subtract. Deficit: ${result.deficit}`);
            // Handle deficit case if needed
        }
    }

    async handleAddAction(transaction, action) {
        const result = await dbHandler.addItemToInventory(transaction.ship_id, action.itemName, action.quantity, true);
        // Handle cases where there's not enough storage space if needed
    }

    async handleChangeGoldAction(transaction, action) {
        const result = await dbHandler.changeGold(transaction.player_id, action.amount);
        if (!result.success) {
            console.warn(`Not enough gold to subtract. Deficit: ${result.deficit}`);
            // Handle deficit case if needed
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