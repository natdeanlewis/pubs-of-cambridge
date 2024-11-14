import Button from "./Button";
import Total from "./Total";
import Music from "./Music";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export default function Header({
    pubs,
    visitedPubs,
    music,
    creditsMusic,
    cancelCredits,
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
            map.fitBounds(INITIAL_MAP_SETTINGS.bounds, { duration: 0 });

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
                }, 100);
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
        const unvisitedPubs = pubs.filter(
            (pub) => !visitedPubs.includes(pub._id)
        );

        unvisitedPubs.forEach((pub) => {
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
        const complete = pubs.length > 0 && pubs.length === visitedPubs.length;
        if (complete) {
            return setComplete(true);
        }
        if (pubs.length === 0) return;

        const showNearestPubApp = (position) => {
            const nearestPub = calculateNearestPub(position);
            playSound("door.mp3");

            if (nearestPub) {
                map.flyTo({
                    center: [nearestPub.longitude, nearestPub.latitude],
                    zoom: 16,
                });
            }
        };
        const getPositionAndCalculateNearestPubApp = async () => {
            const position = await Geolocation.getCurrentPosition();
            if (position) {
                setLoading(true);
                showNearestPubApp(position);
            } else {
                console.error("Error getting location:", error);
                alert(
                    "Share your location to enable finding your nearest unvisited pub"
                );
            }
        };
        if (Capacitor.getPlatform() === "web") {
            if (navigator.geolocation) {
                setLoading(true);

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const nearestPub = calculateNearestPub(position);
                        playSound("door.mp3");

                        if (nearestPub) {
                            map.flyTo({
                                center: [
                                    nearestPub.longitude,
                                    nearestPub.latitude,
                                ],
                                zoom: 16,
                            });
                        }
                    },
                    (error) => {
                        console.error("Error getting location:", error);
                        alert(
                            "Share your location to enable finding your nearest unvisited pub"
                        );
                    }
                );
            }
        } else {
            getPositionAndCalculateNearestPubApp();
        }
    };

    const handleInfoClick = () => {
        if (creditsMusic) {
            cancelCredits();
        }
        let alert_string =
            "Welcome, traveller!\n\n" +
            "🍻 Click a pub to mark it as visited\n" +
            "🎲 Recommends a random unvisited pub\n" +
            "📍 Finds your nearest unvisited pub\n" +
            "🏠 Resets the view\n" +
            "🎶/⏸️ Toggles the music";

        if (pubs.length > 0 && visitedPubs.length === pubs.length) {
            alert_string =
                "Congratulations, you've visited every pub in Cambridge!\n\n" +
                "🏠 Resets the view\n" +
                "🎶/⏸️ Toggles the music" +
                "\n🐬 ???";
        }
        alert(alert_string);
    };

    function disableInteractions() {
        map.scrollZoom.disable();
        map.touchZoomRotate.disable();
        map.dragPan.disable();
        map.boxZoom.disable();
        map.keyboard.disable();
        map.doubleClickZoom.disable();
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
            <div className="absolute flex flex-col sm:flex-row top-4 left-4 z-30 safe-area">
                <Button label="🏠" handleClickAction={handleResetViewClick} />
                <Button
                    label={music ? "⏸️" : "🎶"}
                    handleClickAction={handleMusicClick}
                />
                <Button
                    label={
                        pubs.length > 0 && visitedPubs.length === pubs.length
                            ? creditsMusic
                                ? "⏹️"
                                : "🐬"
                            : "🎲"
                    }
                    handleClickAction={handleRandomPubClick}
                    style="brown"
                />
                {!(pubs.length > 0 && pubs.length === visitedPubs.length) && (
                    <Button
                        label="📍"
                        handleClickAction={handleNearestPubClick}
                        style="brown"
                    />
                )}
            </div>

            <div className="absolute inline-flex top-4 right-4 z-30 safe-area">
                <Total pubs={pubs} visitedPubs={visitedPubs} />
                <Button label="ℹ️" handleClickAction={handleInfoClick} />
            </div>

            <Music id="music" loop={true} src="lute.mp3" />
            <Music id="credits" src="dolphin.mp3" />
        </div>
    );
}
