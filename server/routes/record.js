import express from "express";
import forge from "node-forge";

import db from "../db/connection.js";

import { ObjectId } from "mongodb";

const router = express.Router();

const apiKeyMiddleware = async (req, res, next) => {
    try {
        const decryptedApiKey = await decryptBearerToken(req, res);
        if (decryptedApiKey !== process.env.SERVER_API_KEY) {
            return res.status(403).json({ message: "Forbidden" });
        }
    } catch (error) {
        return res.status(401).json({ message: error.message });
    }

    next();
};

async function decryptBearerToken(req, res) {
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
        throw new Error("Authorization header missing");
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        throw new Error("Bearer token missing");
    }

    return await decryptApiKey(token);
}

async function decryptApiKey(token) {
    const privateKey = forge.pki.privateKeyFromPem(process.env.PRIVATE_KEY);

    const base64Decrypted = atob(token);

    const encryptedBuffer = new Uint8Array(
        base64Decrypted.split("").map((char) => char.charCodeAt(0))
    );

    const decrypted = privateKey.decrypt(encryptedBuffer, "RSA-OAEP");

    const payload = JSON.parse(decrypted);

    if (Date.now() > payload.timestamp) {
        throw new Error("API key has expired");
    }

    return payload.API_KEY;
}

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
