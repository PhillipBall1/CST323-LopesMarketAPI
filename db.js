const { MongoClient } = require("mongodb");
require('dotenv').config();

const mongoUri = process.env.MONGO_URI;
const dbName = "LopesMarket";

// Connect to MongoDB
async function connectToDatabase() {
  const client = new MongoClient(mongoUri, { useUnifiedTopology: true });
  await client.connect();
  console.log("Connected to database");
  return client.db(dbName);
}

// Export the connection to the DB
module.exports = {
  connectToDatabase,
};
