// ReserveModal.tsx
import React, { useState } from 'react';
import BaseModal from './BaseModal';
import axios from 'axios';
import Button from 'react-bootstrap/Button'
import Alert from 'react-bootstrap/Alert'
import Form from 'react-bootstrap/Form';
import { Booking, Payment, Plan, Role, Room, Service, User, Weather } from '../../models';

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

const BookingModal = ({ show, onClose }: BookingModalProps) => {
    const [currentStep, setCurrentStep] = useState(BookingSteps.StepPersonalData);

    // Step form 1
    const [validated, setValidated] = useState(false);
    const [apiError, setApiError] = useState('');
    const [name, setName] = useState('');
    const [surnames, setSurnames] = useState('');
    const [email, setEmail] = useState('');

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
                    let user = new User();
                    let service = new Service(); // podrá ver 1 o más
                    let payment = new Payment();
                    let booking = new Booking();
                    // Llama a la API para realizar la reserva
                    // axios.post('/api/reserve', { /* Datos de reserva */ }).then((response) => {
                    //     setCurrentStep(BookingSteps.StepPlan);
                    // }).catch((error) => {
                    //     console.error(error);
                    //     setApiError(error)
                    // });
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
                            Choose plan
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
                    {/* Contenido del paso 2 */}
                    <Button onClick={goToNextStep}>Next</Button>
                </div>
            )}

            {currentStep === BookingSteps.StepChooseBooking && (
                <div>
                    <h2>Step 3: Choose your booking & services</h2>
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
