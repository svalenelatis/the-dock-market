require('dotenv').config({path: '../.env'});
const { Pool } = require('pg');
const priceChanger = require('./priceChanger');
const fs = require('fs');


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

                await client.query('UPDATE cities SET price_sheet = $1 WHERE id = $2', [newPriceSheet, city.id]);
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

async function addItems() { //need to rework item and city tag schemas before continuing, must kitbash out how to make a relational database to connect everything
    const items = JSON.parse(fs.readFileSync('./dataObjects.json')).items;
    console.log(items);
    
}   //this function will loop through the goods in the dataObjects.json file and add them to the database. Also adds Item Tags, for grouping Items

// async function addCities() {}   this function will loop through the cities in the dataObjects.json file and add them to the database. Will use addItems to populate price sheets

async function addCityTags() {
    const cityTags = JSON.parse(fs.readFileSync('./dataObjects.json')).cityTags;
     

    try{
        await pool.query('BEGIN');
        for (const tag of cityTags) {
            await pool.query('INSERT INTO city_tags (name, description,effects) VALUES ($1, $2,$3)', [tag.name, tag.description,tag.effects]);
            console.log('Tag added:', tag.name);
        }
        await pool.query('COMMIT');
    } catch (e) {
        await pool.query('ROLLBACK');
        console.error('Error adding city tags, transaction rolled back:',e);
    } finally {
        pool.end();
    }
}    //this function will loop through the tags in the dataObjects.json file and add them to the database

// async function tagCity(operation, tagName, city) {}   this function will add/remove tags from the cities, and adjust the price sheets accordingly

// async function populateDatabase() {}   this function should be run on first time setup to populate the database with the dataObjects.json file

// async function adjustPriceSheet(name, goodAdjustments) {}   function will adjust the price sheet for a specific city based on a created goodsAdjustments object. Used for when a player takes an action that directly adjusts a price sheet




function addCity(cityId) {
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

//nudgePriceSheets();
//updatePriceSheets();
//addCity(3);
//addItems();
addCityTags();



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