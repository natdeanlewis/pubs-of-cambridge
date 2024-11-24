export default function Music({ id, loop, src }) {
    return (
        <audio id={id} loop>
            <source src={src} />
        </audio>
    );
}
