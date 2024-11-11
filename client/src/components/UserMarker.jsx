import { useEffect } from "react";
import mapboxgl from "mapbox-gl";

export default function UserMarker({ longitude, latitude, map }) {
    useEffect(() => {
        if (!map) return;

        const userMarker = document.createElement("div");
        userMarker.className = "group hover:z-20";
        userMarker.style.zIndex = "10";

        userMarker.innerHTML = `
            <span class="relative flex items-center justify-center text-2xl">
                <span class="animate-ping absolute inline-flex rounded-full">👑</span>
                <span class="absolute inline-flex rounded-full" style="text-shadow: 1px 1px 0 black, -1px -1px 0 black, -1px 1px 0 black, 1px -1px 0 black;">👑</span>
            </span>
        `;

        const label = document.createElement("div");
        label.className =
            "absolute bottom-[-32px] left-1/2 transform -translate-x-1/2 bg-amber-100 px-1 rounded shadow text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-serif italic";
        label.textContent = `You!`;

        userMarker.appendChild(label);

        new mapboxgl.Marker(userMarker)
            .setLngLat([longitude, latitude])
            .addTo(map);

        return () => {
            userMarker.remove();
        };
    }, [longitude, latitude, map]);
}
