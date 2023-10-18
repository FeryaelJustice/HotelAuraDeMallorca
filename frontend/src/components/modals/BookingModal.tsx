import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import axios from 'axios';
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import { Booking, PaymentMethod, Plan, Room, Service, User, Guest, Payment } from '../../models';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useCookies } from 'react-cookie';
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
    const [cookies, , removeCookie] = useCookies(['token']);
    const [currentStep, setCurrentStep] = useState(BookingSteps.StepPersonalData);
    const [userAllData, setUserAllData] = useState<User>();

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
            const getLoggedUserData = await axios.get(API_URL + '/api/loggedUser/' + currentUser.data.userID, { headers: axiosHeaders }).catch(err => {
                removeCookie('token')
                console.error(err)
            });
            if (getLoggedUserData) {
                return getLoggedUserData.data;
            } else {
                removeCookie('token');
            }
        }
    }

    useEffect(() => {
        if (cookies.token) {
            // Si ya esta logeado, no pedir los datos personales
            setCurrentStep(BookingSteps.StepPlan)

            // Si esta logeado, tener los datos completos del usuario
            try {
                getAllLoggedUserData().then(resp => {
                    let res = resp.data;
                    setUserAllData(new User({
                        id: res.id,
                        name: res.user_name,
                        surnames: res.user_surnames,
                        email: res.user_email,
                        password: res.user_password_hash,
                        verified: res.user_verified,
                    }))
                }).catch(err => console.error(err));
            } catch (err) {
                console.error(err);
            }
        } else {
            setUserAllData(new User())
        }
    }, [cookies])

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
                    // Si no esta logeado, crear usuario con default password y lo seteamos al user global de este modal con todos los datos
                    if (!cookies.token) {
                        const userToCreate = { email: userPersonalData.email, name: userPersonalData.name, surnames: userPersonalData.surnames, password: "1234" };
                        try {
                            // si el id es null, es que es nuevo usuario y no esta logeado, por lo tanto crearlo en la base de datos antes de la reserva
                            const res = await axios.post(API_URL + '/api/register', userToCreate, { headers: axiosHeaders })
                            console.log('Registered successfully', res);
                            const newUserAllData: User = {
                                id: res.data.insertId,
                                ...userToCreate,
                                verified: false
                            };

                            // Update the state with the new userAllData
                            setUserAllData(newUserAllData);
                        } catch (err) {
                            console.error(err);
                        }
                    }

                    let booking = new Booking({
                        id: null,
                        userID: userAllData?.id ?? null,
                        planID: checkedPlan,
                        roomID: selectedRoomID,
                        startDate: startDate as Date,
                        endDate: endDate as Date,
                    });

                    let bookingData = {
                        booking,
                        selectedServicesIDs,
                        guests
                    }

                    let payment = new Payment({
                        id: null,
                        userID: userAllData?.id ?? null,
                        bookingID: booking.id,
                        amount: 0,
                        date: new Date()
                    });

                    try {
                        // First API call for insert guests
                        const guestsResponse = await axios.post(API_URL + '/api/guests', guests, { headers: axiosHeaders });
                        if (guestsResponse.data.status == "success") {
                            // Make the API call for booking, and there we will also insert the booking services and booking guests
                            const bookingResponse = await axios.post(API_URL + '/api/booking', bookingData, { headers: axiosHeaders });
                            if (bookingResponse.data.status == "success") {
                                // Make the API call for payment
                                const paymentResponse = await axios.post(API_URL + '/api/payment', payment, { headers: axiosHeaders })
                                if (paymentResponse.data.status == "success") {
                                    setCurrentStep(BookingSteps.StepConfirmation);
                                }
                            }
                        }
                    } catch (error) {
                        console.error('Error in API call:', error);
                    }
                } catch (error) {
                    // Manejo de errores
                    console.error('Error al realizar la reserva:', error);
                }

                // Si todo ha ido correcto, pasar al next screen y Empty data on next screen
                setCurrentStep(BookingSteps.StepConfirmation);
                break;
            case BookingSteps.StepConfirmation:
                resetBookingModal();
                onClose();
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
    const [checkedPlan, setCheckedPlan] = useState<number | null>(1);

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

    const selectPlan = (planID: any) => {
        setCheckedPlan(planID);
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
    const [selectedServicesIDs, setSelectedServicesIDs] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        axios.get(API_URL + '/api/services').then(res => {
            let servicess = res.data.data;
            let retrievedServices: Service[] = [];
            servicess.forEach((service: any) => {
                retrievedServices.push(new Service({ id: service.id, name: service.serv_name, description: service.serv_description, price: service.serv_price, availabilityStart: new Date(service.serv_availability_start), availabilityEnd: new Date(service.serv_availability_end) }))
            })
            setServices(retrievedServices)
            // Create an array of key-value pairs for selectedServicesIDs
            const keyValuePairArray = retrievedServices.map(service => ({
                [service.id ? service.id : (Math.random() * (retrievedServices.length - 0))]: false
            }));
            // Merge the array of key-value pairs into a single object
            const selectedServicesObject = Object.assign({}, ...keyValuePairArray);
            // Update the state with the object
            setSelectedServicesIDs(selectedServicesObject);
        }).catch
            (err => console.error(err))
    }, []);

    const serviceSelected = (serviceID: any) => {
        if (selectedServicesIDs[serviceID]) {
            setSelectedServicesIDs(prevState => ({ ...prevState, [serviceID]: false }));
        } else {
            setSelectedServicesIDs(prevState => ({ ...prevState, [serviceID]: true }));
        }
    }

    // Step fill guests
    const [guests, setGuests] = useState<Guest[]>([
        new Guest({ id: null, name: '', surnames: '', email: '', isAdult: false })
    ]);
    const [guestsDataErrors, setGuestsDataErrors] = useState([{ nameError: '', surnamesError: '', emailError: '' }]);
    const [loggedUserWantsToBecomeGuest, setLoggedUserWantsToBecomeGuest] = useState(false);
    const [isLoggedUserGuestAdult, setIsLoggedUserGuestAdult] = useState(false);

    const addGuest = () => {
        if (guests.length < 20) {
            // Maximum we allow 20 guests, 10 adults and 10 childs
            setGuests([...guests, { id: null, name: '', surnames: '', email: '', isAdult: false }]);
            setGuestsDataErrors([...guestsDataErrors, { nameError: '', surnamesError: '', emailError: '' }])
        } else {
            alert('The maximum is 20 guests')
        }
    };

    const substractGuest = () => {
        if (guests.length > 1) {
            const updatedGuests = guests.slice(0, -1);
            setGuests(updatedGuests);
            const updatedErrors = guestsDataErrors.slice(0, -1);
            setGuestsDataErrors(updatedErrors);
        }
    }

    const handleGuestsInputChange = (index: any, event: any) => {
        const { name, value, type, checked } = event.target;
        const updatedGuests = [...guests];
        updatedGuests[index] = {
            ...updatedGuests[index],
            [name]: type === 'checkbox' ? checked : value
        };
        setGuests(updatedGuests);
    };

    const validateGuestsDataForm = () => {
        let errors = [{ nameError: '', surnamesError: '', emailError: '' }];
        guests.forEach((guest, index) => {
            if (index === 0) {
                errors = [];
            }
            const { name, surnames, email } = guest;
            const newErrors = { nameError: '', surnamesError: '', emailError: '' };

            if (isEmptyOrSpaces(name)) {
                newErrors.nameError = 'Please enter a valid name'
            }
            if (isEmptyOrSpaces(surnames)) {
                newErrors.surnamesError = 'Please enter valid surnames'
            }
            if (!validateEmail(email)) {
                newErrors.emailError = 'Please enter a valid email'
            }
            errors.push(newErrors)
        })

        return errors;
    }

    const handleGuestsSubmit = (event: any) => {
        event.preventDefault();
        event.stopPropagation();

        //let form = event.currentTarget;
        const formErrors = validateGuestsDataForm();
        let isAnError = false;

        formErrors.forEach((formError) => {
            if (formError.nameError !== '' || formError.surnamesError !== '' || formError.emailError !== '') {
                isAnError = true;
                return;
            }
        })

        if (!isAnError) {
            // Filter out guests with specific values for id, name, surnames, and isAdult (EXTRA FORM VALIDATION SECURITY)
            const filteredGuests = guests.filter(guest => {
                return (
                    guest.id !== null ||
                    guest.name !== '' ||
                    guest.email !== '' ||
                    guest.surnames !== '' ||
                    guest.isAdult !== false
                );
            });
            setGuests(filteredGuests)

            goToNextStep();
        } else {
            setGuestsDataErrors(formErrors)
        }
    };

    useEffect(() => {
        if (loggedUserWantsToBecomeGuest) {

            getAllLoggedUserData().then((data: any) => {
                let user: any = data.data;
                const newUserAsGuest = new Guest({ id: user.id, name: user.user_name, surnames: user.user_surnames, email: user.user_email, isAdult: isLoggedUserGuestAdult })
                setGuests([newUserAsGuest, ...guests]);
                setGuestsDataErrors([{ nameError: '', surnamesError: '', emailError: '' }, ...guestsDataErrors])
            }).catch(err => console.error(err));
        } else {
            if (guests.length > 1) {
                setGuests(prevGuests => prevGuests.slice(1));
                setGuestsDataErrors(prevErrors => prevErrors.slice(1));
            }
        }
    }, [loggedUserWantsToBecomeGuest]);

    useEffect(() => {
        setGuests(prevGuests => {
            return prevGuests.map((guest, index) => {
                if (index === 0) {
                    return { ...guest, isAdult: isLoggedUserGuestAdult };
                }
                return guest;
            })
        });
    }, [isLoggedUserGuestAdult]);

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

    const resetBookingModal = () => {
        setCurrentStep(BookingSteps.StepPersonalData)
        setUserPersonalData({ name: '', surnames: '', email: '' });
        setUserPersonalDataErrors({ nameError: '', surnamesError: '', emailError: '' })
        setGuestsDataErrors([{ nameError: '', surnamesError: '', emailError: '' }])
        setCheckedPlan(1)
        onChangeStartDate(new Date())
        onChangeEndDate(new Date())
        setAdults(1)
        setChildren(0)
        setFilteredRooms([])
    }

    // When close, reset
    useEffect(() => {
        if (!show && !cookies.token) {
            resetBookingModal();
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
                                                <span>{plan.description}</span>
                                                <br />
                                                <span>Price: {plan.price} euros</span>
                                            </div>
                                        </Card.Text>
                                        <Form.Check
                                            type="radio"
                                            name="pricing-plan"
                                            value={plan.name?.toLowerCase()}
                                            checked={checkedPlan === plan.id}
                                            onChange={() => selectPlan(plan.id)}
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
                            <br />
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
                            <br />
                            {/* Inputs de adultos y niños */}
                            <Row className="mt-12">
                                <Col md={6}>
                                    <Form.Label>Adults</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={adults}
                                        onChange={(e) => setAdults(e.target.value as unknown as number)}
                                    />
                                </Col>
                                <Col md={6}>
                                    <Form.Label>Children</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min={0}
                                        max={10}
                                        value={children}
                                        onChange={(e) => setChildren(e.target.value as unknown as number)}
                                    />
                                </Col>
                            </Row>
                            <br />
                            <Row className='mt-12'>
                                <span><em>Maximum 10 adults or 10 children and minimum 1 adult.</em></span>
                                <hr />
                            </Row>
                            <br />
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
                                                        <span>{room.description}</span>
                                                        <br />
                                                        <span>{`Price: ${room.price} euros.`}</span>
                                                        <br />
                                                        <span>{`Avalability start: ${room.availabilityStart?.toISOString().split('T')[0]}, Avalability end: ${room.availabilityEnd?.toISOString().split('T')[0]}`}</span>
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
                                    <em>(Optional)</em>
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
                                                <Form.Check
                                                    type="checkbox"
                                                    name="service"
                                                    value={service.id ? service.id : -1}
                                                    checked={selectedServicesIDs[service.id ? service.id : 1]}
                                                    label="Choose"
                                                    onChange={() => serviceSelected(service.id)} />
                                            </Card.Body>
                                        </Card>
                                    </Row>
                                ))}
                                <Button variant='primary' onClick={goToNextStep}>Continue</Button>
                            </Row>
                        </Container>
                    </div>
                )
            }

            {
                currentStep === BookingSteps.StepFillGuests && (
                    <div>
                        <Container>
                            <Form noValidate onSubmit={handleGuestsSubmit}>
                                {guests.map((guest, index) => (
                                    <Row key={index}>
                                        <Row><strong>Guest {index}</strong></Row>
                                        <Row>
                                            <Col>
                                                <Form.Group controlId={`name-${index}`}>
                                                    <Form.Label>Name</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        name="name"
                                                        disabled={loggedUserWantsToBecomeGuest && index === 0}
                                                        value={guest.name ? guest.name : ''}
                                                        isInvalid={!!guestsDataErrors[index].nameError}
                                                        onChange={(e) => handleGuestsInputChange(index, e)}
                                                    />    <Form.Control.Feedback type='invalid'>
                                                        {guestsDataErrors[index].nameError}
                                                    </Form.Control.Feedback>
                                                </Form.Group>
                                            </Col>
                                            <Col>
                                                <Form.Group controlId={`surname-${index}`}>
                                                    <Form.Label>Surname</Form.Label>
                                                    <Form.Control
                                                        type="text"
                                                        name="surnames"
                                                        disabled={loggedUserWantsToBecomeGuest && index === 0}
                                                        value={guest.surnames ? guest.surnames : ''}
                                                        isInvalid={!!guestsDataErrors[index].surnamesError}
                                                        onChange={(e) => handleGuestsInputChange(index, e)}
                                                    />    <Form.Control.Feedback type='invalid'>
                                                        {guestsDataErrors[index].surnamesError}
                                                    </Form.Control.Feedback>
                                                </Form.Group>
                                            </Col>
                                            <Col>
                                                <Form.Group controlId={`email-${index}`}>
                                                    <Form.Label>Email</Form.Label>
                                                    <Form.Control
                                                        type="email"
                                                        name="email"
                                                        disabled={loggedUserWantsToBecomeGuest && index === 0}
                                                        value={guest.email ? guest.email : ''}
                                                        isInvalid={!!guestsDataErrors[index].emailError}
                                                        onChange={(e) => handleGuestsInputChange(index, e)}
                                                    />    <Form.Control.Feedback type='invalid'>
                                                        {guestsDataErrors[index].emailError}
                                                    </Form.Control.Feedback>
                                                </Form.Group>
                                            </Col>
                                            <Col>
                                                <div className='isAdultFillGuest'>
                                                    <Form.Group controlId={`isAdult-${index}`}>
                                                        <Form.Check
                                                            type="checkbox"
                                                            label="Adult"
                                                            name="isAdult"
                                                            disabled={loggedUserWantsToBecomeGuest && index === 0}
                                                            checked={guest.isAdult ? guest.isAdult : false}
                                                            onChange={(e) => handleGuestsInputChange(index, e)}
                                                        />
                                                    </Form.Group>
                                                </div>
                                            </Col></Row>
                                    </Row>
                                ))}
                                <br />
                                <Button variant="success" onClick={addGuest}>
                                    Add Guest
                                </Button>
                                <Button variant="success" onClick={substractGuest}>
                                    Remove last Guest
                                </Button>
                                <br />
                                <br />
                                {cookies.token && (
                                    <div className='loggedUserWantsToBecomeGuest'>
                                        <Form.Check type='checkbox' name="loggedUserWantsToBecomeGuest" label="Do you want the logged user to be 1 guest?" checked={loggedUserWantsToBecomeGuest} onChange={() => setLoggedUserWantsToBecomeGuest(!loggedUserWantsToBecomeGuest)} />
                                        {loggedUserWantsToBecomeGuest && (
                                            <Form.Check type='checkbox' name="isLoggedUserGuestAdult" label="And are you an adult?" checked={isLoggedUserGuestAdult} onChange={() => setIsLoggedUserGuestAdult(!isLoggedUserGuestAdult)} />
                                        )}
                                        <br />
                                        <br />
                                    </div>
                                )}
                                <Button variant="primary" type="submit">
                                    Submit
                                </Button>
                            </Form>
                        </Container>
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
                    </div>
                )
            }

            {
                currentStep === BookingSteps.StepConfirmation && (
                    <div>
                        <h2>Step 5: Booking completed</h2>
                        <Button variant='primary' onClick={goToNextStep}>Close window!</Button>
                    </div>
                )
            }
        </BaseModal >
    );
};

export default BookingModal;
