import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import Markers from './Markers';
import Message from './Message';
import Header from './Header';

const MAPBOX_USAGE_LIMIT = 50000
const INITIAL_LATITUDE = 52.207
const INITIAL_LONGITUDE = 0.137
const INITIAL_MAP_SETTINGS = {
    bounds: [[INITIAL_LONGITUDE - 0.045, INITIAL_LATITUDE - 0.045], [INITIAL_LONGITUDE + 0.045, INITIAL_LATITUDE + 0.045]],
    pitch: 0,
    bearing: 0,
    maxZoom: 20,
    maxPitch: 0,
    bearingSnap: 180,
};

const MAP_STYLE = 'mapbox://styles/natdeanlewis/cm31fd4i300vc01pigpm06fr3/draft';
const API_URL = import.meta.env.VITE_API_URL;
let firstTime = true;

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
    const [loadCount, setLoadCount] = useState(null);

    const fetchPubs = async () => {
        const response = await fetch(`${API_URL}/pubs`);
        if (!response.ok) {
            console.error(`An error occurred: ${response.statusText}`);
            return;
        }
        const data = await response.json();
        const pubs = data.sort((a, b) => a.latitude - b.latitude);
        setPubs(pubs);
    };

    const fetchVisitedPubs = async () => {
        let localVisitedPubs = JSON.parse(localStorage.getItem('visited_pub_ids'));
        if (!localVisitedPubs) {
            localVisitedPubs = []
            localStorage.setItem('visited_pub_ids', JSON.stringify(localVisitedPubs));
        }
        setVisitedPubs(localVisitedPubs);
        return localVisitedPubs;
    };

    const fetchLoadCount = async () => {
        const response = await fetch(`${API_URL}/load_count`);
        if (!response.ok) {
            console.error(`An error occurred: ${response.statusText}`);
            return;
        }
        const load_count_record = await response.json();
        setLoadCount(load_count_record.load_count)
    }

    const updateLoadCount = async () => {
        await fetch(`${API_URL}/load_count`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
        });
    };

    useEffect(() => {
        fetchLoadCount();
    }, []);
    
    useEffect(() => {
        if (loadCount === null) {
            return
        } else if (loadCount > Math.round(0.9 * MAPBOX_USAGE_LIMIT)) {
            alert('Service Unavailable')
        } else {
            updateLoadCount();
            const initMap = async () => {
                mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY;
                mapRef.current = new mapboxgl.Map({
                    container: mapContainerRef.current,
                    style: MAP_STYLE,
                    ...INITIAL_MAP_SETTINGS,
                });
            };

            const initialize = async () => {
                await Promise.all([fetchPubs(), fetchVisitedPubs(), initMap()]);
            };

            initialize();

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition((position) => {
                    const userMarker = document.createElement('div');
                    userMarker.className = 'group hover:z-20';
                    userMarker.style.zIndex = '10';
            
                    userMarker.innerHTML = `
                        <span class="relative flex items-center justify-center text-2xl">
                             <span class="animate-ping absolute inline-flex rounded-full">👑</span>
                            <span class="absolute inline-flex rounded-full" style="text-shadow: 1px 1px 0 black, -1px -1px 0 black, -1px 1px 0 black, 1px -1px 0 black;">👑</span>
                        </span>
                    `;
                    const label = document.createElement('div');
                    label.className = 'absolute bottom-[-32px] left-1/2 transform -translate-x-1/2 bg-amber-100 px-1 rounded shadow text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-serif italic';
                    label.textContent = `You!`;
                
                    userMarker.appendChild(label);
                    
                    new mapboxgl.Marker(userMarker)
                        .setLngLat([position.coords.longitude, position.coords.latitude])
                        .addTo(mapRef.current);
                });
            }

            return () => {
                if (mapRef.current) {
                    mapRef.current.remove();
                }
            };
        };
    }, [loadCount]);

    useEffect(() => {
        if (!firstTime && pubs.length > 0 && pubs.length === visitedPubs.length) {
            const audio = document.getElementById('music');
            if (music) {
                audio.pause();
                setMusic(!music)
            }
            playSound('fanfare.mp3');
            playSound('applause.mp3');
        }
    }, [visitedPubs]);

    const playSound = (file) => {
        const audio = new Audio(file);
        audio.play();
    };

    return (
        <div className="relative h-dvh">
            <Header pubs={pubs} visitedPubs={visitedPubs} music={music} creditsMusic={creditsMusic} setComplete={setComplete} setRandomPub={setRandomPub} setNearestPub={setNearestPub} setMessage={setMessage} setMusic={setMusic} setCreditsMusic={setCreditsMusic} playSound={playSound} map={mapRef.current} INITIAL_MAP_SETTINGS={INITIAL_MAP_SETTINGS} INITIAL_LATITUDE={INITIAL_LATITUDE} INITIAL_LONGITUDE={INITIAL_LONGITUDE} />

            <div id='map-container' className="h-dvh" ref={mapContainerRef} />
            <Markers map={mapRef.current} markers={markers} pubs={pubs} visitedPubs={visitedPubs} creditsMsuic={creditsMusic} setComplete={setComplete} setNearestPub={setNearestPub} setRandomPub={setRandomPub} setVisitedPubs={setVisitedPubs} firstTime={firstTime} playSound={playSound} INITIAL_MAP_SETTINGS={INITIAL_MAP_SETTINGS} />

            <Message message={message} randomPub={randomPub} nearestPub={nearestPub} complete={complete} loading={loading} creditsMusic={creditsMusic} setMessage={setMessage} setLoading={setLoading} setComplete={setComplete} INITIAL_MAP_SETTINGS={INITIAL_MAP_SETTINGS} map={mapRef.current} />
        </div>
    );
}
