
import { useState, useEffect } from 'react';
import axios from 'axios';
import { Service } from '../models';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
const API_URL = process.env.API_URL ? process.env.API_URL : 'http://localhost:3000';
export const Services = () => {
    const [services, setServices] = useState<Service[]>([])

    useEffect(() => {
        axios.get(API_URL + '/api/services').then(res => {
            let servicess = res.data.data;
            let retrievedServices: Service[] = [];
            servicess.forEach((service: any) => {
                retrievedServices.push(new Service({ id: service.id, name: service.serv_name, description: service.serv_description, price: service.serv_price, availabilityStart: new Date(service.serv_availability_start), availabilityEnd: new Date(service.serv_availability_end), imageURL: null }))
            })
            setServices(retrievedServices)

            // Get and set services images
            axios.post(API_URL + '/api/servicesImages', { services: servicess }).then(res => {
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
            <Container>
                <Row className="mt-12">
                    <Col>
                        <h1>Services</h1>
                    </Col>
                </Row>
                <br />
                {/* Services list */}
                <Row className="mt-12">
                    {services.map((service) => (
                        <Row key={service.id ? (service.id + Math.random() * (1000 - 1)) : Math.random()} md={12} className="mb-12">
                            <Card style={{ backgroundImage: `url(${service.imageURL})`, backgroundSize: 'cover' }}>
                                <Card.Body>
                                    <Card.Title>{service.name}</Card.Title>
                                    <Card.Text>
                                        <span>{service.description}</span>
                                        <br />
                                        <span>{`Price: ${service.price} euros.`}</span>
                                        <br />
                                        <span>{`Avalability start: ${service.availabilityStart?.toISOString().split('T')[0]}, Avalability end: ${service.availabilityEnd?.toISOString().split('T')[0]}`}</span>
                                    </Card.Text>
                                </Card.Body>
                            </Card>
                        </Row>
                    ))}
                </Row>
            </Container>
        </div>
    );
}