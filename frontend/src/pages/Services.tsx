
import { useState, useEffect } from 'react'
import { Service } from '../models';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import { API_URL } from './../services/consts';
import serverAPI from './../services/serverAPI';
import { useTranslation } from "react-i18next";

export const Services = () => {
    const { t } = useTranslation();
    const [services, setServices] = useState<Service[]>([])

    useEffect(() => {
        serverAPI.get('/api/services').then(res => {
            let servicess = res.data.data;
            let retrievedServices: Service[] = [];
            servicess.forEach((service: any) => {
                retrievedServices.push(new Service({ id: service.id, name: service.serv_name, description: service.serv_description, price: service.serv_price, availabilityStart: new Date(service.serv_availability_start), availabilityEnd: new Date(service.serv_availability_end), imageURL: null }))
            })
            setServices(retrievedServices)

            // Get and set services images
            serverAPI.post('/api/servicesImages', { services: servicess }).then(res => {
                const responseData = res.data.data;

                // Update the imageURL property of matching services
                setServices((prevServices) => {
                    return prevServices.map((service) => {
                        const matchingData = responseData.find((data: any) => data.serviceID === service.id);
                        if (matchingData) {
                            return { ...service, imageURL: API_URL + "/" + matchingData.mediaURL };
                        }
                        return service; // No match found, return the original service
                    });
                });

            }).catch(err => { console.error(err) });
        }).catch
            (err => console.error(err))
    }, []);

    return (
        <div className='servicesPage'>
            <div className='servicesPageBg' />
            <div className='servicesPageContent' v-if='services'>
                <Container>
                    <Row className="mt-12">
                        <Col>
                            <h1 className='servicesPageTitle'>{t("services_title")}</h1>
                        </Col>
                    </Row>
                    <br />
                    {/* Services list */}
                    <Row className="mt-12">
                        {services.map((service) => (
                            <Row key={service.id ? (service.id + Math.random() * (1000 - 1)) : Math.random()} md={12} className="mb-12">
                                <Card style={{ backgroundImage: `url(${service.imageURL})`, backgroundSize: 'cover', borderRadius: '12px', marginBottom: '8px', transition: 'transform 0.6s' }}
                                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.04)' }} onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                >
                                    <Card.Body>
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
                    </Row>
                </Container>
            </div>
        </div>
    );
}