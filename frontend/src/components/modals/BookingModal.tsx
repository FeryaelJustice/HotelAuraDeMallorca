// ReserveModal.tsx
import React from 'react';
import BaseModal from './BaseModal';

interface BookingModalProps {
    onClose: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ onClose }) => {
    return (
        <BaseModal onClose={onClose}>
            {/* Contenido específico del modal de reserva */}
            <h2>Booking Modal Content</h2>
        </BaseModal>
    );
};

export default BookingModal;
