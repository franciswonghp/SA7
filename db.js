const { MongoClient } = require("mongodb");
const mongodb = require ('mongodb');
require('dotenv').config();

const ObjectId = mongodb.ObjectId

async function connectToMongoDB(){
    const uri = process.env.MONGODB_URI;
    const client = new MongoClient(uri);
    try {
        await client.connect();
        console.log("Conected to MOngoDb");
        return client.db(process.env.DB_NAME);
    } catch (error){
        console.log("Error connecting to database", error);
        throw error;
    }
}

module.exports = { connectToMongoDB, ObjectId}