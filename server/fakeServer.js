const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

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
    next();
}
);

app.get('/api/prices', async (req, res) => {
    try {
        const sortedPrices = {
            "Blue Harbor": {
              "Building Materials": 43.78,
              "Clothing": 49.06,
              "Gemstones": 54.52,
              "Gold": 51.56,
              "Grain": 7.98,
              "Livestock": 16.78,
              "Metal": 19.62,
              "Rations": 10.17,
              "Silver": 42.78,
              "Stone": 26.93,
              "Textiles": 30.3,
              "Tools": 46.72,
              "Water": 15.72,
              "Weapons": 93.12,
              "Wood": 38.52,
              "Zerikanium": 192.16
            },
            "Capricorn": {
              "Building Materials": 42.74,
              "Clothing": 44.23,
              "Gemstones": 41.45,
              "Gold": 41.22,
              "Grain": 9.9,
              "Livestock": 19.66,
              "Metal": 18.73,
              "Rations": 15.56,
              "Silver": 32.25,
              "Stone": 30.81,
              "Textiles": 27.44,
              "Tools": 46.66,
              "Water": 19.83,
              "Weapons": 94.1,
              "Wood": 41.23,
              "Zerikanium": 188.77
            },
            "Katu": {
              "Building Materials": 47.25,
              "Clothing": 48.93,
              "Gemstones": 49.86,
              "Gold": 52.45,
              "Grain": 10.6,
              "Livestock": 17.71,
              "Metal": 19.26,
              "Rations": 16.83,
              "Silver": 41.13,
              "Stone": 31.76,
              "Textiles": 27.6,
              "Tools": 51.67,
              "Water": 17.89,
              "Weapons": 100.93,
              "Wood": 37.8,
              "Zerikanium": 194.08
            },
            "Temikor": {
              "Building Materials": 45.37,
              "Clothing": 44.92,
              "Gemstones": 55.23,
              "Gold": 55.9,
              "Grain": 9.61,
              "Livestock": 18.58,
              "Metal": 18.51,
              "Rations": 15.64,
              "Silver": 46.41,
              "Stone": 25.85,
              "Textiles": 26.81,
              "Tools": 45.39,
              "Water": 17.51,
              "Weapons": 97.29,
              "Wood": 36.25,
              "Zerikanium": 197.34
            },
			"Temikor2": {
				"Building Materials": 45.37,
				"Clothing": 44.92,
				"Gemstones": 55.23,
				"Gold": 55.9,
				"Grain": 9.61,
				"Livestock": 18.58,
				"Metal": 18.51,
				"Rations": 15.64,
				"Silver": 46.41,
				"Stone": 25.85,
				"Textiles": 26.81,
				"Tools": 45.39,
				"Water": 17.51,
				"Weapons": 97.29,
				"Wood": 36.25,
				"Zerikanium": 197.34
			  },
			  "Jamaca": {
				"Building Materials": 45.37,
				"Clothing": 44.92,
				"Gemstones": 55.23,
				"Gold": 55.9,
				"Grain": 9.61,
				"Livestock": 18.58,
				"Metal": 18.51,
				"Rations": 15.64,
				"Silver": 46.41,
				"Stone": 25.85,
				"Textiles": 26.81,
				"Tools": 45.39,
				"Water": 17.51,
				"Weapons": 97.29,
				"Wood": 36.25,
				"Zerikanium": 197.34
			  }
          };
        
        res.json(sortedPrices);
    } catch (e) {
        console.error('Error fetching prices:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});