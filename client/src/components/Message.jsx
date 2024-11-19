import { useEffect } from "react";

export default function Message({
    message,
    randomPub,
    nearestPub,
    complete,
    loading,
    setMessage,
    setLoading,
    setComplete,
}) {
    useEffect(() => {
        if (randomPub) {
            setMessage(`How about... The ${randomPub.name}?`);
        } else if (nearestPub) {
            setMessage(
                `Your nearest unvisited pub is: The ${nearestPub.name}!`
            );
            setLoading(false);
        } else if (complete) {
            setMessage(`Looks like you're all done... pub?`);
        } else if (loading) {
            setMessage(`Finding your nearest unvisited pub...`);
        } else {
            setMessage(null);
        }

        if (!complete) {
            const messageTimeout = setTimeout(() => {
                setMessage(null);
                setComplete(null);
            }, 5000);
            return () => {
                clearTimeout(messageTimeout);
            };
        }
    }, [randomPub, nearestPub, complete, loading]);

    return (
        <div>
            {message && (
                <div className="absolute left-1/2 transform -translate-x-1/2 text-center bottom-12 sm:top-12 sm:bottom-auto w-full sm:w-auto max-w-[75%] z-40 safe-area">
                    <div className="bg-amber-100 shadow my-8 py-2 px-4 rounded text-neutral-800 font-bold font-serif italic text-balance">
                        {message}
                    </div>
                </div>
            )}
        </div>
    );
}
