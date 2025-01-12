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
function updatePriceSheets() {
    pool.query('SELECT name,price_sheet FROM cities', (err, res) => { //get all cities and their price sheets
        if (err) {
            console.error('Error selecting from cities:', err); //error handling
        } else {
            const cities = res.rows; //get the rows from the query
            for (const city of cities) { //iterate through the cities
                console.log('Updating price sheet for:', city.name); //log the city name
                Object.keys(city.price_sheet).forEach(good => { //iterate through the goods in the price sheet
                    console.log(good, " ", city.price_sheet[good].price); //add price change function here
                })
            }

            //function will then have to update the price sheet in the database, using a transaction for data integrity
        }
        pool.end();
});}

function addCities(cityName, priceSheet) {
    pool.query('INSERT INTO cities (name, price_sheet) VALUES ($1, $2)', [cityName, priceSheet], (err, res) => {
        if (err) {
            console.error('Error inserting into cities:', err);
        } else {
            console.log('City added:', res.rows);
        }
        pool.end();
});}

async function addCitiesFromConfig() {
    //just using this for now, will write a better function later
    const data = JSON.parse(fs.readFileSync('./dataObjects.json'));
    const cities = data.cityList;
    console.log(cities[0].name);
    addCities(cities[0].name, cities[0].priceSheet);
}

updatePriceSheets();



