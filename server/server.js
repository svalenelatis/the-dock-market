const express = require('express');
const bodyParser = require('body-parser');
const dbHandler = require('./dbHandler');
const TransactionManager = require('./transactionManager');
const cors = require('cors')

const app = express();
const port = process.env.PORT || 8080;

const corsOptions = {
    origin: '*', // Allow all origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(cors(corsOptions)); // Enable CORS for all routes


app.use(bodyParser.json());

//log all attempted requests to the console
app.use((req, res, next) => {
    console.log(`Request: ${req.method} ${req.url}`);
    console.log(`Params: ${JSON.stringify(req.params)}`);
    next();
}
);

const transactionManager = new TransactionManager();

// Define your endpoints here

app.get('/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

app.get('/api/players', async (req, res) => {
    try {
        const players = await dbHandler.getAllPlayers();
        res.json(players);
    } catch (e) {
        console.error('Error fetching players:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/prices', async (req, res) => {
    try {
        const pricesObj = await dbHandler.getAllPriceSheets();
        
        // Convert the object into a sorted array of [key, value] pairs
        const sortedEntries = Object.entries(pricesObj)
            .sort(([cityA], [cityB]) => cityA.localeCompare(cityB))
            .map(([city, goods]) => [
                city,
                Object.fromEntries(
                    Object.entries(goods)
                        .sort(([itemA], [itemB]) => itemA.localeCompare(itemB))
                )
            ]);

        // Convert back to an object
        const sortedPrices = Object.fromEntries(sortedEntries);
        
        res.json(sortedPrices);
    } catch (e) {
        console.error('Error fetching prices:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/api/player/:playerUsername', async (req, res) => { //MAKE SURE THE BODY OF THE REQUEST CONTAINS A PLAYER NAME OR THIS ROUTE WONT WORK
    try {
        item = {}
        const { playerUsername } = req.params;
        console.log(`Fetching player data for: ${playerUsername}`);
        const player = await dbHandler.getPlayer(playerUsername);
            
        
        res.json({ player });
    } catch (e) {
        console.error('Error fetching prices:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// app.post('/api/signup', async (req, res) => {
//     try {
//         const { username, password } = req.body;
//         const playerId = await dbHandler.createPlayer(username, password);
//         res.status(201).json({ playerId });
//     } catch (e) {
//         console.error('Error signing up:', e);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });
// app.delete('/api/player/:username', async (req, res) => {
//     try {
//         const { username } = req.params;
//         const result = await dbHandler.deletePlayer(username);
//         if (result) {
//             res.json({ success: true, message: `Player ${username} deleted.` });
//         } else {
//             res.status(404).json({ success: false, message: 'Player not found.' });
//         }
//     } catch (e) {
//         res.status(500).json({ success: false, error: e.message });
//     }
// });

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});