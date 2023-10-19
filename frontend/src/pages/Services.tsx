
import { useState, useEffect } from 'react';
import axios from 'axios';
const API_URL = process.env.API_URL ? process.env.API_URL : 'http://localhost:3000';
import { Service } from '../models';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form';
export const Services = () => {
    const [services, setServices] = useState<Service[]>([])

    useEffect(() => {
        axios.get(API_URL + '/api/services').then(res => {
            let servicess = res.data.data;
            let retrievedServices: Service[] = [];
            servicess.forEach((service: any) => {
                retrievedServices.push(new Service({ id: service.id, name: service.serv_name, description: service.serv_description, price: service.serv_price, availabilityStart: new Date(service.serv_availability_start), availabilityEnd: new Date(service.serv_availability_end) }))
            })
            setServices(retrievedServices)
        }).catch
            (err => console.error(err))
    }, []);

    return (
        <div className='servicesPage'>
            <Container>
                <Row className="mt-12">
                    <Col>
                        <h2>Services</h2>
                    </Col>
                </Row>
                <br />
                {/* Services list */}
                <Row className="mt-12">
                    {services.map((service) => (
                        <Row key={service.id ? (service.id + Math.random() * (1000 - 1)) : Math.random()} md={12} className="mb-12">
                            <Card>
                                <Card.Body>
                                    <Card.Title>{service.name}</Card.Title>
                                    <Card.Text>
                                        <div>
                                            <span>{service.description}</span>
                                            <br />
                                            <span>{`Price: ${service.price} euros.`}</span>
                                            <br />
                                            <span>{`Avalability start: ${service.availabilityStart?.toISOString().split('T')[0]}, Avalability end: ${service.availabilityEnd?.toISOString().split('T')[0]}`}</span>
                                        </div>
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