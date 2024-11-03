import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { map } from 'lodash'

export default function Map() {
    const mapRef = useRef()
    const mapContainerRef = useRef()
    const INITIAL_CENTER = [0.1313, 52.1951]
    const INITIAL_ZOOM = 12
    const [pubs, setPubs] = useState([]);
    const [visitedPubs, setVisitedPubs] = useState([]);
    const markers = useRef([]);

    useEffect(() => {
        mapboxgl.accessToken = 'pk.eyJ1IjoibmF0ZGVhbmxld2lzIiwiYSI6ImNtMzBjcWpkNjBpaXgybXNhdGYyYTU2Y3AifQ.lM4WFOgR19cbYIGR5seCCg'
        mapRef.current = new mapboxgl.Map({
          container: mapContainerRef.current,
          style:'mapbox://styles/natdeanlewis/cm30cthrf00tk01qw5nb5buow/draft',
          center: INITIAL_CENTER,
          zoom: INITIAL_ZOOM
        });
        return () => mapRef.current.remove();
    }, []);

    useEffect(() => {
        async function getPubs() {
            const response = await fetch(`http://localhost:5050/record/pubs`);
            if (!response.ok) {
                const message = `An error occurred: ${response.statusText}`;
                console.error(message);
                return;
            }            
            const pubs = await response.json();
            setPubs(pubs);    
        }
        getPubs();
    
        async function getVisitedPubs() {
            const response = await fetch(`http://localhost:5050/record/users/67269c96e45eaf3016550af0`);
            if (!response.ok) {
              const message = `An error occurred: ${response.statusText}`;
              console.error(message);
              return;
            }
            const user = await response.json();
            const visitedPubs = user.visited_pub_ids
            setVisitedPubs(visitedPubs);
        }
        getVisitedPubs();
    }, []);


       
    useEffect(() => {
        if (!mapRef.current) return;
        markers.current.forEach(marker => marker.remove());
        markers.current = [];

        for (const pub of pubs) {
            const el = document.createElement('div');
            el.className = 'marker';
            el.style.backgroundImage = visitedPubs.includes(pub._id) ? 'url(cheers_full.png)' : 'url(cheers_empty.png)';
            el.style.width = '50px';
            el.style.height = '50px';
            el.style.backgroundSize = '100%';
            el.style.display = 'block';
            el.style.border = 'none';
            el.style.cursor = 'pointer';
            
            const label = document.createElement('div');
            label.className = 'marker-label';
            label.textContent = pub.name;
            label.style.position = 'absolute';
            label.style.bottom = '-30px';
            label.style.left = '50%';
            label.style.transform = 'translateX(-50%)';
            label.style.backgroundColor = 'white';
            label.style.padding = '5px';
            label.style.borderRadius = '3px';
            label.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.5)';
            label.style.fontSize = '12px';
            label.style.whiteSpace = 'nowrap';

            el.appendChild(label);
            const marker = new mapboxgl.Marker(el)
            .setLngLat([pub.longitude, pub.latitude])
            .addTo(mapRef.current);
            
            markers.current.push(marker);

            el.addEventListener('mousedown', () => {
                updateVisitedStatus(pub._id);
            });
            
        }

    }, [visitedPubs]);

    async function updateVisitedStatus(pubId) {
    if (visitedPubs.includes(pubId)) {
            const response = await fetch(`http://localhost:5050/record/users/remove/67269c96e45eaf3016550af0`, {
                method: "PATCH",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify({"pubId": pubId})
            });     
        } else {
            const response = await fetch(`http://localhost:5050/record/users/67269c96e45eaf3016550af0`, {
                method: "PATCH",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify({"pubId": pubId})
            });
        }
        const userResponse = await fetch(`http://localhost:5050/record/users/67269c96e45eaf3016550af0`);
        const userData = await userResponse.json();
        setVisitedPubs(userData.visited_pub_ids);
    }

    const handleButtonClick = () => {
        mapRef.current.flyTo({
            center: INITIAL_CENTER,
            zoom: INITIAL_ZOOM
        })
    }

    return (
        <div className="relative h-screen"> {/* Container for positioning */}
            <button className='absolute top-4 left-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded z-10' onClick={handleButtonClick}>
                Reset view
            </button>
            <div id='map-container' className='h-full' ref={mapContainerRef} />
        </div>

    )
}