import { useState, useEffect } from "react";
import BaseModal from './BaseModal';
import { useCookies } from 'react-cookie';
import { Booking } from './../../models';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { Button } from "react-bootstrap";
import serverAPI from './../../services/serverAPI';

interface DuplicateBookingModalProps {
    colorScheme: string,
    show: boolean,
    onClose: () => void;
    bookingData: Booking;
}

// Calendar properties
type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

const DuplicateBookingModal = ({ colorScheme, show, onClose, bookingData }: DuplicateBookingModalProps) => {

    console.log(colorScheme)
    const [cookies] = useCookies(['token']);
    const [booking, setBooking] = useState<Booking>()
    const [startDate, onChangeStartDate] = useState<Value>();
    const [endDate, onChangeEndDate] = useState<Value>();

    useEffect(() => {
        if (show) {
            setBooking(bookingData);
            onChangeStartDate(bookingData.startDate);
            onChangeEndDate(bookingData.endDate);
        }
    }, [show])

    const handleClose = () => {
        onClose();
    }

    const handleStartDateChange = (newStartDate: Value) => {
        onChangeStartDate(newStartDate);
    }

    const handleEndDateChange = (newEndDate: Value) => {
        onChangeEndDate(newEndDate);
    }

    function duplicateBooking() {
        if (!booking || !startDate || !endDate) {
            console.error('Booking or startDate or endDate are undefined');
            return;
        }

        const bookingDuplicate: Partial<Booking> = { ...booking };

        // Format the startDate and endDate to "YYYY-MM-DD" string
        const formattedStartDate = startDate instanceof Date
            ? startDate.toISOString().split('T')[0]
            : undefined;

        const formattedEndDate = endDate instanceof Date
            ? endDate.toISOString().split('T')[0]
            : undefined;

        bookingDuplicate.startDate = startDate instanceof Date ? startDate : booking.startDate;
        bookingDuplicate.endDate = endDate instanceof Date ? endDate : booking.endDate;

        setBooking(bookingDuplicate as Booking)
        
        const formattedNewBooking = { ...bookingDuplicate, startDate: formattedStartDate, endDate: formattedEndDate }

        if (formattedNewBooking.startDate && formattedNewBooking.endDate) {
            try {
                serverAPI.post('/duplicateBooking', formattedNewBooking, {
                    headers: { 'Authorization': cookies.token }
                }).then(response => {
                    if (response && response.data && response.data.msg) {
                        alert(response.data.msg)
                    }
                    onClose();
                    window.location.reload();
                }).catch(err => {
                    if (err && err.response && err.response.data && err.response.data.error) {
                        alert(err.response.data.error)
                    }
                    console.log(err)
                });
            } catch (error) {
                console.log('Error duplicating booking:', error);
            }
        }
    }

    return (
        <BaseModal title="Duplicate booking" show={show} onClose={handleClose}>
            <em>Todos los datos de esta reserva se mantienen (servicios vinculados, pago...),<br /> lo único que debes cambiar son las fechas</em><hr />
            <p>Reserva ID: {booking?.id}</p>
            <Container>
                <Row>
                    <Col>
                        <Calendar
                            minDate={new Date()}
                            value={startDate}
                            onChange={handleStartDateChange}
                        />
                    </Col>
                    <Col>
                        <Calendar
                            minDate={booking?.startDate instanceof Date ? new Date(booking.startDate.getTime() + 24 * 60 * 60 * 1000) : undefined}
                            value={endDate}
                            onChange={handleEndDateChange}
                        />
                    </Col>
                </Row>
                <br />
                <Button variant="primary" onClick={duplicateBooking} aria-label="duplicateBookingBtn">Hacer nueva reserva a partir de ésta</Button>
            </Container>
        </BaseModal>
    )
};

export default DuplicateBookingModal;