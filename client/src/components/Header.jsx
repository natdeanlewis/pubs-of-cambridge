import Button from "./Button";
import Total from "./Total";
import Music from "./Music";

export default function Header({
    pubs,
    visitedPubs,
    music,
    randomPub,
    setComplete,
    setRandomPub,
    setNearestPub,
    setMessage,
    setLoading,
    setMusic,
    playSound,
    map,
    INITIAL_MAP_SETTINGS,
}) {
    const handleResetViewClick = () => {
        playSound("zoom_out.mp3");
        setComplete(null);
        setRandomPub(null);
        setNearestPub(null);
        setMessage(null);
        map.fitBounds(INITIAL_MAP_SETTINGS.bounds);
    };

    const handleRandomPubClick = () => {
        setNearestPub(null);
        setRandomPub(null);
        setMessage(null);
        setComplete(pubs.length > 0 && pubs.length === visitedPubs.length);

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
        setComplete(null);
        setRandomPub(null);
        const complete = pubs.length > 0 && pubs.length === visitedPubs.length;
        if (complete) {
            return setComplete(true);
        }
        if (pubs.length === 0) return;

        if (navigator.geolocation) {
            setLoading(true);

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
                        "Share your location to enable finding your nearest unvisited pub"
                    );
                }
            );
        }
    };

    const handleInfoClick = () => {
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
                "🎶/⏸️ Toggles the music";
        }
        alert(alert_string);
    };

    const handleMusicClick = () => {
        const audio = document.getElementById("music");
        if (music) {
            audio.pause();
        } else {
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
                {!(pubs.length > 0 && pubs.length === visitedPubs.length) && (
                    <Button
                        label={"🎲"}
                        handleClickAction={handleRandomPubClick}
                        style="brown"
                    />
                )}
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
        </div>
    );
}
