import { useTranslation } from "react-i18next";
import { LegalPageLayout } from "../components/partials/LegalPageLayout";

export const TermsOfUse = () => {
    const { t } = useTranslation();

    const highlights = [
        {
            icon: "🛎️",
            title: "Reservas Garantizadas",
            description: "Condiciones de reserva transparentes, disponibilidad en tiempo real y plazo de cancelación de 24 horas."
        },
        {
            icon: "🎁",
            title: "Club de Fidelización",
            description: "Ventajas exclusivas y códigos de 50% de descuento personal tras completar 5 o más estancias."
        },
        {
            icon: "⚖️",
            title: "Marco Legal y Respeto",
            description: "Compromiso de uso responsable de la plataforma y jurisdicción oficial conforme a las leyes españolas."
        }
    ];

    return (
        <LegalPageLayout
            badge="Hotel Aura de Mallorca - Términos y Condiciones"
            badgeIcon="📜"
            variant="terms"
            title={t("termsOfUse_title") || "Términos de Uso"}
            subtitle="Pautas, derechos y compromisos para disfrutar de nuestros servicios y estancias con total tranquilidad."
            highlights={highlights}
            htmlContent={t("termsOfUse")}
            contactEmail="nano9gs@hotmail.es"
        />
    );
};

