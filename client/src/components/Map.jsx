import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import Button from './Button';

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
const creditsBeatLength = 60000/122.36
const creditsMessages =[
    '(Sound on!) Well, here we are at last...',
    'Just look at all those pubs...',
    'More to the point, think of all those drinks!',
    'It\'s been a long journey...',
    'But there\'s a whole world out there...',
    'What on earth have you been doing?!',
    'Why not go and explore somewhere else for a change?',
    'I hear there are some pretty nice pubs in Grantchester...',
    'And there might even be some further out than that...',
    'Hey, I can see my house from up here!',
    'Anyway, I hope you\'ve found a new pub or two you like...',
    'Or at least some you definitely won\'t be going back to...',
    'Looking at you, <insert soulless Greene King here>',
    'Either way, what a time you\'ve had...',
    'I\'m almost sad this is all over...',
    'But I\'m sure you\'ll find a new challenge!',
    'Hang on, my favourite bit\'s nearly coming up...',
    'You\'re gonna love it, I promise...',
    'Wait for it...',
    'Oops, not quite yet...',
    'Are you ready?',
    'Okay, here we go!!!',
    '🎷🐬 DoO dOo DoO dOo DoOoO dOo 🎷🐬',
]

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
            requestAnimationFrame(() => {
                mapRef.current.fitBounds(INITIAL_MAP_SETTINGS.bounds);
            });
        }
    }, [pubs, visitedPubs, creditsMusic]);

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

    useEffect(() => {    
        if (randomPub) {
            setMessage(`How about... The ${randomPub.name}?`);
        } else if (nearestPub) {
            setMessage(`Your nearest pub is... The ${nearestPub.name}!`);
            setLoading(false);
        } else if (creditsMusic) {
            setMessage(null);
            setComplete(null);
            
            let timeout;
            for (let i = 0; i < creditsMessages.length; i++) {
                switch(true) {
                    case (i === 0):
                        timeout = 0;
                        break;
                    case (i === 3 ):
                        timeout += 17 * creditsBeatLength;
                        break;
                    case (i === 10 ):
                        timeout += 20 * creditsBeatLength;
                        break;
                    case (i === 21 ):
                        timeout += 8 * creditsBeatLength;
                        break;
                    case (i === 22 ):
                        timeout += 9 * creditsBeatLength;
                        break;
                    default:
                        timeout += 16 * creditsBeatLength;
                }
                setTimeout(() => {
                    setMessage(creditsMessages[i])
                }, timeout)
                if (i === creditsMessages.length - 1) {
                    setTimeout(() => {
                        setMessage(null);
                    }, timeout +  (3 * 16  + 15) * creditsBeatLength)
                    setTimeout(() => {
                        cancelCredits();
                        setComplete(null);
                        setMessage(null);
                        mapRef.current.fitBounds(INITIAL_MAP_SETTINGS.bounds);
                (null);
                    }, timeout +  (7 * 16  + 15) * creditsBeatLength)
                }
            }
        } else if (complete) {
            setMessage(`Looks like you're all done... pub?`);
        } else if (loading) {
            setMessage(`Looking for your nearest pub...`);
        } else {
            setMessage(null);
        }

        if (!creditsMusic) {
            const messageTimeout = setTimeout(() => {
                setMessage(null);
                setComplete(null);
            }, 5000);    
            return () => {
                clearTimeout(messageTimeout);   
            };    
        }
        
    }, [randomPub, nearestPub, complete, loading, creditsMusic]);

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

    const updateVisitedStatus = (pubId) => {
        if(creditsMusic) {
            cancelCredits();
        }    
        const localVisitedPubs = JSON.parse(localStorage.getItem('visited_pub_ids'));
        const method = localVisitedPubs.includes(pubId) ? 'remove' : 'add';
        let newVisitedPubs
        if (method === 'remove') {
            newVisitedPubs = localVisitedPubs.filter(id => id !== pubId);
            playSound('glass_break.mp3')
        } else {
            newVisitedPubs = [...localVisitedPubs, pubId];
            playSound('glass_clink.mp3')
        }
        localStorage.setItem('visited_pub_ids', JSON.stringify(newVisitedPubs));
        setVisitedPubs(newVisitedPubs);
        
        firstTime = false;
    };

    const handleResetViewClick = () => {
        if (creditsMusic) {
            cancelCredits();
        } 
        playSound('zoom_out.mp3');
        setComplete(null);
        setRandomPub(null);
        setNearestPub(null);
        setMessage(null);
        mapRef.current.fitBounds(INITIAL_MAP_SETTINGS.bounds);
    };
    function disableInteractions() {
        mapRef.current.scrollZoom.disable();
        mapRef.current.touchZoomRotate.disable();
        mapRef.current.dragPan.disable();
        mapRef.current.boxZoom.disable();
        mapRef.current.keyboard.disable();
        mapRef.current.doubleClickZoom.disable();
      }
      
      function enableInteractions() {
        mapRef.current.scrollZoom.enable();
        mapRef.current.touchZoomRotate.enable();
        mapRef.current.dragPan.enable();
        mapRef.current.boxZoom.enable();
        mapRef.current.keyboard.enable();
        mapRef.current.doubleClickZoom.enable();
      }

      function cancelCredits() {
        const credits = document.getElementById('credits');
        credits.pause();
        setCreditsMusic(false);
        requestAnimationFrame(() => {
            mapRef.current.fitBounds(INITIAL_MAP_SETTINGS.bounds);
        });
        enableInteractions();  
        var id = window.setTimeout(function() {}, 0);
        while (id--) {
            window.clearTimeout(id);
        }
        setMessage(null);
        setComplete(null);
        setRandomPub(null);
        setNearestPub(null);
      } 
      
    const handleRandomPubClick = () => {
        if (creditsMusic) {
            cancelCredits();
        } 
        setNearestPub(null);
        setComplete(null);
        setRandomPub(null);
        setMessage(null);
        setComplete(pubs.length > 0 && pubs.length === visitedPubs.length);
        if (pubs.length > 0 && pubs.length === visitedPubs.length) {
            
            const credits = document.getElementById('credits');
            const audio = document.getElementById('music');
            mapRef.current.fitBounds(INITIAL_MAP_SETTINGS.bounds, {duration: 500});

            if (creditsMusic) {
                cancelCredits();
            } else {
                audio.pause();
                setMusic(false);
                credits.load();
                credits.play();
                setCreditsMusic(true);
                disableInteractions();
                setTimeout(() => {
                    mapRef.current.flyTo({center: [INITIAL_LONGITUDE, INITIAL_LATITUDE], zoom: 0, duration: 352000});
                }, 500);
            }
        } else {
            playSound('die_roll.mp3');
            let unvisitedPubs = pubs.filter(pub => !visitedPubs.includes(pub._id));
            if (randomPub) {
                unvisitedPubs = unvisitedPubs.filter(pub => pub._id != randomPub._id)
            }
            if (!randomPub && unvisitedPubs.length === 0) {
                mapRef.current.fitBounds(INITIAL_MAP_SETTINGS.bounds);
            } else {
                if (unvisitedPubs.length === 0) {
                    console.log(randomPub)
                    mapRef.current.flyTo({
                        center: [randomPub.longitude, randomPub.latitude],
                        zoom: 16,
                    });    
                } else {
                    const randomPub = unvisitedPubs[Math.floor(Math.random() * unvisitedPubs.length)];
                    setRandomPub(randomPub);
                    mapRef.current.flyTo({
                        center: [randomPub.longitude, randomPub.latitude],
                        zoom: 16,
                    });
                }
            }
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
        if (creditsMusic) {
            cancelCredits();
        } 
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
        if (creditsMusic) {
            cancelCredits();
        } 
        const audio = document.getElementById('music');
        const credits = document.getElementById('credits');
        if (music) {
            audio.pause();
        } else {
            credits.pause();
            setCreditsMusic(false);
            audio.play();
        }
        setMusic(!music);
    };

    const playSound = (file) => {
        const audio = new Audio(file);
        audio.play();
    };


    const handleInfoClick = () => {
        if (creditsMusic) {
            cancelCredits();
        } 
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
                <Button label="🏠" handleClickAction={handleResetViewClick} />
                <Button label={music ? "🔇" : "🎵"} handleClickAction={handleMusicClick} />
                <Button label={pubs.length > 0 && visitedPubs.length === pubs.length ? (creditsMusic ? "🛑" : "🐬") : "🎲"} handleClickAction={handleRandomPubClick} style="brown" />
                <Button label="📍" handleClickAction={handleNearestPubClick} style="brown" />
            </div>
            
            <audio id='music' loop>
                <source src='lute.mp3' />
            </audio>

            <audio id='credits'>
                <source src='dolphin.mp3' />
            </audio>

            {message && (
                <div className="absolute w-full flex justify-center text-center bottom-12 sm:top-12 sm:bottom-auto">
                    <div className="bg-amber-100 shadow m-8 py-2 px-4 z-30 rounded text-neutral-800 font-bold font-serif italic text-balance">
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
                <Button label="ℹ️" handleClickAction={handleInfoClick} />
            </div>

            <div id='map-container' className="h-dvh" ref={mapContainerRef} />
        </div>
    );
}
