import { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import { map } from 'lodash'

export default function Map() {
    const mapRef = useRef()
    const mapContainerRef = useRef()
    const INITIAL_CENTER = [0.1313, 52.1951]
    const INITIAL_ZOOM = 12
    const [pubs, setPubs] = useState([]);
    const [user, setUser] = useState([]);

    useEffect(() => {
        mapboxgl.accessToken = 'pk.eyJ1IjoibmF0ZGVhbmxld2lzIiwiYSI6ImNtMzBjcWpkNjBpaXgybXNhdGYyYTU2Y3AifQ.lM4WFOgR19cbYIGR5seCCg'
        mapRef.current = new mapboxgl.Map({
          container: mapContainerRef.current,
          style:'mapbox://styles/natdeanlewis/cm30cthrf00tk01qw5nb5buow/draft',
          center: INITIAL_CENTER,
          zoom: INITIAL_ZOOM
        });

        // const goldenHind = new mapboxgl.Marker({ color: 'green' })
        // .setLngLat([0.145562, 52.227937])
        // .addTo(mapRef.current);
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

        async function getUser() {
            const response = await fetch(`http://localhost:5050/record/users/67269c96e45eaf3016550af0`);
            if (!response.ok) {
              const message = `An error occurred: ${response.statusText}`;
              console.error(message);
              return;
            }
            const user = await response.json();
            setUser(user);
        }
        getUser();

        async function updateVisitedStatus(pubId) {
            if (user.visited_pub_ids.includes(pubId)) {
                console.log('asdfasdf')
                response = await fetch(`http://localhost:5050/record/users/remove/67269c96e45eaf3016550af0`, {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({"pubId": pubId})
                  });     
                } else {
                response = await fetch(`http://localhost:5050/record/users/67269c96e45eaf3016550af0`, {
                    method: "PATCH",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({"pubId": pubId})
                  });
            }
        }
        // const geojson = {
        //     type: 'FeatureCollection',
        //     features: [
        //       {
        //         type: 'Feature',
        //         geometry: {
        //           type: 'Point',
        //           coordinates: [0.145562, 52.227937]
        //         },
        //         properties: {
        //           message: 'Golden Hind',
        //           visited: true,
        //         }
        //       },
        //       {
        //         type: 'Feature',
        //         geometry: {
        //           type: 'Point',
        //           coordinates: [0.136563, 52.222812]
        //         },
        //         properties: {
        //           message: 'Milton Arms',
        //           visited: false,
        //         }
        //       }
        //     ]
        // };

        for (const pub of pubs) {
            const el = document.createElement('div');
            el.className = 'marker';
            el.style.backgroundImage = user.visited_pub_ids.includes(pub._id) ? 'url(cheers_full.png)' : 'url(cheers_empty.png)';
            el.style.width = '50px';
            el.style.height = '50px';
            el.style.backgroundSize = '100%';
            el.style.display = 'block';
            el.style.border = 'none';
            el.style.cursor = 'pointer';

            new mapboxgl.Marker(el)
            .setLngLat([pub.longitude, pub.latitude])
            // .setPopup(
            //           new mapboxgl.Popup({ offset: 25 }) 
            //             .setHTML(
            //               pub.name
            //             )
            //         )
            .addTo(mapRef.current);
                  
            el.addEventListener('click', () => {
                updateVisitedStatus(pub._id);
                window.alert('Marking as visited');
              });
        }
    //   }, [pubs, user]); - make this update on pub or user change but not require refresh like below
      }, [pubs.length]);

        const handleButtonClick = () => {
            mapRef.current.flyTo({
              center: INITIAL_CENTER,
              zoom: INITIAL_ZOOM
            })
          }
    return (
        <>
        <button className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded' onClick={handleButtonClick}>
            Reset view
        </button>
        <div id='map-container' className='h-screen' ref={mapContainerRef}/>
        </>
    )
}