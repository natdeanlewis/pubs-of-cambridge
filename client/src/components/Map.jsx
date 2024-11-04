import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';

const INITIAL_MAP_SETTINGS = {
    center: [0.1313, 52.202],
    zoom: 12.6,
    pitch: 0,
    bearing: 0,
};

const MAP_STYLE = 'mapbox://styles/natdeanlewis/cm31fd4i300vc01pigpm06fr3/draft';
const API_URL = 'http://localhost:5050/record';
const USER_ID = '67269c96e45eaf3016550af0';

export default function Map() {
    const mapRef = useRef();
    const mapContainerRef = useRef();
    const markers = useRef([]);

    const [pubs, setPubs] = useState([]);
    const [visitedPubs, setVisitedPubs] = useState([]);
    const [randomPub, setRandomPub] = useState(null);
    const [complete, setComplete] = useState(false);
    const [music, setMusic] = useState(false);

    useEffect(() => {
        mapboxgl.accessToken = 'pk.eyJ1IjoibmF0ZGVhbmxld2lzIiwiYSI6ImNtMzBjcWpkNjBpaXgybXNhdGYyYTU2Y3AifQ.lM4WFOgR19cbYIGR5seCCg';
        
        mapRef.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: MAP_STYLE,
            ...INITIAL_MAP_SETTINGS,
        });

        return () => mapRef.current.remove();
    }, []);

    useEffect(() => {
        const fetchPubs = async () => {
            const response = await fetch(`${API_URL}/pubs`);
            if (!response.ok) {
                console.error(`An error occurred: ${response.statusText}`);
                return;
            }
            const data = await response.json();
            setPubs(data);
        };

        const fetchVisitedPubs = async () => {
            const response = await fetch(`${API_URL}/users/${USER_ID}`);
            if (!response.ok) {
                console.error(`An error occurred: ${response.statusText}`);
                return;
            }
            const userData = await response.json();
            setVisitedPubs(userData.visited_pub_ids);
        };

        fetchPubs();
        fetchVisitedPubs();
    }, []);

    useEffect(() => {
        if (pubs.length > 0 && pubs.length === visitedPubs.length) {
            playSound('applause.mp3');
        }
    }, [visitedPubs]);

    useEffect(() => {
        if (!mapRef.current) return;

        markers.current.forEach(marker => marker.remove());
        markers.current = [];

        pubs.forEach(pub => {
            const el = createMarkerElement(pub);
            const marker = new mapboxgl.Marker(el)
                .setLngLat([pub.longitude, pub.latitude])
                .addTo(mapRef.current);

            markers.current.push(marker);
            el.addEventListener('mousedown', () => updateVisitedStatus(pub._id));
        });

        setComplete(pubs.length > 0 && pubs.length === visitedPubs.length);
    }, [pubs, visitedPubs]);

    const createMarkerElement = (pub) => {
        const el = document.createElement('div');
        el.className = 'group';
        el.style.backgroundImage = visitedPubs.includes(pub._id) 
            ? 'url(cheers_full.png)' 
            : 'url(cheers_empty.png)';
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.backgroundSize = '100%';
        el.style.cursor = 'pointer';

        const label = document.createElement('div');
        label.className = 'absolute bottom-[-15px] left-1/2 transform -translate-x-1/2 bg-white px-1 rounded shadow text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300';
        label.textContent = pub.name;

        el.appendChild(label);
        return el;
    };

    const updateVisitedStatus = async (pubId) => {
        const method = visitedPubs.includes(pubId) ? 'remove' : 'add';
        playSound(method === 'remove' ? 'glass_break.mp3' : 'glass_clink.mp3');

        await fetch(`${API_URL}/users/${method}/${USER_ID}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ pubId }),
        });

        const response = await fetch(`${API_URL}/users/${USER_ID}`);
        const userData = await response.json();
        setVisitedPubs(userData.visited_pub_ids);
    };

    const handleResetViewClick = () => {
        playSound('zoom_out.mp3');
        setComplete(false);
        setRandomPub(null);
        mapRef.current.flyTo(INITIAL_MAP_SETTINGS);
    };

    const handleRandomPubClick = () => {
        const unvisitedPubs = pubs.filter(pub => !visitedPubs.includes(pub._id));
        if (unvisitedPubs.length === 0) return;

        playSound('die_roll.mp3');
        const randomPub = unvisitedPubs[Math.floor(Math.random() * unvisitedPubs.length)];
        setRandomPub(randomPub);
        mapRef.current.flyTo({
            center: [randomPub.longitude, randomPub.latitude],
            zoom: 16,
        });
    };

    const handleMusicClick = () => {
        const audio = document.getElementById('music');
        if (music) {
            audio.pause();
        } else {
            audio.play();
        }
        setMusic(!music);
    };

    const playSound = (file) => {
        const audio = new Audio(file);
        audio.play();
    };

    return (
        <div className="relative h-screen">
            <div className="absolute inline-flex top-4 left-4">
                <button className='m-2 bg-yellow-700 hover:bg-yellow-900 text-white font-bold py-2 px-4 rounded z-10' onClick={handleRandomPubClick}>
                    🎲
                </button>
                <button className='m-2 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded z-10' onClick={handleMusicClick}>
                    {music ? '🔇' : '🎵'}
                </button>
                <audio id='music' loop>
                    <source src='lute.mp3' />
                </audio>
                <button className='m-2 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded z-10' onClick={handleResetViewClick}>
                    🏠
                </button>
            </div>

            {(randomPub || complete) && 
                <div className="absolute w-full flex justify-center top-4">
                    <div className='m-16 py-2 px-4 z-10 bg-neutral-800 rounded text-white font-bold'>
                        {complete ? 'Looks like you\'re all done... pub?' : `How about... The ${randomPub.name}?`}
                    </div>
                </div>
            }

            <div className="absolute inline-flex top-4 right-4">
                {pubs.length > 0 && (
                    <p className='m-2 text-white font-bold bg-neutral-800 py-2 px-4 rounded z-10'>
                        {visitedPubs.length}/{pubs.length} 
                        {visitedPubs.length === pubs.length ? ' 🥳' : ' 🍻'}
                    </p>
                )}
            </div>

            <div id='map-container' className='h-full' ref={mapContainerRef} />
        </div>
    );
}
