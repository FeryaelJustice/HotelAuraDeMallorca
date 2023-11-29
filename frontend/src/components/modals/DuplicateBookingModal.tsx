import BaseModal from './BaseModal';
import { Booking } from './../../models';

interface DuplicateBookingModalProps {
    colorScheme: string,
    show: boolean,
    onClose: () => void;
    bookingData: Booking;
}

const DuplicateBookingModal = ({ colorScheme, show, onClose, bookingData }: DuplicateBookingModalProps) => {

    console.log(colorScheme)

    const handleClose = () => {
        onClose();
    }

    return (
        <BaseModal title="Duplicate booking" show={show} onClose={handleClose}>
            <p>{bookingData.id}</p>
        </BaseModal>
    )
};

export default DuplicateBookingModal;