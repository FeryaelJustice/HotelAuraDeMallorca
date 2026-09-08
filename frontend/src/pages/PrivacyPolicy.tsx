import { useTranslation } from "react-i18next";
import { LegalPageLayout } from "../components/partials/LegalPageLayout";

export const PrivacyPolicy = () => {
    const { t } = useTranslation();

    const highlights = [
        {
            icon: "🔒",
            title: "Protección RGPD",
            description: "Tus datos personales y de reserva son tratados con los más altos estándares de seguridad y confidencialidad."
        },
        {
            icon: "💳",
            title: "Pagos 100% Seguros",
            description: "Procesamiento cifrado a través de pasarelas seguras para garantizar la total privacidad de tus transacciones."
        },
        {
            icon: "⚖️",
            title: "Tus Derechos",
            description: "Acceso, rectificación o cancelación de datos en cualquier momento mediante solicitud a nuestro delegado de privacidad."
        }
    ];

    return (
        <LegalPageLayout
            badge="Hotel Aura de Mallorca - Cumplimiento Legal"
            badgeIcon="🔒"
            variant="privacy"
            title={t("privacyPolicy_title") || "Política de Privacidad"}
            subtitle="Conoce con total claridad cómo gestionamos y protegemos tus datos durante tu estancia y navegación."
            highlights={highlights}
            htmlContent={t("privacyPolicy")}
            contactEmail="nano9gs@hotmail.es"
        />
    );
};

