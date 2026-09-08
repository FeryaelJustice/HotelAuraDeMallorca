import { useTranslation } from "react-i18next";
import { NavLink } from "react-router-dom";
import "./Footer.css";

interface FooterProps {
    colorScheme: string;
    onOpenTechModal?: () => void;
}

export const Footer = ({ colorScheme, onOpenTechModal }: FooterProps) => {
    const { t } = useTranslation();
    const isDark = colorScheme === "dark";
    const currentYear = new Date().getFullYear();

    return (
        <footer
            id="footer"
            className={`site-footer ${isDark ? "site-footer--dark" : "site-footer--light"}`}
            role="contentinfo"
            aria-label="Pie de página de Hotel Aura de Mallorca"
        >
            <div className="site-footer__container">
                {process.env.IS_PRODUCTION !== 'true' && (
                    <div
                        className="site-footer__portfolio-disclaimer"
                        role="alert"
                        style={{
                            backgroundColor: '#fee2e2',
                            color: '#991b1b',
                            border: '2px solid #ef4444',
                            borderRadius: '12px',
                            padding: '1.25rem 1.5rem',
                            marginBottom: '2.5rem',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '1rem',
                            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.15)',
                        }}
                    >
                        <div style={{ fontSize: '1.75rem', lineHeight: 1, flexShrink: 0 }}>⚠️</div>
                        <div style={{ fontSize: '0.92rem', lineHeight: 1.55 }}>
                            <strong style={{ display: 'block', fontSize: '1.05rem', marginBottom: '0.35rem', color: '#7f1d1d' }}>
                                Aviso de Demostración Técnica y Portafolio Profesional - Fernando González Serrano
                            </strong>
                            Este sitio web es una muestra interactiva para el portafolio profesional de <strong>Fernando González Serrano</strong>. El <em>Hotel Aura de Mallorca</em> es un establecimiento ficticio concebido con fines demostrativos, si bien toda la plataforma (frontend, backend, base de datos y pasarelas de pago) está completamente optimizada y lista para producción (<em>production-ready</em>). Puedes probar el proceso de reserva con total libertad: cualquier pago simulado o transacción mediante Stripe es de prueba y 100% reembolsable.
                        </div>
                    </div>
                )}
                <div className="site-footer__grid">
                    {/* Columna 1: Identidad & Compromiso Hotelero */}
                    <div className="site-footer__grid-col site-footer__brand">
                        <NavLink
                            to="/"
                            className="site-footer__logo-link"
                            aria-label="Ir a la página de inicio de Hotel Aura de Mallorca"
                        >
                            <img
                                src={isDark ? "/logo-dark-mode.svg" : "/logo.svg"}
                                alt="Hotel Aura de Mallorca"
                                className="site-footer__logo-img"
                                width="250"
                                height="40"
                                loading="lazy"
                            />
                        </NavLink>

                        <div className="site-footer__badge-wrapper" aria-label="Hotel 4 estrellas superior boutique en Mallorca">
                            <span className="site-footer__stars" aria-hidden="true">
                                {[...Array(5)].map((_, i) => (
                                    <svg
                                        key={i}
                                        className="site-footer__star-icon"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </span>
                            <span>Boutique & Spa Retreat</span>
                        </div>

                        <p className="site-footer__description">
                            {t("footer_description")}
                        </p>

                        <div className="site-footer__trust-pill">
                            <span aria-hidden="true">✨</span>
                            <span>Hospitalidad Balear & Compromiso Sostenible</span>
                        </div>
                    </div>

                    {/* Columna 2: Navegación & Experiencias */}
                    <nav className="site-footer__grid-col site-footer__nav-col" aria-label="Navegación del pie de página">
                        <h3 className="site-footer__heading">Explorar</h3>
                        <ul className="site-footer__nav-list">
                            <li>
                                <NavLink to="/" className="site-footer__nav-link">
                                    <span className="site-footer__link-bullet" aria-hidden="true">→</span>
                                    <span>{t("home")}</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/services" className="site-footer__nav-link">
                                    <span className="site-footer__link-bullet" aria-hidden="true">→</span>
                                    <span>{t("services")}</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/cupones" className="site-footer__nav-link">
                                    <span className="site-footer__link-bullet" aria-hidden="true">→</span>
                                    <span>{t("coupons")}</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/user-bookings" className="site-footer__nav-link">
                                    <span className="site-footer__link-bullet" aria-hidden="true">→</span>
                                    <span>{t("bookings")}</span>
                                </NavLink>
                            </li>
                            <li>
                                <NavLink to="/contact" className="site-footer__nav-link">
                                    <span className="site-footer__link-bullet" aria-hidden="true">→</span>
                                    <span>{t("contact")}</span>
                                </NavLink>
                            </li>
                        </ul>
                    </nav>

                    {/* Columna 3: Conserjería & Contacto Directo */}
                    <div className="site-footer__grid-col site-footer__contact-col">
                        <h3 className="site-footer__heading">{t("footer_contact") || "Atención & Reservas"}</h3>
                        <address className="site-footer__contact-address" style={{ fontStyle: "normal" }}>
                            <ul className="site-footer__contact-list">
                                <li className="site-footer__contact-item">
                                    <div className="site-footer__contact-icon-box" aria-hidden="true">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                        </svg>
                                    </div>
                                    <div className="site-footer__contact-details">
                                        <span className="site-footer__contact-label">{t("footer_callus")}</span>
                                        <a href="tel:+34123456789" className="site-footer__contact-link">
                                            +34 123 456 789
                                        </a>
                                    </div>
                                </li>

                                <li className="site-footer__contact-item">
                                    <div className="site-footer__contact-icon-box" aria-hidden="true">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                                        </svg>
                                    </div>
                                    <div className="site-footer__contact-details">
                                        <span className="site-footer__contact-label">WhatsApp</span>
                                        <a
                                            href="https://api.whatsapp.com/send?phone=34123456789"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="site-footer__contact-link"
                                        >
                                            {t("footer_sendmsg")}
                                        </a>
                                        <span className="site-footer__live-badge">
                                            <span className="site-footer__pulse-dot" aria-hidden="true"></span>
                                            Atención 24/7
                                        </span>
                                    </div>
                                </li>

                                <li className="site-footer__contact-item">
                                    <div className="site-footer__contact-icon-box" aria-hidden="true">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <rect width="20" height="16" x="2" y="4" rx="2" />
                                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                                        </svg>
                                    </div>
                                    <div className="site-footer__contact-details">
                                        <span className="site-footer__contact-label">Email Oficial</span>
                                        <a href="mailto:contact@feryaeljustice.dev" className="site-footer__contact-link">
                                            contact@feryaeljustice.dev
                                        </a>
                                    </div>
                                </li>

                                <li className="site-footer__contact-item">
                                    <div className="site-footer__contact-icon-box" aria-hidden="true">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                                            <circle cx="12" cy="10" r="3" />
                                        </svg>
                                    </div>
                                    <div className="site-footer__contact-details">
                                        <span className="site-footer__contact-label">Ubicación</span>
                                        <span className="site-footer__contact-text">
                                            Pl. d'Espanya, Palma de Mallorca, España
                                        </span>
                                    </div>
                                </li>
                            </ul>
                        </address>
                    </div>

                    {/* Columna 4: Destacados de Experiencia & Horarios */}
                    <div className="site-footer__grid-col site-footer__features-col">
                        <h3 className="site-footer__heading">Experiencia Aura</h3>
                        <ul className="site-footer__features-list">
                            <li className="site-footer__feature-item">
                                <svg className="site-footer__feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                </svg>
                                <span>Spa & Tratamientos de Bienestar</span>
                            </li>
                            <li className="site-footer__feature-item">
                                <svg className="site-footer__feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                                <span>Suites con Vistas Mediterráneas</span>
                            </li>
                            <li className="site-footer__feature-item">
                                <svg className="site-footer__feature-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3" />
                                </svg>
                                <span>Gastronomía & Coctelería de Autor</span>
                            </li>
                        </ul>

                        <div className="site-footer__schedule-box">
                            <div className="site-footer__schedule-title">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                    <circle cx="12" cy="12" r="10" />
                                    <polyline points="12 6 12 12 16 14" />
                                </svg>
                                <span>Horarios de Estancia</span>
                            </div>
                            <div>Check-in: 15:00h | Check-out: 12:00h</div>
                            <div>Recepción y Conserjería 24 Horas</div>
                        </div>
                    </div>
                </div>

                {/* Sub-Footer / Bottom Bar: Copyright, Legal & Tech Stack */}
                <div className="site-footer__bottom">
                    <p className="site-footer__copyright">
                        © {currentYear} {process.env.APP_NAME || "Hotel Aura de Mallorca"}. Todos los derechos reservados.
                    </p>

                    <div className="site-footer__legal-nav">
                        <NavLink to="/privacy-policy" className="site-footer__legal-link">
                            {t("privacyPolicy_title")}
                        </NavLink>
                        <NavLink to="/legal-notice" className="site-footer__legal-link">
                            {t("legalNotice_title")}
                        </NavLink>
                        <NavLink to="/cookies-policy" className="site-footer__legal-link">
                            {t("cookiePolicy_title")}
                        </NavLink>
                        <NavLink to="/terms-of-use" className="site-footer__legal-link">
                            {t("termsOfUse_title")}
                        </NavLink>

                        {onOpenTechModal && (
                            <button
                                type="button"
                                onClick={onOpenTechModal}
                                className="site-footer__tech-btn"
                                title="Ver arquitectura técnica del proyecto para portafolio"
                                aria-label="Abrir modal de arquitectura técnica del proyecto"
                            >
                                <span aria-hidden="true">⚡</span>
                                <span>Tech Stack</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </footer>
    );
};