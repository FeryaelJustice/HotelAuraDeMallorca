import './Home.css';
import { Parallax } from "react-parallax";
import Image from './../assets/images/pexels-maria-orlova-garden.webp'
import Image2 from './../assets/images/castle-park-1920.webp'
import Image3 from './../assets/images/hotel-room-1920.webp'

export function Home() {
    // Get env variables nativa de vite pero es SOLO para react
    console.log(import.meta.env)
    return (
        <div>
            <Parallax strength={300} bgImage={Image}>
                <div className="content" id='home'>
                    <div className="text-content">
                        Welcome to Aura de Mallorca
                    </div>
                </div>
            </Parallax>
            <hr />
            <Parallax strength={300} bgImage={Image2}>
                <div className="content" id='home'>
                    <div className="text-content">
                        Welcome
                    </div>
                </div>
            </Parallax>
            <hr />
            <Parallax strength={-600} bgImage={Image3}>
                <div className="content" id='home'>
                    <div className="text-content">
                        to Aura de Mallorca
                    </div>
                </div>
            </Parallax>
        </div>
    );
}