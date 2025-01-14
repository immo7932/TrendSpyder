const express = require('express');
const path = require('path');
const { scrapeTrends } = require('./scraper');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB configuration
const MONGO_URI = 'mongodb+srv://reader7932:Imranalam123@cluster0.ozx6exi.mongodb.net/twitter_trends';
const DB_NAME = 'twitter_trends';
const COLLECTION_NAME = 'trends';

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Format data according to requirements
function formatTrendsData(scrapedData) {
    // Default values in case of failure
    const defaultData = {
        trends: ['No trend available', 'No trend available', 'No trend available', 'No trend available', 'No trend available'],
        ipAddress: '0.0.0.0'
    };

    // Use provided data or defaults
    const data = scrapedData || defaultData;
    const trends = data.trends || defaultData.trends;
    const ipAddress = data.ipAddress || defaultData.ipAddress;

    return {
        nameoftrend1: trends[0] || 'No trend available',
        nameoftrend2: trends[1] || 'No trend available',
        nameoftrend3: trends[2] || 'No trend available',
        nameoftrend4: trends[3] || 'No trend available',
        nameoftrend5: trends[4] || 'No trend available',
        timestamp: new Date(),
        ipAddress: ipAddress
    };
}

// Endpoint to trigger the scraper
app.post('/run_scraper', async (req, res) => {
    let client;
    try {
        // Get data from scraper
        let scrapedData;
        try {
            scrapedData = await scrapeTrends();
            if (!scrapedData) {
                throw new Error('Scraper returned no data');
            }
        } catch (scrapeError) {
            console.error('Scraping failed:', scrapeError);
            // Continue with default data
            scrapedData = null;
        }

        // Format data for MongoDB
        const formattedData = formatTrendsData(scrapedData);
        
        // Connect to MongoDB
        client = new MongoClient(MONGO_URI, { 
            useUnifiedTopology: true,
           // useNewUrlParser: true 
        });
        await client.connect();
        
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);
        
        // Insert data
        const result = await collection.insertOne(formattedData);
        
        // Format response
        const response = {
            timestamp: formattedData.timestamp,
            trends: [
                formattedData.nameoftrend1,
                formattedData.nameoftrend2,
                formattedData.nameoftrend3,
                formattedData.nameoftrend4,
                formattedData.nameoftrend5
            ],
            ipAddress: formattedData.ipAddress,
            mongoDbRecord: {
                _id: result.insertedId,
                ...formattedData
            }
        };

        res.status(200).json(response);
    } catch (error) {
        console.error("Error in /run_scraper:", error);
        res.status(500).json({ 
            status: 'error', 
            message: error.message || 'Internal server error',
            timestamp: new Date(),
            trends: ['Error occurred', 'Error occurred', 'Error occurred', 'Error occurred', 'Error occurred'],
            ipAddress: '0.0.0.0'
        });
    } finally {
        if (client) {
            await client.close();
        }
    }
});

// Rest of your server code remains the same...

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});