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


//Our main function
function nudgePriceSheets() {
    pool.query('SELECT name,price_sheet FROM cities', (err, res) => { //get all cities and their price sheets
        if (err) {
            console.error('Error selecting from cities:', err); //error handling
        } else {
            const cities = res.rows; //get the rows from the query
            for (const city of cities) { //iterate through the cities
                console.log('Updating price sheet for:', city.name); //log the city name
                const newPriceSheet = {...city.price_sheet}; //create a new price sheet object. Object parses to price_sheet, not priceSheet?
                Object.keys(newPriceSheet).forEach(good => { //iterate through the goods in the price sheet
                    //console.log(good, " ", newPriceSheet[good].price); 
                    const oldPrice = newPriceSheet[good].price; //get the old price
                    const newPrice = priceChanger(oldPrice); //calculate the new price
                    console.log(good, " ", oldPrice, "->", newPrice); //log the good, old price, and new price
                    newPriceSheet[good].price = newPrice; //update the price in the new price sheet
                })
                console.log(newPriceSheet);
            }

            //function will then have to update the price sheet in the database, using a transaction for data integrity
        }
        pool.end();
});}

async function updatePriceSheets() {
    const client = await pool.connect(); //grab a client to complete the transaction

    try {
        await client.query('BEGIN'); //begin the transaction. Ensures atomicity and data integrity
        

        const res = await client.query('SELECT id,name,price_sheet FROM cities'); //get all cities and their price sheets
        const cities = res.rows; //get the rows from the query

            for (const city of cities) { //iterate through the cities
                console.log('Updating price sheet for:', city.name); //log the city name
                const newPriceSheet = {...city.price_sheet}; //create a new price sheet object. Object parses to price_sheet, not priceSheet?
                Object.keys(newPriceSheet).forEach(good => { //iterate through the goods in the price sheet
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

// async function addCitiesFromConfig() {
//     //just using this for now, will write a better function later
//     const data = JSON.parse(fs.readFileSync('./dataObjects.json'));
//     const cities = data.cityList;
//     console.log(cities[0].name);
//     addCities(cities[0].name, cities[0].priceSheet);
// }



//nudgePriceSheets();
updatePriceSheets();
//addCity(3);



