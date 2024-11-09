export default function Total({ pubs, visitedPubs }) {
    return (
        <div>
            {pubs.length > 0 && (
                <p className="m-2 text-white font-bold bg-yellow-700 py-2 px-4 rounded font-serif">
                    <span className="italic">
                        {visitedPubs.length}/{pubs.length}
                    </span>
                    {visitedPubs.length === pubs.length ? " 🥳" : " 🍻"}
                </p>
            )}
        </div>
    );
}
