import { useState, useEffect } from 'react'
import { Service } from '../models';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import { API_URL_BASE } from './../services/consts';
import serverAPI from './../services/serverAPI';
import { useTranslation } from "react-i18next";
import BackgroundImage from './../assets/images/services.webp'
interface ServicesProps {
    colorScheme: string,
    openImagePreviewModal: (imageSrc: string, title: string, description: string) => void,
}

export const Services = ({ colorScheme, openImagePreviewModal }: ServicesProps) => {
    // Dependencies
    const { t } = useTranslation();
    const [services, setServices] = useState<Service[]>([])

    window.scrollTo({
        top: 0,
        behavior: 'smooth',
    });

    useEffect(() => {
        serverAPI.get('/services').then(res => {
            let servicess = res.data.data;
            let retrievedServices: Service[] = [];
            servicess.forEach((service: any) => {
                retrievedServices.push(new Service({ id: service.id, name: service.serv_name, description: service.serv_description, price: service.serv_price, availabilityStart: new Date(service.serv_availability_start), availabilityEnd: new Date(service.serv_availability_end), imageURL: null }))
            })
            setServices(retrievedServices)

            // Get and set services images
            serverAPI.post('/servicesImages', { services: servicess }).then(res => {
                const responseData = res.data.data;

                // Update the imageURL property of matching services
                setServices((prevServices) => {
                    return prevServices.map((service) => {
                        const matchingData = responseData.find((data: any) => data.serviceID === service.id);
                        if (matchingData) {
                            return { ...service, imageURL: API_URL_BASE + "/" + matchingData.mediaURL };
                        }
                        return service; // No match found, return the original service
                    });
                });

            }).catch(err => { console.log(err) });
        }).catch
            (err => console.log(err))
    }, []);

    return (
        <div className='servicesPage'>
            <div className='servicesPageBg' style={{ backgroundImage: `url(${BackgroundImage})` }} />
            <div className='servicesPageContent' v-if='services'>
                <Container>
                    <Row className="mt-12">
                        <Col>
                            <h1 className='servicesPageTitle' style={{ backgroundColor: 'black', border: '1px groove #0ffff0', padding: '10px' }}>{t("services_title")}</h1>
                        </Col>
                    </Row>
                    <br />
                    {/* Services list */}
                    <Row className="mt-12">
                        {services && services.length > 0 ? (
                            <div>
                                {services.map((service) => (
                                    <Row key={service.id ? (service.id + Math.random() * (1000 - 1)) : Math.random()} md={12} className="mb-12">
                                        <Card style={{ height: '360px', cursor: 'pointer', backgroundImage: `url(${service.imageURL})`, backgroundSize: 'cover', backgroundPositionY: 'center', borderRadius: '12px', marginBottom: '8px', transition: 'transform 0.6s', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '2px dashed #ffffff' }}
                                            onMouseEnter={(e: any) => { e.currentTarget.style.transform = 'scale(1.04)' }} onMouseLeave={(e: any) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                            onClick={() => openImagePreviewModal(service.imageURL ? service.imageURL : '', service.name ? service.name : '', service.description ? service.description : '')}
                                        >
                                            <Card.Body style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', textShadow: colorScheme !== "light" ? '2px 2px black' : '1px 1px 1px white', color: colorScheme == "light" ? 'black' : 'white', background: colorScheme == "dark" ? ' rgba(0, 0, 0, .9)' : 'rgba(255, 255, 255, .9)', borderRadius: '8px' }}>
                                                <Card.Title>{service.name}</Card.Title>
                                                <Card.Text>
                                                    <span>{service.description}</span>
                                                    <br />
                                                    <span>{t("services_item_price", { price: service.price })}</span>
                                                    <br />
                                                    <span>{t("services_item_availabilityDates", { availabilityStart: service.availabilityStart?.toISOString().split('T')[0], availabilityEnd: service.availabilityEnd?.toISOString().split('T')[0] })}</span>
                                                </Card.Text>
                                            </Card.Body>
                                        </Card>
                                    </Row>
                                ))}
                            </div>
                        ) : (
                            <div>
                                <p>No services found</p>
                            </div>
                        )}
                    </Row>
                </Container>
            </div>
        </div>
    );
}