const express = require('express');
const bodyParser = require('body-parser');
const dbHandler = require('./dbHandler');
const TransactionManager = require('./transactionManager');
const cors = require('cors')

const app = express();
const port = process.env.PORT || 3000;

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
    next();
}
);

const transactionManager = new TransactionManager();

// Define your endpoints here

app.get('/test', (req, res) => {
    res.json({ message: 'Server is running!' });
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

app.get('/api/player'), async (req, res) => { //MAKE SURE THE BODY OF THE REQUEST CONTAINS A PLAYER NAME OR THIS ROUTE WONT WORK
    try {


        item = {}
        if(req.body.searchName === "Synn"){
            item = {
                "name" : "Synn Rixen",
                "home port" : "Katu",
                "Gold" : 1400,
                "Inventory" : {
                    "Grain" : 10,
                    "Stone" : 10,
                    "Fruit" : 10
                },
                "Ships" : {
                    "Ship Name" : {
                        "Speed" : 1,
                        "Inventory" : {
                            "Iron" : 3
                        },
                        "Status" : "Ready"
                    },
                    "Ship Name 2" : {
                        "Speed" : 2,
                        "Inventory" : {
                            "Preserves" : 3
                        },
                        "Status" : "Returning"
                    }
                },
                "Factories" : {
                    "Iron Mine" : {
                        "Price" : {

                        },
                        "Production" : {
                            "Iron Ore" : 1
                        }
                    }
                }
            }
        }
        else if(req.body.searchName == "Rad'num"){
            item = {
                "name" : "Rad'num LongLastname",
                "home port" : "Greenlands",
                "Gold" : 200,
                "Inventory" : {
                    "Grain" : 2,
                    "Stone" : 5,
                    "Fruit" : 2
                },
                "Ships" : {
                    "Ship Name" : {
                        "Speed" : 1,
                        "Inventory" : {
                            "Coal" : 9
                        },
                        "Status" : "Not Ready"
                    },
                    "Ship Name 2" : {
                        "Speed" : 1.5,
                        "Inventory" : {
                            "Jewelry" : 1
                        },
                        "Status" : "Ready"
                    }
                },
                "Factories" : {
                    "Coal Mine" : {
                        "Price" : {

                        },
                        "Production" : {
                            "Coal" : 1
                        }
                    },
                    "Rations Factory" : {
                        "Price" : {
                            "Flour" : 1,
                            "Livestock" : 1,
                            "Water" : 1
                        },
                        "Production" : {
                            "Rations" : 2
                        }
                    }
                }
            }
        }
        
        res.json(item);
    } catch (e) {
        console.error('Error fetching prices:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

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