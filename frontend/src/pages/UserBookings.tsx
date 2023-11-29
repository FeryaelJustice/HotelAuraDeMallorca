import { useEffect, useState } from 'react'
import { useCookies } from 'react-cookie';
import { useNavigate } from 'react-router-dom';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import { Booking, Plan, Room } from '../models';
import serverAPI from './../services/serverAPI';
import { API_URL } from './../services/consts';
import Calendar from 'react-calendar';
import { useTranslation } from "react-i18next";

// Calendar properties
type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface UserBookingsProps {
    colorScheme: string,
    userHasBookings: boolean,
    openDuplicateBookingModal: (booking: Booking) => void,
}

export const UserBookings = ({ colorScheme, userHasBookings, openDuplicateBookingModal }: UserBookingsProps) => {
    // Dependencies
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [cookies] = useCookies(['token']);

    window.scrollTo({
        top: 0,
        behavior: 'smooth',
    });

    // All bookings
    const [bookings, setBookings] = useState<Booking[]>();

    // To display info
    const [plans, setPlans] = useState<Plan[]>();
    const [rooms, setRooms] = useState<Room[]>();

    // Current data of selected booking
    const [selectedBookingId, setSelectedBookingId] = useState<number>(-1);
    const [selectedBooking, setSelectedBooking] = useState<Booking>(new Booking());
    const [selectedBookingStartDate, setSelectedBookingStartDate] = useState<Value>();
    const [selectedBookingEndDate, setSelectedBookingEndDate] = useState<Value>();
    const [selectedBookingIsCancelled, setSelectedBookingIsCancelled] = useState<boolean>(false);

    // One time async
    useEffect(() => {
        if (!cookies.token || !userHasBookings) {
            navigate("/")
        }
        serverAPI.get(API_URL + '/bookingsByUser', { headers: { 'Authorization': cookies.token } }).then(res => {
            let bookingsRes: Booking[] = [];
            res.data.data.forEach((booking: any) => {
                bookingsRes.push(new Booking({ id: booking.id, userID: booking.user_id, planID: booking.plan_id, roomID: booking.room_id, startDate: booking.booking_start_date, endDate: booking.booking_end_date, isCancelled: booking.is_cancelled }))
            })
            setBookings(bookingsRes)
        }).catch(err => console.log(err))

        serverAPI.get(API_URL + '/plans').then(res => {
            let plansRes: Plan[] = [];
            res.data.data.forEach((plan: any) => {
                plansRes.push(new Plan({ id: plan.id, name: plan.plan_name, description: plan.plan_description, price: plan.plan_price, imageURL: plan.imageURL }))
            })
            setPlans(plansRes)
        }).catch(err => console.log(err))


        serverAPI.get(API_URL + '/rooms').then(res => {
            let roomsRes: Room[] = [];
            res.data.data.forEach((room: any) => {
                roomsRes.push(new Room({ id: room.id, name: room.room_name, description: room.room_description, price: room.room_price, availabilityStart: room.room_availability_start, availabilityEnd: room.room_availability_end, imageURL: room.imageURL }))
            })
            setRooms(roomsRes)
        }).catch(err => console.log(err))
    }, [])

    // Handle change of entire booking object (like creating a new)
    const handleBookingIDSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = parseInt(e.target.value, 10);
        setSelectedBookingId(isNaN(id) ? -1 : id);

        const selectedBk = bookings?.find((booking) => booking.id == id);
        setSelectedBooking(selectedBk ? selectedBk : new Booking())
        const startDate = new Date(selectedBk?.startDate ? selectedBk.startDate : new Date());
        const endDate = new Date(selectedBk?.endDate ? selectedBk.endDate : new Date());
        endDate.setDate(endDate.getDate() + 1)
        setSelectedBookingStartDate(startDate)
        setSelectedBookingEndDate(endDate)
        setSelectedBookingIsCancelled(selectedBk?.isCancelled ? selectedBk.isCancelled : false)
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
            window.location.reload();
            // removeBooking();
        }).catch(error => {
            console.log(error)
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

    /*
    function removeBooking() {
        // Use filter to create a new array without the selected booking
        const updatedBookings = bookings?.filter(booking => booking.id !== selectedBookingId);
        setBookings(updatedBookings);
        // Reset selectedBookingId to indicate that nothing is selected
        setSelectedBookingId(-1);
    };
    */

    const getPlanName = (bookingPlanId: any) => {
        const matchingPlan = plans?.find((plan) => plan.id === bookingPlanId);
        return matchingPlan ? matchingPlan.name : '';
    };

    const getRoomName = (bookingRoomId: any) => {
        const matchingRoom = rooms?.find((room) => room.id === bookingRoomId);
        return matchingRoom ? matchingRoom.name : '';
    };

    return (
        <div style={{ color: colorScheme == 'light' ? 'black' : 'white' }}>
            <h1 style={{ margin: '20px', paddingTop: '20px' }}>{t("userBookings_title")}</h1>
            <div className='user_bookingSection' style={{ display: 'flex', justifyContent: 'start', alignContent: 'center', margin: '20px' }}>
                {bookings && bookings.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', width: '200px' }}>
                        <h2>{t("bookings")}</h2>
                        <label htmlFor="selectBooking">{t("userBookings_select")}:</label>
                        <select id='selectBooking' name='selectBooking' value={selectedBookingId} onChange={handleBookingIDSelectChange}>
                            <option value="">{t("userBookings_select")}</option>
                            {bookings?.map((booking) => (
                                <option key={booking.id} value={booking?.id ? booking.id : -1}>
                                    {t("booking")} - {t("startDate")}: {booking?.startDate?.toString()} / {t("endDate")}: {booking?.endDate?.toString()}
                                </option>
                            ))}
                        </select>
                        <hr />
                        {selectedBookingId != -1 && (
                            <div className='user_booking' style={{ marginTop: '10px' }}>
                                <h3>ID: {selectedBookingId}</h3>
                                <p>{t("plan")}: {getPlanName(bookings.find((booking) => booking.id === selectedBookingId)?.planID)}</p>
                                <p>{t("room")}: {getRoomName(bookings.find((booking) => booking.id === selectedBookingId)?.roomID)}</p>
                                <Form id="userDisplayBookingData" className='userDisplayBookingData' style={{ display: 'flex' }}>
                                    <Form.Group className="mb-3" controlId="bookingStartDate" style={{ marginRight: '10%' }}>
                                        <Form.Label>{t("startDate")}</Form.Label>
                                        <Calendar value={selectedBookingStartDate} />
                                    </Form.Group>

                                    <Form.Group className="mb-3" controlId="bookingEndDate">
                                        <Form.Label>{t("endDate")}</Form.Label>
                                        <Calendar value={selectedBookingEndDate} />
                                    </Form.Group>
                                </Form>
                                <Form id='userEditBookingForm' className='userEditBookingForm' onSubmit={handleUserEditBookingFormSubmit}>
                                    <Form.Group className="mb-3" controlId="cancelledBooking" style={{ display: 'flex', flexDirection: 'row' }}>
                                        {!selectedBookingIsCancelled ? (
                                            <Button aria-label='Cancel booking button' variant='danger' type='submit'>Cancelar la reserva</Button>
                                        ) : (
                                            <div>
                                                    <p>{t("modal_duplicatebooking_cancelledBooking")}</p>
                                                    <Button aria-label='Duplicate booking button' variant='primary' onClick={() => { openDuplicateBookingModal(selectedBooking ? selectedBooking : new Booking()) }}>{t("userBookings_btnDuplicate")}</Button>
                                            </div>

                                        )}
                                    </Form.Group>
                                </Form>
                                <hr />
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                            <p>{t("modal_duplicatebooking_noBookings")}</p>
                    </div>
                )}
            </div>
        </div>
    );
}