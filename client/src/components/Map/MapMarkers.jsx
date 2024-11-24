import mapboxgl from "mapbox-gl";

const addPubMarkers = (
    pubs,
    visitedPubs,
    map,
    markers,
    pubLongitudeRange,
    setVisitedPubs
) => {
    markers.current.forEach((marker) => marker.remove());
    markers.current = [];
    const longitudes = pubs.map((pub) => pub.longitude);
    pubLongitudeRange.current = {
        min: Math.min(...longitudes),
        max: Math.max(...longitudes),
    };
    pubs.forEach((pub) => {
        const el = createMarkerElement(
            pub,
            pubs,
            visitedPubs,
            map,
            pubLongitudeRange
        );
        const marker = new mapboxgl.Marker(el)
            .setLngLat([pub.longitude, pub.latitude])
            .addTo(map);

        markers.current.push(marker);
        el.addEventListener("click", () => {
            updateVisitedStatus(pub._id, setVisitedPubs);
        });
    });
};

const createMarkerElement = (
    pub,
    pubs,
    visitedPubs,
    map,
    pubLongitudeRange
) => {
    const container = document.createElement("div");
    const el = document.createElement("div");
    el.className = "group";
    el.style.backgroundImage = "url(cheers_full.png)";
    if (visitedPubs.includes(pub._id)) {
        el.classList.add("mapboxgl-marker-semi-transparent-opacity");
        el.classList.add("mapboxgl-marker-semi-transparent-filter");
        container.classList.add("z-0");
    } else {
        container.classList.add("z-10");
        container.classList.add("hover:z-30");
    }
    el.style.width = "40px";
    el.style.height = "40px";
    el.style.backgroundSize = "100%";
    el.style.cursor = "pointer";
    if (pubs.length > 0 && pubs.length === visitedPubs.length) {
        el.classList.add("animate-bounce-custom");
        const scaledDelay =
            ((pub.longitude - pubLongitudeRange.current.min) /
                (pubLongitudeRange.current.max -
                    pubLongitudeRange.current.min)) *
            1;
        el.style.animationDelay = `${scaledDelay}s`;
        el.addEventListener("animationend", (event) => {
            if (event.animationName === "rainbow") {
                el.classList.remove("mapboxgl-marker-semi-transparent-filter");
            }
        });
    } else if (pubs.length > 0 && pubs.length === visitedPubs.length) {
        el.classList.remove("mapboxgl-marker-semi-transparent-filter");
    }

    const label = document.createElement("div");
    label.className =
        "absolute bottom-[-15px] left-1/2 transform -translate-x-1/2 bg-amber-100 px-1 rounded shadow text-xs whitespace-nowrap opacity-0 transition-opacity duration-300 font-serif italic";
    if (!visitedPubs.includes(pub._id)) {
        label.classList.add("group-hover:opacity-100");
    }
    label.textContent = `The ${pub.name}`;

    container.appendChild(el);
    el.appendChild(label);

    const updateLabelOpacity = () => {
        const zoom = map.getZoom();
        if (pubs.length > 0 && pubs.length === visitedPubs.length) {
            if (zoom > 13.5) {
                label.style.opacity = "1";
            } else {
                label.style.opacity = null;
            }
        } else if (
            zoom > 15.5 ||
            (zoom > 13.5 && !visitedPubs.includes(pub._id))
        ) {
            label.style.opacity = "1";
        } else {
            label.style.opacity = null;
        }
    };

    updateLabelOpacity();

    map.on("zoom", updateLabelOpacity);
    return container;
};

const updateVisitedStatus = (pubId, setVisitedPubs) => {
    const localVisitedPubs = JSON.parse(
        localStorage.getItem("visited_pub_ids")
    );
    const method = localVisitedPubs.includes(pubId) ? "remove" : "add";
    let newVisitedPubs;
    if (method === "remove") {
        newVisitedPubs = localVisitedPubs.filter((id) => id !== pubId);
    } else {
        newVisitedPubs = [...localVisitedPubs, pubId];
    }
    localStorage.setItem("visited_pub_ids", JSON.stringify(newVisitedPubs));
    setVisitedPubs(newVisitedPubs);
};

export { addPubMarkers };
