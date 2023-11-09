import './Home.css';
import { Parallax } from "react-parallax";
import Image from './../assets/images/pexels-maria-orlova-garden.webp'
import Image2 from './../assets/images/castle-park-1920.webp'
import Image3 from './../assets/images/hotel-room-1920.webp'
import { useTranslation } from "react-i18next";

interface HomeProps {
    colorScheme: string,
}

export const Home = ({ colorScheme }: HomeProps) => {

    console.log(colorScheme)

    // Get env variables nativa de vite pero es SOLO para react
    // console.log(import.meta.env)
    const { t } = useTranslation();
    return (
        <div>
            <Parallax strength={300} bgImage={Image}>
                <div className="content" id='home'>
                    <div className="text-content">
                        {t("welcome")}
                    </div>
                </div>
            </Parallax>
            <hr />
            <Parallax strength={300} bgImage={Image2}>
                <div className="content" id='home'>
                    <div className="text-content">
                        {t("welcome_secondary")}
                    </div>
                </div>
            </Parallax>
            <hr />
            <Parallax strength={-600} bgImage={Image3}>
                <div className="content" id='home'>
                    <div className="text-content">
                        {t("welcome_tertiary")}
                    </div>
                </div>
            </Parallax>
        </div>
    );
}