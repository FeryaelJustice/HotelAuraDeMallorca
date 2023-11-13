import { useEffect, useState } from 'react'
import { useCookies } from 'react-cookie';
import { useNavigate } from 'react-router-dom';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import serverAPI from './../services/serverAPI';
import { Booking } from '../models';
import axios from 'axios';
import { API_URL } from './../services/consts';

interface UserBookingsProps {
    colorScheme: string,
    userHasBookings: boolean
}

export const UserBookings = ({ colorScheme, userHasBookings }: UserBookingsProps) => {

    console.log(colorScheme)

    // Dependencies
    const navigate = useNavigate();
    const [cookies] = useCookies(['token']);

    // User
    const [userID, setUserID] = useState<number>();

    // All bookings
    const [bookings, setBookings] = useState<Booking[]>();

    // Current data of selected booking
    const [selectedBookingId, setSelectedBookingId] = useState<number>(-1);
    const [cancelledBookingCheck, setCancelledBookingCheck] = useState<boolean>(false);

    // One time async
    useEffect(() => {
        if (!cookies.token && !userHasBookings) {
            navigate("/")
        }
        getAllLoggedUserData().then(res => {
            let resp = res.data;
            setUserID(resp.id);
            axios.get(API_URL + '/bookingsByUser/' + resp.id).then((data) => {
                console.log(data)
                let bookingsRes: Booking[] = [];
                res.data.data.forEach((booking: any) => {
                    bookingsRes.push(new Booking({ id: booking.id, userID: booking.user_id, planID: booking.plan_id, roomID: booking.room_id, startDate: booking.booking_start_date, endDate: booking.booking_end_date }))
                })
                setBookings(bookingsRes)
            }).catch(err => console.log(err))
        })
    }, [])

    // Handle change of entire booking object (like creating a new)
    const handleBookingIDSelectChange = (e: any) => {
        const id = e.target.value;
        setSelectedBookingId(id);
        // const selected = bookings?.find((booking) => booking.id == id);
    };
    // Form actions
    const handleAdminEditBookingFormSubmit = (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        const data = {
            id: Number(selectedBookingId),
            userID: Number(userID)
        }
        serverAPI.post('/booking', data, { headers: { 'Authorization': cookies.token } }).then(res => {
            alert(res.data.msg)
        }).catch(err => console.error(err))
    }

    // Get JWT user data
    async function getAllLoggedUserData(): Promise<any> {
        const loggedUserID = await serverAPI.post('/getLoggedUserID', { token: cookies.token });
        if (loggedUserID) {
            const getLoggedUserData = await serverAPI.get('/loggedUser/' + loggedUserID.data.userID).catch(err => {
                console.error(err)
            });
            if (getLoggedUserData) {
                return getLoggedUserData.data;
            }
        }
    }

    return (
        <div>
            <h1>Administra tus reservas</h1>
            <div className='admin_bookingSection'>
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
                        <Form id='userEditBookingForm' className='userEditBookingForm' onSubmit={handleAdminEditBookingFormSubmit}>
                            <Form.Group className="mb-3" controlId="cancelledBooking">
                                <Form.Label>Cancelled booking?</Form.Label>
                                <Form.Check aria-label='Cancelled booking checkbox' type='checkbox' checked={cancelledBookingCheck} onChange={(e: any) => { setCancelledBookingCheck(e.target.value) }} />
                            </Form.Group>

                            <div className='user_bookings_selector'>
                                <Button variant='primary' type='submit'>Guardar</Button>
                            </div>
                        </Form>
                    </div>
                )}
            </div>
        </div>
    );
}