import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import axios from 'axios';
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import { Booking, PaymentMethod, Payment, Plan, Role, Room, Service, User, Weather } from '../../models';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useCookies } from 'react-cookie';
import ReCAPTCHA from "react-google-recaptcha";
import { isEmptyOrSpaces, validateEmail } from '../../utils';
import './BookingModal.css'

interface BookingModalProps {
    show: boolean,
    onClose: () => void;
}

enum BookingSteps {
    StepPersonalData,
    StepPlan,
    StepChooseRoom,
    StepChooseServices,
    StepFillGuests,
    StepPaymentMethod,
    StepConfirmation,
}

// Booking step: calendar properties
type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

const BookingModal = ({ show, onClose }: BookingModalProps) => {
    const API_URL = process.env.API_URL ? process.env.API_URL : 'http://localhost:3000';
    const [cookies, setCookie, removeCookie] = useCookies(['token']);
    const [currentStep, setCurrentStep] = useState(BookingSteps.StepPersonalData);

    useEffect(() => {
        if (cookies.token) {
            // Si ya esta logeado, no pedir los datos personales
            setCurrentStep(BookingSteps.StepPlan)
        }
    }, [cookies])

    // Axios request properties para cors
    const axiosHeaders = {
        'Content-Type': 'application/json',
        'Authorization': '',
        'Accept': 'application/json',
        'Access-Control-Allow-Origin': '*',
    }
    axios.defaults.withCredentials = true;

    // Get JWT user data
    async function getAllLoggedUserData(): Promise<any> {
        const currentUser = await axios.post(API_URL + '/api/currentUser', cookies, { headers: axiosHeaders });
        if (currentUser) {
            const getLoggedUserData = await axios.get(API_URL + '/api/loggedUser/' + currentUser.data.userID, { headers: axiosHeaders }).catch(err => removeCookie('token'));
            if (getLoggedUserData) {
                return getLoggedUserData.data;
            } else {
                removeCookie('token');
            }
        }
    }

    // Logica de navegacion por el modal
    const goToNextStep = async () => {
        // Lógica específica para cada paso
        switch (currentStep) {
            case BookingSteps.StepPersonalData:
                setCurrentStep(BookingSteps.StepPlan);
                break;
            case BookingSteps.StepPlan:
                setCurrentStep(BookingSteps.StepChooseRoom);
                break;
            case BookingSteps.StepChooseRoom:
                setCurrentStep(BookingSteps.StepChooseServices);
                break;
            case BookingSteps.StepChooseServices:
                setCurrentStep(BookingSteps.StepFillGuests);
                break;
            case BookingSteps.StepFillGuests:
                setCurrentStep(BookingSteps.StepPaymentMethod);
                break;
            case BookingSteps.StepPaymentMethod:
                // Realizar la reserva
                try {
                    // Crear usuario si no esta logeado, sino cogemos ese usuario
                    let user = new User({
                        id: null,
                        name: userPersonalData.name,
                        surnames: userPersonalData.surnames,
                        email: userPersonalData.email,
                        password: null,
                        verified: true,
                    });
                    if (cookies.token) {
                        // Si esta logeado
                        getAllLoggedUserData().then(res => {
                            user.id = res.id;
                            user.name = res.user_name;
                            user.surnames = res.user_surnames;
                            user.email = res.user_email;
                            user.password = res.user_password_hash;
                            user.verified = res.user_verified;
                        }).catch(err => console.error(err))
                    }
                    if (!user.id && !cookies.token) {
                        const userToCreate = { email: user.email, name: user.name, surnames: user.surnames, password: "1234" };
                        // si el id es null, es que es nuevo usuario y no esta logeado, por lo tanto crearlo en la base de datos antes de la reserva
                        axios.post('http://localhost:3000/api/register', userToCreate, { headers: axiosHeaders }).then(res => {
                            console.log('registered successfully')
                        }).catch(err => {
                            console.error(err)
                        })
                    }
                    let selectedPlanID = 0;
                    if (checkedPlan == 'vip') {
                        selectedPlanID = 1;
                    }
                    let serviceIDSelected = selectedServiceID;
                    //let payment = new Payment();
                    let booking = new Booking({
                        id: null,
                        userID: user.id,
                        planID: selectedPlanID,
                        roomID: selectedRoomID,
                        startDate: startDate as Date,
                        endDate: endDate as Date,
                    });
                    // Llama a la API para realizar la reserva
                    // axios.post(API_URL + '/api/booking', booking, { headers: axiosHeaders }).then((response) => {
                    //     setCurrentStep(BookingSteps.StepConfirmation);
                    // }).catch((error) => {
                    //     console.error(error);
                    // });
                } catch (error) {
                    // Manejo de errores
                    console.error('Error al realizar la reserva:', error);
                }


                // Si todo ha ido correcto, pasar al next screen y Empty data on next screen
                setCurrentStep(BookingSteps.StepConfirmation);
                onClose();
                setCurrentStep(BookingSteps.StepPersonalData);
                break;
            case BookingSteps.StepConfirmation:
                // onClose();
                break;
            default:
                break;
        }
    };

    // Step Personal data Form
    const [userPersonalData, setUserPersonalData] = useState({ name: '', surnames: '', email: '' });
    const [userPersonalDataErrors, setUserPersonalDataErrors] = useState({ nameError: '', surnamesError: '', emailError: '' });

    const validatePersonalDataForm = () => {
        const { name, surnames, email } = userPersonalData;
        const newErrors = { nameError: '', surnamesError: '', emailError: '' }

        if (isEmptyOrSpaces(name)) {
            newErrors.nameError = 'Please enter a valid name'
        }
        if (isEmptyOrSpaces(surnames)) {
            newErrors.surnamesError = 'Please enter valid surnames'
        }
        if (!validateEmail(email)) {
            newErrors.emailError = 'Please enter a valid email'
        }

        return newErrors;
    }

    const handlePersonalDataSubmit = (event: React.ChangeEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();

        //let form = event.currentTarget;
        const formErrors = validatePersonalDataForm();

        if (formErrors.nameError == '' && formErrors.surnamesError == '' && formErrors.emailError == '') {
            goToNextStep();
        } else {
            setUserPersonalDataErrors(formErrors)
        }
    }

    const handlePersonalDataChange = (event: any) => {
        setUserPersonalData({ ...userPersonalData, [event.target.name]: event.target.value });
        if (!!userPersonalDataErrors[event.target.name as keyof Object]) {
            setUserPersonalDataErrors({ ...userPersonalDataErrors, [event.target.name]: null })
        }
    }

    // Step choose Plan
    const [plans, setPlans] = useState<Plan[]>([])
    const [checkedPlan, setCheckedPlan] = useState<string | null>('basic');

    useEffect(() => {
        axios.get(API_URL + '/api/plans').then(res => {
            let plans = res.data.data;
            let retrievedPlans: Plan[] = [];
            plans.forEach((plan: any) => {
                retrievedPlans.push(new Plan({ id: plan.id, name: plan.plan_name, description: plan.plan_description, price: plan.plan_price }))
            })
            setPlans(retrievedPlans)
        }).catch
            (err => console.error(err))
    }, [])

    const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCheckedPlan(event.target.value);
    };

    // Step booking
    const [startDate, onChangeStartDate] = useState<Value>(new Date());
    const [endDate, onChangeEndDate] = useState<Value>(new Date());
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoomID, setSelectedRoomID] = useState(null);

    // Get rooms
    useEffect(() => {
        axios.get(API_URL + '/api/rooms').then(res => {
            let rooms = res.data.data;
            let retrievedRooms: Room[] = [];
            rooms.forEach((room: any) => {
                retrievedRooms.push(new Room({ id: room.id, name: room.room_name, description: room.room_description, price: room.room_price, availabilityStart: new Date(room.room_availability_start), availabilityEnd: new Date(room.room_availability_end) }))
            })
            setRooms(retrievedRooms)
        }).catch
            (err => console.error(err))
    }, []) // only once

    const [adults, setAdults] = useState(1);
    const [children, setChildren] = useState(0);
    const [filteredRooms, setFilteredRooms] = useState<Room[]>([])

    // Filter rooms
    useEffect(() => {
        setFilteredRooms(
            rooms.filter((room) => {
                if (startDate && endDate && room && room.availabilityStart && room.availabilityEnd) {
                    return room.availabilityStart <= startDate && room.availabilityEnd >= endDate;
                } else {
                    const now = new Date();
                    if (room && room.availabilityStart && room.availabilityEnd) {
                        return room.availabilityStart <= now && room.availabilityEnd >= now;
                    }
                }
            })
        );
    }, [rooms, startDate, endDate, adults, children]);

    const roomSelected = (roomID: any) => {
        setSelectedRoomID(roomID)
        goToNextStep();
    }

    // Step choose services
    const [services, setServices] = useState<Service[]>([])
    const [selectedServiceID, setSelectedServiceID] = useState(null);

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

    const serviceSelected = (serviceID: any) => {
        setSelectedServiceID(serviceID)
        goToNextStep();
    }

    // Step fill guests


    // Step choose payment method
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
    const [checkedPaymentMethod, setCheckedPaymentMethod] = useState<string | null>('stripe');

    useEffect(() => {
        axios.get(API_URL + '/api/paymentmethods').then(res => {
            let paymentMethodss = res.data.data;
            let retrievedPaymentMethods: PaymentMethod[] = [];
            paymentMethodss.forEach((pm: any) => {
                retrievedPaymentMethods.push(new PaymentMethod({ id: pm.id, name: pm.payment_method_name }))
            })
            setPaymentMethods(retrievedPaymentMethods)
        }).catch
            (err => console.error(err))
    }, []);

    const paymentMethodSelected = (paymentMethodID: any) => {
        setCheckedPaymentMethod(paymentMethodID);
        goToNextStep();
    };

    // When close, reset
    useEffect(() => {
        if (!show && !cookies.token) {
            setCurrentStep(BookingSteps.StepPersonalData)
            setUserPersonalData({ name: '', surnames: '', email: '' });
            setUserPersonalDataErrors({ nameError: '', surnamesError: '', emailError: '' })
            setCheckedPlan('basic')
            onChangeStartDate(new Date())
            onChangeEndDate(new Date())
            setAdults(1)
            setChildren(0)
            setFilteredRooms([])
        }
    }, [show])

    return (
        <BaseModal title={'Book'} show={show} onClose={onClose}>
            {currentStep === BookingSteps.StepPersonalData && (
                <div>
                    <h2>Your personal data</h2>

                    <Form noValidate onSubmit={handlePersonalDataSubmit}>
                        <Form.Group className="mb-3" controlId="formName">
                            <Form.Label>Name</Form.Label>
                            <Form.Control type="text" name="name" placeholder="Enter your name" value={userPersonalData.name} onChange={handlePersonalDataChange} isInvalid={!!userPersonalDataErrors.nameError} required />
                            <Form.Control.Feedback type='invalid'>
                                {userPersonalDataErrors.nameError}
                            </Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formSurnames">
                            <Form.Label>Surnames</Form.Label>
                            <Form.Control type="text" name="surnames" placeholder="Enter your surnames" value={userPersonalData.surnames} onChange={handlePersonalDataChange} isInvalid={!!userPersonalDataErrors.surnamesError} required />
                            <Form.Control.Feedback type='invalid'>
                                {userPersonalDataErrors.surnamesError}
                            </Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formEmail">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="email" name="email" placeholder="Enter your email" value={userPersonalData.email} onChange={handlePersonalDataChange} isInvalid={!!userPersonalDataErrors.emailError} required />
                            <Form.Text className="text-muted">
                                We'll never share your email with anyone else and we will send confirmation mails to this one.
                            </Form.Text>
                            <Form.Control.Feedback type='invalid'>
                                {userPersonalDataErrors.emailError}
                            </Form.Control.Feedback>
                        </Form.Group>

                        <Form.Label><em>*If you do a booking without signin in, your default password will be: 1234.</em><br /><strong>Please change it inmediatly when you finish by logging in and going to edit profile.</strong></Form.Label>

                        <Button variant="primary" type="submit">
                            Next step: Choose plan
                        </Button>
                    </Form>
                </div>
            )
            }

            {
                currentStep === BookingSteps.StepPlan && (
                    <div>
                        <h2>Choose your PLAN</h2>
                        <div className="cards-plan">
                            {plans.map((plan) => (
                                <Card key={plan.id ? (plan.id + Math.random() * (1000 - 1)) : Math.random()}>
                                    <Card.Body>
                                        <Card.Title>Plan: {plan.name}</Card.Title>
                                        <Card.Text>
                                            <div>
                                                <p>{plan.description}</p>
                                                <br />
                                                <p>Price: {plan.price} euros</p>
                                            </div>
                                        </Card.Text>
                                        <Form.Check
                                            id={plan.name?.toLowerCase()}
                                            type="radio"
                                            name="pricing-plan"
                                            value={plan.name?.toLowerCase()}
                                            checked={checkedPlan === plan.name?.toLowerCase()}
                                            onChange={handleRadioChange}
                                        />
                                    </Card.Body>
                                </Card>
                            ))}
                        </div>

                        <Button onClick={goToNextStep}>Next</Button>
                    </div>
                )
            }

            {
                currentStep === BookingSteps.StepChooseRoom && (
                    <div className='bookingContainer'>
                        <Container>
                            <Row className="mt-12">
                                <Col>
                                    <h2>Choose your room</h2>
                                </Col>
                            </Row>
                            {/* Inputs de fechas */}
                            <Row className="mt-12">
                                <Col md={6}>
                                    <h3>Start date</h3>
                                    <Calendar onChange={onChangeStartDate} value={startDate} />
                                </Col>
                                <Col md={6}>
                                    <h3>End date</h3>
                                    <Calendar onChange={onChangeEndDate} value={endDate} />
                                </Col>
                            </Row>

                            {/* Inputs de adultos y niños */}
                            <Row className="mt-12">
                                <Col md={6}>
                                    <Form.Label>Adults</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={adults}
                                        onChange={(e) => setAdults(e.target.value as unknown as number)}
                                    />
                                </Col>
                                <Col md={6}>
                                    <Form.Label>Children</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={children}
                                        onChange={(e) => setChildren(e.target.value as unknown as number)}
                                    />
                                </Col>
                            </Row>

                            {/* Room list */}
                            <Row className="mt-12">
                                <h4>Rooms found:</h4>
                                {filteredRooms.map((room) => (
                                    <Row key={room.id ? (room.id + Math.random() * (1000 - 1)) : Math.random()} md={12} className="mb-12">
                                        <Card>
                                            <Card.Body>
                                                <Card.Title>{room.name}</Card.Title>
                                                <Card.Text>
                                                    <div>
                                                        <p>{room.description}</p>
                                                        <br />
                                                        <p>{`Price: ${room.price} euros.`}</p>
                                                        <br />
                                                        <p>{`Avalability start: ${room.availabilityStart?.toISOString().split('T')[0]}, Avalability end: ${room.availabilityEnd?.toISOString().split('T')[0]}`}</p>
                                                    </div>

                                                </Card.Text>
                                                <Button variant="primary" onClick={() => roomSelected(room.id)}>Book</Button>
                                            </Card.Body>
                                        </Card>
                                    </Row>
                                ))}
                            </Row>
                        </Container>
                    </div>
                )
            }

            {
                currentStep === BookingSteps.StepChooseServices && (
                    <div className='servicesContainer'>
                        <Container>
                            <Row className="mt-12">
                                <Col>
                                    <h2>Choose your services</h2>
                                </Col>
                            </Row>

                            {/* Room list */}
                            <Row className="mt-12">
                                {services.map((service) => (
                                    <Row key={service.id ? (service.id + Math.random() * (1000 - 1)) : Math.random()} md={12} className="mb-12">
                                        <Card>
                                            <Card.Body>
                                                <Card.Title>{service.name}</Card.Title>
                                                <Card.Text>
                                                    <div>
                                                        <p>{service.description}</p>
                                                        <br />
                                                        <p>{`Price: ${service.price} euros.`}</p>
                                                        <br />
                                                        <p>{`Avalability start: ${service.availabilityStart?.toISOString().split('T')[0]}, Avalability end: ${service.availabilityEnd?.toISOString().split('T')[0]}`}</p>
                                                    </div>
                                                </Card.Text>
                                                <Button variant="primary" onClick={() => serviceSelected(service.id)}>Choose</Button>
                                            </Card.Body>
                                        </Card>
                                    </Row>
                                ))}
                            </Row>
                        </Container>
                    </div>
                )
            }

            {
                currentStep === BookingSteps.StepFillGuests && (
                    <div>
                        <h2>Fill your guests</h2>
                        <button onClick={goToNextStep}>Next</button>
                    </div>
                )
            }

            {
                currentStep === BookingSteps.StepPaymentMethod && (
                    <div>
                        <h2>Choose payment method</h2>
                        <div className="cards-payment">
                            {paymentMethods.map((paymentMethod) => (
                                <Card key={paymentMethod.id ? (paymentMethod.id + Math.random() * (1000 - 1)) : Math.random()}>
                                    <Card.Body>
                                        <Card.Title>{paymentMethod.name}</Card.Title>
                                        <Form.Check
                                            type="radio"
                                            name="payment-method"
                                            value={paymentMethod.name?.toString()}
                                            checked={checkedPaymentMethod === paymentMethod.name}
                                            onChange={() => paymentMethodSelected(paymentMethod.id)}
                                        />
                                    </Card.Body>
                                </Card>
                            ))}
                        </div>
                        <Button onClick={goToNextStep}>Next</Button>
                    </div>
                )
            }

            {
                currentStep === BookingSteps.StepConfirmation && (
                    <div>
                        <h2>Step 5: Booking completed</h2>
                    </div>
                )
            }
        </BaseModal >
    );
};

export default BookingModal;
