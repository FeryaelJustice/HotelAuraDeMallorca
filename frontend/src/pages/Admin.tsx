import { useEffect, useState } from 'react';
import { useCookies } from 'react-cookie';
import { useNavigate } from 'react-router-dom';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import serverAPI from './../services/serverAPI';
import { Booking, Room, Plan } from '../models';
import { useTranslation } from "react-i18next";
import { UserRoles } from '../constants';
import { API_URL_BASE } from '../services/consts';
import './Admin.css';

// Calendar properties
type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface AdminProps {
    colorScheme: string;
}

interface UserSummary {
    id: number;
    user_name?: string;
    user_surnames?: string;
    user_email?: string;
    user_dni?: string;
}

interface BookingWithDetails extends Booking {
    userName?: string;
    userSurnames?: string;
    userEmail?: string;
    userDni?: string;
    roomName?: string;
    roomPrice?: number;
    planName?: string;
    planPrice?: number;
}

interface GuestItem {
    id: number;
    guest_name: string;
    guest_surnames: string;
    guest_email: string;
    isAdult: number | boolean;
    isSystemUser: number | boolean;
}

interface ServiceItem {
    id: number;
    serv_name: string;
    serv_price: string | number;
}

interface BookingLookupResult {
    booking_id: number;
    user_id: number;
    plan_id: number;
    room_id: number;
    booking_start_date: string;
    booking_end_date: string;
    cancellation_deadline?: string;
    is_cancelled: number | boolean;
    created_at?: string;
    user_name?: string;
    user_surnames?: string;
    user_email?: string;
    user_dni?: string;
    room_name?: string;
    room_price?: number;
    plan_name?: string;
    plan_price?: number;
    payment_id?: number;
    payment_amount?: number;
    payment_method_id?: number;
    payment_method_name?: string;
    guests: GuestItem[];
    services: ServiceItem[];
    locator: string;
}

export const Admin = ({ colorScheme }: AdminProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [cookies] = useCookies(['token']);

    // Tab state: 'scanner' | 'manage'
    const [activeTab, setActiveTab] = useState<'scanner' | 'manage'>('scanner');

    // Admin Auth State
    const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

    // QR Locator Search State
    const [locatorInput, setLocatorInput] = useState<string>('');
    const [isSearchingLocator, setIsSearchingLocator] = useState<boolean>(false);
    const [locatorError, setLocatorError] = useState<string | null>(null);
    const [foundBooking, setFoundBooking] = useState<BookingLookupResult | null>(null);

    // All bookings for the management section
    const [bookings, setBookings] = useState<BookingWithDetails[]>();

    // Current data of selected booking
    const [selectedBookingId, setSelectedBookingId] = useState<number>(-1);
    const [selectedBookingUserID, setSelectedBookingUserID] = useState<number>();
    const [selectedBookingPlanID, setSelectedBookingPlanID] = useState<number>();
    const [selectedBookingRoomID, setSelectedBookingRoomID] = useState<number>();

    // Calendars
    const [selectedBookingStartDate, onChangeSelectedBookingStartDate] = useState<Value>();
    const [selectedBookingEndDate, onChangeSelectedBookingEndDate] = useState<Value>();

    // Guests belonging to the currently selected booking
    const [selectedBookingGuests, setSelectedBookingGuests] = useState<GuestItem[]>([]);
    const [isLoadingBookingGuests, setIsLoadingBookingGuests] = useState<boolean>(false);

    // Dropdown catalogs
    const [usersCatalog, setUsersCatalog] = useState<UserSummary[]>([]);
    const [plansCatalog, setPlansCatalog] = useState<Plan[]>([]);
    const [roomsCatalog, setRoomsCatalog] = useState<Room[]>([]);

    // Initial auth & role verification
    useEffect(() => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });

        if (!cookies.token) {
            navigate("/");
            return;
        }

        const verifyStaffAccess = async () => {
            try {
                const idRes = await serverAPI.post('/getLoggedUserID', { token: cookies.token });
                const userId = idRes?.data?.userID;
                if (!userId) {
                    navigate("/");
                    return;
                }

                const roleRes = await serverAPI.get('/getUserRole/' + userId, {
                    headers: { 'Authorization': cookies.token }
                });
                const roleName = roleRes?.data?.data?.name;

                if (roleName === UserRoles.ADMIN || roleName === UserRoles.EMPLOYEE) {
                    setIsAuthorized(true);
                    loadBookingsAndFields();
                } else {
                    navigate("/");
                }
            } catch (err) {
                console.error("Staff authorization check failed:", err);
                navigate("/");
            }
        };

        verifyStaffAccess();
    }, [cookies.token, navigate]);

    const loadBookingsAndFields = async () => {
        try {
            const res = await serverAPI.get('/bookings', { headers: { 'Authorization': cookies.token } });
            const bookingsRes: BookingWithDetails[] = [];
            if (res.data?.data) {
                res.data.data.forEach((booking: any) => {
                    const b = new Booking({
                        id: booking.id,
                        userID: booking.user_id,
                        planID: booking.plan_id,
                        roomID: booking.room_id,
                        startDate: booking.booking_start_date,
                        endDate: booking.booking_end_date,
                        isCancelled: booking.is_cancelled
                    }) as BookingWithDetails;

                    b.userName = booking.user_name;
                    b.userSurnames = booking.user_surnames;
                    b.userEmail = booking.user_email;
                    b.userDni = booking.user_dni;
                    b.roomName = booking.room_name;
                    b.roomPrice = booking.room_price;
                    b.planName = booking.plan_name;
                    b.planPrice = booking.plan_price;

                    bookingsRes.push(b);
                });
            }
            setBookings(bookingsRes);
            getFieldsData();
        } catch (err) {
            console.error("Error loading bookings:", err);
        }
    };

    function clearData() {
        setSelectedBookingId(-1);
        setSelectedBookingUserID(-1);
        setSelectedBookingPlanID(-1);
        setSelectedBookingRoomID(-1);
        setSelectedBookingGuests([]);
        onChangeSelectedBookingStartDate(new Date());
        onChangeSelectedBookingEndDate(new Date());
    }

    async function getFieldsData() {
        try {
            const [usersRes, plansRes, roomsRes] = await Promise.all([
                serverAPI.get('/usersID', { headers: { 'Authorization': cookies.token } }),
                serverAPI.get('/plans'),
                serverAPI.get('/rooms')
            ]);

            if (usersRes?.data?.data) {
                setUsersCatalog(usersRes.data.data);
            }

            if (plansRes?.data?.data) {
                const plansData: Plan[] = plansRes.data.data.map((p: any) => new Plan({
                    id: p.id,
                    name: p.plan_name || p.name,
                    description: p.plan_description || p.description,
                    price: p.plan_price || p.price,
                    imageURL: p.imageURL
                }));
                setPlansCatalog(plansData);
            }

            if (roomsRes?.data?.data) {
                const roomsData: Room[] = roomsRes.data.data.map((r: any) => new Room({
                    id: r.id,
                    name: r.room_name || r.name,
                    description: r.room_description || r.description,
                    price: r.room_price || r.price,
                    availabilityStart: r.room_availability_start,
                    availabilityEnd: r.room_availability_end,
                    imageURL: r.imageURL
                }));
                setRoomsCatalog(roomsData);
            }
        } catch (err) {
            console.error("Error fetching admin catalogs:", err);
        }
    }

    // QR Locator Lookup
    const handleLocatorSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const query = locatorInput.trim();
        if (!query) {
            setLocatorError('Por favor introduce un localizador o ID de reserva.');
            return;
        }

        setIsSearchingLocator(true);
        setLocatorError(null);
        setFoundBooking(null);

        try {
            const res = await serverAPI.get(`/bookingByLocator/${encodeURIComponent(query)}`, {
                headers: { 'Authorization': cookies.token }
            });

            if (res.data?.data) {
                setFoundBooking(res.data.data);
            } else {
                setLocatorError('No se encontró ninguna reserva asociada.');
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Error al localizar la reserva. Comprueba el código o los permisos.';
            setLocatorError(msg);
        } finally {
            setIsSearchingLocator(false);
        }
    };

    const handleBookingIDSelectChange = (e: any) => {
        const id = Number(e.target.value);
        setSelectedBookingId(id);
        const selected = bookings?.find((b) => b.id == id);
        setSelectedBookingUserID(selected?.userID ? selected.userID : -1);
        setSelectedBookingPlanID(selected?.planID ? selected.planID : -1);
        setSelectedBookingRoomID(selected?.roomID ? selected.roomID : -1);
        onChangeSelectedBookingStartDate(new Date(selected?.startDate ? selected.startDate : new Date()));
        onChangeSelectedBookingEndDate(new Date(selected?.endDate ? selected.endDate : new Date()));

        // Load guest details for the selected booking
        if (id > 0) {
            setIsLoadingBookingGuests(true);
            serverAPI.get(`/bookingByLocator/${id}`, {
                headers: { 'Authorization': cookies.token }
            }).then(res => {
                if (res.data?.data?.guests) {
                    setSelectedBookingGuests(res.data.data.guests);
                } else {
                    setSelectedBookingGuests([]);
                }
            }).catch(err => {
                console.error("Error fetching guests for booking:", err);
                setSelectedBookingGuests([]);
            }).finally(() => {
                setIsLoadingBookingGuests(false);
            });
        } else {
            setSelectedBookingGuests([]);
        }
    };

    const handleBookingStartDateChange = (newStartDate: Value) => {
        onChangeSelectedBookingStartDate(newStartDate);
    };

    const handleBookingEndDateChange = (newEndDate: Value) => {
        onChangeSelectedBookingEndDate(newEndDate);
    };

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
        };
        serverAPI.put('/booking', data, { headers: { 'Authorization': cookies.token } }).then(res => {
            alert(res.data.message);
            loadBookingsAndFields();
        }).catch(err => console.error(err));
    };

    const deleteBooking = () => {
        if (!window.confirm(`¿Confirmas eliminar la reserva #${selectedBookingId}?`)) return;
        serverAPI.delete('/booking/' + selectedBookingId, { headers: { 'Authorization': cookies.token } }).then(res => {
            alert(res.data.message);
            clearData();
            loadBookingsAndFields();
        }).catch(err => console.error(err));
    };

    if (isAuthorized === null) {
        return (
            <div className={`admin-page ${colorScheme === 'dark' ? 'admin-page--dark' : 'admin-page--light'}`} style={{ padding: '6rem 2rem', textAlign: 'center' }}>
                <p>Verificando credenciales de administración...</p>
            </div>
        );
    }

    return (
        <div className={`admin-page ${colorScheme === 'dark' ? 'admin-page--dark' : 'admin-page--light'}`}>
            <header className="admin-hero">
                <span className="admin-hero__badge">
                    ✦ Portal de Administración & Recepción
                </span>
                <h1 className="admin-hero__title">
                    {t("userAdmin_title") || "Gestión Hotel Aura"}
                </h1>
                <p className="admin-hero__subtitle">
                    Control centralizado de reservas, validación de pases QR de huéspedes y configuración operativa.
                </p>
            </header>

            <div className="admin-container">
                {/* Navigation Tabs */}
                <div className="admin-tabs">
                    <button
                        type="button"
                        className={`admin-tab-btn ${activeTab === 'scanner' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('scanner')}
                    >
                        <span>📷</span>
                        <span>Escanear / Validar Pase QR</span>
                    </button>
                    <button
                        type="button"
                        className={`admin-tab-btn ${activeTab === 'manage' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('manage')}
                    >
                        <span>📅</span>
                        <span>Gestión y Modificación de Reservas</span>
                    </button>
                </div>

                {/* TAB 1: QR & LOCATOR SCANNER */}
                {activeTab === 'scanner' && (
                    <div className="admin-card">
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '6px' }}>
                                Validación de Huéspedes por Localizador QR
                            </h2>
                            <p style={{ fontSize: '0.92rem', opacity: 0.85, margin: 0 }}>
                                Introduce el localizador oficial de la reserva (ej: <code>AURA-BK-14</code>) o escanea el pase de llegada del huésped para comprobar validez y habitación.
                            </p>
                        </div>

                        <form onSubmit={handleLocatorSearch} className="admin-scanner-searchbox">
                            <Form.Control
                                type="text"
                                className="admin-scanner-input"
                                placeholder="AURA-BK-14 o ID..."
                                value={locatorInput}
                                onChange={(e) => setLocatorInput(e.target.value)}
                            />
                            <Button
                                variant="primary"
                                type="submit"
                                disabled={isSearchingLocator}
                                style={{ minWidth: '130px', fontWeight: 700, borderRadius: '12px' }}
                            >
                                {isSearchingLocator ? 'Buscando...' : '🔍 Localizar'}
                            </Button>
                        </form>

                        <div className="admin-camera-ready-notice">
                            <span>ℹ️</span>
                            <span>
                                <strong>Preparado para Lector de Cámara:</strong> El sistema admite lectores de código de barras / QR USB o Bluetooth en emulación de teclado directo en este campo, y está preparado para activación WebRTC.
                            </span>
                        </div>

                        {locatorError && (
                            <div className="alert alert-danger" style={{ borderRadius: '12px', marginBottom: '1.5rem' }}>
                                {locatorError}
                            </div>
                        )}

                        {/* FOUND BOOKING DETAILS */}
                        {foundBooking && (
                            <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.2)', paddingTop: '1.75rem' }}>
                                <div className="admin-result-header">
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                                            <span style={{
                                                fontSize: '0.8rem',
                                                fontWeight: 800,
                                                padding: '4px 10px',
                                                borderRadius: '6px',
                                                backgroundColor: foundBooking.is_cancelled ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                                color: foundBooking.is_cancelled ? '#ef4444' : '#10b981'
                                            }}>
                                                {foundBooking.is_cancelled ? 'CANCELADA' : 'RESERVA ACTIVA / CONFIRMADA'}
                                            </span>
                                            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.2rem', color: '#c5a059' }}>
                                                {foundBooking.locator}
                                            </span>
                                        </div>
                                        <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>
                                            {foundBooking.user_name} {foundBooking.user_surnames}
                                        </h3>
                                        <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>
                                            {foundBooking.user_email} | DNI: {foundBooking.user_dni || 'No indicado'}
                                        </p>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '0.78rem', opacity: 0.7, textTransform: 'uppercase' }}>Estado de Pago</span>
                                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981' }}>
                                            {foundBooking.payment_amount ? `${Number(foundBooking.payment_amount).toFixed(2)} €` : 'Liquidado'}
                                        </div>
                                        <span style={{ fontSize: '0.82rem', opacity: 0.8 }}>
                                            Método: {foundBooking.payment_method_name || 'Recepción / Tarjeta'}
                                        </span>
                                    </div>
                                </div>

                                <div className="admin-grid-details">
                                    <div className="admin-info-box">
                                        <span className="admin-info-box-title">Habitación</span>
                                        <span className="admin-info-box-value" style={{ color: '#0d6efd' }}>
                                            {foundBooking.room_name || `Habitación #${foundBooking.room_id}`}
                                        </span>
                                        <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                                            Precio base: {foundBooking.room_price || '0'} € / noche
                                        </span>
                                    </div>
                                    <div className="admin-info-box">
                                        <span className="admin-info-box-title">Régimen & Plan</span>
                                        <span className="admin-info-box-value" style={{ color: '#c5a059' }}>
                                            {foundBooking.plan_name || `Plan #${foundBooking.plan_id}`}
                                        </span>
                                        <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                                            Suplemento: {foundBooking.plan_price || '0'} €
                                        </span>
                                    </div>
                                    <div className="admin-info-box">
                                        <span className="admin-info-box-title">Fechas de la Estancia</span>
                                        <span className="admin-info-box-value">
                                            {new Date(foundBooking.booking_start_date).toLocaleDateString('es-ES')} - {new Date(foundBooking.booking_end_date).toLocaleDateString('es-ES')}
                                        </span>
                                        <span style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                                            Plazo cancelación: {foundBooking.cancellation_deadline ? new Date(foundBooking.cancellation_deadline).toLocaleDateString('es-ES') : 'Estándar'}
                                        </span>
                                    </div>
                                </div>

                                {/* GUESTS LIST */}
                                <div style={{ marginTop: '1.5rem' }}>
                                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                                        Huéspedes Registrados ({foundBooking.guests?.length || 0})
                                    </h4>
                                    {foundBooking.guests && foundBooking.guests.length > 0 ? (
                                        <div style={{ overflowX: 'auto' }}>
                                            <table className="admin-guest-table">
                                                <thead>
                                                    <tr>
                                                        <th>Nombre y Apellidos</th>
                                                        <th>Email</th>
                                                        <th>Tipo</th>
                                                        <th>Usuario Sistema</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {foundBooking.guests.map((g) => (
                                                        <tr key={g.id}>
                                                            <td><strong>{g.guest_name} {g.guest_surnames}</strong></td>
                                                            <td>{g.guest_email || '-'}</td>
                                                            <td>
                                                                <span className={`badge ${g.isAdult ? 'bg-success' : 'bg-warning'}`}>
                                                                    {g.isAdult ? 'Adulto' : 'Niño'}
                                                                </span>
                                                            </td>
                                                            <td>{g.isSystemUser ? 'Sí (Titular / Cuenta)' : 'Acompañante'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>No hay desglose de huéspedes secundarios.</p>
                                    )}
                                </div>

                                {/* EXTRA SERVICES */}
                                {foundBooking.services && foundBooking.services.length > 0 && (
                                    <div style={{ marginTop: '1.5rem' }}>
                                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                                            Servicios Adicionales Contratados
                                        </h4>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {foundBooking.services.map((s) => (
                                                <span key={s.id} style={{
                                                    padding: '6px 14px',
                                                    borderRadius: '8px',
                                                    background: 'rgba(217, 119, 6, 0.15)',
                                                    border: '1px solid rgba(217, 119, 6, 0.3)',
                                                    fontWeight: 600,
                                                    fontSize: '0.88rem'
                                                }}>
                                                    ✦ {s.serv_name} ({s.serv_price} €)
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 2: EDIT / MANAGE BOOKINGS */}
                {activeTab === 'manage' && (
                    <div className="admin-card">
                        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.25rem' }}>
                            {t("bookings") || "Gestión de Fechas y Asignaciones"}
                        </h2>
                        <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label htmlFor="selectBooking" style={{ fontWeight: 700 }}>
                                {t("userBookings_select") || "Seleccionar Reserva:"}
                            </label>
                            <Form.Select
                                id='selectBooking'
                                name='selectBooking'
                                value={selectedBookingId}
                                onChange={handleBookingIDSelectChange}
                                style={{ maxWidth: '640px' }}
                            >
                                <option value="-1">-- Selecciona una reserva --</option>
                                {bookings?.map((booking) => {
                                    const userLabel = booking.userName
                                        ? `${booking.userName} ${booking.userSurnames || ''} (ID #${booking.userID})`
                                        : `Usuario #${booking.userID}`;
                                    const roomLabel = booking.roomName
                                        ? `${booking.roomName}`
                                        : `Hab. #${booking.roomID}`;
                                    return (
                                        <option key={booking.id} value={booking?.id ? booking.id : -1}>
                                            Reserva #{booking.id} - {userLabel} | {roomLabel}
                                        </option>
                                    );
                                })}
                            </Form.Select>
                        </div>

                        {selectedBookingId !== -1 && (
                            <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.2)', paddingTop: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '1.25rem' }}>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                                        {t("booking")} ID: #{selectedBookingId}
                                    </h3>
                                    {bookings?.find(b => b.id === selectedBookingId)?.userDni && (
                                        <span style={{ fontSize: '0.88rem', opacity: 0.8 }}>
                                            DNI / Pasaporte: <strong>{bookings.find(b => b.id === selectedBookingId)?.userDni}</strong>
                                        </span>
                                    )}
                                </div>

                                <Form id='adminEditBookingForm' onSubmit={handleAdminEditBookingFormSubmit}>
                                    {/* USER SELECT */}
                                    <Form.Group className="mb-3" controlId="bookingID">
                                        <Form.Label style={{ fontWeight: 700 }}>
                                            {t("user")} Titular de la Reserva
                                        </Form.Label>
                                        <Form.Select
                                            aria-label='User ID select'
                                            value={selectedBookingUserID}
                                            onChange={(e: any) => setSelectedBookingUserID(Number(e.target.value))}
                                        >
                                            {usersCatalog && usersCatalog.length > 0 ? (
                                                usersCatalog.map((u) => (
                                                    <option key={u.id} value={u.id}>
                                                        #{u.id} - {u.user_name} {u.user_surnames || ''} {u.user_email ? `(${u.user_email})` : ''}
                                                    </option>
                                                ))
                                            ) : (
                                                <option value={selectedBookingUserID}>Usuario #{selectedBookingUserID}</option>
                                            )}
                                        </Form.Select>
                                    </Form.Group>

                                    {/* PLAN SELECT */}
                                    <Form.Group className="mb-3" controlId="bookingPlanID">
                                        <Form.Label style={{ fontWeight: 700 }}>
                                            {t("plan")} & Régimen de Estancia
                                        </Form.Label>
                                        <Form.Select
                                            aria-label='Plan ID select'
                                            value={selectedBookingPlanID}
                                            onChange={(e: any) => setSelectedBookingPlanID(Number(e.target.value))}
                                        >
                                            {plansCatalog && plansCatalog.length > 0 ? (
                                                plansCatalog.map((p) => (
                                                    <option key={p.id} value={p.id ?? -1}>
                                                        #{p.id} - {p.name} {p.price !== null && p.price !== undefined ? `(+${p.price} €)` : ''}
                                                    </option>
                                                ))
                                            ) : (
                                                <option value={selectedBookingPlanID}>Plan #{selectedBookingPlanID}</option>
                                            )}
                                        </Form.Select>
                                    </Form.Group>

                                    {/* ROOM SELECT & PREVIEW */}
                                    <Form.Group className="mb-3" controlId="bookingRoomID">
                                        <Form.Label style={{ fontWeight: 700 }}>
                                            {t("room")} Asignada
                                        </Form.Label>
                                        <Form.Select
                                            aria-label='Room ID select'
                                            value={selectedBookingRoomID}
                                            onChange={(e: any) => setSelectedBookingRoomID(Number(e.target.value))}
                                        >
                                            {roomsCatalog && roomsCatalog.length > 0 ? (
                                                roomsCatalog.map((r) => (
                                                    <option key={r.id} value={r.id ?? -1}>
                                                        #{r.id} - {r.name} {r.price !== null && r.price !== undefined ? `(${r.price} €/noche)` : ''}
                                                    </option>
                                                ))
                                            ) : (
                                                <option value={selectedBookingRoomID}>Habitación #{selectedBookingRoomID}</option>
                                            )}
                                        </Form.Select>

                                        {/* Room Thumbnail & Details Preview */}
                                        {(() => {
                                            const currentRoom = roomsCatalog.find(r => r.id === selectedBookingRoomID);
                                            if (!currentRoom) return null;
                                            const imageUrl = currentRoom.imageURL
                                                ? (currentRoom.imageURL.startsWith('http') ? currentRoom.imageURL : `${API_URL_BASE}/${currentRoom.imageURL.replace(/^\/+/, '')}`)
                                                : `${API_URL_BASE}/media/img/room.webp`;

                                            return (
                                                <div className="admin-room-preview-card">
                                                    <img
                                                        src={imageUrl}
                                                        alt={currentRoom.name || 'Habitación'}
                                                        className="admin-room-preview-thumb"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = `${API_URL_BASE}/media/img/room.webp`;
                                                        }}
                                                    />
                                                    <div>
                                                        <h5 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 800 }}>
                                                            {currentRoom.name}
                                                        </h5>
                                                        <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.85 }}>
                                                            {currentRoom.description || 'Alojamiento exclusivo en Hotel Aura'}
                                                        </p>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c5a059', display: 'inline-block', marginTop: '4px' }}>
                                                            Tarifa base: {currentRoom.price ?? 0} € / noche
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })()}
                                    </Form.Group>

                                    {/* GUEST ATTENDEES ROSTER */}
                                    <div style={{ marginTop: '1.75rem', marginBottom: '1.75rem' }}>
                                        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                                            Huéspedes y Asistentes Registrados ({selectedBookingGuests.length})
                                        </h4>
                                        {isLoadingBookingGuests ? (
                                            <p style={{ fontSize: '0.88rem', opacity: 0.7 }}>Cargando asistentes de la reserva...</p>
                                        ) : selectedBookingGuests.length > 0 ? (
                                            <div style={{ overflowX: 'auto' }}>
                                                <table className="admin-guest-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Nombre y Apellidos</th>
                                                            <th>Email</th>
                                                            <th>Categoría</th>
                                                            <th>Titular / Cuenta</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {selectedBookingGuests.map((guest) => (
                                                            <tr key={guest.id}>
                                                                <td>
                                                                    <strong>{guest.guest_name} {guest.guest_surnames}</strong>
                                                                </td>
                                                                <td>{guest.guest_email || '-'}</td>
                                                                <td>
                                                                    <span className={`badge ${guest.isAdult ? 'bg-success' : 'bg-warning'}`}>
                                                                        {guest.isAdult ? 'Adulto' : 'Niño'}
                                                                    </span>
                                                                </td>
                                                                <td>{guest.isSystemUser ? 'Titular de la cuenta' : 'Acompañante'}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p style={{ fontSize: '0.88rem', opacity: 0.75, fontStyle: 'italic' }}>
                                                No hay acompañantes secundarios registrados para esta reserva.
                                            </p>
                                        )}
                                    </div>

                                    {/* STAY DATES CALENDARS */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '1.5rem' }}>
                                        <Form.Group controlId="bookingStartDate">
                                            <Form.Label style={{ fontWeight: 700 }}>{t("startDate")}</Form.Label>
                                            <Calendar onChange={handleBookingStartDateChange} value={selectedBookingStartDate} />
                                        </Form.Group>

                                        <Form.Group controlId="bookingEndDate">
                                            <Form.Label style={{ fontWeight: 700 }}>{t("endDate")}</Form.Label>
                                            <Calendar onChange={handleBookingEndDateChange} value={selectedBookingEndDate} />
                                        </Form.Group>
                                    </div>

                                    <div style={{ display: 'flex', gap: '12px' }}>
                                        <Button variant='primary' type='submit' style={{ fontWeight: 700, padding: '8px 24px' }}>
                                            {t("edit")}
                                        </Button>
                                        <Button variant='danger' type='button' onClick={() => deleteBooking()} style={{ fontWeight: 700, padding: '8px 24px' }}>
                                            {t("delete")}
                                        </Button>
                                    </div>
                                </Form>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Admin;