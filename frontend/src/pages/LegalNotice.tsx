import { useTranslation } from "react-i18next";
import { LegalPageLayout } from "../components/partials/LegalPageLayout";

export const LegalNotice = () => {
    const { t } = useTranslation();

    const highlights = [
        {
            icon: "🏛️",
            title: "Titularidad Oficial",
            description: "Establecimiento hotelero operado por Fernando González Serrano con sede en Pl. d'Espanya, Palma de Mallorca."
        },
        {
            icon: "📜",
            title: "Propiedad Intelectual",
            description: "Todos los contenidos, imágenes, marcas y diseños de la web están protegidos por la legislación española e internacional."
        },
        {
            icon: "📍",
            title: "Jurisdicción",
            description: "Sujeción plena a las normativas de las Illes Balears y tribunales de la ciudad de Palma de Mallorca."
        }
    ];

    return (
        <LegalPageLayout
            badge="Hotel Aura de Mallorca - Información Corporativa"
            badgeIcon="🏛️"
            variant="notice"
            title={t("legalNotice_title") || "Aviso Legal"}
            subtitle="Identificación oficial, titularidad y condiciones legales de navegación en nuestro portal web."
            highlights={highlights}
            htmlContent={t("legalNotice")}
            contactEmail="nano9gs@hotmail.es"
        />
    );
};

