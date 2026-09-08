import { useState, useEffect, useMemo } from 'react';
import { Service } from '../models';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import { API_URL_BASE } from './../services/consts';
import serverAPI from './../services/serverAPI';
import { useTranslation } from "react-i18next";
import BackgroundImage from './../assets/images/services.webp';

interface ServicesProps {
    colorScheme: string;
    openImagePreviewModal: (imageSrc: string, title: string, description: string) => void;
}

export const Services = ({ colorScheme, openImagePreviewModal }: ServicesProps) => {
    // Dependencies
    const { t } = useTranslation();
    const [services, setServices] = useState<Service[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    useEffect(() => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });

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
                    return prevServices.map((service) => {
                        const matchingData = responseData.find((data: any) => data.serviceID === service.id);
                        if (matchingData) {
                            const media = matchingData.mediaURL || "";
                            const fullURL = media.startsWith("http://") || media.startsWith("https://") ? media : API_URL_BASE + "/" + media;
                            return { ...service, imageURL: fullURL };
                        }
                        return service;
                    });
                });
            }).catch(err => { console.log(err); });
        }).catch(err => console.log(err));
    }, []);

    const categories = [
        { id: 'all', label: 'Todos los servicios' },
        { id: 'bienestar', label: 'Bienestar & Spa' },
        { id: 'gastronomia', label: 'Gastronomía' },
        { id: 'ocio', label: 'Ocio & Excursiones' },
        { id: 'vip', label: 'Exclusivo VIP' }
    ];

    const filteredServices = useMemo(() => {
        if (selectedCategory === 'all') return services;

        return services.filter((service) => {
            const text = `${service.name || ''} ${service.description || ''}`.toLowerCase();
            if (selectedCategory === 'bienestar') {
                return text.includes('spa') || text.includes('masaje') || text.includes('relax') || text.includes('wellness') || text.includes('sauna');
            }
            if (selectedCategory === 'gastronomia') {
                return text.includes('desayuno') || text.includes('cena') || text.includes('comida') || text.includes('restaurante') || text.includes('vino') || text.includes('buffet');
            }
            if (selectedCategory === 'ocio') {
                return text.includes('barco') || text.includes('playa') || text.includes('tour') || text.includes('excurs') || text.includes('deporte') || text.includes('calas');
            }
            if (selectedCategory === 'vip') {
                return text.includes('vip') || text.includes('suite') || text.includes('chofer') || text.includes('privad') || text.includes('premium') || (service.price && service.price > 100);
            }
            return true;
        });
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
                                    {cat.label}
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