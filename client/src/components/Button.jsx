export default function Button({ label, handleClickAction, style }) {
    let classes = "m-2 py-2 px-4 rounded";
    if (style === "brown") {
        classes +=
            " bg-yellow-700 hover:bg-yellow-900 focus:bg-yellow-700 active:bg-yellow-900";
    } else {
        classes +=
            " bg-gray-500 hover:bg-gray-700 focus:bg-gray-500 active:bg-gray-700";
    }

    return (
        <button className={classes} onClick={handleClickAction}>
            {label}
        </button>
    );
}
