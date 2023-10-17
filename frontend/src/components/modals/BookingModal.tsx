import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import axios from 'axios';
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import { Booking, Plan, Room, User } from '../../models';
// import { Booking, Payment, Plan, Role, Room, Service, User, Weather } from '../../models';
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
    StepChooseBooking,
    StepPayment,
    StepConfirmation,
}

// Booking step: calendar properties
type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

const BookingModal = ({ show, onClose }: BookingModalProps) => {
    const API_URL = process.env.API_URL ? process.env.API_URL : 'http://localhost:3000';
    const [cookies, removeCookie] = useCookies(['token']);
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

    // Logica de navegacion por el modal
    const goToNextStep = async () => {
        // Lógica específica para cada paso
        switch (currentStep) {
            case BookingSteps.StepPersonalData:
                setCurrentStep(BookingSteps.StepPlan);
                break;
            case BookingSteps.StepPlan:
                setCurrentStep(BookingSteps.StepChooseBooking);
                break;
            case BookingSteps.StepChooseBooking:
                setCurrentStep(BookingSteps.StepPayment);
                break;
            case BookingSteps.StepPayment:
                // Realizar la reserva
                try {
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
                    if (!user.id) {
                        const userToCreate = { email: user.email, name: user.name, surnames: user.surnames, password: "1234" };
                        // si el id es null, es que es nuevo usuario y no esta logeado, por lo tanto crearlo en la base de datos antes de la reserva
                        axios.post('http://localhost:3000/api/register', userToCreate, { headers: axiosHeaders }).then(res => {
                            console.log('registered successfully')
                        }).catch(err => {
                            console.error(err)
                        })
                    }
                    let plan = new Plan();
                    let room = new Room();
                    //let service = new Service(); // podrá ver 1 o más
                    //let payment = new Payment();
                    let booking = new Booking({
                        id: null,
                        userID: user.id,
                        planID: plan.id,
                        roomID: room.id,
                        startDate: new Date(),
                        endDate: new Date(),
                    });
                    // Llama a la API para realizar la reserva
                    // const res = await axios.get(API_URL, { headers: axiosHeaders })
                    /*
                    axios.post(API_URL+'/api/reserve', data, { headers: axiosHeaders }).then((response) => {
                        setCurrentStep(BookingSteps.StepPlan);
                    }).catch((error) => {
                        console.error(error);
                    });
                    */
                    setCurrentStep(BookingSteps.StepPlan);
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

    // Get JWT user data
    async function getAllLoggedUserData(): Promise<any> {
        const currentUser = await axios.post(API_URL + '/api/currentUser', cookies, { headers: axiosHeaders });
        if (currentUser) {
            const getLoggedUserData = await axios.get(API_URL + '/api/loggedUser/' + currentUser.data.userID, { headers: axiosHeaders }).catch(err => removeCookie('token', ''));
            if (getLoggedUserData) {
                return getLoggedUserData.data;
            } else {
                removeCookie('token', '');
            }
        }
    }

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
    const [checkedPlan, setCheckedPlan] = useState<string | null>('basic');

    const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCheckedPlan(event.target.value);
    };

    // Step booking
    // Select date
    const [startDate, onChangeStartDate] = useState<Value>(new Date());
    const [endDate, onChangeEndDate] = useState<Value>(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [rooms, setRooms] = useState<Room[]>([
        new Room({
            id: 1,
            name: 'Room 1',
            description: 'Description 1',
            price: 100,
            availabilityStart: new Date(),
            availabilityEnd: tomorrow,
        }),
        new Room({
            id: 2,
            name: 'Room 2',
            description: 'Description 2',
            price: 120,
            availabilityStart: new Date(),
            availabilityEnd: tomorrow,
        }),
    ]);
    const [adults, setAdults] = useState(1);
    const [children, setChildren] = useState(0);
    const [filteredRooms, setFilteredRooms] = useState<Room[]>([])

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
    }, [startDate, endDate, adults, children]);

    // Step choose payment method
    const [checkedPaymentMethod, setCheckedPaymentMethod] = useState<string | null>('stripe');

    const handleRadioChangePayment = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCheckedPaymentMethod(event.target.value);
    };

    // When close, reset
    useEffect(() => {
        if (!show) {
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
                            <Card>
                                <Card.Body>
                                    <Card.Title>Plan: Basic</Card.Title>
                                    <Card.Text>
                                        In the basic plan, you are going to be able to choose your room and delight of the free meteorology service we have. Services will not be included (choose the ones you want).
                                    </Card.Text>
                                    <Form.Check
                                        id="basic"
                                        type="radio"
                                        name="pricing-plan"
                                        value="basic"
                                        checked={checkedPlan === "basic"}
                                        onChange={handleRadioChange}
                                    />
                                </Card.Body>
                            </Card>
                            <Card>
                                <Card.Body>
                                    <Card.Title>Plan: VIP</Card.Title>
                                    <Card.Text>
                                        In the vip plan, you delight all the benefits of Basic plan + all extra services included + special attention.
                                    </Card.Text>
                                    <Form.Check
                                        id="vip"
                                        type="radio"
                                        name="pricing-plan"
                                        value="vip"
                                        checked={checkedPlan === "vip"}
                                        onChange={handleRadioChange}
                                    />
                                </Card.Body>
                            </Card>
                        </div>

                        <Button onClick={goToNextStep}>Next</Button>
                    </div>
                )
            }

            {
                currentStep === BookingSteps.StepChooseBooking && (
                    <div className='bookingContainer'>

                        <Container>
                            <Row className="mt-12">
                                <Col>
                                    <h2>Choose your booking & services</h2>
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

                            {/* Lista de hoteles */}
                            <Row className="mt-12">
                                <h4>Rooms found:</h4>
                                {filteredRooms.map((room) => (
                                    <Row key={room.id} md={12} className="mb-12">
                                        <Card>
                                            <Card.Body>
                                                <Card.Title>{room.name}</Card.Title>
                                                <Card.Text>
                                                    {`Inicio: ${room.availabilityStart?.toISOString().split('T')[0]}, Fin: ${room.availabilityEnd?.toISOString().split('T')[0]}`}
                                                </Card.Text>
                                                <Button variant="primary">Book</Button>
                                            </Card.Body>
                                        </Card>
                                    </Row>
                                ))}
                            </Row>

                            <Button onClick={goToNextStep}>Next</Button>
                        </Container>
                    </div>
                )
            }

            {
                currentStep === BookingSteps.StepPayment && (
                    <div>
                        <h2>Choose payment method</h2>
                        <div className="cards-payment">
                            <Card>
                                <Card.Body>
                                    <Card.Title>Stripe</Card.Title>
                                    <Card.Text>
                                        The safe Stripe method.
                                    </Card.Text>
                                    <Form.Check
                                        id="stripe"
                                        type="radio"
                                        name="payment-method"
                                        value="stripe"
                                        checked={checkedPaymentMethod === "stripe"}
                                        onChange={handleRadioChangePayment}
                                    />
                                </Card.Body>
                            </Card>
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
