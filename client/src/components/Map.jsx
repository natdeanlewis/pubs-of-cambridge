import { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import Message from "./Message";
import Header from "./Header";
import UserMarker from "./UserMarker";
import { addPubMarkers } from "./Map/MapMarkers";
import {
    fetchPubs,
    fetchVisitedPubs,
    fetchLoadCountRecord,
    incrementLoadCountRecord,
    resetLoadCountPeriod,
} from "./Map/MapUtils";

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
    const [initializing, setInitializing] = useState(true);

    useEffect(() => {
        (async () => {
            const fetchedLoadCountRecord = await fetchLoadCountRecord();
            setLoadCountRecord(fetchedLoadCountRecord);
        })();
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
                const [fetchedPubs, fetchedVisitedPubs] = await Promise.all([
                    fetchPubs(),
                    fetchVisitedPubs(),
                    initMap(),
                ]);
                setPubs(fetchedPubs);
                setVisitedPubs(fetchedVisitedPubs);
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
        if (!mapRef.current || !pubs) return;
        setComplete(pubs.length > 0 && pubs.length === visitedPubs.length);
        addPubMarkers(
            pubs,
            visitedPubs,
            mapRef.current,
            markers,
            pubLongitudeRange,
            setVisitedPubs
        );
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

    return (
        <div className="relative custom-height">
            {initializing && (
                <div className="fixed inset-0 bg-yellow-950 z-[60] flex items-center justify-center">
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
                map={mapRef.current}
                INITIAL_MAP_SETTINGS={INITIAL_MAP_SETTINGS}
                INITIAL_LATITUDE={INITIAL_LATITUDE}
                INITIAL_LONGITUDE={INITIAL_LONGITUDE}
            />

            <div
                id="map-container"
                className="dynamic-height"
                ref={mapContainerRef}
            />

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
