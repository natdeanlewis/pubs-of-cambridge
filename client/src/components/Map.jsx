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
    const pubLongitudeRange = useRef({});

    const [pubs, setPubs] = useState([]);
    const [visitedPubs, setVisitedPubs] = useState([]);
    const [randomPub, setRandomPub] = useState(null);
    const [nearestPub, setNearestPub] = useState(null);
    const [loading, setLoading] = useState(null);
    const [complete, setComplete] = useState(null);
    const [music, setMusic] = useState(false);
    const [message, setMessage] = useState(null);
    const [loadCountRecord, setLoadCountRecord] = useState(null);
    const [userPosition, setUserPosition] = useState(null);
    const [firstTime, setFirstTime] = useState(true);
    const [initializing, setInitializing] = useState(true);

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

                mapRef.current.doubleClickZoom.disable();
                mapRef.current.touchZoomRotate.disableRotation();
                mapRef.current.dragRotate.disable();
                mapRef.current.boxZoom.disable();
            };

            const initialize = async () => {
                await Promise.all([fetchPubs(), fetchVisitedPubs(), initMap()]);
            };

            initialize();

            const updatePosition = (position) => {
                setUserPosition({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                });
            };

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(updatePosition);
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

    useEffect(() => {
        if (!mapRef.current || !pubs) return;

        markers.current.forEach((marker) => marker.remove());
        markers.current = [];
        const longitudes = pubs.map((pub) => pub.longitude);
        pubLongitudeRange.current = {
            min: Math.min(...longitudes),
            max: Math.max(...longitudes),
        };
        pubs.forEach((pub) => {
            const el = createMarkerElement(pub);
            const marker = new mapboxgl.Marker(el)
                .setLngLat([pub.longitude, pub.latitude])
                .addTo(mapRef.current);

            markers.current.push(marker);
            el.addEventListener("click", () => {
                updateVisitedStatus(pub._id);
            });
        });
        setComplete(pubs.length > 0 && pubs.length === visitedPubs.length);
        setNearestPub(null);
        setRandomPub(null);
        if (pubs.length > 0 && pubs.length === visitedPubs.length) {
            requestAnimationFrame(() => {
                mapRef.current.fitBounds(INITIAL_MAP_SETTINGS.bounds);
            });
        }

        if (initializing && markers.current.length > 0) {
            const loadingImageContainer = document.getElementById(
                "loading-image-container"
            );

            if (loadingImageContainer) {
                loadingImageContainer.addEventListener(
                    "animationiteration",
                    function () {
                        setInitializing(false);
                    }
                );
            }
        }
    }, [pubs, visitedPubs]);

    const createMarkerElement = (pub) => {
        const container = document.createElement("div");
        const el = document.createElement("div");
        el.className = "group";
        el.style.backgroundImage = "url(cheers_full.png)";
        if (visitedPubs.includes(pub._id)) {
            el.classList.add("mapboxgl-marker-semi-transparent-opacity");
            el.classList.add("mapboxgl-marker-semi-transparent-filter");
            container.classList.add("z-0");
        } else {
            container.classList.add("z-10");
            container.classList.add("hover:z-30");
        }
        el.style.width = "40px";
        el.style.height = "40px";
        el.style.backgroundSize = "100%";
        el.style.cursor = "pointer";
        if (pubs.length > 0 && pubs.length === visitedPubs.length) {
            el.classList.add("animate-bounce-custom");
            const scaledDelay =
                ((pub.longitude - pubLongitudeRange.current.min) /
                    (pubLongitudeRange.current.max -
                        pubLongitudeRange.current.min)) *
                1;
            el.style.animationDelay = `${scaledDelay}s`;
            el.addEventListener("animationend", (event) => {
                if (event.animationName === "rainbow") {
                    el.classList.remove(
                        "mapboxgl-marker-semi-transparent-filter"
                    );
                }
            });
        }

        const label = document.createElement("div");
        label.className =
            "absolute bottom-[-15px] left-1/2 transform -translate-x-1/2 bg-amber-100 px-1 rounded shadow text-xs whitespace-nowrap opacity-0 transition-opacity duration-300 font-serif italic";
        if (!visitedPubs.includes(pub._id)) {
            label.classList.add("group-hover:opacity-100");
        }
        label.textContent = `The ${pub.name}`;
        container.appendChild(el);
        el.appendChild(label);

        const updateLabelOpacity = () => {
            const zoom = mapRef.current.getZoom();
            if (pubs.length > 0 && pubs.length === visitedPubs.length) {
                if (zoom > 13.5) {
                    label.style.opacity = "1";
                } else {
                    label.style.opacity = null;
                }
            } else if (
                zoom > 15.5 ||
                (zoom > 13.5 && !visitedPubs.includes(pub._id))
            ) {
                label.style.opacity = "1";
            } else {
                label.style.opacity = null;
            }
        };

        updateLabelOpacity();

        mapRef.current.on("zoom", updateLabelOpacity);
        return container;
    };

    const updateVisitedStatus = (pubId) => {
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
        <div className="relative h-screen">
            {initializing && (
                <div className="fixed inset-0 bg-yellow-950 z-50 flex items-center justify-center">
                    <div
                        id="loading-image-container"
                        className="relative w-32 h-32 loading-image-container"
                    >
                        <img
                            src="cheers_empty.png"
                            className="absolute inset-0 w-full h-full object-contain loading-image-background"
                        />
                        <img
                            src="cheers_full.png"
                            className="absolute inset-0 w-full h-full object-contain loading-image"
                        />
                    </div>
                </div>
            )}

            <Header
                pubs={pubs}
                visitedPubs={visitedPubs}
                music={music}
                randomPub={randomPub}
                setComplete={setComplete}
                setRandomPub={setRandomPub}
                setNearestPub={setNearestPub}
                setMessage={setMessage}
                setLoading={setLoading}
                setMusic={setMusic}
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
