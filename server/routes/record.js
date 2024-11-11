import express from "express";

import db from "../db/connection.js";

import { ObjectId } from "mongodb";

const router = express.Router();

const apiKeyMiddleware = (req, res, next) => {
    const origin = req.get("Origin");
    const apiKey = req.get("x-api-key");
    if (
        origin !== process.env.CLIENT_ORIGIN ||
        apiKey !== process.env.SERVER_API_KEY
    ) {
        return res.status(403).json({ message: "Forbidden" });
    }
    next();
};

router.use(apiKeyMiddleware);

router.get("/pubs", async (req, res) => {
    let collection = await db.collection("pubs");
    let results = await collection.find({}).toArray();
    res.send(results).status(200);
});

router.get("/load_count", async (req, res) => {
    let collection = await db.collection("map_loads");
    let query = { _id: new ObjectId(process.env.LOAD_COUNT_ID) };
    let result = await collection.findOne(query);

    if (!result) res.send("Not found").status(404);
    else res.send(result).status(200);
});

router.patch("/load_count", async (req, res) => {
    try {
        const query = { _id: new ObjectId(process.env.LOAD_COUNT_ID) };
        const updates = {
            $inc: {
                load_count: 1,
            },
        };
        let collection = await db.collection("map_loads");
        let result = await collection.updateOne(query, updates);
        res.send(result).status(200);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating record");
    }
});

router.patch("/load_count/period", async (req, res) => {
    try {
        const query = { _id: new ObjectId(process.env.LOAD_COUNT_ID) };
        const updates = {
            $set: {
                load_count: 1,
                created_at: new Date(),
            },
        };

        let collection = await db.collection("map_loads");
        let result = await collection.updateOne(query, updates);

        res.send(result).status(200);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating record");
    }
});

export default router;
