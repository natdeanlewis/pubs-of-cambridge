import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';

export default function Map() {
    const mapRef = useRef();
    const mapContainerRef = useRef();
    const INITIAL_CENTER = [0.1313, 52.202];
    const INITIAL_ZOOM = 12.6;
    const INITIAL_PITCH = 0;
    const INITIAL_BEARING = 0;
    const [pubs, setPubs] = useState([]);
    const [visitedPubs, setVisitedPubs] = useState([]);
    const [randomPub, setRandomPub] = useState([]);
    const markers = useRef([]);
    const lotrMapStyle = 'mapbox://styles/natdeanlewis/cm31fd4i300vc01pigpm06fr3/draft';

    useEffect(() => {
        async function getPubs() {
            const response = await fetch(`http://localhost:5050/record/pubs`);
            if (!response.ok) {
                console.error(`An error occurred: ${response.statusText}`);
                return;
            }
            const pubs = await response.json();
            setPubs(pubs);
        }
        
        async function getVisitedPubs() {
            const response = await fetch(`http://localhost:5050/record/users/67269c96e45eaf3016550af0`);
            if (!response.ok) {
                console.error(`An error occurred: ${response.statusText}`);
                return;
            }
            const user = await response.json();
            setVisitedPubs(user.visited_pub_ids);
        }

        getPubs();
        getVisitedPubs();
        setRandomPub(null);

        mapboxgl.accessToken = 'pk.eyJ1IjoibmF0ZGVhbmxld2lzIiwiYSI6ImNtMzBjcWpkNjBpaXgybXNhdGYyYTU2Y3AifQ.lM4WFOgR19cbYIGR5seCCg';
        
        mapRef.current = new mapboxgl.Map({
            container: mapContainerRef.current,
            style: lotrMapStyle,
            center: INITIAL_CENTER,
            zoom: INITIAL_ZOOM,
            pitch: INITIAL_PITCH,
            bearing: INITIAL_BEARING,
        });

        return () => mapRef.current.remove();
    }, []);

    useEffect(() => {
        if (!mapRef.current) return;

        markers.current.forEach(marker => marker.remove());
        markers.current = [];

        for (const pub of pubs) {
            const el = document.createElement('div');
            el.className = 'group';
            el.style.backgroundImage = visitedPubs.includes(pub._id) 
                ? 'url(cheers_full.png)' 
                : 'url(cheers_empty.png)';
            el.style.width = '40px';
            el.style.height = '40px';
            el.style.backgroundSize = '100%';
            el.style.border = 'none';
            el.style.cursor = 'pointer';

            const label = document.createElement('div');
            label.className = `
                absolute 
                bottom-[-15px] 
                left-1/2 
                transform 
                -translate-x-1/2 
                bg-white 
                px-1 
                rounded 
                shadow 
                text-xs 
                whitespace-nowrap 
                opacity-0 
                group-hover:opacity-100 
                transition-opacity 
                duration-300
            `;
            label.textContent = pub.name;

            el.appendChild(label);

            const marker = new mapboxgl.Marker(el)
                .setLngLat([pub.longitude, pub.latitude])
                .addTo(mapRef.current);

            markers.current.push(marker);

            el.addEventListener('mousedown', () => {
                updateVisitedStatus(pub._id);
            });
        }
    }, [pubs, visitedPubs]);

    async function updateVisitedStatus(pubId) {
        const method = visitedPubs.includes(pubId) ? 'remove' : 'add';
        const response = await fetch(`http://localhost:5050/record/users/${method}/67269c96e45eaf3016550af0`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ "pubId": pubId }),
        });

        const userResponse = await fetch(`http://localhost:5050/record/users/67269c96e45eaf3016550af0`);
        const userData = await userResponse.json();
        setVisitedPubs(userData.visited_pub_ids);
    }

    const handleResetViewClick = () => {
        setRandomPub(null)
        mapRef.current.flyTo({
            center: INITIAL_CENTER,
            zoom: INITIAL_ZOOM,
            pitch: INITIAL_PITCH,
            bearing: INITIAL_BEARING,
        });
    };

    const handleRandomPubClick = () => {
        const unvisitedPubs = pubs.filter((pub) => !visitedPubs.includes(pub._id)).filter((pub) => !visitedPubs.includes(pub._id))
        const randomChoice = Math.floor(Math.random() * unvisitedPubs.length)
        const randomPub = unvisitedPubs[randomChoice]
        
        setRandomPub(randomPub)

        mapRef.current.flyTo({
            center: [randomPub.longitude, randomPub.latitude],
            zoom: 16,
            pitch: INITIAL_PITCH,
            bearing: INITIAL_BEARING,
        });
    };
      
    return (
        <div className="relative h-screen">
            <div className="absolute inline-flex top-4 left-4">     
                <button
                    className='m-2 bg-yellow-700 hover:bg-yellow-900 text-white font-bold py-2 px-4 rounded z-10'
                    onClick={handleRandomPubClick}
                >
                    Pub?
                </button>

                <button
                    className='m-2 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded z-10'
                    onClick={handleResetViewClick}
                >
                    Reset view
                </button>
            </div>

            {!!randomPub && 
            <div className="absolute w-full flex justify-center top-4">
                    <div className='m-16 py-2 px-4 z-10 bg-neutral-800 rounded text-white font-bold'>
                        How about... The {randomPub.name}?
                    </div>
            </div>
            }

            <div className="absolute inline-flex top-4 right-4">     
                {pubs.length > 0 &&
                    <p className='m-2 text-white font-bold bg-neutral-800 py-2 px-4 rounded z-10'>
                        Visited: {visitedPubs.length}/{pubs.length}
                        {visitedPubs.length === pubs.length ? ' 🥳' : ''}
                    </p>        
                }

            </div>

            <div id='map-container' className='h-full' ref={mapContainerRef} />
        </div>
    );
}
