const express = require('express');
const bodyParser = require('body-parser');
const dbHandler = require('./dbHandler');
const TransactionManager = require('./transactionManager');
const cors = require('cors')

const app = express();
const port = process.env.PORT || 8080;

const corsOptions = {
    origin: `*`, // FIX THIS LATER TYLER THIS IS A SECURITY RISK AND YOU KNOW IT
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    credentials: true,
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

app.post('/api/transaction', async (req, res) => {
    // await transactionManager.addTransaction(player2Id, ship2Id, 'Blue Harbor', {
    //     action: [{ type: 'sell', itemName: 'Iron', quantity: 30 },
    //         { type: 'buy', itemName: 'Tools', quantity: 5 }]
    // }, true);

    try {
        const { playerId, shipId, destination, action,pass } = req.body;
        if(pass != process.env.PASS) {
            console.log("Password not provided or incorrect. Transaction not added.");
            return res.status(403).json({ error: 'Forbidden' });
        }
        console.log(`Adding transaction for player ${playerId} to ship ${shipId} at ${destination}, with ${action.length} actions.`);
        const transaction = await transactionManager.addTransaction(playerId, shipId, destination, action, true);
        res.json(transaction);
    }
    catch (e) {
        console.error('Error adding transaction:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }


});



app.post('/api/factory', async (req, res) => {
    try {

        // const factory1Id2 = await dbHandler.addFactory('Grain Mill', player1Id, {
        //             price: [{ good: 'Grain', quantity: 1 }],
        //             output: [{ good: 'Flour', quantity: 1 }]
        //         });

        const { playerId, factoryName, price, output,pass } = req.body;
        if(pass != process.env.PASS) {
            console.log("Password not provided or incorrect. Transaction not added.");
            return res.status(403).json({ error: 'Forbidden' });
        }
        console.log(`Adding factory ${factoryName} for player ${playerId}.`);
        const factoryId = await dbHandler.addFactory(factoryName, playerId, { price, output });
        res.json({ factoryId });
    } catch (e) {
        console.error('Error adding factory:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/ship', async (req, res) => {
    try {
        // const ship1Id2 = await dbHandler.addShip(player1Id, 'Nightfang', 1.2, 25);

        const { playerId, shipName, speed, cargoCapacity,pass } = req.body;
        if(pass != process.env.PASS) {
            console.log("Password not provided or incorrect. Transaction not added.");
            return res.status(403).json({ error: 'Forbidden' });
        }
        console.log(`Adding ship ${shipName} for player ${playerId}.`);
        const shipId = await dbHandler.addShip(playerId, shipName, speed, cargoCapacity);
        res.json({ shipId });
    }
    catch (e) {
        console.error('Error adding ship:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.post('/api/signup', async (req, res) => {
    try {


        const { username, password,pass,factoryName,price, output,shipName,speed,cargoCapacity } = req.body;
        if(pass != process.env.PASS) {
            console.log("Password not provided or incorrect. Transaction not added.");
            return res.status(403).json({ error: 'Forbidden' });
        }
        console.log(`Creating player ${username} with ID ${playerId}.`);
        const playerId = await dbHandler.createPlayer(username, password);
        console.log(`Adding factory ${factoryName} for player ${playerId}.`);
        const factoryId = await dbHandler.addFactory(factoryName, playerId, { price, output });
        console.log(`Adding ship ${shipName} for player ${playerId}.`);
        const shipId = await dbHandler.addShip(playerId, shipName, speed, cargoCapacity);
        console.log('Player fully added.');
        res.status(201).json({ playerId });
    } catch (e) {
        console.error('Error signing up:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
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