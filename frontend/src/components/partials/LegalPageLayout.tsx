import React, { useEffect } from "react";
import "../../pages/LegalLayout.css";

export interface LegalHighlight {
  icon: string;
  title: string;
  description: string;
}

export type LegalVariant = "privacy" | "cookies" | "terms" | "notice";

interface LegalPageLayoutProps {
  badge: string;
  badgeIcon?: string;
  variant?: LegalVariant;
  title: string;
  subtitle: string;
  lastUpdated?: string;
  highlights?: LegalHighlight[];
  htmlContent: string;
  contactEmail?: string;
}

export const LegalPageLayout: React.FC<LegalPageLayoutProps> = ({
  badge,
  badgeIcon = "🛡️",
  variant = "privacy",
  title,
  subtitle,
  lastUpdated = "Actualizado: Temporada 2026",
  highlights = [],
  htmlContent,
  contactEmail = "nano9gs@hotmail.es"
}) => {

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }, []);

  return (
    <div className={`legal-page-container legal-variant-${variant}`}>
      <div className="legal-content-wrapper">
        {/* Header Card */}
        <header className="legal-header-card">
          <div className="legal-header-top-bar">
            <div className="legal-badge-tag">
              <span className="legal-badge-icon" aria-hidden="true">{badgeIcon}</span>
              <span className="legal-badge-text">{badge}</span>
            </div>
            {lastUpdated && (
              <span className="legal-header-timestamp">{lastUpdated}</span>
            )}
          </div>
          <h1 className="legal-header-title">{title}</h1>
          <p className="legal-header-desc">{subtitle}</p>
        </header>

        {/* Highlighted Key Points */}
        {highlights.length > 0 && (
          <section className="legal-highlights-grid" aria-label="Puntos clave">
            {highlights.map((item, index) => (
              <div key={index} className={`legal-highlight-card legal-highlight-${variant}`}>
                <span className="legal-highlight-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <h3 className="legal-highlight-title">{item.title}</h3>
                <p className="legal-highlight-text">{item.description}</p>
              </div>
            ))}
          </section>
        )}


        {/* Detailed Document Body */}
        <article className="legal-body-card">
          <div
            className="legal-html-content"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          {/* Hotel Contact Box */}
          <aside className="legal-footer-contact">
            <div className="legal-footer-info">
              <h4>¿Tienes dudas sobre esta documentación?</h4>
              <p>
                El equipo de atención y cumplimiento de Hotel Aura de Mallorca responderá a todas tus solicitudes.
              </p>
            </div>
            <a
              href={`mailto:${contactEmail}`}
              className="legal-contact-btn"
              aria-label={`Contactar por correo electrónico a ${contactEmail}`}
            >
              <span>✉️</span>
              <span>Contactar Soporte</span>
            </a>
          </aside>
        </article>
      </div>
    </div>
  );
};
