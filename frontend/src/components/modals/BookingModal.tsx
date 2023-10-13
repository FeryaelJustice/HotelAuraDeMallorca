// ReserveModal.tsx
import { useState } from 'react';
import BaseModal from './BaseModal';
import axios from 'axios';
import Button from 'react-bootstrap/Button'
import Alert from 'react-bootstrap/Alert'

interface BookingModalProps {
    show: boolean,
    onClose: () => void;
}

enum BookingSteps {
    Step1,
    Step2,
    Step3,
}

const BookingModal = ({ show, onClose }: BookingModalProps) => {
    const [currentStep, setCurrentStep] = useState(BookingSteps.Step1);
    const [apiError, setApiError] = useState('');

    const goToNextStep = async () => {
        // Lógica específica para cada paso
        if (currentStep === BookingSteps.Step1) {
            try {
                // Llama a la API para realizar la reserva
                axios.post('/api/reserve', { /* Datos de reserva */ }).then((response) => {
                    setCurrentStep(BookingSteps.Step2);
                }).catch((error) => {
                    console.error(error);
                    setApiError(error)
                });
            } catch (error) {
                // Manejo de errores
                console.error('Error al realizar la reserva:', error);
            }
        } else if (currentStep === BookingSteps.Step2) {
            // Lógica para el paso 2
            // Puedes agregar más pasos según sea necesario
            setCurrentStep(BookingSteps.Step3);
        }
    };

    return (
        <BaseModal title={'Book'} show={show} onClose={onClose}>
            {currentStep === BookingSteps.Step1 && (
                <div>
                    <h2>Paso 1: Información de reserva</h2>
                    {/* Contenido del paso 1 */}
                    <Button onClick={goToNextStep}>Siguiente</Button>
                    {apiError != '' && (
                        <Alert key={'danger'} variant={'danger'} >
                            This is a danger alert—check it out!
                        </Alert >
                    )}
                </div>
            )}

            {currentStep === BookingSteps.Step2 && (
                <div>
                    <h2>Paso 2: Confirmación de reserva</h2>
                    {/* Contenido del paso 2 */}
                    <Button onClick={goToNextStep}>Siguiente</Button>
                </div>
            )}

            {currentStep === BookingSteps.Step3 && (
                <div>
                    <h2>Paso 3: Reserva completada</h2>
                </div>
            )}
        </BaseModal>
    );
};

export default BookingModal;
