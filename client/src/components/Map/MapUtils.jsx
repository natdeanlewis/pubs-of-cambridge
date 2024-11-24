import forge from "node-forge";

const API_URL = import.meta.env.VITE_API_URL;
const API_KEY = import.meta.env.VITE_API_KEY;
const PUBLIC_KEY = import.meta.env.VITE_PUBLIC_KEY;

function newEncryptedApiKey() {
    const publicKey = forge.pki.publicKeyFromPem(PUBLIC_KEY);
    const timestamp = Date.now() + 60000;
    const payload = JSON.stringify({ API_KEY, timestamp });
    const encrypted = publicKey.encrypt(payload, "RSA-OAEP");
    const base64Encrypted = btoa(encrypted);
    return base64Encrypted;
}

const fetchPubs = async () => {
    const response = await fetch(`${API_URL}/pubs`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + newEncryptedApiKey(),
        },
    });
    if (!response.ok) {
        console.error(`An error occurred: ${response.statusText}`);
        return;
    }
    const data = await response.json();
    return data.sort((a, b) => a.latitude - b.latitude);
};

const fetchVisitedPubs = async () => {
    let localVisitedPubs = JSON.parse(localStorage.getItem("visited_pub_ids"));
    if (!localVisitedPubs) {
        localVisitedPubs = [];
        localStorage.setItem(
            "visited_pub_ids",
            JSON.stringify(localVisitedPubs)
        );
    }
    return localVisitedPubs;
};

const fetchLoadCountRecord = async () => {
    const response = await fetch(`${API_URL}/load_count`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + newEncryptedApiKey(),
        },
    });
    if (!response.ok) {
        console.error(`An error occurred: ${response.statusText}`);
        return;
    }
    return await response.json();
};

const incrementLoadCountRecord = async () => {
    await fetch(`${API_URL}/load_count`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + newEncryptedApiKey(),
        },
    });
};

const resetLoadCountPeriod = async () => {
    await fetch(`${API_URL}/load_count/period`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + newEncryptedApiKey(),
        },
    });
};

export {
    fetchPubs,
    fetchVisitedPubs,
    fetchLoadCountRecord,
    incrementLoadCountRecord,
    resetLoadCountPeriod,
};
