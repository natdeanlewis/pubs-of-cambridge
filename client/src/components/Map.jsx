import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';

const MAPBOX_USAGE_LIMIT = 50000
const INITIAL_LATIUDE = 52.204
const INITIAL_LONGITUDE = 0.133
const INITIAL_MAP_SETTINGS = {
    bounds: [[INITIAL_LONGITUDE - 0.045, INITIAL_LATIUDE - 0.045], [INITIAL_LONGITUDE + 0.045, INITIAL_LATIUDE + 0.045]],
    pitch: 0,
    bearing: 0,
    maxZoom: 20,
    maxPitch: 0,
    bearingSnap: 180,
    maxBounds: [[INITIAL_LONGITUDE - 0.3, INITIAL_LATIUDE - 0.1], [INITIAL_LONGITUDE + 0.3, INITIAL_LATIUDE + 0.1]]
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
        const response = await fetch(`${API_URL}/users/${USER_ID}`);
        if (!response.ok) {
            console.error(`An error occurred: ${response.statusText}`);
            return;
        }
        const userData = await response.json();
        setVisitedPubs(userData.visited_pub_ids);
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
            mapRef.current.fitBounds(INITIAL_MAP_SETTINGS.bounds);
        }
    }, [pubs, visitedPubs]);

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
            setMessage(`Looking for your nearest pub...`);
        } else {
            setMessage(null);
        }

        const messageTimeout = setTimeout(() => {
            setMessage(null);
            setComplete(null);
        }, 5000);
    
        return () => {
            clearTimeout(messageTimeout);   
        };    
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
        label.className = 'absolute bottom-[-15px] left-1/2 transform -translate-x-1/2 bg-amber-100 px-1 rounded shadow text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-serif italic';
        label.textContent = `The ${pub.name}`;
    
        el.appendChild(label);
        
        const updateLabelOpacity = () => {
            const zoom = mapRef.current.getZoom();
            if (zoom > 13.5) {
                label.style.opacity = '1';
            } else {
                label.style.opacity = null;
            }
        };

        updateLabelOpacity();

        mapRef.current.on('zoom', updateLabelOpacity);
        return el;
    };

    const updateVisitedStatus = async (pubId) => {
        const method = visitedPubs.includes(pubId) ? 'remove' : 'add';
        let newVisitedPubs
        if (method === 'remove') {
            newVisitedPubs = visitedPubs.filter(id => id !== pubId);
            playSound('glass_break.mp3')
        } else {
            newVisitedPubs = [...visitedPubs, pubId];
            playSound('glass_clink.mp3')
        }
        setVisitedPubs(newVisitedPubs);

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

        if (!userData.visited_pub_ids.sort().every((element, index) => element === newVisitedPubs.sort()[index])) {
            setVisitedPubs(userData.visited_pub_ids);
        }
    };

    const handleResetViewClick = () => {
        playSound('zoom_out.mp3');
        setComplete(null);
        setRandomPub(null);
        setNearestPub(null);
        setMessage(null);
        mapRef.current.fitBounds(INITIAL_MAP_SETTINGS.bounds);
    };

    const handleRandomPubClick = () => {
        setNearestPub(null)
        setComplete(pubs.length > 0 && pubs.length === visitedPubs.length);
        const unvisitedPubs = pubs.filter(pub => !visitedPubs.includes(pub._id));
        playSound('die_roll.mp3');
        if (unvisitedPubs.length === 0) {
            mapRef.current.fitBounds(INITIAL_MAP_SETTINGS.bounds);
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
                alert('Share your location to enable finding your nearest pub');
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
            + '📍 Finds your nearest pub\n'
            + '🏠 Resets the view\n'
            + '🎵 Toggles the music')
    };

    return (
        <div className="relative h-dvh">
            <div className="absolute flex flex-col sm:flex-row top-4 left-4 z-30">
                <button className='m-2 bg-gray-500 hover:bg-gray-700 py-2 px-4 rounded' onClick={handleResetViewClick}>
                    🏠
                </button>
                <button className='m-2 bg-gray-500 hover:bg-gray-700 py-2 px-4 rounded' onClick={handleMusicClick}>
                    {music ? '🔇' : '🎵'}
                </button>
                <button className='m-2 bg-yellow-700 hover:bg-yellow-900 py-2 px-4 rounded' onClick={handleRandomPubClick}>
                    🎲
                </button>
                <button className='m-2 bg-yellow-700 hover:bg-yellow-900 py-2 px-4 rounded' onClick={handleNearestPubClick}>
                    📍
                </button>

            </div>

            <audio id='music' loop>
                <source src='lute.mp3' />
            </audio>

            {message && (
                <div className="absolute w-full flex justify-center text-center bottom-12 sm:top-12 sm:bottom-auto">
                    <div
                        className="m-8 py-2 px-4 z-30 rounded text-neutral-800 font-bold font-serif italic"
                        style={{
                            backgroundImage: `url('parchment.jpg')`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    >
                        {message}
                    </div>
                </div>
            )}

            <div className="absolute inline-flex top-4 right-4 z-30">
                {pubs.length > 0 && (
                    <p className='m-2 text-white font-bold bg-yellow-700 py-2 px-4 rounded font-serif'>
                        <span className='italic'>{visitedPubs.length}/{pubs.length}</span>
                        {visitedPubs.length === pubs.length ? ' 🥳' : ' 🍻'}
                    </p>
                )}
                <button className='m-2 bg-gray-500 hover:bg-gray-700 py-2 px-4 rounded' onClick={handleInfoClick}>
                    ℹ️
                </button>
            </div>

            <div id='map-container' className="h-dvh" ref={mapContainerRef} />
        </div>
    );
}
