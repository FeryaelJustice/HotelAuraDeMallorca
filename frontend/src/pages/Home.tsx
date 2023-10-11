import './Home.css';
import { Parallax } from "react-parallax";
import Image from './../assets/images/pexels-maria-orlova-garden.webp'

export function Home() {
    // Get env variables nativa de vite pero es SOLO para react
    console.log(import.meta.env)
    return (
        <div>
            <Parallax strength={600} bgImage={Image}>
                <div className="content" id='home'>
                    <div className="text-content">
                        Welcome to Aura de Mallorca                    </div>
                </div>
            </Parallax>
            <br />
            Server is running in {import.meta.env.MODE}
        </div>
    );
}