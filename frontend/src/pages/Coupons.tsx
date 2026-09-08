import { useState, useEffect } from 'react';
import { Promotion } from '../models';
import serverAPI from '../services/serverAPI';
import { useTranslation } from 'react-i18next';
import { useCookies } from 'react-cookie';
import './Coupons.css';

interface CouponsProps {
    colorScheme: string;
    onOpenBookingModal?: (promoCode?: string) => void;
}

export const Coupons = ({ colorScheme, onOpenBookingModal }: CouponsProps) => {
    const { t } = useTranslation();
    const [cookies] = useCookies(['token']);
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });

        const fetchPromotions = async () => {
            let uidParam = '';
            if (cookies.token) {
                try {
                    const loggedRes = await serverAPI.post('/getLoggedUserID', { token: cookies.token });
                    if (loggedRes?.data?.userID) {
                        uidParam = `&userID=${loggedRes.data.userID}`;
                    }
                } catch (e) {
                    console.log('Error verifying session in coupons page:', e);
                }
            }

            try {
                const res = await serverAPI.get(`/promotions?visible=true${uidParam}`);
                const promos = res.data.data || [];
                const parsedPromos = promos.map((p: any) => new Promotion({
                    id: p.id,
                    code: p.code,
                    discount_price: p.discount_price,
                    name: p.name,
                    description: p.description,
                    start_date: p.start_date,
                    end_date: p.end_date,
                    is_active: p.is_active,
                    is_visible: p.is_visible,
                    is_user_exclusive: Boolean(p.is_user_exclusive),
                }));
                setPromotions(parsedPromos);
            } catch (err) {
                console.error('Error fetching visible promotions:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchPromotions();
    }, [cookies.token]);

    const handleCopy = (code: string) => {
        if (!code) return;
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => {
            setCopiedCode((prev) => (prev === code ? null : prev));
        }, 2500);
    };

    const handleApplyAndBook = (code: string) => {
        if (onOpenBookingModal) {
            onOpenBookingModal(code);
        }
    };

    const formatDate = (date: Date | null) => {
        if (!date) return 'Sin fecha límite';
        try {
            return new Intl.DateTimeFormat('es-ES', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
            }).format(new Date(date));
        } catch {
            return String(date);
        }
    };

    const isDark = colorScheme === 'dark';

    return (
        <div className={`coupons-page ${isDark ? 'coupons-page--dark' : 'coupons-page--light'}`}>
            {/* Hero Section */}
            <section className="coupons-hero">
                <div className="coupons-hero__badge">
                    <span>✨</span>
                    <span>Beneficios y Tarifas Especiales</span>
                </div>
                <h1 className="coupons-hero__title">
                    Cupones y Promociones Exclusivas
                </h1>
                <p className="coupons-hero__subtitle">
                    Descubre nuestras ventajas directas para tu estancia en Mallorca. Aplica estos códigos durante tu proceso de reserva o ingresa tu cupón privado.
                </p>
            </section>

            {/* Quick Guide Info Bar */}
            <div className="coupons-info-bar">
                <div className="coupons-info-bar__icon" aria-hidden="true">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="16" x2="12" y2="12" />
                        <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                </div>
                <p className="coupons-info-bar__text">
                    <strong>¿Cómo canjear tu cupón?</strong> Puedes pulsar en <em>"Reservar con este cupón"</em> para iniciar tu reserva de inmediato con el descuento preseleccionado, o copiar el código y seleccionarlo en el Paso 6 del asistente de reserva.
                </p>
            </div>

            {/* Coupons List */}
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                    <div className="spinner-border text-warning" role="status">
                        <span className="visually-hidden">Cargando cupones...</span>
                    </div>
                    <p style={{ marginTop: '1rem', opacity: 0.8 }}>Consultando promociones vigentes...</p>
                </div>
            ) : promotions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏷️</div>
                    <h3>No hay promociones públicas activas en este momento</h3>
                    <p style={{ opacity: 0.8, maxWidth: '500px', margin: '0.5rem auto 1.5rem' }}>
                        Pronto publicaremos nuevas ofertas de temporada. Si dispones de un código promocional privado o corporativo, puedes canjearlo directamente en el paso de pago de tu reserva.
                    </p>
                    {onOpenBookingModal && (
                        <button
                            type="button"
                            className="coupon-card__action-btn"
                            style={{ maxWidth: '280px', margin: '0 auto' }}
                            onClick={() => onOpenBookingModal()}
                        >
                            Comenzar Reserva
                        </button>
                    )}
                </div>
            ) : (
                <div className="coupons-grid">
                    {promotions.map((promo) => {
                        const isCopied = copiedCode === promo.code;
                        const discountDisplay = promo.discount_price
                            ? `${promo.discount_price}% DTO`
                            : 'Descuento Especial';

                        return (
                            <article key={promo.id || promo.code} className={`coupon-card ${promo.is_user_exclusive ? 'coupon-card--exclusive' : ''}`}>
                                <div>
                                    <div className="coupon-card__header">
                                        <span className="coupon-card__discount-tag">
                                            {discountDisplay}
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {promo.is_user_exclusive && (
                                                <span className="coupon-card__exclusive-pill">
                                                    ⭐ Solo para ti
                                                </span>
                                            )}
                                            <span className="coupon-card__status-pill">
                                                Vigente
                                            </span>
                                        </div>
                                    </div>

                                    <h2 className="coupon-card__title">
                                        {promo.name || 'Promoción Aura'}
                                    </h2>

                                    <p className="coupon-card__description">
                                        {promo.description || 'Disfruta de condiciones exclusivas en tu alojamiento en Hotel Aura de Mallorca.'}
                                    </p>

                                    <div className="coupon-card__code-box">
                                        <span className="coupon-card__code-text">
                                            {promo.code}
                                        </span>
                                        <button
                                            type="button"
                                            className={`coupon-card__copy-btn ${isCopied ? 'coupon-card__copy-btn--copied' : ''}`}
                                            onClick={() => handleCopy(promo.code || '')}
                                            aria-label={`Copiar código ${promo.code}`}
                                        >
                                            {isCopied ? (
                                                <>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="20 6 9 17 4 12" />
                                                    </svg>
                                                    ¡Copiado!
                                                </>
                                            ) : (
                                                <>
                                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                                    </svg>
                                                    Copiar
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    <div className="coupon-card__meta">
                                        <div className="coupon-card__meta-item">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                                <line x1="16" y1="2" x2="16" y2="6" />
                                                <line x1="8" y1="2" x2="8" y2="6" />
                                                <line x1="3" y1="10" x2="21" y2="10" />
                                            </svg>
                                            <span>Válido hasta: <strong>{formatDate(promo.end_date)}</strong></span>
                                        </div>
                                        <div className="coupon-card__meta-item">
                                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                                                <polyline points="22 4 12 14.01 9 11.01" />
                                            </svg>
                                            <span>Aplicable directamente sobre tarifa de habitación</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="coupon-card__action-btn"
                                    onClick={() => handleApplyAndBook(promo.code || '')}
                                >
                                    <span>Reservar con este cupón</span>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="5" y1="12" x2="19" y2="12" />
                                        <polyline points="12 5 19 12 12 19" />
                                    </svg>
                                </button>
                            </article>
                        );
                    })}
                </div>
            )}

            {/* Private & Loyalty Coupons Notice */}
            <aside className="coupon-private-notice">
                <h3 className="coupon-private-notice__title">
                    ¿Tienes un código privado o de fidelización?
                </h3>
                <p className="coupon-private-notice__text">
                    Si eres cliente recurrente, has recibido un cupón por correspondencia oficial o posees un código especial no listado públicamente, puedes escribirlo manualmente en el <strong>Paso 6 (Cupón de descuento)</strong> durante el proceso de reserva. El sistema lo validará y aplicará tu descuento al instante.
                </p>
                {onOpenBookingModal && (
                    <button
                        type="button"
                        className="btn btn-outline-warning"
                        style={{ borderRadius: '10px', fontWeight: 600, padding: '0.6rem 1.4rem' }}
                        onClick={() => onOpenBookingModal()}
                    >
                        Abrir Asistente de Reserva
                    </button>
                )}
            </aside>
        </div>
    );
};
export default Coupons;
