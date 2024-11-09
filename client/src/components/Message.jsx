import { useEffect } from "react";

export default function Message({ message, randomPub, nearestPub, complete, loading, creditsMusic, setMessage, setLoading, setComplete, INITIAL_MAP_SETTINGS}) {
    const creditsBeatLength = 60000/122.36
    const creditsMessages =[
        '(Sound on!) Well, here we are at last...',
        'Just look at all those pubs...',
        'More to the point, think of all those drinks!',
        'It\'s been a long journey...',
        'But there\'s a whole world out there...',
        'What on earth have you been doing?!',
        'Why not go and explore somewhere else for a change?',
        'I hear there are some pretty nice pubs in Grantchester...',
        'And there might even be some further out than that...',
        'Hey, I can see my house from up here!',
        'Anyway, I hope you\'ve found a new pub or two you like...',
        'Or at least some you definitely won\'t be going back to...',
        'Looking at you, <insert soulless Greene King here>',
        'Either way, what a time you\'ve had...',
        'I\'m almost sad this is all over...',
        'But I\'m sure you\'ll find a new challenge!',
        'Hang on, my favourite bit\'s nearly coming up...',
        'You\'re gonna love it, I promise...',
        'Wait for it...',
        'Oops, not quite yet...',
        'Are you ready?',
        'Okay, here we go!!!',
        '🎷🐬 DoO dOo DoO dOo DoOoO dOo 🎷🐬',
    ]

    useEffect(() => {    
        if (randomPub) {
            setMessage(`How about... The ${randomPub.name}?`);
        } else if (nearestPub) {
            setMessage(`Your nearest pub is... The ${nearestPub.name}!`);
            setLoading(false);
        } else if (creditsMusic) {
            setMessage(null);
            setComplete(null);
            
            let timeout;
            for (let i = 0; i < creditsMessages.length; i++) {
                switch(true) {
                    case (i === 0):
                        timeout = 0;
                        break;
                    case (i === 3 ):
                        timeout += 17 * creditsBeatLength;
                        break;
                    case (i === 10 ):
                        timeout += 20 * creditsBeatLength;
                        break;
                    case (i === 21 ):
                        timeout += 8 * creditsBeatLength;
                        break;
                    case (i === 22 ):
                        timeout += 9 * creditsBeatLength;
                        break;
                    default:
                        timeout += 16 * creditsBeatLength;
                }
                setTimeout(() => {
                    setMessage(creditsMessages[i])
                }, timeout)
                if (i === creditsMessages.length - 1) {
                    setTimeout(() => {
                        setMessage(null);
                    }, timeout +  (3 * 16  + 15) * creditsBeatLength)
                    setTimeout(() => {
                        cancelCredits();
                        setComplete(null);
                        setMessage(null);
                        map.fitBounds(INITIAL_MAP_SETTINGS.bounds);
                (null);
                    }, timeout +  (7 * 16  + 15) * creditsBeatLength)
                }
            }
        } else if (complete) {
            setMessage(`Looks like you're all done... pub?`);
        } else if (loading) {
            setMessage(`Looking for your nearest pub...`);
        } else {
            setMessage(null);
        }

        if (!creditsMusic) {
            const messageTimeout = setTimeout(() => {
                setMessage(null);
                setComplete(null);
            }, 5000);    
            return () => {
                clearTimeout(messageTimeout);   
            };    
        }
        
    }, [randomPub, nearestPub, complete, loading, creditsMusic]);

    return (
        <div>
            {message && (
                <div className="absolute w-full flex justify-center text-center bottom-12 sm:top-12 sm:bottom-auto">
                    <div className="bg-amber-100 shadow m-8 py-2 px-4 z-30 rounded text-neutral-800 font-bold font-serif italic text-balance">
                        {message}
                    </div>
                </div>
            )}
        </div>
    );
}
