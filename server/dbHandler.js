require('dotenv').config({path: '../.env'});
const { Pool } = require('pg');
const priceChanger = require('./priceChanger');
const fs = require('fs');
const { populate } = require('dotenv');


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
        

        const res = await client.query('SELECT id,name,price_sheet FROM cities'); //get all cities and their price sheets
        const cities = res.rows; //get the rows from the query

            for (const city of cities) { //iterate through the cities
                console.log('Updating price sheet for:', city.name); //log the city name
                const newPriceSheet = {...city.price_sheet}; //create a new price sheet object. Object parses to price_sheet, not priceSheet?
                Object.keys(newPriceSheet).forEach(good => { //iterate through the goods in the price sheet. Difference between the for loops is a product of debugging, will fix
                    //console.log(good, " ", newPriceSheet[good].price); 
                    const oldPrice = newPriceSheet[good].price; //get the old price
                    const newPrice = priceChanger(oldPrice); //calculate the new price
                    console.log(good, " ", oldPrice, "->", newPrice); //log the good, old price, and new price
                    newPriceSheet[good].price = newPrice; //update the price in the new price sheet
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

async function populateDatabase() {
    await resetDatabase(true);
    await addItems();
    await addCityTags();
    await addItemTags();
    await addCities();
    await tagCities();
    pool.end();
}   //this function should be run on first time setup to populate the database with the dataObjects.json file

// async function adjustPriceSheet(name, goodAdjustments) {}   function will adjust the price sheet for a specific city based on a created goodsAdjustments object. Used for when a player takes an action that directly adjusts a price sheet


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


// Example functions for debugging/reference
//
//
//
//example function to get all cities
// function nudgePriceSheets() {
//     pool.query('SELECT name,price_sheet FROM cities', (err, res) => { //get all cities and their price sheets
//         if (err) {
//             console.error('Error selecting from cities:', err); //error handling
//         } else {
//             const cities = res.rows; //get the rows from the query
//             for (const city of cities) { //iterate through the cities
//                 console.log('Updating price sheet for:', city.name); //log the city name
//                 const newPriceSheet = {...city.price_sheet}; //create a new price sheet object. Object parses to price_sheet, not priceSheet?
//                 Object.keys(newPriceSheet).forEach(good => { //iterate through the goods in the price sheet
//                     //console.log(good, " ", newPriceSheet[good].price); 
//                     const oldPrice = newPriceSheet[good].price; //get the old price
//                     const newPrice = priceChanger(oldPrice); //calculate the new price
//                     console.log(good, " ", oldPrice, "->", newPrice); //log the good, old price, and new price
//                     newPriceSheet[good].price = newPrice; //update the price in the new price sheet
//                 })
//                 console.log(newPriceSheet);
//             }

//             //function will then have to update the price sheet in the database, using a transaction for data integrity
//         }
//         pool.end();
// });}

// async function addCitiesFromConfig() {
//     //just using this for now, will write a better function later
//     const data = JSON.parse(fs.readFileSync('./dataObjects.json'));
//     const cities = data.cityList;
//     console.log(cities[0].name);
//     addCities(cities[0].name, cities[0].priceSheet);
// }

//super basic test of connecting to the database, now time to learn schema and queries
// (async () => {
//     try {
//       const res = await pool.query("SELECT NOW()");
//       console.log('Database connected:', res.rows[0]);
//     } catch (err) {
//       console.error('Database connection error:', err);
//     } finally {
//       await pool.end();
//     }
//   })();