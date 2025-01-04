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

function updatePriceSheets() {
    pool.query('SELECT name,price_sheet FROM cities', (err, res) => {
        if (err) {
            console.error('Error selecting from cities:', err);
        } else {
            console.log('Cities:', res.rows);
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
    //does some stuff, I'm taking a break
}

function removeCity(cityName) {
    pool.query('DELETE FROM cities WHERE name = $1', [cityName], (err, res) => {
        if (err) {
            console.error('Error deleting from cities:', err);
        } else {
            console.log('City removed:', res.rows);
        }
        pool.end();
});}

