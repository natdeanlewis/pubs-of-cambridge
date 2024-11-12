import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import Message from "./Message";
import Header from "./Header";
import UserMarker from "./UserMarker";
import forge from "node-forge";

const MAPBOX_USAGE_LIMIT = 50000;
const INITIAL_LATITUDE = 52.207;
const INITIAL_LONGITUDE = 0.137;
const INITIAL_MAP_SETTINGS = {
    bounds: [
        [INITIAL_LONGITUDE - 0.045, INITIAL_LATITUDE - 0.045],
        [INITIAL_LONGITUDE + 0.045, INITIAL_LATITUDE + 0.045],
    ],
    pitch: 0,
    bearing: 0,
    maxZoom: 20,
    maxPitch: 0,
    bearingSnap: 180,
};

const MAP_STYLE =
    "mapbox://styles/natdeanlewis/cm31fd4i300vc01pigpm06fr3/draft";
const API_URL = import.meta.env.VITE_API_URL;
const API_KEY = import.meta.env.VITE_API_KEY;
const PUBLIC_KEY = import.meta.env.VITE_PUBLIC_KEY;

export default function Map() {
    const mapRef = useRef();
    const mapContainerRef = useRef();
    const markers = useRef([]);

    const [pubs, setPubs] = useState([]);
    const [visitedPubs, setVisitedPubs] = useState([]);
    const [randomPub, setRandomPub] = useState(null);
    const [nearestPub, setNearestPub] = useState(null);
    const [loading, setLoading] = useState(null);
    const [complete, setComplete] = useState(null);
    const [music, setMusic] = useState(null);
    const [creditsMusic, setCreditsMusic] = useState(null);
    const [message, setMessage] = useState(null);
    const [loadCountRecord, setLoadCountRecord] = useState(null);
    const [userPosition, setUserPosition] = useState(null);
    const [firstTime, setFirstTime] = useState(true);
    const [initializing, setInitializing] = useState(true);
    const [multiTouchActive, setMultiTouchActive] = useState(false);

    useEffect(() => {
        const handleTouchStart = (e) => {
            if (e.touches.length > 1) {
                setMultiTouchActive(true);
            }
        };

        const handleTouchEnd = (e) => {
            if (e.touches.length === 0) {
                setMultiTouchActive(false);
            }
        };

        const handleTouchCancel = (e) => {
            setMultiTouchActive(false);
        };

        window.addEventListener("touchstart", handleTouchStart);
        window.addEventListener("touchend", handleTouchEnd);
        window.addEventListener("touchcancel", handleTouchCancel);

        return () => {
            window.removeEventListener("touchstart", handleTouchStart);
            window.removeEventListener("touchend", handleTouchEnd);
            window.removeEventListener("touchcancel", handleTouchCancel);
        };
    }, []);

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
        const pubs = data.sort((a, b) => a.latitude - b.latitude);
        setPubs(pubs);
    };

    const fetchVisitedPubs = async () => {
        let localVisitedPubs = JSON.parse(
            localStorage.getItem("visited_pub_ids")
        );
        if (!localVisitedPubs) {
            localVisitedPubs = [];
            localStorage.setItem(
                "visited_pub_ids",
                JSON.stringify(localVisitedPubs)
            );
        }
        setVisitedPubs(localVisitedPubs);
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
        const loadCountRecord = await response.json();
        setLoadCountRecord(loadCountRecord);
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

    useEffect(() => {
        fetchLoadCountRecord();
    }, []);

    const billingPeriodIsCurrent = () => {
        const createdAt = new Date(loadCountRecord.created_at);
        const billing_period_month = createdAt.getMonth();
        const billing_period_year = createdAt.getFullYear();
        const now = new Date();
        const now_month = now.getMonth();
        const now_year = now.getFullYear();

        return (
            now_month === billing_period_month &&
            now_year === billing_period_year
        );
    };

    useEffect(() => {
        if (loadCountRecord === null) {
            return;
        } else if (
            (!loadCountRecord.load_count && loadCountRecord.load_count != 0) ||
            !loadCountRecord.created_at
        ) {
            alert("Service Unavailable");
        } else if (
            billingPeriodIsCurrent() &&
            loadCountRecord.load_count > Math.round(0.9 * MAPBOX_USAGE_LIMIT)
        ) {
            alert("Service Unavailable");
        } else {
            if (!billingPeriodIsCurrent()) {
                resetLoadCountPeriod();
            } else {
                incrementLoadCountRecord();
            }
            const initMap = async () => {
                mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY;
                mapRef.current = new mapboxgl.Map({
                    container: mapContainerRef.current,
                    style: MAP_STYLE,
                    ...INITIAL_MAP_SETTINGS,
                });
                var nav = new mapboxgl.NavigationControl({
                    showCompass: false,
                    showZoom: true,
                });

                mapRef.current.addControl(nav, "bottom-right");
                mapRef.current.doubleClickZoom.disable();
                mapRef.current.touchZoomRotate.disableRotation();
                mapRef.current.dragRotate.disable();
                mapRef.current.boxZoom.disable();
            };

            const initialize = async () => {
                await Promise.all([fetchPubs(), fetchVisitedPubs(), initMap()]);
            };

            initialize();

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                    setUserPosition({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                });
            }

            return () => {
                if (mapRef.current) {
                    mapRef.current.remove();
                }
            };
        }
    }, [loadCountRecord]);

    useEffect(() => {
        if (
            !firstTime &&
            pubs.length > 0 &&
            pubs.length === visitedPubs.length
        ) {
            const audio = document.getElementById("music");
            if (music) {
                audio.pause();
                setMusic(!music);
            }
            playSound("fanfare.mp3");
            playSound("applause.mp3");
        }
    }, [visitedPubs]);

    const playSound = (file) => {
        const audio = new Audio(file);
        audio.play();
    };

    function enableInteractions() {
        mapRef.current.scrollZoom.enable();
        mapRef.current.touchZoomRotate.enable();
        mapRef.current.dragPan.enable();
        mapRef.current.boxZoom.enable();
        mapRef.current.keyboard.enable();
        mapRef.current.doubleClickZoom.enable();
    }

    function cancelCredits() {
        const credits = document.getElementById("credits");
        credits.pause();
        setCreditsMusic(false);
        requestAnimationFrame(() => {
            mapRef.current.fitBounds(INITIAL_MAP_SETTINGS.bounds);
        });
        enableInteractions();
        var id = window.setTimeout(function () {}, 0);
        while (id--) {
            window.clearTimeout(id);
        }
        setMessage(null);
        setComplete(null);
        setRandomPub(null);
        setNearestPub(null);
    }

    useEffect(() => {
        if (!mapRef.current || !pubs) return;

        markers.current.forEach((marker) => marker.remove());
        markers.current = [];

        pubs.forEach((pub) => {
            const el = createMarkerElement(pub);
            const marker = new mapboxgl.Marker(el)
                .setLngLat([pub.longitude, pub.latitude])
                .addTo(mapRef.current);

            markers.current.push(marker);
            el.addEventListener("pointerup", () =>
                updateVisitedStatus(pub._id)
            );
        });
        setComplete(
            !firstTime && pubs.length > 0 && pubs.length === visitedPubs.length
        );
        setNearestPub(null);
        setRandomPub(null);
        if (pubs.length > 0 && pubs.length === visitedPubs.length) {
            requestAnimationFrame(() => {
                mapRef.current.fitBounds(INITIAL_MAP_SETTINGS.bounds);
            });
        }

        if (markers.current.length > 0) {
            setInitializing(false);
        }
    }, [pubs, visitedPubs, creditsMusic]);

    const createMarkerElement = (pub) => {
        const el = document.createElement("div");
        el.className = "group hover:z-20";
        el.style.backgroundImage = visitedPubs.includes(pub._id)
            ? "url(cheers_full.png)"
            : "url(cheers_empty.png)";
        el.style.width = "40px";
        el.style.height = "40px";
        el.style.backgroundSize = "100%";
        el.style.cursor = "pointer";

        const label = document.createElement("div");
        label.className =
            "absolute bottom-[-15px] left-1/2 transform -translate-x-1/2 bg-amber-100 px-1 rounded shadow text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-serif italic";
        label.textContent = `The ${pub.name}`;

        el.appendChild(label);

        const updateLabelOpacity = () => {
            const zoom = mapRef.current.getZoom();
            if (zoom > 13.5) {
                label.style.opacity = "1";
            } else {
                label.style.opacity = null;
            }
        };

        updateLabelOpacity();

        mapRef.current.on("zoom", updateLabelOpacity);
        return el;
    };

    const updateVisitedStatus = (pubId) => {
        if (multiTouchActive) {
            return;
        }
        if (creditsMusic) {
            cancelCredits();
        }
        const localVisitedPubs = JSON.parse(
            localStorage.getItem("visited_pub_ids")
        );
        const method = localVisitedPubs.includes(pubId) ? "remove" : "add";
        let newVisitedPubs;
        if (method === "remove") {
            newVisitedPubs = localVisitedPubs.filter((id) => id !== pubId);
            playSound("glass_break.mp3");
        } else {
            newVisitedPubs = [...localVisitedPubs, pubId];
            playSound("glass_clink.mp3");
        }
        localStorage.setItem("visited_pub_ids", JSON.stringify(newVisitedPubs));
        setVisitedPubs(newVisitedPubs);

        setFirstTime(false);
    };

    return (
        <div className="relative h-dvh">
            {initializing && (
                <div className="fixed w-full h-full bg-yellow-950 z-50 flex items-center justify-center">
                    <div className="absolute w-32 h-32">
                        <img src="cheers_empty.png" />
                    </div>
                    <div className="absolute w-32 h-32">
                        <img src="cheers_full.png" className="loading-image" />
                    </div>
                </div>
            )}

            <Header
                pubs={pubs}
                visitedPubs={visitedPubs}
                music={music}
                creditsMusic={creditsMusic}
                cancelCredits={cancelCredits}
                randomPub={randomPub}
                setComplete={setComplete}
                setRandomPub={setRandomPub}
                setNearestPub={setNearestPub}
                setMessage={setMessage}
                setLoading={setLoading}
                setMusic={setMusic}
                setCreditsMusic={setCreditsMusic}
                playSound={playSound}
                map={mapRef.current}
                INITIAL_MAP_SETTINGS={INITIAL_MAP_SETTINGS}
                INITIAL_LATITUDE={INITIAL_LATITUDE}
                INITIAL_LONGITUDE={INITIAL_LONGITUDE}
            />

            <div id="map-container" className="h-dvh" ref={mapContainerRef} />

            <Message
                message={message}
                randomPub={randomPub}
                nearestPub={nearestPub}
                complete={complete}
                loading={loading}
                creditsMusic={creditsMusic}
                cancelCredits={cancelCredits}
                setMessage={setMessage}
                setLoading={setLoading}
                setComplete={setComplete}
                INITIAL_MAP_SETTINGS={INITIAL_MAP_SETTINGS}
                map={mapRef.current}
            />

            {userPosition && (
                <UserMarker
                    longitude={userPosition.longitude}
                    latitude={userPosition.latitude}
                    map={mapRef.current}
                />
            )}
        </div>
    );
}
