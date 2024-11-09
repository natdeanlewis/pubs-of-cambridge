import Button from "./Button";
import Total from "./Total";
import Music from "./Music";

export default function Header({
    pubs,
    visitedPubs,
    music,
    creditsMusic,
    randomPub,
    setComplete,
    setRandomPub,
    setNearestPub,
    setMessage,
    setLoading,
    setMusic,
    setCreditsMusic,
    playSound,
    map,
    INITIAL_MAP_SETTINGS,
    INITIAL_LATITUDE,
    INITIAL_LONGITUDE,
}) {
    const handleResetViewClick = () => {
        if (creditsMusic) {
            cancelCredits();
        }
        playSound("zoom_out.mp3");
        setComplete(null);
        setRandomPub(null);
        setNearestPub(null);
        setMessage(null);
        map.fitBounds(INITIAL_MAP_SETTINGS.bounds);
    };

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
            const credits = document.getElementById("credits");
            const audio = document.getElementById("music");
            map.fitBounds(INITIAL_MAP_SETTINGS.bounds, { duration: 500 });

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
                    map.flyTo({
                        center: [INITIAL_LONGITUDE, INITIAL_LATITUDE],
                        zoom: 0,
                        duration: 352000,
                    });
                }, 500);
            }
        } else {
            playSound("die_roll.mp3");
            let unvisitedPubs = pubs.filter(
                (pub) => !visitedPubs.includes(pub._id)
            );
            if (randomPub) {
                unvisitedPubs = unvisitedPubs.filter(
                    (pub) => pub._id != randomPub._id
                );
            }
            if (!randomPub && unvisitedPubs.length === 0) {
                map.fitBounds(INITIAL_MAP_SETTINGS.bounds);
            } else {
                if (unvisitedPubs.length === 0) {
                    map.flyTo({
                        center: [randomPub.longitude, randomPub.latitude],
                        zoom: 16,
                    });
                } else {
                    const randomPub =
                        unvisitedPubs[
                            Math.floor(Math.random() * unvisitedPubs.length)
                        ];
                    setRandomPub(randomPub);
                    map.flyTo({
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

        pubs.forEach((pub) => {
            const distance =
                Math.pow(pub.latitude - position.coords.latitude, 2) +
                Math.pow(pub.longitude - position.coords.longitude, 2);

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
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const nearestPub = calculateNearestPub(position);
                    playSound("door.mp3");

                    if (nearestPub) {
                        map.flyTo({
                            center: [nearestPub.longitude, nearestPub.latitude],
                            zoom: 16,
                        });
                    }
                },
                (error) => {
                    console.error("Error getting location:", error);
                    alert(
                        "Share your location to enable finding your nearest pub"
                    );
                }
            );
        }
    };

    const handleInfoClick = () => {
        if (creditsMusic) {
            cancelCredits();
        }
        alert(
            "Welcome, traveller!\n\n" +
                "🍻 Click a pub to mark it as visited\n" +
                "🎲 Recommends a random unvisited pub\n" +
                "📍 Finds your nearest pub\n" +
                "🏠 Resets the view\n" +
                "🎵 Toggles the music"
        );
    };

    function disableInteractions() {
        map.scrollZoom.disable();
        map.touchZoomRotate.disable();
        map.dragPan.disable();
        map.boxZoom.disable();
        map.keyboard.disable();
        map.doubleClickZoom.disable();
    }

    function enableInteractions() {
        map.scrollZoom.enable();
        map.touchZoomRotate.enable();
        map.dragPan.enable();
        map.boxZoom.enable();
        map.keyboard.enable();
        map.doubleClickZoom.enable();
    }

    function cancelCredits() {
        const credits = document.getElementById("credits");
        credits.pause();
        setCreditsMusic(false);
        requestAnimationFrame(() => {
            map.fitBounds(INITIAL_MAP_SETTINGS.bounds);
        });
        enableInteractions();
        var id = window.setTimeout(function () {}, 0);
        while (id--) {
            window.clearTimeout(id);
        }
        setMessage(null);
        setComplete(null);
        setRandomPub(null);
        setNearestPub(null);
    }

    const handleMusicClick = () => {
        if (creditsMusic) {
            cancelCredits();
        }
        const audio = document.getElementById("music");
        const credits = document.getElementById("credits");
        if (music) {
            audio.pause();
        } else {
            credits.pause();
            setCreditsMusic(false);
            audio.play();
        }
        setMusic(!music);
    };

    return (
        <div>
            <div className="absolute flex flex-col sm:flex-row top-4 left-4 z-30">
                <Button label="🏠" handleClickAction={handleResetViewClick} />
                <Button
                    label={music ? "🔇" : "🎵"}
                    handleClickAction={handleMusicClick}
                />
                <Button
                    label={
                        pubs.length > 0 && visitedPubs.length === pubs.length
                            ? creditsMusic
                                ? "🛑"
                                : "🐬"
                            : "🎲"
                    }
                    handleClickAction={handleRandomPubClick}
                    style="brown"
                />
                <Button
                    label="📍"
                    handleClickAction={handleNearestPubClick}
                    style="brown"
                />
            </div>

            <div className="absolute inline-flex top-4 right-4 z-30">
                <Total pubs={pubs} visitedPubs={visitedPubs} />
                <Button label="ℹ️" handleClickAction={handleInfoClick} />
            </div>

            <Music id="music" loop={true} src="lute.mp3" />
            <Music id="credits" src="dolphin.mp3" />
        </div>
    );
}
