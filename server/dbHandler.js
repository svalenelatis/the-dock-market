require('dotenv').config({path: '../.env'});
const { Pool } = require('pg');
const priceChanger = require('./priceChanger');
const fs = require('fs');
const { populate } = require('dotenv');
const bcrypt = require('bcrypt');


const pool = new Pool({
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
});
async function updatePriceSheets() {  //the main, async function to run the price sheet update in a wrapped transaction
    const client = await pool.connect(); //grab a client to complete the transaction

    try {
        await client.query('BEGIN'); //begin the transaction. Ensures atomicity and data integrity
        

        const cityRes = await client.query('SELECT id,name,price_sheet,volatility FROM cities'); //get all cities and their price sheets
        const cities = cityRes.rows; //get the rows from the query
        const itemRes = await client.query('SELECT name, base_price FROM items')

        const basePrices = {};
        itemRes.rows.forEach(item => {
            //console.log(item)
            basePrices[item.name] = item.base_price;
        })
        //console.log(basePrices);

            for (const city of cities) { //iterate through the cities
                console.log('Updating price sheet for:', city.name); //log the city name
                const newPriceSheet = {...city.price_sheet}; //create a new price sheet object. Object parses to price_sheet, not priceSheet?
                Object.keys(newPriceSheet).forEach(good => { //iterate through the goods in the price sheet. Difference between the for loops is a product of debugging, will fix
                    let {price,demand,integral,demandSetpoint} = newPriceSheet[good];
                    //console.log(good, " ", newPriceSheet[good].price); 
                    //console.log(price,demand,integral,demandSetpoint)
                    const oldValues = {oldPrice: price,oldDemand: demand, oldIntegral: integral}; //get the old price
                    //console.log(basePrices[good])
                    const newValues = priceChanger(basePrices[good],price,demandSetpoint,demand,integral,.2 ,5 ,0.1 ,2); //calculate the new price
                    //console.log(newValues)
                    //console.log(good, " ", oldPrice, "->", newValues.price); //log the good, old price, and new price
                    newPriceSheet[good].price = roundToThree(jitter(newValues.price,city.volatility)); //update the price in the new price sheet
                    newPriceSheet[good].demand = roundToThree(jitter(newValues.demand,city.volatility));
                    newPriceSheet[good].integral = newValues.integral;
                    console.log(oldValues)
                    console.log("---->")
                    console.log(newValues)
                })
                //console.log(newPriceSheet);
                //console.log(city.id);

                await client.query('UPDATE cities SET price_sheet = $1 WHERE id = $2', [newPriceSheet, city.id]); //update the price sheet in the database
                console.log("Price sheet updated for:", city.name);
            }





        await client.query('COMMIT'); //commit the transaction
    } catch (e) {
        await client.query('ROLLBACK'); //rollback the transaction if there's an error
        console.error('Error updating city prices, transaction rolled back:',e); //throw the error
    } finally {
        client.release(); //release the client
    }
}

async function addRandomTagsToCities() {
    try {
        const citiesRes = await pool.query('SELECT id, name, tags FROM cities');
        const cities = citiesRes.rows;

        const randomTagsRes = await pool.query('SELECT name FROM city_tags WHERE random = TRUE');
        const randomTags = randomTagsRes.rows.map(row => row.name);

        for (const city of cities) {
            if (Math.random() < 0.25) { // 10% chance to add a random tag
                const randomTag = randomTags[Math.floor(Math.random() * randomTags.length)];
                if (!city.tags.includes(randomTag)) {
                    await tagCity('add', randomTag, city.name);
                    console.log(`Added random tag ${randomTag} to city ${city.name}`);
                }
            }
        }
    } catch (e) {
        console.error('Error adding random tags to cities:', e);
    }
}

async function removeRandomTagsFromCities() {
    try {
        const citiesRes = await pool.query('SELECT id, name, tags FROM cities');
        const cities = citiesRes.rows;

        const randomTagsRes = await pool.query('SELECT name FROM city_tags WHERE random = TRUE');
        const randomTags = randomTagsRes.rows.map(row => row.name);

        for (const city of cities) {
            for (const tag of city.tags) {
                if (randomTags.includes(tag) && Math.random() < 0.25) { // 10% chance to remove a random tag
                    await tagCity('remove', tag, city.name);
                    console.log(`Removed random tag ${tag} from city ${city.name}`);
                }
            }
        }
    } catch (e) {
        console.error('Error removing random tags from cities:', e);
    }
}

async function processFactories() {
    try {
        const res = await pool.query('SELECT player_id, production_sheet FROM factories');
        const factories = res.rows;

        for (const factory of factories) {
            const player = factory.player_id;
            const price = factory.production_sheet.price;

            try {
                if (price.length > 0) {
                    for (const item of price) {
                        const { good, quantity } = item;
                        const result = await subtractItemFromInventory(player, good, quantity);
                        if (!result.success) {
                            throw new Error(`Insufficient ${good} in inventory for player ${player}`);
                        }
                    }
                }

                const output = factory.production_sheet.output;
                for (const item of output) {
                    const { good, quantity } = item;
                    await addItemToInventory(player, good, quantity);
                    console.log("Successfully added item to inventory.");
                }
                //console.log(player, price);
            } catch (e) {
                console.error(`Error processing factory for player ${player}. Probably not enough goods.`);
                continue; // Skip to the next factory
            }
        }
    } catch (e) {
        console.error('Error processing factories:', e);
    }
}

async function getPriceSheet(cityName) {
    try {
        const res = await pool.query(
            'SELECT price_sheet FROM cities WHERE name = $1',
            [cityName]
        );
        if (res.rows.length === 0) {
            throw new Error('City not found');
        }
        return res.rows[0].price_sheet;
    } catch (e) {
        console.error('Error getting price sheet:', e);
        throw e;
    }
}

async function getGoodPrice(cityName, itemName) {
    try {
        const priceSheet = await getPriceSheet(cityName);
        if (!priceSheet[itemName]) {
            throw new Error(`Price for item ${itemName} not found in city ${cityName}`);
        }
        return priceSheet[itemName];
    } catch (e) {
        console.error(`Error getting price for ${itemName} in ${cityName}:`, e);
        throw e;
    }
}

function jitter(value,factor) {
    const jit = (Math.random() * 2 - 1) * factor;
    return value + jit;
}

async function addItems() { //adds all items from config. 
    const items = JSON.parse(fs.readFileSync('./dataObjects.json')).items; //grab the items from the config file
    //console.log(items);

    try {
        await pool.query('BEGIN'); //begin the transaction
        for (const item of items) { //iterate through the items
            if(item.components !== undefined){ //if the item has components, add them
                await pool.query('INSERT INTO items (name, base_price, components) VALUES ($1, $2,$3)', [item.name, item.basePrice,item.components]);
                console.log('Item with components added:', item.name,item.components);
            }
            else { //if the item has no components, add it with null
                await pool.query('INSERT INTO items (name, base_price,components) VALUES ($1, $2,$3)', [item.name, item.basePrice,null]);
                console.log('Item with no components added:', item.name);
            }
        await pool.query('COMMIT'); //commit the transaction
    }
    } catch (e) {
        await pool.query('ROLLBACK'); //rollback the transaction if there's an error
        console.error('Error adding items, transaction rolled back:',e);
    } finally {
        console.log('Items done');
    }
    
}   

async function addCityTags() { //adds City Tags from config
    const cityTags = JSON.parse(fs.readFileSync('./dataObjects.json')).cityTags; //grab the city tags from the config file
    const randomTags = JSON.parse(fs.readFileSync('./dataObjects.json')).randomEventTags; //grab the random tags from the config file
     

    try{
        await pool.query('BEGIN'); //begin the transaction
        for (const tag of cityTags) { //iterate through the city tags
            await pool.query('INSERT INTO city_tags (name, description,effects,random) VALUES ($1, $2,$3,$4)', [tag.name, tag.description,tag.effects,false]); //false, not random
            console.log('Set tag added:', tag.name);
        } 
        for (const tag of randomTags) { //iterate through the random tags
            await pool.query('INSERT INTO city_tags (name, description,effects,random) VALUES ($1, $2,$3,$4)', [tag.name, tag.description,tag.effects,true]); //true, random
            console.log('Random Tag added:', tag.name);
        }
        await pool.query('COMMIT'); //commit the transaction
    } catch (e) {
        await pool.query('ROLLBACK');
        console.error('Error adding city tags, transaction rolled back:',e);
    } finally {
        console.log('City Tags done');
    }
}  

function roundToThree(num) { //rounds a number to two decimal places
    const factor = Math.pow(10, 2);
    return Math.round(num * factor) / factor;
}

async function tagCity(operation, tagName, city) { // this function will add/remove tags from the cities, and adjust the price sheets accordingly
    const client = await pool.connect();
    try{
        await client.query('BEGIN'); //transaction time

        const cityResult = await client.query('SELECT tags,price_sheet FROM cities WHERE name = $1', [city]); //get the city and its price sheet
        //console.log(cityResult.rows[0]);


        if (cityResult.rows.length === 0) { //General error handlingt
            throw new Error(`City with name ${city} not found`);
        }
        let { tags, price_sheet } = cityResult.rows[0];
        tags = tags || []; 

        const tagResult = await client.query('SELECT * FROM city_tags WHERE name = $1', [tagName]); //get the tag
        if (tagResult.rows.length === 0) {
            throw new Error(`Tag with name ${tagName} not found`); //error handling
        }
        //console.log(tagResult.rows[0]);
        const tagEffects = tagResult.rows[0].effects; //get the tag effects
        //console.log(tagEffects);

        if(operation == 'add'){ //add or remove the tag, depending on operation
            if(!tags.includes(tagName)){
                tags.push(tagName);
            }
        }
        else if(operation == 'remove'){ //add or remove the tag, depending on operation
            if(tags.includes(tagName)){
                tags = tags.filter(tag => tag !== tagName);
            }
        }
        else {
            throw new Error('Invalid operation');
        }

        if (tagEffects.goods) { //adjust the price sheet based on the individual tag effects
            for (const [good, effect] of Object.entries(tagEffects.goods)) { //iterate through the goods and their effects
                //console.log(good, effect);
                if(price_sheet[good]){
                    //console.log(good, price_sheet[good].demand);
                    price_sheet[good].demandSetpoint += effect === 'add' ? effect : -effect; //fancy ternary operator to add or subtract the effect
                    price_sheet[good].demandSetpoint = roundToThree(Math.max(price_sheet[good].demandSetpoint,0)); //ensures demand doesn't go below 1
                    //console.log(good, price_sheet[good].demandSetpoint);
                }
            }
        }

        if (tagEffects.tags) {  //adjust the price sheet based on the large scale tag effects
            for (const [tag, effect] of Object.entries(tagEffects.tags)) {
                const goodsResult = await client.query('SELECT good_name FROM item_tag_goods WHERE item_tag_id = (SELECT id FROM item_tags WHERE name = $1)', [tag]);
                for (const goodRow of goodsResult.rows) {
                    const good = goodRow.good_name;
                    if(price_sheet[good]){
                        price_sheet[good].demandSetpoint += effect === 'add' ? effect : -effect;
                        price_sheet[good].demandSetpoint = roundToThree(Math.max(price_sheet[good].demandSetpoint,0));
                    }
        }}}

        

        await client.query('UPDATE cities SET tags = $1, price_sheet = $2 WHERE name = $3', [tags, price_sheet, city]); //update the city with the new tags and price sheet
        await client.query('COMMIT');
        console.log(`Successfully ${operation}ed tag ${tagName} to city ${city}`);
    }
    catch (e) {
        await client.query('ROLLBACK');
        console.error('Error tagging city, transaction rolled back:',e);
    } finally {
        client.release();
}

} 

async function resetDatabase(poolCheck) { //Full Database Reset and Schema Load. Remove when done testing. poolCheck to determine if pool should stay open or close after reset
    try {
        const schema = fs.readFileSync('./schema.sql', 'utf8');
        console.log('Schema read:', schema);
        await pool.query(schema);
        console.log('Database reset, schema successfully loaded');
    }
    catch (e) {
        console.error('Error loading schema:', e);
    }
    finally {
        if(poolCheck){
            console.log('Pool stays open.');
        }
        else{
            console.log('Pool closing.');
            pool.end();
        }
    }
}

function addCity(cityId) { //deprecated function to add a single city to database. Keeping just in case/as admin function
    const cities = JSON.parse(fs.readFileSync('./dataObjects.json')).cityList;
    const name = cities[cityId].name;
    const sheet = cities[cityId].priceSheet;
    pool.query('INSERT INTO cities (name, price_sheet) VALUES ($1, $2)', [name, sheet], (err, res) => {
        if (err) {
            console.error('Error inserting into cities:', err);
        } else {
            console.log('City added:', res.rows);
        }
        pool.end();
});}

async function tagCities() { //loops cities and runs tagCity for each tag on each city
    const cityList = JSON.parse(fs.readFileSync('./dataObjects.json')).cityList;

    for (const city of cityList) {
        for (const tag of city.tags) {
            await tagCity('add', tag, city.name);
        }
    }
}

async function addCities() { //this function will loop through the cities in the dataObjects.json file and add them to the database. Will use addItems to populate price sheets
    const cities = JSON.parse(fs.readFileSync('./dataObjects.json')).cityList;
    try {
        await pool.query('BEGIN');
        const priceSheet = generatePriceSheet();
        for (const city of cities) {
            await pool.query('INSERT INTO cities (name, price_sheet,volatility) VALUES ($1, $2,$3)', [city.name, priceSheet,city.volatility]);
            console.log('City added:', city.name);
        }
        await pool.query('COMMIT');
    } catch (e) {
        await pool.query('ROLLBACK');
        console.error('Error adding cities, transaction rolled back:', e);
    } finally {
        console.log('Cities done');
    }
}

async function addItemTags() { //this function will loop through the item tags in the dataObjects.json file and add them to the database
    const itemTags = JSON.parse(fs.readFileSync('./dataObjects.json')).itemTags;
    try {
        await pool.query('BEGIN');
        
        
        for (const tag of itemTags) {
            const result = await pool.query('INSERT INTO item_tags (name, description) VALUES ($1, $2) RETURNING id', [tag.name, tag.description]);
            tagId = result.rows[0].id;
            console.log('Tag added:', tag.name);
            if(tag.goods.length > 0) {
                const goodsValues = tag.goods.map(good => `(${tagId}, '${good}')`).join(', ');
                await pool.query(`INSERT INTO item_tag_goods (item_tag_id, good_name) VALUES ${goodsValues}`);
                console.log('Goods added:', tag.goods);
            }
            
        }
        await pool.query('COMMIT');
    } catch (e) {    
        await pool.query('ROLLBACK');
        console.error('Error adding item tags, transaction rolled back:', e);
    } finally {
        console.log('Item tags added');
    }
}

function generatePriceSheet() { //generates a price sheet based on the items in the dataObjects.json file
    const priceSheet = {};
    const items = JSON.parse(fs.readFileSync('./dataObjects.json')).items;
    for (const item of items) {
        priceSheet[item.name] = {price: item.basePrice, demand: 1, demandSetpoint: 1, integral: 0};
    }
    console.log("New Price Sheet Generated from item config");
    return priceSheet;
}

async function createPlayer(username, password) {
    const saltRounds = 10;

    const existingUser = await pool.query('SELECT id FROM players WHERE username = $1', [username]);

    if (existingUser.rows.length > 0) {
        throw new Error('Username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await pool.query('BEGIN');
    try {
        const result = await pool.query('INSERT INTO players (username, password_hash) VALUES ($1, $2) RETURNING id', [username, hashedPassword]);
        const playerId = result.rows[0].id;
        await pool.query('COMMIT');
        return playerId;
    } catch (e) {
        await pool.query('ROLLBACK');
        console.error('Error creating player, transaction rolled back:', e);
        throw e;
    } finally {
        //pool.end();
        console.log("made a player")
    }
}

async function deletePlayer(username) {
    try {
        const res = await pool.query(
            'DELETE FROM players WHERE username = $1 RETURNING id',
            [username]
        );
        if (res.rowCount === 0) {
            throw new Error('User not found. No deletion occurred.');
        }
        return true; // Player deleted successfully
    } catch (error) {
        console.error(`Error deleting player: ${error.message}`);
        return false; // Indicate failure
    }
}

async function itemExists(itemName) {
    try {
        const res = await pool.query(
            'SELECT 1 FROM items WHERE name = $1',
            [itemName]
        );
        return res.rows.length > 0;
    } catch (e) {
        console.error('Error checking if item exists:', e);
        throw e;
    }
    finally {
        //pool.end();
        
    }
}

async function addItemToInventory(ownerId, itemName, quantity, isShip = false) {
    try {
        if (quantity <= 0) {
            console.warn(`Attempted to add a non-positive quantity (${quantity}) of ${itemName} to inventory.`);
            return 0; // No operation performed
        }

        if (!await itemExists(itemName)) {
            throw new Error(`Item with name ${itemName} does not exist`);
        }

        const table = isShip ? 'ship_inventories' : 'player_inventories';
        const idColumn = isShip ? 'ship_id' : 'player_id';

        await pool.query('BEGIN');
        const res = await pool.query(
            `INSERT INTO ${table} (${idColumn}, item_name, quantity) VALUES ($1, $2, $3) ON CONFLICT (${idColumn}, item_name) DO UPDATE SET quantity = ${table}.quantity + EXCLUDED.quantity RETURNING quantity`,
            [ownerId, itemName, quantity]
        );
        await pool.query('COMMIT');
        return res.rows[0].quantity;
    } catch (e) {
        await pool.query('ROLLBACK');
        console.error('Error adding item to inventory, transaction rolled back:', e);
        throw e;
    }
}

async function subtractItemFromInventory(ownerId, itemName, quantity, isShip = false) {
    try {
        if (quantity <= 0) {
            console.warn(`Attempted to subtract a non-positive quantity (${quantity}) of ${itemName} from inventory.`);
            return { success: false, deficit: 0 }; // No operation performed
        }

        if (!await itemExists(itemName)) {
            throw new Error(`Item with name ${itemName} does not exist`);
        }

        const table = isShip ? 'ship_inventories' : 'player_inventories';
        const idColumn = isShip ? 'ship_id' : 'player_id';

        await pool.query('BEGIN');
        const res = await pool.query(
            `SELECT quantity FROM ${table} WHERE ${idColumn} = $1 AND item_name = $2`,
            [ownerId, itemName]
        );
        if (res.rows.length === 0 || res.rows[0].quantity < quantity) {
            await pool.query('ROLLBACK');
            return { success: false, deficit: quantity - (res.rows[0]?.quantity || 0) };
        }

        const newQuantity = res.rows[0].quantity - quantity;
        if (newQuantity === 0) {
            await pool.query(
                `DELETE FROM ${table} WHERE ${idColumn} = $1 AND item_name = $2`,
                [ownerId, itemName]
            );
        } else {
            await pool.query(
                `UPDATE ${table} SET quantity = $1 WHERE ${idColumn} = $2 AND item_name = $3`,
                [newQuantity, ownerId, itemName]
            );
        }

        await pool.query('COMMIT');
        return { success: true };
    } catch (e) {
        await pool.query('ROLLBACK');
        console.error('Error subtracting item from inventory, transaction rolled back:', e);
        throw e;
    }
}

async function returnInventory(ownerId, isShip = false) {
    try {
        const table = isShip ? 'ship_inventories' : 'player_inventories';
        const idColumn = isShip ? 'ship_id' : 'player_id';

        const res = await pool.query(
            `SELECT item_name, quantity FROM ${table} WHERE ${idColumn} = $1`,
            [ownerId]
        );
        return res.rows;
    } catch (e) {
        console.error('Error returning inventory:', e);
        throw e;
    }
}

async function changeGold(playerId, amount) {
    try {
        await pool.query('BEGIN');
        const res = await pool.query(
            'SELECT gold FROM players WHERE id = $1',
            [playerId]
        );
        if (res.rows.length === 0 || res.rows[0].gold + amount < 0) {
            await pool.query('ROLLBACK');
            return { success: false, deficit: Math.abs(res.rows[0]?.gold + amount) };
        }
        await pool.query(
            'UPDATE players SET gold = gold + $1 WHERE id = $2',
            [amount, playerId]
        );
        await pool.query('COMMIT');
        return { success: true };
    } catch (e) {
        await pool.query('ROLLBACK');
        console.error('Error changing gold, transaction rolled back:', e);
        throw e;
    }
}

async function getGold(playerId) {
    try {
        const res = await pool.query(
            'SELECT gold FROM players WHERE id = $1',
            [playerId]
        );
        if (res.rows.length === 0) {
            throw new Error('Player not found');
        }
        return res.rows[0].gold;
    } catch (e) {
        console.error('Error getting gold:', e);
        throw e;
    }
}

async function createTransaction(playerId, shipId, cityName, scheduledDate, actions, needsReturn) {
    try {
        const res = await pool.query(
            'INSERT INTO transactions (player_id, ship_id, city_name, scheduled_date, actions, needs_return) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [playerId, shipId, cityName, scheduledDate, actions, needsReturn]
        );
        return res.rows[0].id;
    } catch (e) {
        console.error('Error creating transaction:', e);
        throw e;
    }
}

async function getPendingTransactions() {
    try {
        const res = await pool.query(
            "SELECT * FROM transactions WHERE status = 'pending' AND scheduled_date <= CURRENT_DATE"
        );
        return res.rows;
    } catch (e) {
        console.error('Error getting pending transactions:', e);
        throw e;
    }
}

async function updateTransactionStatus(transactionId, status) {
    try {
        await pool.query(
            'UPDATE transactions SET status = $1 WHERE id = $2',
            [status, transactionId]
        );
    } catch (e) {
        console.error('Error updating transaction status:', e);
        throw e;
    }
}

async function addShip(playerId, name, speed, cargoSpace, attributes = {}) {
    try {
        const res = await pool.query(
            'INSERT INTO ships (player_id, name, speed, cargo_space, attributes) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [playerId, name, speed, cargoSpace, attributes]
        );
        return res.rows[0].id;
    } catch (e) {
        console.error('Error adding ship:', e);
        throw e;
    }
}

async function removeShip(shipId) {
    try {
        const res = await pool.query(
            'DELETE FROM ships WHERE id = $1 RETURNING id',
            [shipId]
        );
        if (res.rowCount === 0) {
            throw new Error('Ship not found. No deletion occurred.');
        }
        return true; // Ship deleted successfully
    } catch (e) {
        console.error(`Error deleting ship: ${e.message}`);
        return false; // Indicate failure
    }
}

async function poolClose() {
    pool.end()
}

async function getShip(id) {
    try {
        const res = await pool.query('SELECT * FROM ships WHERE id = $1', [id]);
        if (res.rows.length === 0) {
            throw new Error('Ship not found');
        }
        return res.rows[0];
    } catch (e) {
        console.error('Error getting ship:', e);
        throw e;
    }
}

async function updateShipStatus(shipId, status) {
    try {
        await pool.query(
            'UPDATE ships SET status = $1 WHERE id = $2',
            [status, shipId]
        );
    } catch (e) {
        console.error('Error updating ship status:', e);
        throw e;
    }
}

async function handleShipReturn(shipId) {
    try {
        await pool.query('BEGIN');
        const ship = await getShip(shipId);
        const playerId = ship.player_id;
        // Transfer goods from ship to player inventory
        const shipInventory = await returnInventory(shipId, true);
        for (const item of shipInventory) {
            await addItemToInventory(playerId, item.item_name, item.quantity);
            await subtractItemFromInventory(shipId, item.item_name, item.quantity, true);
        }

        // Update ship status to available
        await updateShipStatus(shipId, 'ready');

        await pool.query('COMMIT');
    } catch (e) {
        await pool.query('ROLLBACK');
        console.error('Error handling ship return, transaction rolled back:', e);
        throw e;
    }
}

//factory prodSheets should be formatted as such:
// prod = {
//     price: [
//         {good: "name",quantity: 1},
//         {good: "name",quantity: 1},
//         {good: "name",quantity: 1}
//     ],
//     output: [
//         {good: "name",quantity: 1}
//     ]
// }


async function addFactory(name,playerId,prodSheet) {
    try {
        const res = await pool.query('INSERT INTO factories (name, player_id,production_sheet) VALUES ($1,$2,$3) RETURNING id',
            [name,playerId,prodSheet]);
        console.log(`Factory added at ${res.rows[0].id}`);
        return(res.rows[0].id);
    } catch (e) {
        console.error('Error adding factory:',e);
        throw e;
    }
}
async function deleteFactory(factoryId){
    try {
        const res = await pool.query(
            'DELETE FROM factories WHERE id = $1 RETURNING id',
            [factoryId]
        );
        if (res.rowCount === 0) {
            throw new Error('Factory not found. No deletion occurred.');
        }
        console.log("Factory deleted successfully.")
        return true; // Factory deleted successfully
    } catch (e) {
        console.error(`Error deleting factory: ${e.message}`);
        return false; // Indicate failure
    }
}



async function populateDatabase() {
    await resetDatabase(true);
    await addItems();
    await addCityTags();
    await addItemTags();
    await addCities();
    await tagCities();
    await createPlayer('Zorgmor','123')
    await createPlayer('Mammoth','123')
    await createPlayer('Gonzola','123')
    await createPlayer('74747474','123')
    await createPlayer('Zorgmor24','123')
    //pool.end();
}   //this function should be run on first time setup to populate the database with the dataObjects.json file



module.exports = {
    updatePriceSheets,
    addItems,
    addCityTags,
    tagCity,
    resetDatabase,
    addCity,
    tagCities,
    addCities,
    addItemTags,
    generatePriceSheet,
    createPlayer,
    deletePlayer,
    itemExists,
    addItemToInventory,
    subtractItemFromInventory,
    returnInventory,
    changeGold,
    createTransaction,
    getPendingTransactions,
    updateTransactionStatus,
    addShip,
    removeShip,
    populateDatabase,
    poolClose,
    getGold,
    getPriceSheet,
    getGoodPrice,
    getShip,
    updateShipStatus,
    handleShipReturn,
    addFactory,
    deleteFactory,
    processFactories,
    addRandomTagsToCities,
    removeRandomTagsFromCities
};


//nudgePriceSheets();
//updatePriceSheets();
//addCity(3);
//addItems();
//addCityTags();
//tagCity('add','Agricultural','Blue Harbor');
//resetDatabase();
//addItemTags();
//generatePriceSheet();
//addCities();
//populateDatabase();
//createPlayer('platedfungi','Fakepassword#44');
//itemExists('Zerikanium')
//addItemToInventory(3,"Zerikanium",5,false);
// prod = {
//     price: [
//         {good: "Cows",quantity:1}
//     ],
//     output: [
//         {good: "Grain",quantity: 1}
//     ]
// }
//addFactory('Grain-Cow Factory',1,prod)
//processFactories();
