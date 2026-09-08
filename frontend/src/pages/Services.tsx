import { useState, useEffect, useMemo } from 'react';
import { Service, Promotion } from '../models';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';
import { API_URL_BASE } from './../services/consts';
import serverAPI from './../services/serverAPI';
import { useTranslation } from "react-i18next";
import { useCookies } from 'react-cookie';
import BackgroundImage from './../assets/images/services.webp';

interface ServicesProps {
    colorScheme: string;
    openImagePreviewModal: (imageSrc: string, title: string, description: string) => void;
    onOpenBookingModal?: (promoCode?: string) => void;
}

// In-memory cache for services page
let cachedServicesWithImages: Service[] | null = null;

export const Services = ({ colorScheme, openImagePreviewModal, onOpenBookingModal }: ServicesProps) => {
    // Dependencies
    const { t } = useTranslation();
    const [cookies] = useCookies(['token']);
    const [services, setServices] = useState<Service[]>(() => cachedServicesWithImages || []);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [userExclusivePromo, setUserExclusivePromo] = useState<Promotion | null>(null);

    // Consulta de cupón exclusivo del usuario logueado
    useEffect(() => {
        if (!cookies.token) {
            setUserExclusivePromo(null);
            return;
        }

        serverAPI.post('/getLoggedUserID', { token: cookies.token })
            .then(userRes => {
                const uid = userRes?.data?.userID;
                if (!uid) return;
                return serverAPI.get(`/promotions?visible=true&userID=${uid}`);
            })
            .then(promoRes => {
                if (promoRes?.data?.data) {
                    const promos = promoRes.data.data;
                    const exclusive = promos.find((p: any) => p.is_user_exclusive === 1 || p.is_user_exclusive === true);
                    if (exclusive) {
                        setUserExclusivePromo(new Promotion({
                            id: exclusive.id,
                            code: exclusive.code,
                            discount_price: exclusive.discount_price,
                            name: exclusive.name,
                            description: exclusive.description,
                            start_date: exclusive.start_date,
                            end_date: exclusive.end_date,
                            is_active: exclusive.is_active,
                            is_visible: exclusive.is_visible,
                            is_user_exclusive: true,
                        }));
                    }
                }
            })
            .catch(err => {
                console.log('Error checking user exclusive promotions in Services:', err);
            });
    }, [cookies.token]);

    useEffect(() => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });

        if (cachedServicesWithImages && cachedServicesWithImages.length > 0) {
            setServices(cachedServicesWithImages);
            return;
        }

        serverAPI.get('/services').then(res => {
            const servicess = res.data.data;
            const retrievedServices: Service[] = [];
            servicess.forEach((service: any) => {
                retrievedServices.push(new Service({
                    id: service.id,
                    name: service.serv_name,
                    description: service.serv_description,
                    price: service.serv_price,
                    availabilityStart: new Date(service.serv_availability_start),
                    availabilityEnd: new Date(service.serv_availability_end),
                    imageURL: null
                }));
            });
            setServices(retrievedServices);

            // Get and set services images
            serverAPI.post('/servicesImages', { services: servicess }).then(resImg => {
                const responseData = resImg.data.data;

                setServices((prevServices) => {
                    const withImages = prevServices.map((service) => {
                        const matchingData = responseData.find((data: any) => data.serviceID === service.id);
                        if (matchingData) {
                            const media = matchingData.mediaURL || "";
                            const fullURL = media.startsWith("http://") || media.startsWith("https://") ? media : API_URL_BASE + "/" + media;
                            return { ...service, imageURL: fullURL };
                        }
                        return service;
                    });
                    cachedServicesWithImages = withImages;
                    return withImages;
                });
            }).catch(err => { console.log(err); });
        }).catch(err => console.log(err));
    }, []);

    const categories = [
        { id: 'all', label: 'Todos los servicios' },
        { id: 'bienestar', label: 'Bienestar & Spa' },
        { id: 'fitness', label: 'Fitness & Deporte' },
        { id: 'exteriores', label: 'Jardines & Piscina' },
        { id: 'confort', label: 'Confort & Tecnología' }
    ];

    const isServiceInCategory = (service: Service, categoryId: string) => {
        const text = `${service.name || ''} ${service.description || ''}`.toLowerCase();
        if (categoryId === 'bienestar') {
            return text.includes('spa') || text.includes('wellness') || text.includes('thermal') || text.includes('sauna') || text.includes('masaje') || text.includes('relax');
        }
        if (categoryId === 'fitness') {
            return text.includes('gym') || text.includes('fitness') || text.includes('entren') || text.includes('trainer') || text.includes('sport') || text.includes('deporte');
        }
        if (categoryId === 'exteriores') {
            return text.includes('garden') || text.includes('jardín') || text.includes('jardin') || text.includes('pool') || text.includes('piscina') || text.includes('cabana');
        }
        if (categoryId === 'confort') {
            return text.includes('wi-fi') || text.includes('wifi') || text.includes('internet') || text.includes('fiber') || text.includes('fibra') || text.includes('tecnolog') || text.includes('confort');
        }
        return false;
    };

    const categoryCounts = useMemo(() => {
        const counts: Record<string, number> = { all: services.length };
        categories.forEach(cat => {
            if (cat.id === 'all') return;
            counts[cat.id] = services.filter(service => isServiceInCategory(service, cat.id)).length;
        });
        return counts;
    }, [services]);

    const filteredServices = useMemo(() => {
        if (selectedCategory === 'all') return services;
        return services.filter((service) => isServiceInCategory(service, selectedCategory));
    }, [services, selectedCategory]);

    return (
        <div className='servicesPage'>
            <div className='servicesPageBg' style={{ backgroundImage: `url(${BackgroundImage})` }} />
            <div className='servicesPageContent'>
                <Container>
                    <Row className="mt-12">
                        <Col>
                            <h1 className='servicesPageTitle' style={{ backgroundColor: colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)', border: '1px groove #0ffff0', padding: '10px', color: colorScheme === 'dark' ? '#ffffff' : '#000000' }}>{t("services_title")}</h1>
                        </Col>
                    </Row>

                    {/* Banner promocional exclusivo: Solo visible para usuario con cupon activo asignado */}
                    {userExclusivePromo && (
                        <div
                            style={{
                                margin: '20px 0 10px 0',
                                padding: '18px 22px',
                                borderRadius: '16px',
                                background: colorScheme === 'dark'
                                    ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(19, 27, 46, 0.95) 100%)'
                                    : 'linear-gradient(135deg, rgba(217, 119, 6, 0.12) 0%, #ffffff 100%)',
                                border: '1.5px solid #f59e0b',
                                boxShadow: '0 8px 24px rgba(245, 158, 11, 0.2)',
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '16px',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ fontSize: '2rem' }}>🎁</div>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span
                                            style={{
                                                fontSize: '0.72rem',
                                                fontWeight: 800,
                                                padding: '3px 9px',
                                                borderRadius: '9999px',
                                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                                color: '#ffffff',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.04em',
                                                boxShadow: '0 2px 6px rgba(16, 185, 129, 0.35)',
                                            }}
                                        >
                                            ⭐ Solo para ti
                                        </span>
                                        <span
                                            style={{
                                                fontSize: '0.8rem',
                                                fontWeight: 700,
                                                color: '#f59e0b',
                                            }}
                                        >
                                            -{userExclusivePromo.discount_price}% de Descuento
                                        </span>
                                    </div>
                                    <h3 style={{ margin: '0 0 2px 0', fontSize: '1.15rem', fontWeight: 800, color: colorScheme === 'dark' ? '#f8fafc' : '#0f172a' }}>
                                        {userExclusivePromo.name || 'Promoción Personal Exclusiva'}
                                    </h3>
                                    <p style={{ margin: 0, fontSize: '0.88rem', opacity: 0.85, color: colorScheme === 'dark' ? '#cbd5e1' : '#475569' }}>
                                        {userExclusivePromo.description || `Aprovecha tu código exclusivo ${userExclusivePromo.code} al reservar tu próxima estancia.`}
                                    </p>
                                </div>
                            </div>

                            {onOpenBookingModal && (
                                <Button
                                    variant="primary"
                                    onClick={() => onOpenBookingModal(userExclusivePromo.code || '')}
                                    style={{
                                        fontWeight: 700,
                                        padding: '10px 22px',
                                        borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                                        border: 'none',
                                        color: '#ffffff',
                                        boxShadow: '0 4px 14px rgba(217, 119, 6, 0.35)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    Reservar con mi Cupón ({userExclusivePromo.code}) →
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Category Filter Pills */}
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '10px',
                            margin: '20px 0 30px 0',
                            justifyContent: 'flex-start'
                        }}
                        role="tablist"
                        aria-label="Filtro de categorías de servicios"
                    >
                        {categories.map((cat) => {
                            const isSelected = selectedCategory === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={isSelected}
                                    onClick={() => setSelectedCategory(cat.id)}
                                    style={{
                                        padding: '8px 18px',
                                        borderRadius: '25px',
                                        border: isSelected ? '2px solid #0ffff0' : '1px solid rgba(255, 255, 255, 0.4)',
                                        backgroundColor: isSelected ? 'rgba(0, 0, 0, 0.9)' : 'rgba(0, 0, 0, 0.55)',
                                        color: isSelected ? '#0ffff0' : '#ffffff',
                                        fontWeight: isSelected ? '700' : '500',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease',
                                        backdropFilter: 'blur(8px)',
                                        boxShadow: isSelected ? '0 0 12px rgba(15, 255, 240, 0.35)' : 'none'
                                    }}
                                >
                                    {cat.label} <span style={{ opacity: 0.8, fontSize: '0.85rem' }}>({categoryCounts[cat.id] ?? 0})</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Services list */}
                    <Row className="mt-12">
                        {filteredServices && filteredServices.length > 0 ? (
                            <div>
                                {filteredServices.map((service) => (
                                    <Row key={service.id ? (service.id + Math.random() * (1000 - 1)) : Math.random()} md={12} className="mb-12">
                                        <Card
                                            tabIndex={0}
                                            role="button"
                                            aria-label={`Ver detalles del servicio ${service.name}`}
                                            style={{
                                                height: '360px',
                                                cursor: 'pointer',
                                                backgroundImage: `url(${service.imageURL})`,
                                                backgroundSize: 'cover',
                                                backgroundPositionY: 'center',
                                                borderRadius: '12px',
                                                marginBottom: '16px',
                                                transition: 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.4s ease',
                                                display: 'flex',
                                                justifyContent: 'center',
                                                alignItems: 'center',
                                                border: '2px dashed #ffffff',
                                                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
                                            }}
                                            onMouseEnter={(e: any) => {
                                                e.currentTarget.style.transform = 'scale(1.03)';
                                                e.currentTarget.style.boxShadow = '0 12px 32px rgba(0, 255, 255, 0.25)';
                                            }}
                                            onMouseLeave={(e: any) => {
                                                e.currentTarget.style.transform = 'scale(1)';
                                                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.4)';
                                            }}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    openImagePreviewModal(service.imageURL ? service.imageURL : '', service.name ? service.name : '', service.description ? service.description : '');
                                                }
                                            }}
                                            onClick={() => openImagePreviewModal(service.imageURL ? service.imageURL : '', service.name ? service.name : '', service.description ? service.description : '')}
                                        >
                                            <Card.Body
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    justifyContent: 'center',
                                                    alignItems: 'center',
                                                    textAlign: 'center',
                                                    textShadow: colorScheme !== "light" ? '2px 2px black' : '1px 1px 1px white',
                                                    color: colorScheme === "light" ? 'black' : 'white',
                                                    background: colorScheme === "dark" ? 'rgba(0, 0, 0, 0.88)' : 'rgba(255, 255, 255, 0.92)',
                                                    borderRadius: '8px',
                                                    padding: '24px',
                                                    maxWidth: '85%',
                                                    backdropFilter: 'blur(8px)',
                                                    border: '1px solid rgba(255, 255, 255, 0.15)'
                                                }}
                                            >
                                                <Card.Title style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '12px' }}>
                                                    {service.name}
                                                </Card.Title>
                                                <Card.Text>
                                                    <span style={{ fontSize: '1.05rem', lineHeight: '1.5' }}>{service.description}</span>
                                                    <br />
                                                    <strong style={{ display: 'inline-block', marginTop: '10px', fontSize: '1.1rem', color: colorScheme === 'dark' ? '#0ffff0' : '#0148b2' }}>
                                                        {t("services_item_price", { price: service.price })}
                                                    </strong>
                                                    <br />
                                                    <span style={{ fontSize: '0.85rem', opacity: 0.85 }}>
                                                        {t("services_item_availabilityDates", {
                                                            availabilityStart: service.availabilityStart?.toISOString().split('T')[0],
                                                            availabilityEnd: service.availabilityEnd?.toISOString().split('T')[0]
                                                        })}
                                                    </span>
                                                </Card.Text>
                                            </Card.Body>
                                        </Card>
                                    </Row>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '12px' }}>
                                <p style={{ fontSize: '1.2rem', color: '#ffffff' }}>No se encontraron servicios en esta categoría.</p>
                                <button
                                    type="button"
                                    onClick={() => setSelectedCategory('all')}
                                    style={{ border: '1px solid #0ffff0', color: '#0ffff0', background: 'transparent', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
                                >
                                    Ver todos los servicios
                                </button>
                            </div>
                        )}
                    </Row>
                </Container>
            </div>
        </div>
    );
};