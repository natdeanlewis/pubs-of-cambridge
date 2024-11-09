export default function Button({ label, handleClickAction, style }) {
    let classes = "m-2 py-2 px-4 rounded";
    if (style === "brown") {
        classes += " bg-yellow-700 hover:bg-yellow-900";
    } else {
        classes += " bg-gray-500 hover:bg-gray-700";
    }

    return (
        <button className={classes} onClick={handleClickAction}>
            {label}
        </button>
    );
}
