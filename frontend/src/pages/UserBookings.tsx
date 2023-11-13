import { useEffect, useState } from 'react'
import { useCookies } from 'react-cookie';
import { useNavigate } from 'react-router-dom';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { Booking } from '../models';
import serverAPI from './../services/serverAPI';
import { API_URL } from './../services/consts';

interface UserBookingsProps {
    colorScheme: string,
    userHasBookings: boolean
}

export const UserBookings = ({ colorScheme, userHasBookings }: UserBookingsProps) => {
    // Dependencies
    const navigate = useNavigate();
    const [cookies] = useCookies(['token']);

    // All bookings
    const [bookings, setBookings] = useState<Booking[]>();

    // Current data of selected booking
    const [selectedBookingId, setSelectedBookingId] = useState<number>(-1);

    // One time async
    useEffect(() => {
        if (!cookies.token && !userHasBookings) {
            navigate("/")
        }
        serverAPI.get(API_URL + '/bookingsByUser', { headers: { 'Authorization': cookies.token } }).then(res => {
            let bookingsRes: Booking[] = [];
            res.data.data.forEach((booking: any) => {
                bookingsRes.push(new Booking({ id: booking.id, userID: booking.user_id, planID: booking.plan_id, roomID: booking.room_id, startDate: booking.booking_start_date, endDate: booking.booking_end_date }))
            })
            setBookings(bookingsRes)
        }).catch(err => console.log(err))
    }, [])

    // Handle change of entire booking object (like creating a new)
    const handleBookingIDSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = parseInt(e.target.value, 10);
        setSelectedBookingId(isNaN(id) ? -1 : id);
        // const selected = bookings?.find((booking) => booking.id == id);
    };

    // Form actions
    const handleUserEditBookingFormSubmit = (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        const data = {
            bookingID: Number(selectedBookingId),
        }
        serverAPI.put('/cancelBookingByUser', data, { headers: { 'Authorization': cookies.token } }).then(res => {
            alert(res.data.msg)
            removeBooking();
        }).catch(error => {
            console.error(error)
            if (error && error.response && error.response.data) {
                if (error.response.data.message) {
                    alert(error.response.data.message)
                }
                if (error.response.data.error) {
                    alert(error.response.data.error)
                }
            }
        })
    }

    function removeBooking() {
        // Use filter to create a new array without the selected booking
        const updatedBookings = bookings?.filter(booking => booking.id !== selectedBookingId);
        setBookings(updatedBookings);
        // Reset selectedBookingId to indicate that nothing is selected
        setSelectedBookingId(-1);
    };


    return (
        <div style={{ color: colorScheme == 'light' ? 'black' : 'white' }}>
            <h1>Administra tus reservas</h1>
            <div className='user_bookingSection' style={{ display: 'flex', justifyContent: 'start', alignContent: 'center', margin: '20px' }}>
                {bookings && bookings.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '200px' }}>
                        <h2>Reservas</h2>
                        <label htmlFor="selectBooking">Selecciona una reserva:</label>
                        <select id='selectBooking' name='selectBooking' value={selectedBookingId} onChange={handleBookingIDSelectChange}>
                            <option value="">Selecciona una reserva</option>
                            {bookings?.map((booking) => (
                                <option key={booking.id} value={booking?.id ? booking.id : -1}>
                                    {booking.id}
                                </option>
                            ))}
                        </select>
                        {selectedBookingId != -1 && (
                            <div className='user_booking'>
                                <h3>Booking ID: {selectedBookingId}</h3>
                                <Form id='userEditBookingForm' className='userEditBookingForm' onSubmit={handleUserEditBookingFormSubmit}>
                                    <Form.Group className="mb-3" controlId="cancelledBooking" style={{ display: 'flex', flexDirection: 'row' }}>
                                        <Button aria-label='Cancel booking button' variant='danger' type='submit'>Cancelar la reserva</Button>
                                    </Form.Group>
                                </Form>
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <p>No tienes reservas</p>
                    </div>
                )}
            </div>
        </div>
    );
}