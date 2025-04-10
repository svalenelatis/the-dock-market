const dbHandler = require('./dbHandler');

class TransactionManager {
    constructor() {
        this.transactions = [];
    }

    async addTransaction(playerId, shipId, cityName, actions, needsReturn = true) {
        try {
            // Check if the ship is ready
            const ship = await dbHandler.getShip(shipId);
            if (ship.status !== 'ready') {
                throw new Error('Ship is not ready for a new transaction');
            }

            const cityId = await dbHandler.getCityByName(cityName);

            // Update ship status to busy
            await dbHandler.updateShipStatus(shipId, 'busy');

            const scheduledDate = new Date(Date.now() + (await dbHandler.getTravelTime(shipId, cityId) * 24 * 60 * 60 * 1000)); //returns travel time in days
            const transactionId = await dbHandler.createTransaction(playerId, shipId, cityName, scheduledDate, actions, needsReturn);
            console.log(`Transaction created with ID: ${transactionId}`);
        } catch (e) {
            console.error('Error creating transaction:', e);
            return(false);
        }
    }

    async addReturnTransaction(playerId, shipId, cityName, scheduledDate) {
        try {
            const returnActions = { action: [{ type: 'return' }] };
            const transactionId = await dbHandler.createTransaction(playerId, shipId, cityName, scheduledDate, returnActions, false);
            console.log(`Return transaction created with ID: ${transactionId}`);
        } catch (e) {
            console.error('Error creating return transaction:', e);
        }
    }

    async processPendingTransactions() {
        try {
            const transactions = await dbHandler.getPendingTransactions();
            for (const transaction of transactions) {
                try {
                    await this.processTransaction(transaction);
                    await dbHandler.updateTransactionStatus(transaction.id, 'completed');

                    if (transaction.needs_return) {
                        // Calculate return date based on the scheduled date
                        const scheduledDate = new Date(transaction.scheduled_date);
                        const returnDate = new Date(scheduledDate.getTime() + (scheduledDate.getTime() - Date.now()));

                        // Schedule a return transaction
                        await this.addReturnTransaction(transaction.player_id, transaction.ship_id, transaction.city_name, returnDate);
                    }

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
                    case 'return':
                        await this.handleReturnAction(transaction);
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
        let { itemName, quantity } = action;
        const itemData = await dbHandler.getGoodPrice(transaction.city_name, itemName);
        const pricePerUnit = itemData.price;
        let totalCost = pricePerUnit * quantity;

        // Check player's gold
        const playerGold = await dbHandler.getGold(transaction.player_id);
        if (playerGold < totalCost) {
            const affordableQuantity = Math.floor(playerGold / pricePerUnit);
            totalCost = pricePerUnit * affordableQuantity;
            console.log(`Tried to afford ${quantity}, only could afford ${affordableQuantity}`)
            quantity = affordableQuantity;
            
        }
        else{
            console.log(`Bought ${quantity} of ${itemName} at ${totalCost} (${pricePerUnit} at ${transaction.cityName})`)
        }

        // Subtract gold from player
        const goldResult = await dbHandler.changeGold(transaction.player_id, -totalCost);
        if (!goldResult.success) {
            console.log("Something went wrong, gold didn't come back right")
            return;
        }

        // Check ship's available space
        const shipInventory = await dbHandler.returnInventory(transaction.ship_id, true);
        const ship = await dbHandler.getShip(transaction.ship_id);
        const currentSpaceUsed = shipInventory.reduce((acc, item) => acc + item.quantity, 0);
        const availableSpace = ship.cargo_space - currentSpaceUsed;
        if (availableSpace < quantity) {
            const previousCost = totalCost;
            const oldQuantity = quantity;
            quantity = availableSpace;
            totalCost = pricePerUnit * quantity;
            const refund = previousCost - totalCost;
            console.log(`Not enough room. Sold back ${oldQuantity-quantity} for ${refund}`)
            await dbHandler.changeGold(transaction.player_id, refund); // Refund the difference
        }

        // Add item to ship inventory
        await dbHandler.addItemToInventory(transaction.ship_id, itemName, quantity, true);
    }

    async handleSellAction(transaction, action) {
        let { itemName, quantity } = action;
        const itemData = await dbHandler.getGoodPrice(transaction.city_name, itemName);
        const pricePerUnit = itemData.price;
        let totalRevenue = pricePerUnit * quantity;

        // Subtract item from ship inventory
        const subtractItemResult = await dbHandler.subtractItemFromInventory(transaction.ship_id, itemName, quantity, true);
        if (!subtractItemResult.success) {
            const availableQuantity = quantity - subtractItemResult.deficit;
            const newQuantity = availableQuantity;
            totalRevenue = pricePerUnit * newQuantity;
            console.log(`Tried to sell ${quantity}, only could sell ${availableQuantity} at ${totalRevenue}`)
        }
        else{
            console.log(`Sold ${quantity} of ${itemName} at ${totalRevenue}`)
        }
        // Add gold to player
        await dbHandler.changeGold(transaction.player_id, totalRevenue);
    }

    async handleSubtractAction(transaction, action) {
        const result = await dbHandler.subtractItemFromInventory(transaction.ship_id, action.itemName, action.quantity, true);
        if (!result.success) {
            // Handle deficit case if needed
        }
    }

    async handleAddAction(transaction, action) {
        await dbHandler.addItemToInventory(transaction.ship_id, action.itemName, action.quantity, true);
    }

    async handleChangeGoldAction(transaction, action) {
        const result = await dbHandler.changeGold(transaction.player_id, action.amount);
        if (!result.success) {
            // Handle deficit case if needed
        }
    }

    async handleReturnAction(transaction) {
        await dbHandler.handleShipReturn(transaction.ship_id);
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
        try {
            await this.transferItem(playerId, targetPlayerId, itemName, quantity);
        } catch (e) {
            console.error('Error trading items:', e);
            throw e;
        }
    }

}

module.exports = TransactionManager;