import { useEffect, useState } from "react";
import { useCookies } from "react-cookie";
import { useNavigate } from "react-router-dom";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import Badge from "react-bootstrap/Badge";
import Swal from "sweetalert2";
import { Booking, Plan, Room } from "../models";
import serverAPI from "./../services/serverAPI";
import { API_URL, API_URL_BASE } from "./../services/consts";
import Calendar from "react-calendar";
import { useTranslation } from "react-i18next";
import "./UserBookings.css";

// Calendar properties
type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface UserBookingsProps {
    colorScheme: string;
    userHasBookings: boolean;
    openDuplicateBookingModal: (booking: Booking) => void;
    onOpenBookingModal?: () => void;
    onOpenUserModal?: () => void;
}

export const UserBookings = ({
    colorScheme,
    userHasBookings,
    openDuplicateBookingModal,
    onOpenBookingModal,
    onOpenUserModal,
}: UserBookingsProps) => {
    // Dependencies
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [cookies] = useCookies(["token"]);

    // All bookings
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Metadata
    const [plans, setPlans] = useState<Plan[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);

    // Selected booking
    const [selectedBookingId, setSelectedBookingId] = useState<number>(-1);
    const [selectedBooking, setSelectedBooking] = useState<Booking>(new Booking());
    const [selectedBookingStartDate, setSelectedBookingStartDate] = useState<Value>();
    const [selectedBookingEndDate, setSelectedBookingEndDate] = useState<Value>();
    const [selectedBookingIsCancelled, setSelectedBookingIsCancelled] = useState<boolean>(false);

    // Cancel modal state
    const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
    const [isCancelling, setIsCancelling] = useState<boolean>(false);

    useEffect(() => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }, []);

    // Load plans and rooms
    useEffect(() => {
        serverAPI
            .get(API_URL + "/plans")
            .then((res) => {
                const plansRes: Plan[] = [];
                res.data.data.forEach((plan: any) => {
                    plansRes.push(
                        new Plan({
                            id: plan.id,
                            name: plan.plan_name,
                            description: plan.plan_description,
                            price: plan.plan_price,
                            imageURL: plan.imageURL,
                        })
                    );
                });
                setPlans(plansRes);
            })
            .catch((err) => console.log(err));

        serverAPI
            .get(API_URL + "/rooms")
            .then((res) => {
                const roomsRes: Room[] = [];
                res.data.data.forEach((room: any) => {
                    roomsRes.push(
                        new Room({
                            id: room.id,
                            name: room.room_name,
                            description: room.room_description,
                            price: room.room_price,
                            availabilityStart: room.room_availability_start,
                            availabilityEnd: room.room_availability_end,
                            imageURL: room.imageURL,
                        })
                    );
                });
                setRooms(roomsRes);
            })
            .catch((err) => console.log(err));
    }, []);

    // Load bookings if token is available
    useEffect(() => {
        if (!cookies.token) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        serverAPI
            .get(API_URL + "/bookingsByUser", {
                headers: { Authorization: cookies.token },
            })
            .then((res) => {
                const bookingsRes: Booking[] = [];
                res.data.data.forEach((booking: any) => {
                    bookingsRes.push(
                        new Booking({
                            id: booking.id,
                            userID: booking.user_id,
                            planID: booking.plan_id,
                            roomID: booking.room_id,
                            startDate: booking.booking_start_date,
                            endDate: booking.booking_end_date,
                            isCancelled: booking.is_cancelled === 1 || booking.is_cancelled === true,
                            cancelledAt: booking.cancelled_at,
                            paymentStatus: booking.payment_status,
                            paymentMethodID: booking.payment_method_id,
                            paymentAmount: booking.payment_amount,
                            refundAmount: booking.refund_amount,
                            refundDate: booking.refund_date,
                        })
                    );
                });
                setBookings(bookingsRes);

                // Auto select first booking if available and none selected
                if (bookingsRes.length > 0) {
                    const first = bookingsRes[0];
                    selectBookingItem(first);
                }
            })
            .catch((err) => {
                console.log(err);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [cookies.token]);

    const selectBookingItem = (bk: Booking) => {
        if (!bk || !bk.id) return;
        setSelectedBookingId(bk.id);
        setSelectedBooking(bk);

        const startDate = new Date(bk.startDate ? bk.startDate : new Date());
        const endDate = new Date(bk.endDate ? bk.endDate : new Date());
        setSelectedBookingStartDate(startDate);
        setSelectedBookingEndDate(endDate);
        setSelectedBookingIsCancelled(!!bk.isCancelled);
    };

    const handleCancelBooking = () => {
        if (selectedBookingId === -1) return;
        setIsCancelling(true);
        serverAPI
            .put(
                "/cancelBookingByUser",
                { bookingID: Number(selectedBookingId) },
                { headers: { Authorization: cookies.token } }
            )
            .then(async (res) => {
                setShowCancelModal(false);
                const refundMsg = res.data?.refundMessage ? `\n\n${res.data.refundMessage}` : "";
                await Swal.fire({
                    title: "Reserva Cancelada",
                    text: `${res.data?.message || "Tu reserva ha sido cancelada correctamente."}${refundMsg}`,
                    icon: "success",
                    confirmButtonColor: "#c5a059",
                });

                const newStatus = res.data?.refundStatus || "CANCELLED";

                // Update booking in local state as cancelled
                setBookings((prev) =>
                    prev.map((b) =>
                        b.id === selectedBookingId ? { ...b, isCancelled: true, paymentStatus: newStatus } : b
                    )
                );
                setSelectedBookingIsCancelled(true);
                if (selectedBooking) {
                    setSelectedBooking(new Booking({ ...selectedBooking, isCancelled: true, paymentStatus: newStatus }));
                }
            })
            .catch((error) => {
                console.error("Error al cancelar reserva:", error);
                const msg = error?.response?.data?.message || "Error al cancelar la reserva";
                Swal.fire({
                    title: "No se pudo cancelar",
                    text: msg,
                    icon: "error",
                    confirmButtonColor: "#c5a059",
                });
            })
            .finally(() => {
                setIsCancelling(false);
            });
    };

    const getPlan = (bookingPlanId: any) => {
        return plans.find((plan) => plan.id === bookingPlanId);
    };

    const getRoom = (bookingRoomId: any) => {
        return rooms.find((room) => room.id === bookingRoomId);
    };

    const getRoomSrc = (bookingRoomId: any) => {
        const matchingRoom = getRoom(bookingRoomId);
        if (!matchingRoom || !matchingRoom.imageURL) return "/deluxe.webp";
        if (matchingRoom.imageURL.startsWith("http://") || matchingRoom.imageURL.startsWith("https://")) {
            return matchingRoom.imageURL;
        }
        return API_URL_BASE + "/" + matchingRoom.imageURL;
    };

    const formatDateStr = (d: any) => {
        if (!d) return "-";
        try {
            const dateObj = new Date(d);
            return dateObj.toLocaleDateString("es-ES", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
            });
        } catch {
            return String(d);
        }
    };

    const calculateNights = (start: any, end: any) => {
        if (!start || !end) return 1;
        const diff = new Date(end).getTime() - new Date(start).getTime();
        const nights = Math.round(diff / (1000 * 60 * 60 * 24));
        return nights > 0 ? nights : 1;
    };

    const activeRoom = getRoom(selectedBooking?.roomID);
    const activePlan = getPlan(selectedBooking?.planID);
    const nights = calculateNights(selectedBooking?.startDate, selectedBooking?.endDate);
    const roomPrice = Number(activeRoom?.price || 0);
    const planPrice = Number(activePlan?.price || 0);
    const estimatedTotal = (roomPrice * nights) + planPrice;

    const isDarkMode = colorScheme === "dark";
    const pageThemeClass = isDarkMode ? "user-bookings-page--dark" : "user-bookings-page--light";

    return (
        <div className={"user-bookings-page " + pageThemeClass}>
            {/* Hero Section */}
            <header className="user-bookings-hero">
                <div className="user-bookings-hero__badge">
                    <span aria-hidden="true">💎</span>
                    <span>Aura de Mallorca Sanctuary</span>
                </div>
                <h1 className="user-bookings-hero__title">
                    {t("userBookings_title") || "Administra tus reservas"}
                </h1>
                <p className="user-bookings-hero__subtitle">
                    Gestiona los detalles de tu estancia, consulta las fechas en los calendarios interactivos y administra o renueva tu reserva cuando lo desees.
                </p>
            </header>

            <main className="user-bookings-container">
                {/* State: Not logged in */}
                {!cookies.token && (
                    <div className="user-bookings-empty-card">
                        <div className="user-bookings-empty-icon">🔐</div>
                        <h2 className="user-bookings-empty-title">Inicia sesion para ver tus reservas</h2>
                        <p className="user-bookings-empty-desc">
                            Para consultar o gestionar el estado de tus estancias en el Hotel Aura de Mallorca, debes iniciar sesion con tu cuenta.
                        </p>
                        <div className="user-bookings-empty-actions">
                            <Button
                                variant="primary"
                                className="user-booking-duplicate-btn"
                                onClick={() => {
                                    if (onOpenUserModal) {
                                        onOpenUserModal();
                                    } else {
                                        navigate("/");
                                    }
                                }}
                            >
                                Iniciar sesion
                            </Button>
                            <Button
                                variant="outline-secondary"
                                onClick={() => navigate("/")}
                            >
                                Volver al inicio
                            </Button>
                        </div>
                    </div>
                )}

                {/* State: Logged in but no bookings */}
                {cookies.token && !isLoading && bookings.length === 0 && (
                    <div className="user-bookings-empty-card">
                        <div className="user-bookings-empty-icon">🏖️</div>
                        <h2 className="user-bookings-empty-title">
                            {t("modal_duplicatebooking_noBookings") || "No tienes reservas activas"}
                        </h2>
                        <p className="user-bookings-empty-desc">
                            Aun no has reservado una estancia en el Hotel Aura de Mallorca. Descubre nuestras suites boutique, planes gastronomicos y spa.
                        </p>
                        <div className="user-bookings-empty-actions">
                            <Button
                                variant="primary"
                                className="user-booking-duplicate-btn"
                                onClick={() => {
                                    if (onOpenBookingModal) {
                                        onOpenBookingModal();
                                    } else {
                                        navigate("/");
                                    }
                                }}
                            >
                                Reservar ahora
                            </Button>
                            <Button
                                variant="outline-secondary"
                                onClick={() => navigate("/services")}
                            >
                                Ver servicios y suites
                            </Button>
                        </div>
                    </div>
                )}

                {/* State: Has Bookings */}
                {cookies.token && bookings.length > 0 && (
                    <>
                        {/* Interactive Reservation Selector */}
                        <section className="user-bookings-selector-section" aria-label="Selector de reserva">
                            <div className="user-bookings-selector-header">
                                <h2 className="user-bookings-selector-title">
                                    <span>Tus Estancias</span>
                                    <span className="user-bookings-count-pill">
                                        {bookings.length} {bookings.length === 1 ? "reserva" : "reservas"}
                                    </span>
                                </h2>
                                <span style={{ fontSize: "0.85rem", opacity: 0.75 }}>
                                    Haz clic en una reserva para ver su itinerario completo
                                </span>
                            </div>

                            <div className="user-bookings-nav-grid" role="tablist">
                                {bookings.map((b) => {
                                    const room = getRoom(b.roomID);
                                    const isSelected = b.id === selectedBookingId;
                                    const isCancelled = !!b.isCancelled;

                                    return (
                                        <button
                                            key={b.id}
                                            type="button"
                                            role="tab"
                                            aria-selected={isSelected}
                                            className={"user-booking-pill-btn " + (isSelected ? "is-selected" : "")}
                                            onClick={() => selectBookingItem(b)}
                                        >
                                            <div className="user-booking-pill-top">
                                                <span className="user-booking-pill-id">Reserva #{b.id}</span>
                                                <span
                                                    className={
                                                        "user-booking-status-badge " +
                                                        (isCancelled ? "status-badge--cancelled" : "status-badge--active")
                                                    }
                                                >
                                                    {isCancelled ? (
                                                        <>✕ {t("cancelled") || "Cancelada"}</>
                                                    ) : (
                                                        <>✓ {t("active") || "Activa"}</>
                                                    )}
                                                </span>
                                            </div>
                                            <div className="user-booking-pill-room">
                                                {room ? room.name : (t("room") + " #" + b.roomID)}
                                            </div>
                                            <div className="user-booking-pill-dates">
                                                <span>🗓️</span>
                                                <span>
                                                    {formatDateStr(b.startDate)} - {formatDateStr(b.endDate)}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {/* Active Booking Detail View */}
                        {selectedBookingId !== -1 && (
                            <section className="user-booking-detail-card" aria-label="Detalles de la reserva seleccionada">
                                <div className="user-booking-detail-header">
                                    <div className="user-booking-detail-heading-group">
                                        <span className="user-booking-detail-tag">Detalle de tu estancia</span>
                                        <h2 className="user-booking-detail-title">
                                            {activeRoom ? activeRoom.name : (t("room") + " #" + selectedBooking.roomID)}
                                        </h2>
                                    </div>
                                    <span
                                        className={
                                            "user-booking-status-badge " +
                                            (selectedBookingIsCancelled ? "status-badge--cancelled" : "status-badge--active")
                                        }
                                        style={{ fontSize: "0.85rem", padding: "0.4rem 0.9rem" }}
                                    >
                                        {selectedBookingIsCancelled ? (
                                            <>✕ {t("cancelled") || "Reserva Cancelada"}</>
                                        ) : (
                                            <>✓ {t("active") || "Reserva Confirmada & Activa"}</>
                                        )}
                                    </span>
                                </div>

                                <div className="user-booking-grid-content">
                                    {/* Left Column: Room info, Plan, Specs */}
                                    <div className="user-booking-room-preview">
                                        <div className="user-booking-room-img-container">
                                            <img
                                                src={getRoomSrc(selectedBooking.roomID)}
                                                alt={activeRoom?.name || "Habitacion"}
                                                className="user-booking-room-img"
                                                onError={(e: any) => {
                                                    e.target.onerror = null;
                                                    e.target.src = "/deluxe.webp";
                                                }}
                                            />
                                            <span className="user-booking-room-badge">
                                                {activeRoom?.name || "Suite Aura"}
                                            </span>
                                        </div>

                                        <div className="user-booking-info-list">
                                            <div className="user-booking-info-item">
                                                <span className="user-booking-info-label">
                                                    <span>🏷️</span> Referencia de Reserva
                                                </span>
                                                <span className="user-booking-info-value">
                                                    #{selectedBooking.id}
                                                </span>
                                            </div>

                                            <div className="user-booking-info-item">
                                                <span className="user-booking-info-label">
                                                    <span>🍽️</span> {t("plan") || "Plan Seleccionado"}
                                                </span>
                                                <span className="user-booking-info-value">
                                                    {activePlan ? activePlan.name : "Estándar"}
                                                </span>
                                            </div>

                                            <div className="user-booking-info-item">
                                                <span className="user-booking-info-label">
                                                    <span>🌙</span> Duracion de la Estancia
                                                </span>
                                                <span className="user-booking-info-value">
                                                    {nights} {nights === 1 ? "noche" : "noches"}
                                                </span>
                                            </div>

                                            <div className="user-booking-info-item">
                                                <span className="user-booking-info-label">
                                                    <span>💶</span> Tarifa Estimada
                                                </span>
                                                <span className="user-booking-info-value">
                                                    {estimatedTotal > 0 ? estimatedTotal + " €" : "Consultar en recepcion"}
                                                </span>
                                            </div>

                                            {selectedBookingIsCancelled && (
                                                <div className="user-booking-info-item">
                                                    <span className="user-booking-info-label">
                                                        <span>💳</span> Estado de Pago / Devolución
                                                    </span>
                                                    <span className="user-booking-info-value">
                                                        {selectedBooking?.paymentStatus === "REFUNDED" ? (
                                                            <Badge bg="success" style={{ fontSize: "0.85rem" }}>
                                                                ✓ Reembolsado en tarjeta
                                                            </Badge>
                                                        ) : selectedBooking?.paymentStatus === "REFUND_PENDING" ? (
                                                            <Badge bg="warning" text="dark" style={{ fontSize: "0.85rem" }}>
                                                                ⏳ Reembolso en trámite
                                                            </Badge>
                                                        ) : selectedBooking?.paymentMethodID === 2 || selectedBooking?.paymentStatus === "CANCELLED" ? (
                                                            <Badge bg="secondary" style={{ fontSize: "0.85rem" }}>
                                                                ✓ Anulado sin coste (Recepción)
                                                            </Badge>
                                                        ) : (
                                                            <Badge bg="danger" style={{ fontSize: "0.85rem" }}>
                                                                Reserva Cancelada
                                                            </Badge>
                                                        )}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right Column: Calendars */}
                                    <div className="user-booking-calendars-wrapper">
                                        <h3 className="user-booking-calendars-title">
                                            <span>📅</span> Calendario de Entrada y Salida
                                        </h3>

                                        <div className="user-booking-calendars-grid">
                                            {/* Check-in Calendar */}
                                            <div className="user-booking-calendar-box">
                                                <div className="user-booking-calendar-header calendar-header--start">
                                                    <span>Check-in (Entrada)</span>
                                                    <span>{formatDateStr(selectedBooking.startDate)}</span>
                                                </div>
                                                <Calendar
                                                    value={selectedBookingStartDate}
                                                    tileClassName={({ date, view }) => {
                                                        if (view === "month" && selectedBookingStartDate instanceof Date) {
                                                            const isSameDay =
                                                                date.getDate() === selectedBookingStartDate.getDate() &&
                                                                date.getMonth() === selectedBookingStartDate.getMonth() &&
                                                                date.getFullYear() === selectedBookingStartDate.getFullYear();
                                                            if (isSameDay) return "calendar-tile-checkin";
                                                        }
                                                        return null;
                                                    }}
                                                />
                                            </div>

                                            {/* Check-out Calendar */}
                                            <div className="user-booking-calendar-box">
                                                <div className="user-booking-calendar-header calendar-header--end">
                                                    <span>Check-out (Salida)</span>
                                                    <span>{formatDateStr(selectedBooking.endDate)}</span>
                                                </div>
                                                <Calendar
                                                    value={selectedBookingEndDate}
                                                    tileClassName={({ date, view }) => {
                                                        if (view === "month" && selectedBookingEndDate instanceof Date) {
                                                            const isSameDay =
                                                                date.getDate() === selectedBookingEndDate.getDate() &&
                                                                date.getMonth() === selectedBookingEndDate.getMonth() &&
                                                                date.getFullYear() === selectedBookingEndDate.getFullYear();
                                                            if (isSameDay) return "calendar-tile-checkout";
                                                        }
                                                        return null;
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Footer */}
                                <div className="user-booking-actions-card">
                                    <div className="user-booking-policy-notice">
                                        <span style={{ fontSize: "1.2rem" }}>ℹ️</span>
                                        <span>
                                            Puedes cancelar tu reserva dentro del plazo permitido antes del check-in o volver a reservar con los mismos servicios si tu reserva previa fue cancelada.
                                        </span>
                                    </div>

                                    <div className="user-booking-btn-group">
                                        {!selectedBookingIsCancelled ? (
                                            <Button
                                                variant="outline-danger"
                                                className="user-booking-cancel-btn"
                                                onClick={() => setShowCancelModal(true)}
                                            >
                                                {t("userBookings_btnCancel") || "Cancelar Reserva"}
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="primary"
                                                className="user-booking-duplicate-btn"
                                                onClick={() => {
                                                    openDuplicateBookingModal(selectedBooking);
                                                }}
                                            >
                                                {t("userBookings_btnDuplicate") || "Hacer nueva reserva a partir de esta"}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>

            {/* Cancel Booking Confirmation Modal */}
            <Modal
                show={showCancelModal}
                onHide={() => setShowCancelModal(false)}
                centered
                data-bs-theme={colorScheme === "dark" ? "dark" : "light"}
                contentClassName="user-booking-confirm-dialog"
            >
                <Modal.Header closeButton>
                    <Modal.Title style={{ fontWeight: 800, fontSize: "1.2rem" }}>
                        Confirmar Cancelacion de Reserva
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p style={{ marginBottom: "1rem" }}>
                        ¿Estás seguro de que deseas cancelar la reserva <strong>#{selectedBookingId}</strong> para la habitación <strong>{activeRoom?.name}</strong>?
                    </p>
                    <div
                        style={{
                            backgroundColor: isDarkMode ? "rgba(255, 255, 255, 0.05)" : "#f8fafc",
                            padding: "12px 14px",
                            borderRadius: "8px",
                            border: "1px solid",
                            borderColor: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0",
                            marginBottom: "14px",
                            fontSize: "0.85rem",
                        }}
                    >
                        <p style={{ margin: "0 0 6px 0", fontWeight: 700, color: "#c5a059" }}>
                            {selectedBooking?.paymentMethodID === 1 ? "💳 Política de Reembolso (Stripe):" : "🏨 Política de Cancelación (Recepción):"}
                        </p>
                        <p style={{ margin: 0, opacity: 0.9, lineHeight: 1.5 }}>
                            {selectedBooking?.paymentMethodID === 1
                                ? "Al cancelar dentro del plazo, tramitaremos el reembolso íntegro a tu tarjeta mediante Stripe. Recibirás un correo con la confirmación y el importe estará disponible en tu cuenta en un plazo de 5 a 10 días laborables."
                                : "Como seleccionaste la modalidad de pago en el hotel, tu reserva se cancelará sin ningún cargo económico."}
                        </p>
                    </div>
                    <p style={{ fontSize: "0.85rem", opacity: 0.8, margin: 0 }}>
                        Recuerda que si en el futuro deseas volver a disfrutar de tu estancia, podrás crear una nueva reserva conservando tu habitación, plan y extras desde este mismo panel.
                    </p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCancelModal(false)} disabled={isCancelling}>
                        Mantener Reserva
                    </Button>
                    <Button variant="danger" onClick={handleCancelBooking} disabled={isCancelling}>
                        {isCancelling ? "Cancelando..." : "Si, Cancelar Reserva"}
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default UserBookings;
