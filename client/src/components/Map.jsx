import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';

const INITIAL_MAP_SETTINGS = {
    center: [0.1313, 52.202],
    zoom: 12.6,
    pitch: 0,
    bearing: 0,
};

const MAP_STYLE = 'mapbox://styles/natdeanlewis/cm31fd4i300vc01pigpm06fr3/draft';
const API_URL = import.meta.env.VITE_API_URL;
const USER_ID = '67269c96e45eaf3016550af0';
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
    const [message, setMessage] = useState(null);

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

        mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_KEY;
        mapRef.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: MAP_STYLE,
            ...INITIAL_MAP_SETTINGS,
        });
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
                label.className = 'absolute bottom-[-32px] left-1/2 transform -translate-x-1/2 bg-amber-100 px-1 rounded shadow text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-serif';
                label.textContent = `You!`;
            
                userMarker.appendChild(label);
                
                new mapboxgl.Marker(userMarker)
                    .setLngLat([position.coords.longitude, position.coords.latitude])
                    .addTo(mapRef.current);
            });
        }

        return () => mapRef.current.remove();
    }, []);



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

        setComplete(!firstTime && pubs.length > 0 && pubs.length === visitedPubs.length);
        setNearestPub(null);
        setRandomPub(null);
        if (pubs.length > 0 && pubs.length === visitedPubs.length) {
            mapRef.current.flyTo(INITIAL_MAP_SETTINGS);
        }
    }, [visitedPubs]);

    useEffect(() => {
        if (!firstTime && pubs.length > 0 && pubs.length === visitedPubs.length) {
            playSound('applause.mp3');
        }
    }, [visitedPubs]);

    useEffect(() => {    
        if (randomPub) {
            setMessage(`How about... The ${randomPub.name}?`);
        } else if (nearestPub) {
            setMessage(`Your nearest pub is... The ${nearestPub.name}!`);
            setLoading(false);
        } else if (complete) {
            setMessage(`Looks like you're all done... pub?`);
        } else if (loading) {
            setMessage(`Finding your nearest pub...`);
        } else {
            setMessage(null);
        }

        if (!loading) {
            const messageTimeout = setTimeout(() => {
                setMessage(null);
                setComplete(null);
            }, 3000);
        
            return () => {
                clearTimeout(messageTimeout);   
            };    
        }
        }, [randomPub, nearestPub, complete, loading]);

    const createMarkerElement = (pub) => {
        const el = document.createElement('div');
        el.className = 'group hover:z-20';
        el.style.backgroundImage = visitedPubs.includes(pub._id) 
            ? 'url(cheers_full.png)' 
            : 'url(cheers_empty.png)';
        el.style.width = '40px';
        el.style.height = '40px';
        el.style.backgroundSize = '100%';
        el.style.cursor = 'pointer';
    
        const label = document.createElement('div');
        label.className = 'absolute bottom-[-15px] left-1/2 transform -translate-x-1/2 bg-amber-100 px-1 rounded shadow text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-serif';
        label.textContent = `The ${pub.name}`;
    
        el.appendChild(label);
        return el;
    };

    const updateVisitedStatus = async (pubId) => {
        const method = visitedPubs.includes(pubId) ? 'remove' : 'add';
        playSound(method === 'remove' ? 'glass_break.mp3' : 'glass_clink.mp3');
        firstTime = false;
        
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
        setComplete(null);
        setRandomPub(null);
        setNearestPub(null);
        setMessage(null);
        mapRef.current.flyTo(INITIAL_MAP_SETTINGS);
    };

    const handleRandomPubClick = () => {
        setNearestPub(null)
        setComplete(pubs.length > 0 && pubs.length === visitedPubs.length);
        const unvisitedPubs = pubs.filter(pub => !visitedPubs.includes(pub._id));
        playSound('die_roll.mp3');
        if (unvisitedPubs.length === 0) {
            mapRef.current.flyTo(INITIAL_MAP_SETTINGS);
        } else {
            const randomPub = unvisitedPubs[Math.floor(Math.random() * unvisitedPubs.length)];
            setRandomPub(randomPub);
            mapRef.current.flyTo({
                center: [randomPub.longitude, randomPub.latitude],
                zoom: 16,
            });
        }
    };

    function calculateNearestPub(position) {
        let minDistance = Infinity;
        let nearestPub = null;
    
        pubs.forEach(pub => {
            const distance = Math.pow(pub.latitude - position.coords.latitude, 2) + Math.pow(pub.longitude - position.coords.longitude, 2);
        
            if (distance < minDistance) {
                minDistance = distance;
                nearestPub = pub;
            }
        });
    
        setNearestPub(nearestPub);
        return nearestPub;
    }
    
    const handleNearestPubClick = () => {
        setComplete(null);
        setRandomPub(null);
        setLoading(true);
        if (pubs.length === 0) return;
    
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const nearestPub = calculateNearestPub(position);
                playSound('door.mp3');
    
                if (nearestPub) {
                    mapRef.current.flyTo({
                        center: [nearestPub.longitude, nearestPub.latitude],
                        zoom: 16,
                    });
                }
            }, (error) => {
                console.error('Error getting location:', error);
            });
        } 
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


    const handleInfoClick = () => {
        alert('Welcome, traveller!\n\n'
            + '🍻 Click a pub to mark it as visited\n'
            + '🎲 Recommends a random unvisited pub\n'
            + '📍 Shows your nearest pub\n'
            + '🏠 Resets the view\n'
            + '🎵 Toggles the music')
    };

    return (
        <div className="relative h-screen">
            <div className="absolute inline-flex top-4 left-4">
                <button className='m-2 bg-yellow-700 hover:bg-yellow-900 py-2 px-4 rounded z-30' onClick={handleRandomPubClick}>
                    🎲
                </button>
                <button className='m-2 bg-yellow-700 hover:bg-yellow-900 py-2 px-4 rounded z-30' onClick={handleNearestPubClick}>
                    📍
                </button>
                <button className='m-2 bg-gray-500 hover:bg-gray-700 py-2 px-4 rounded z-30' onClick={handleResetViewClick}>
                    🏠
                </button>
                <button className='m-2 bg-gray-500 hover:bg-gray-700 py-2 px-4 rounded z-30' onClick={handleMusicClick}>
                    {music ? '🔇' : '🎵'}
                </button>
                <audio id='music' loop>
                    <source src='lute.mp3' />
                </audio>
            </div>

            {message && 
                <div className="absolute w-full flex justify-center top-4">
                    <div className='m-16 py-2 px-4 z-30 rounded text-neutral-800 font-bold font-serif italic'
                    style={{ backgroundImage: `url('parchment.jpg')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
                        {message}
                    </div>
                </div>
            }
       
            <div className="absolute inline-flex top-4 right-4">

            {pubs.length > 0 && (
                    <p className='m-2 text-white font-bold bg-yellow-700 py-2 px-4 rounded z-30 font-serif'>
                    {visitedPubs.length}/{pubs.length} 
                    {visitedPubs.length === pubs.length ? ' 🥳' : ' 🍻'}
                </p>
            )}
            <button className='m-2 bg-gray-500 hover:bg-gray-700 py-2 px-4 rounded z-30' onClick={handleInfoClick}>
                ℹ️
            </button>
        </div>

        <div id='map-container' className='h-full' ref={mapContainerRef} />
        </div>
    );
}
