export default function Button({ label, handleClickAction, style }) {
    let classes = "m-2 py-2 px-4 rounded";
    if (style === "brown") {
        classes +=
            " bg-yellow-900 active:bg-yellow-950";
    } else {
        classes +=
            " bg-gray-400 active:bg-gray-600";
    }

    return (
        <button className={classes} onClick={handleClickAction}>
            {label}
        </button>
    );
}
