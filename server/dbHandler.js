require('dotenv').config({path: '../.env'});
const { Pool } = require('pg');


const pool = new Pool({
    host: process.env.PGHOST,
    user: process.env.PGUSER,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT,
});
//super basic test of connecting to the database, now time to learn schema and queries
(async () => {
    try {
      const res = await pool.query("UPDATE cities SET price_sheet = jsonb_set(price_sheet, '{itemPriceKeyPairs,Stone}',$1) WHERE name = 'katu' RETURNING *",['15']);
      console.log('Database connected:', res.rows[0]);
    } catch (err) {
      console.error('Database connection error:', err);
    } finally {
      await pool.end();
    }
  })();