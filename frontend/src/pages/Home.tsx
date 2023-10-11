export function Home() {
    // Get env variables nativa de vite pero es SOLO para react
    console.log(import.meta.env)
    return (
        <div>
            Home
            <br />
            Server is running in {import.meta.env.MODE}
        </div>
    );
}