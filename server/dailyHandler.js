const cron = require('node-cron')
const dbHandler = require('./dbHandler');
const TransactionManager = require('./transactionManager');

const transactionManager = new TransactionManager();


async function dailyTasks(){
    try{
        //Add some random tags and wobble
        console.log("Adding and removing Random Tags")
        await dbHandler.addRandomTagsToCities();
        await dbHandler.removeRandomTagsFromCities();
        //Update all price sheets according to random variance
        console.log("Updating Pricesheets. This may take a while.")
        await dbHandler.updatePriceSheets();
        //Process all transactions
        console.log("Processing all transactions. This may take a while.")
        await transactionManager.processPendingTransactions();
        //Process Factories
        console.log("Processing factories and inventories.")
        await dbHandler.processFactories();
        
    }
    catch(e) {
        console.error("Error processing daily transactions.", e)
    }
}
