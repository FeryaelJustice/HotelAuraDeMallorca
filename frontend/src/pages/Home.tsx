import './Home.css';
import { Parallax } from "react-parallax";
import Image from '/home-main.webp';
import Image2 from './../assets/images/castle-park-1920.webp';
import Image3 from './../assets/images/hotel-room-1920.webp';
import { useTranslation } from "react-i18next";

interface HomeProps {
    colorScheme: string;
}

/**
 * Pagina principal: Home
 * Que hace: Presenta la experiencia de bienvenida con efectos Parallax de fondo,
 * transiciones suaves y soporte multiidioma (i18n).
 * Por que: Es el escaparate visual de primer impacto que conduce a la reserva y exploracion de servicios.
 */
export const Home = ({ colorScheme }: HomeProps) => {
    // Dependencies
    const { t } = useTranslation();

    const scrollToNature = () => {
        const nextSection = document.getElementById('home-nature');
        if (nextSection) {
            nextSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <div>
            <Parallax strength={300} bgImage={Image}>
                <section className="content home-section" id="home" aria-label="Bienvenida Hotel Aura de Mallorca">
                    <div className="text-content" style={{ color: colorScheme === "dark" ? "#FFFFFF" : "#F7F7F7" }}>
                        {t("welcome")}
                    </div>
                    <button
                        type="button"
                        className="home-scroll-indicator"
                        onClick={scrollToNature}
                        aria-label="Desplazarse a la siguiente sección"
                    >
                        <div className="home-scroll-indicator-pill" aria-hidden="true">
                            <span className="home-scroll-indicator-dot" />
                        </div>
                        <span className="home-scroll-indicator-text">Descubre Aura</span>
                    </button>
                </section>
            </Parallax>
            <hr />
            <Parallax strength={300} bgImage={Image2}>
                <section className="content home-section" id="home-nature" aria-label="Entorno natural de Mallorca">
                    <div className="text-content">
                        {t("welcome_secondary")}
                    </div>
                </section>
            </Parallax>
            <hr />
            <Parallax strength={-600} bgImage={Image3}>
                <section className="content home-section" id="home-suites" aria-label="Habitaciones y confort de lujo">
                    <div className="text-content">
                        {t("welcome_tertiary")}
                    </div>
                </section>
            </Parallax>
        </div>
    );
};