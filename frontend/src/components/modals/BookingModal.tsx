// ReserveModal.tsx
import React, { useState } from 'react';
import BaseModal from './BaseModal';
import axios from 'axios';
import Button from 'react-bootstrap/Button'
import Alert from 'react-bootstrap/Alert'
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import { Booking, Payment, Plan, Role, Room, Service, User, Weather } from '../../models';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

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

// Booking step calendar
type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

const BookingModal = ({ show, onClose }: BookingModalProps) => {
    const [currentStep, setCurrentStep] = useState(BookingSteps.StepPersonalData);

    // Step Personal data Form
    const [validated, setValidated] = useState(false);
    const [apiError, setApiError] = useState('');
    const [name, setName] = useState('');
    const [surnames, setSurnames] = useState('');
    const [email, setEmail] = useState('');

    // Select date
    const [startDate, onChangeStartDate] = useState<Value>(new Date());
    const [endDate, onChangeEndDate] = useState<Value>(new Date());

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
                        name: name,
                        surnames: surnames,
                        email: email,
                        password: '1234', // get on current logged user or a petition
                        verified: true,
                    });
                    let plan = new Plan();
                    let room = new Room();
                    let service = new Service(); // podrá ver 1 o más
                    let payment = new Payment();
                    let booking = new Booking({
                        id: null,
                        userID: user.id,
                        planID: plan.id,
                        roomID: room.id,
                        startDate: new Date(),
                        endDate: new Date(),
                    });
                    // Llama a la API para realizar la reserva
                    // axios.post('/api/reserve', { /* Datos de reserva */ }).then((response) => {
                    //     setCurrentStep(BookingSteps.StepPlan);
                    // }).catch((error) => {
                    //     console.error(error);
                    //     setApiError(error)
                    // });
                    console.log(booking)
                    setCurrentStep(BookingSteps.StepPlan);
                } catch (error) {
                    // Manejo de errores
                    console.error('Error al realizar la reserva:', error);
                }


                // Si todo ha ido correcto, pasar al next screen y Empty data on next screen
                setCurrentStep(BookingSteps.StepConfirmation);
                onClose();
                setCurrentStep(BookingSteps.StepPersonalData);
                setValidated(false);
                setApiError('');
                break;
            case BookingSteps.StepConfirmation:
                // onClose();
                break;
            default:
                break;
        }
    };

    const handleSubmit = (event: React.ChangeEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();

        let form = event.currentTarget;
        setValidated(form.checkValidity());
        if (form.checkValidity()) {
            goToNextStep();
        }
    }

    const handleNameChange = (event: any) => {
        setName(event.target.value)
    }
    const handleSurnamesChange = (event: any) => {
        setSurnames(event.target.value)
    }
    const handleEmailChange = (event: any) => {
        setEmail(event.target.value)
    }

    // Step choose Plan
    const [checkedPlan, setCheckedPlan] = useState<string | null>(null);

    const handleRadioChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setCheckedPlan(event.target.value);
    };

    return (
        <BaseModal title={'Book'} show={show} onClose={onClose}>
            {currentStep === BookingSteps.StepPersonalData && (
                <div>
                    <h2>Step 1: Your personal data</h2>

                    <Form noValidate validated={validated} onSubmit={handleSubmit}>
                        <Form.Group className="mb-3" controlId="formName">
                            <Form.Label>Name</Form.Label>
                            <Form.Control type="text" placeholder="Enter your name" onChange={handleNameChange} />
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formSurnames">
                            <Form.Label>Surnames</Form.Label>
                            <Form.Control type="text" placeholder="Enter your surnames" onChange={handleSurnamesChange} />
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formEmail">
                            <Form.Label>Email</Form.Label>
                            <Form.Control type="text" placeholder="Enter your email" onChange={handleEmailChange} />
                            <Form.Text className="text-muted">
                                We'll never share your email with anyone else and we will send confirmation mails to this one.
                            </Form.Text>
                        </Form.Group>
                        <Button variant="primary" type="submit">
                            Next step: Choose plan
                        </Button>
                    </Form>

                    {apiError != '' && (
                        <Alert key={'danger'} variant={'danger'} >
                            This is a danger alert—check it out!
                        </Alert >
                    )}
                </div>
            )}

            {currentStep === BookingSteps.StepPlan && (
                <div>
                    <h2>Step 2: Choose your PLAN</h2>
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
            )}

            {currentStep === BookingSteps.StepChooseBooking && (
                <div>
                    <h2>Step 3: Choose your booking & services</h2>

                    <div className="startenddates">
                        <div className="startdate">
                            <h3>Start date</h3>
                            <Calendar onChange={onChangeStartDate} value={startDate} />
                        </div>
                        <div className="enddate">
                            <h3>End date</h3>
                            <Calendar onChange={onChangeEndDate} value={endDate} />
                        </div>
                    </div>

                    <Button onClick={goToNextStep}>Next</Button>
                </div>
            )}

            {currentStep === BookingSteps.StepPayment && (
                <div>
                    <h2>Step 4: Choose payment method</h2>
                    <Button onClick={goToNextStep}>Next</Button>
                </div>
            )}

            {currentStep === BookingSteps.StepConfirmation && (
                <div>
                    <h2>Step 5: Booking completed</h2>
                </div>
            )}
        </BaseModal>
    );
};

export default BookingModal;
