const express = require('express');
const bodyParser = require('body-parser');
const dbHandler = require('./dbHandler');
const TransactionManager = require('./transactionManager');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

const transactionManager = new TransactionManager();

// Define your endpoints here

app.get('/test', (req, res) => {
    res.json({ message: 'Server is running!' });
});

app.post('/api/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        const playerId = await dbHandler.createPlayer(username, password);
        res.status(201).json({ playerId });
    } catch (e) {
        console.error('Error signing up:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.delete('/api/player/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const result = await dbHandler.deletePlayer(username);
        if (result) {
            res.json({ success: true, message: `Player ${username} deleted.` });
        } else {
            res.status(404).json({ success: false, message: 'Player not found.' });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});