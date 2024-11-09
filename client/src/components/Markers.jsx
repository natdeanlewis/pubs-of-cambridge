import { useEffect } from "react";
import mapboxgl from "mapbox-gl";

export default function Markers({
    map,
    markers,
    pubs,
    visitedPubs,
    creditsMusic,
    setComplete,
    setNearestPub,
    setRandomPub,
    setVisitedPubs,
    firstTime,
    setFirstTime,
    playSound,
    INITIAL_MAP_SETTINGS,
}) {
    useEffect(() => {
        if (!map) return;

        markers.current.forEach((marker) => marker.remove());
        markers.current = [];

        pubs.forEach((pub) => {
            const el = createMarkerElement(pub);
            const marker = new mapboxgl.Marker(el)
                .setLngLat([pub.longitude, pub.latitude])
                .addTo(map);

            markers.current.push(marker);
            el.addEventListener("mousedown", () =>
                updateVisitedStatus(pub._id)
            );
        });
        console.log(firstTime);
        setComplete(
            !firstTime && pubs.length > 0 && pubs.length === visitedPubs.length
        );
        setNearestPub(null);
        setRandomPub(null);
        if (pubs.length > 0 && pubs.length === visitedPubs.length) {
            requestAnimationFrame(() => {
                map.fitBounds(INITIAL_MAP_SETTINGS.bounds);
            });
        }
    }, [pubs, visitedPubs, creditsMusic]);

    const createMarkerElement = (pub) => {
        const el = document.createElement("div");
        el.className = "group hover:z-20";
        el.style.backgroundImage = visitedPubs.includes(pub._id)
            ? "url(cheers_full.png)"
            : "url(cheers_empty.png)";
        el.style.width = "40px";
        el.style.height = "40px";
        el.style.backgroundSize = "100%";
        el.style.cursor = "pointer";

        const label = document.createElement("div");
        label.className =
            "absolute bottom-[-15px] left-1/2 transform -translate-x-1/2 bg-amber-100 px-1 rounded shadow text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-serif italic";
        label.textContent = `The ${pub.name}`;

        el.appendChild(label);

        const updateLabelOpacity = () => {
            const zoom = map.getZoom();
            if (zoom > 13.5) {
                label.style.opacity = "1";
            } else {
                label.style.opacity = null;
            }
        };

        updateLabelOpacity();

        map.on("zoom", updateLabelOpacity);
        return el;
    };

    const updateVisitedStatus = (pubId) => {
        if (creditsMusic) {
            cancelCredits();
        }
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
        console.log(1);
    };
}
