import { useEffect, useState } from 'react'
import { useCookies } from 'react-cookie';
import { useNavigate } from 'react-router-dom';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import serverAPI from './../services/serverAPI';
import { Booking } from '../models';

// Calendar properties
type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface AdminProps {
    colorScheme: string,
}

export const Admin = ({ colorScheme }: AdminProps) => {
    // Dependencies
    const navigate = useNavigate();
    const [cookies] = useCookies(['token']);

    window.scrollTo({
        top: 0,
        behavior: 'smooth',
    });

    // All bookings
    const [bookings, setBookings] = useState<Booking[]>();

    // Current data of selected booking
    const [selectedBookingId, setSelectedBookingId] = useState<number>(-1);
    const [selectedBookingUserID, setSelectedBookingUserID] = useState<number>();
    const [selectedBookingPlanID, setSelectedBookingPlanID] = useState<number>();
    const [selectedBookingRoomID, setSelectedBookingRoomID] = useState<number>();
    // Calendars
    const [selectedBookingStartDate, onChangeSelectedBookingStartDate] = useState<Value>();
    const [selectedBookingEndDate, onChangeSelectedBookingEndDate] = useState<Value>();

    // Data to fill the options
    const [userIDs, setUserIDs] = useState<number[]>();
    const [planIDs, setPlanIDs] = useState<number[]>();
    const [roomIDs, setRoomIDs] = useState<number[]>();

    // One time async
    useEffect(() => {
        if (!cookies.token) {
            navigate("/")
        }
        serverAPI.get('/bookings', { headers: { 'Authorization': cookies.token } }).then(res => {
            let bookingsRes: Booking[] = [];
            res.data.data.forEach((booking: any) => {
                bookingsRes.push(new Booking({ id: booking.id, userID: booking.user_id, planID: booking.plan_id, roomID: booking.room_id, startDate: booking.booking_start_date, endDate: booking.booking_end_date, isCancelled: booking.is_cancelled }))
            })
            setBookings(bookingsRes)

            getFieldsData();
        }).catch(err => console.log(err))
    }, [])

    function clearData() {
        setSelectedBookingId(-1);
        setSelectedBookingUserID(-1);
        setSelectedBookingPlanID(-1);
        setSelectedBookingRoomID(-1);
        onChangeSelectedBookingStartDate(new Date());
        onChangeSelectedBookingEndDate(new Date());
    }

    async function getFieldsData() {
        // User ids
        const userIDS = await serverAPI.get('/usersID');
        let userids: number[] = []
        userIDS.data.data.forEach((userID: any) => {
            userids.push(userID.id)
        })
        setUserIDs(userids)
        // Plan ids
        const planIDS = await serverAPI.get('/plansID');
        let planids: number[] = []
        planIDS.data.data.forEach((planID: any) => {
            planids.push(planID.id)
        })
        setPlanIDs(planids)
        // Room ids
        const roomIDS = await serverAPI.get('/roomsID');
        let roomids: number[] = []
        roomIDS.data.data.forEach((roomID: any) => {
            roomids.push(roomID.id)
        })
        setRoomIDs(roomids)
    }

    // Handle change of entire booking object (like creating a new)
    const handleBookingIDSelectChange = (e: any) => {
        const id = e.target.value;
        setSelectedBookingId(id);
        const selected = bookings?.find((booking) => booking.id == id);
        setSelectedBookingUserID(selected?.userID ? selected.userID : -1)
        setSelectedBookingPlanID(selected?.planID ? selected.planID : -1)
        setSelectedBookingRoomID(selected?.roomID ? selected.roomID : -1)
        onChangeSelectedBookingStartDate(new Date(selected?.startDate ? selected.startDate : new Date()))
        onChangeSelectedBookingEndDate(new Date(selected?.endDate ? selected.endDate : new Date()))
    };

    const handleBookingStartDateChange = (newStartDate: Value) => {
        onChangeSelectedBookingStartDate(newStartDate);
    }

    const handleBookingEndDateChange = (newEndDate: Value) => {
        onChangeSelectedBookingEndDate(newEndDate);
    }

    // Form actions
    const handleAdminEditBookingFormSubmit = (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        const data = {
            id: Number(selectedBookingId),
            userID: Number(selectedBookingUserID),
            planID: Number(selectedBookingPlanID),
            roomID: Number(selectedBookingRoomID),
            startDate: selectedBookingStartDate,
            endDate: selectedBookingEndDate
        }
        serverAPI.put('/booking', data, { headers: { 'Authorization': cookies.token } }).then(res => {
            alert(res.data.msg)
        }).catch(err => console.log(err))
    }

    const deleteBooking = () => {
        serverAPI.delete('/booking/' + selectedBookingId, { headers: { 'Authorization': cookies.token } }).then(res => {
            alert(res.data.msg)
            clearData()
            navigate("/")
        }).catch(err => console.log(err))
    }

    return (
        <div style={{ color: colorScheme == 'light' ? 'black' : 'white' }}>
            <h1>Sección de administrador</h1>
            <div className='admin_bookingSection'>
                <h2>Bookings</h2>
                <div className='adminSelectBooking' style={{ display: 'flex' }}>
                    <label htmlFor="selectBooking" style={{ marginRight: '10px' }}>Select a Booking:</label>
                    <select id='selectBooking' name='selectBooking' value={selectedBookingId} onChange={handleBookingIDSelectChange}>
                        <option value="">Select a Booking</option>
                        {bookings?.map((booking) => (
                            <option key={booking.id} value={booking?.id ? booking.id : -1}>
                                {booking.id}
                            </option>
                        ))}
                    </select>
                </div>
                {selectedBookingId != -1 && (
                    <div className='admin_booking'>
                        <h3>Booking ID: {selectedBookingId}</h3>
                        <Form id='adminEditBookingForm' className='adminEditBookingForm' onSubmit={handleAdminEditBookingFormSubmit}>
                            <Form.Group className="mb-3" controlId="bookingID">
                                <Form.Label>User ID</Form.Label>
                                <Form.Select aria-label='User ID select' value={selectedBookingUserID} onChange={(e: any) => { setSelectedBookingUserID(e.target.value) }}>
                                    {userIDs?.map((userID) => (
                                        <option key={userID} value={userID}>
                                            {userID}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>

                            <Form.Group className="mb-3" controlId="bookingPlanID">
                                <Form.Label>Plan ID</Form.Label>
                                <Form.Select aria-label='Plan ID select' value={selectedBookingPlanID} onChange={(e: any) => { setSelectedBookingPlanID(e.target.value) }}>
                                    {planIDs?.map((planID) => (
                                        <option key={planID} value={planID}>
                                            {planID}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>

                            <Form.Group className="mb-3" controlId="bookingRoomID">
                                <Form.Label>Room ID</Form.Label>
                                <Form.Select aria-label='Room ID select' value={selectedBookingRoomID} onChange={(e: any) => { setSelectedBookingRoomID(e.target.value) }}>
                                    {roomIDs?.map((roomID) => (
                                        <option key={roomID} value={roomID}>
                                            {roomID}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>

                            <Form.Group className="mb-3" controlId="bookingStartDate">
                                <Form.Label>Book Start Date</Form.Label>
                                <Calendar onChange={handleBookingStartDateChange} value={selectedBookingStartDate} />
                            </Form.Group>

                            <Form.Group className="mb-3" controlId="bookingEndDate">
                                <Form.Label>Book End Date</Form.Label>
                                <Calendar onChange={handleBookingEndDateChange} value={selectedBookingEndDate} />
                            </Form.Group>

                            <div className='admin_bookings_selector'>
                                <Button variant='primary' type='submit'>Editar</Button>
                                <Button variant='danger' onClick={() => deleteBooking()}>Eliminar</Button>
                            </div>
                        </Form>
                    </div>
                )}
            </div>
        </div>
    );
}