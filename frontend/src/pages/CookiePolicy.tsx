import { useTranslation } from "react-i18next";
import { LegalPageLayout } from "../components/partials/LegalPageLayout";

export const CookiePolicy = () => {
    const { t } = useTranslation();

    const highlights = [
        {
            icon: "🍪",
            title: "Cookies Esenciales",
            description: "Garantizan la correcta navegación, seguridad de sesión y gestión de tus reservas hoteleras."
        },
        {
            icon: "⚙️",
            title: "Control Personalizado",
            description: "Puedes configurar tus preferencias o revocar el consentimiento cuando desees desde tu navegador o nuestro panel."
        },
        {
            icon: "📊",
            title: "Rendimiento y Experiencia",
            description: "Nos ayudan a mejorar la velocidad y la ergonomía del portal para que tu experiencia sea fluida."
        }
    ];

    return (
        <LegalPageLayout
            badge="Hotel Aura de Mallorca - Transparencia Digital"
            badgeIcon="🍪"
            variant="cookies"
            title={t("cookiePolicy_title") || "Política de Cookies"}
            subtitle="Información detallada sobre las tecnologías de rastreo y almacenamiento empleadas en nuestro portal."
            highlights={highlights}
            htmlContent={t("cookiePolicy")}
            contactEmail="nano9gs@hotmail.es"
        />
    );
};

