import BaseModal from './BaseModal';
import './TechStackModal.css';

interface TechStackModalProps {
    show: boolean;
    onClose: () => void;
    colorScheme: string;
}

export const TechStackModal = ({ show, onClose, colorScheme }: TechStackModalProps) => {
    const cardThemeClass = colorScheme === 'dark' ? 'tech-card-dark' : 'tech-card-light';

    return (
        <BaseModal title="Arquitectura Técnica & Stack - Hotel Aura de Mallorca" show={show} onClose={onClose}>
            <div style={{ maxHeight: '72vh', overflowY: 'auto', paddingRight: '4px' }}>
                <p style={{ fontSize: '0.95rem', opacity: 0.9, marginBottom: '16px' }}>
                    Proyecto Full-Stack diseñado para un resort de lujo en Mallorca, integrando validación meteorológica en tiempo real, pasarela de pago segura y gestión de reservas en modales interactivos.
                </p>

                <div className="tech-modal-grid">
                    {/* Frontend */}
                    <div className={`tech-card ${cardThemeClass}`}>
                        <h4>
                            <span role="img" aria-label="Frontend">💻</span>
                            Frontend SPA
                        </h4>
                        <div className="tech-badges">
                            <span className="tech-badge">React 19</span>
                            <span className="tech-badge">TypeScript</span>
                            <span className="tech-badge">Vite</span>
                            <span className="tech-badge">React Router 7</span>
                            <span className="tech-badge">Bootstrap 5</span>
                            <span className="tech-badge">i18next</span>
                        </div>
                        <p>
                            Arquitectura modular orientada a componentes, tipado estricto con TypeScript, internacionalización multilingüe (ES/EN/CA/DE), modo oscuro/claro reactivo y optimización de assets con Vite.
                        </p>
                    </div>

                    {/* Backend */}
                    <div className={`tech-card ${cardThemeClass}`}>
                        <h4>
                            <span role="img" aria-label="Backend">⚙️</span>
                            Backend & API REST
                        </h4>
                        <div className="tech-badges">
                            <span className="tech-badge">Node.js</span>
                            <span className="tech-badge">Express</span>
                            <span className="tech-badge">JWT</span>
                            <span className="tech-badge">bcrypt</span>
                            <span className="tech-badge">Multer</span>
                        </div>
                        <p>
                            API RESTful modularizada con autenticación mediante JSON Web Tokens (JWT), encriptación segura de contraseñas, control de acceso basado en roles (RBAC) y gestión de ficheros multimedia.
                        </p>
                    </div>

                    {/* Base de Datos */}
                    <div className={`tech-card ${cardThemeClass}`}>
                        <h4>
                            <span role="img" aria-label="Base de datos">🗄️</span>
                            Base de Datos
                        </h4>
                        <div className="tech-badges">
                            <span className="tech-badge">MySQL</span>
                            <span className="tech-badge">MariaDB</span>
                            <span className="tech-badge">Diagrama E-R</span>
                            <span className="tech-badge">Seeds & Migrations</span>
                        </div>
                        <p>
                            Modelo relacional normalizado que gestiona usuarios, reservas, habitaciones, planes (VIP/Básico), servicios adicionales, métodos de pago y registros históricos del clima balear.
                        </p>
                    </div>

                    {/* Integraciones */}
                    <div className={`tech-card ${cardThemeClass}`}>
                        <h4>
                            <span role="img" aria-label="Integraciones">⚡</span>
                            Integraciones Externas
                        </h4>
                        <div className="tech-badges">
                            <span className="tech-badge">Stripe Elements</span>
                            <span className="tech-badge">AccuWeather API</span>
                            <span className="tech-badge">OpenWeatherMap</span>
                            <span className="tech-badge">QR Code</span>
                        </div>
                        <p>
                            Procesamiento de pagos online seguro con Stripe, doble proveedor meteorológico para verificación predictiva de clima al reservar, y generación de pases digitales de check-in con código QR.
                        </p>
                    </div>

                    {/* Infraestructura */}
                    <div className={`tech-card ${cardThemeClass}`}>
                        <h4>
                            <span role="img" aria-label="DevOps">🚀</span>
                            DevOps & Despliegue
                        </h4>
                        <div className="tech-badges">
                            <span className="tech-badge">Linux VPS</span>
                            <span className="tech-badge">Apache Reverse Proxy</span>
                            <span className="tech-badge">PM2</span>
                            <span className="tech-badge">SSL Let's Encrypt</span>
                        </div>
                        <p>
                            Configuración de servidor Linux en producción, gestión de procesos con PM2, proxy inverso mediante Apache VirtualHost con redirección HTTPS obligatoria y compresión HTTP.
                        </p>
                    </div>

                    {/* UX & Accesibilidad */}
                    <div className={`tech-card ${cardThemeClass}`}>
                        <h4>
                            <span role="img" aria-label="Accesibilidad">🎨</span>
                            UI/UX & Accesibilidad
                        </h4>
                        <div className="tech-badges">
                            <span className="tech-badge">WCAG 2.2 AA</span>
                            <span className="tech-badge">WebAIM Checked</span>
                            <span className="tech-badge">Mobile First</span>
                            <span className="tech-badge">Parallax</span>
                        </div>
                        <p>
                            Contrastes cromáticos certificados con WebAIM Contrast Checker, soporte completo para lectores de pantalla mediante ARIA, stepper interactivo de reserva y experiencia inmersiva con sonido ambiental balear.
                        </p>
                    </div>
                </div>
            </div>
        </BaseModal>
    );
};

export default TechStackModal;
