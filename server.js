const express = require("express");
const { MongoClient } = require("mongodb");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Global MongoDB client
let mongoClient = null;
let currentDb = null;

// MongoDB connection endpoint
app.post("/api/connect", async (req, res) => {
  try {
    const { connectionString, dbName } = req.body;

    // Close existing connection if any
    if (mongoClient) {
      await mongoClient.close();
    }

    // Create new connection
    mongoClient = new MongoClient(connectionString);
    await mongoClient.connect();

    // Test connection
    await mongoClient.db("admin").admin().ping();

    // Set current database
    if (dbName) {
      currentDb = mongoClient.db(dbName);
    }

    res.json({
      success: true,
      message: "Connected successfully",
      databases: await getDatabaseList(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get databases list
app.get("/api/databases", async (req, res) => {
  try {
    if (!mongoClient) {
      return res.status(400).json({ error: "Not connected to MongoDB" });
    }

    const databases = await getDatabaseList();
    res.json(databases);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get collections from a database
app.get("/api/databases/:dbName/collections", async (req, res) => {
  try {
    if (!mongoClient) {
      return res.status(400).json({ error: "Not connected to MongoDB" });
    }

    const db = mongoClient.db(req.params.dbName);
    const collections = await db.listCollections().toArray();

    res.json(
      collections.map((col) => ({
        name: col.name,
        type: col.type || "collection",
      })),
    );
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get documents from a collection
app.get(
  "/api/databases/:dbName/collections/:collectionName/documents",
  async (req, res) => {
    try {
      if (!mongoClient) {
        return res.status(400).json({ error: "Not connected to MongoDB" });
      }

      const db = mongoClient.db(req.params.dbName);
      const collection = db.collection(req.params.collectionName);

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip = (page - 1) * limit;

      const documents = await collection
        .find({})
        .skip(skip)
        .limit(limit)
        .toArray();
      const totalCount = await collection.countDocuments();

      res.json({
        documents,
        totalCount,
        page,
        totalPages: Math.ceil(totalCount / limit),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
);

// Execute a query
app.post("/api/query", async (req, res) => {
  try {
    if (!mongoClient) {
      return res.status(400).json({ error: "Not connected to MongoDB" });
    }

    const { database, collection, query, operation = "find" } = req.body;
    const db = mongoClient.db(database);
    const col = db.collection(collection);

    let result;
    const parsedQuery = JSON.parse(query || "{}");

    switch (operation) {
      case "find":
        result = await col.find(parsedQuery).limit(100).toArray();
        break;
      case "findOne":
        result = await col.findOne(parsedQuery);
        break;
      case "count":
        result = await col.countDocuments(parsedQuery);
        break;
      default:
        throw new Error(`Operation ${operation} not supported`);
    }

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to get database list
async function getDatabaseList() {
  const adminDb = mongoClient.db("admin");
  const dbs = await adminDb.admin().listDatabases();
  return dbs.databases.map((db) => ({
    name: db.name,
    sizeOnDisk: db.sizeOnDisk,
  }));
}

// Serve the main HTML file
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`MongoDB Web Manager running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  if (mongoClient) {
    await mongoClient.close();
  }
  process.exit(0);
});
