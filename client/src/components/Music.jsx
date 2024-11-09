export default function Music({ id, loop, src }) {
    return (
        <audio id={id} loop={loop ? true : undefined}>
            <source src={src} />
        </audio>
    );
}
