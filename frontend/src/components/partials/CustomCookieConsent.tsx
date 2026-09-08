import CookieConsent from 'react-cookie-consent';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './CustomCookieConsent.css';

interface CustomCookieConsentProps {
    colorScheme: string;
}

export const CustomCookieConsent = ({ colorScheme }: CustomCookieConsentProps) => {
    const { t } = useTranslation();

    return (
        <CookieConsent
            location="none"
            cookieName="cookieConsent"
            enableDeclineButton
            buttonText="Aceptar todas"
            declineButtonText="Rechazar"
            disableStyles={true}
            containerClasses={`cookie-card-container ${colorScheme === 'dark' ? 'cookie-card-dark' : 'cookie-card-light'}`}
            contentClasses="cookie-card-content"
            buttonWrapperClasses="cookie-card-actions"
            buttonClasses="cookie-btn cookie-btn-accept"
            declineButtonClasses="cookie-btn cookie-btn-decline"
            expires={150}
            ariaAcceptLabel="Aceptar cookies para el sitio web"
            ariaDeclineLabel="Rechazar cookies no esenciales"
        >
            <div className="cookie-card-header">
                <span role="img" aria-label="Cookie">🍪</span>
                <span>Privacidad y Cookies</span>
            </div>
            <p className="cookie-card-text">
                {process.env.APP_NAME || 'Hotel Aura de Mallorca'} utiliza cookies técnicas para la gestión segura de reservas y para brindarte una estancia digital personalizada.
            </p>
            <NavLink to="/cookies-policy" className="cookie-card-link">
                {t("cookiePolicy_title") || "Política de cookies"}
            </NavLink>
        </CookieConsent>
    );
};

export default CustomCookieConsent;
