import { useState, useEffect } from "react";
import BaseModal from "./BaseModal";
import { useCookies } from "react-cookie";
import { Booking } from "./../../models";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./BookingModal.css";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Button, Spinner, Badge, Alert } from "react-bootstrap";
import serverAPI from "./../../services/serverAPI";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";

interface DuplicateBookingModalProps {
    colorScheme: string;
    show: boolean;
    onClose: () => void;
    bookingData: Booking;
}

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface OccupancyRecord {
    id: number;
    room_id: number;
    room_name: string;
    booking_start_date: string;
    booking_end_date: string;
}

interface BookingServiceItem {
    id: number;
    serv_name: string;
    serv_price: number;
    serv_description?: string;
}

interface BookingGuestItem {
    id: number;
    guest_name: string;
    guest_surnames?: string;
    isAdult: string | number;
}

const DuplicateBookingModal = ({ colorScheme, show, onClose, bookingData }: DuplicateBookingModalProps) => {
    const { t } = useTranslation();
    const [cookies] = useCookies(["token"]);

    // Steps: 1 = Dates & Configuration, 2 = Payment selection
    const [step, setStep] = useState<number>(1);

    // Dates (default today + 2 to today + 5 to strictly satisfy 48h advance booking policy)
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() + 2);
    defaultStart.setHours(12, 0, 0, 0);

    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 5);
    defaultEnd.setHours(12, 0, 0, 0);

    const [startDate, setStartDate] = useState<Value>(defaultStart);
    const [endDate, setEndDate] = useState<Value>(defaultEnd);

    // Occupancy state and hover information
    const [occupancyList, setOccupancyList] = useState<OccupancyRecord[]>([]);
    const [hoveredDateInfo, setHoveredDateInfo] = useState<{ dateStr: string; occupiedRooms: string[] } | null>(null);

    // Full booking details loaded from API
    const [isLoadingDetails, setIsLoadingDetails] = useState<boolean>(false);
    const [roomDetails, setRoomDetails] = useState<any>(null);
    const [planDetails, setPlanDetails] = useState<any>(null);
    const [servicesList, setServicesList] = useState<BookingServiceItem[]>([]);
    const [guestsList, setGuestsList] = useState<BookingGuestItem[]>([]);

    // Payment state
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<number>(1); // 1 = Stripe, 2 = Recepcion
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Load detailed data of the cancelled booking when modal opens
    useEffect(() => {
        if (show && bookingData && bookingData.id) {
            setStep(1);
            setErrorMessage(null);
            setIsLoadingDetails(true);

            serverAPI
                .get(`/bookingDetailsForDuplication/${bookingData.id}`, {
                    headers: { Authorization: cookies.token },
                })
                .then((res) => {
                    if (res.data && res.data.status === "success" && res.data.data) {
                        const { booking, services, guests } = res.data.data;
                        setRoomDetails({
                            id: booking.room_id,
                            name: booking.room_name || "Suite Hotel Aura",
                            price: Number(booking.room_price || 120),
                        });
                        setPlanDetails({
                            id: booking.plan_id,
                            name: booking.plan_name || "Solo Alojamiento",
                            price: Number(booking.plan_price || 0),
                        });
                        setServicesList(services || []);
                        setGuestsList(guests || []);

                        // Set preferred payment method from previous booking or default to Stripe
                        if (booking.payment_method_id) {
                            setSelectedPaymentMethod(Number(booking.payment_method_id));
                        }
                    }
                })
                .catch((err) => {
                    console.error("Error loading duplication details:", err);
                    // Fallback using bookingData
                    setRoomDetails({ id: bookingData.roomID, name: "Habitación seleccionada", price: 120 });
                    setPlanDetails({ id: bookingData.planID, name: "Plan seleccionado", price: 0 });
                })
                .finally(() => {
                    setIsLoadingDetails(false);
                });
        }
    }, [show, bookingData?.id, cookies.token]);

    // Fetch calendar occupancy from backend on mount or when shown
    useEffect(() => {
        if (show) {
            serverAPI
                .get("/bookingOccupancy")
                .then((res) => {
                    if (res.data && res.data.status === "success") {
                        setOccupancyList(res.data.data || []);
                    }
                })
                .catch((err) => {
                    console.warn("Error fetching occupancy for duplicate modal:", err);
                });
        }
    }, [show]);

    // Format date string as YYYY-MM-DD
    const extractFormattedDate = (date: any): string => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = (d.getMonth() + 1).toString().padStart(2, "0");
        const day = d.getDate().toString().padStart(2, "0");
        return `${year}-${month}-${day}`;
    };

    // Helpers to query occupancy by date for this room
    const currentRoomId = roomDetails?.id || bookingData?.roomID;

    const getOccupiedRoomsForDate = (date: Date): string[] => {
        const dStr = extractFormattedDate(date);
        const roomsSet = new Set<string>();
        occupancyList.forEach((item) => {
            if (dStr >= item.booking_start_date && dStr <= item.booking_end_date) {
                roomsSet.add(item.room_name);
            }
        });
        return Array.from(roomsSet);
    };

    const isDateOccupiedForThisRoom = (date: Date): boolean => {
        if (!currentRoomId) return false;
        const dStr = extractFormattedDate(date);
        return occupancyList.some(
            (item) =>
                item.room_id === currentRoomId &&
                dStr >= item.booking_start_date &&
                dStr <= item.booking_end_date,
        );
    };

    const getCalendarTileClassName = ({ date, view }: { date: Date; view: string }) => {
        if (view !== "month") return "";
        const occupied = getOccupiedRoomsForDate(date);
        if (occupied.length === 0) return "calendar-tile-free";

        if (currentRoomId && isDateOccupiedForThisRoom(date)) {
            return "calendar-tile-occupied-selected";
        }
        return "calendar-tile-occupied-partial";
    };

    const getCalendarTileContent = ({ date, view }: { date: Date; view: string }) => {
        if (view !== "month") return null;
        const occupied = getOccupiedRoomsForDate(date);
        if (occupied.length === 0) return null;

        const isSelectedOccupied = currentRoomId ? isDateOccupiedForThisRoom(date) : false;
        const badgeClass = isSelectedOccupied ? "occupied-badge-danger" : "occupied-badge-partial";
        const badgeText = isSelectedOccupied ? "Ocupada" : `${occupied.length} ocup`;
        const tooltipText = isSelectedOccupied
            ? `Habitación (${roomDetails?.name || "Suite"}) ocupada en esta fecha`
            : `Habitaciones ocupadas (${occupied.length}): ${occupied.join(", ")}`;

        return (
            <div
                className="calendar-tile-full-overlay"
                title={tooltipText}
                onMouseEnter={() =>
                    setHoveredDateInfo({
                        dateStr: extractFormattedDate(date),
                        occupiedRooms: occupied,
                    })
                }
                onMouseLeave={() => setHoveredDateInfo(null)}
            >
                <span className={`calendar-tile-status-tag ${badgeClass}`}>
                    {badgeText}
                </span>
            </div>
        );
    };

    // Calculate nights
    const calculateNights = (start: Value, end: Value): number => {
        if (start instanceof Date && end instanceof Date) {
            const diffMs = end.getTime() - start.getTime();
            const nights = Math.round(diffMs / (1000 * 60 * 60 * 24));
            return nights > 0 ? nights : 1;
        }
        return 1;
    };

    const nights = calculateNights(startDate, endDate);
    const roomPrice = Number(roomDetails?.price || 0);
    const planPrice = Number(planDetails?.price || 0);
    const servicesTotal = servicesList.reduce((acc, s) => acc + Number(s.serv_price || 0), 0);
    const totalPrice = (roomPrice * nights) + planPrice + servicesTotal;

    // Check availability and advance to payment step
    const handleProceedToPayment = async () => {
        setErrorMessage(null);
        if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
            setErrorMessage("Por favor, selecciona las fechas de entrada y salida en los calendarios.");
            return;
        }

        if (startDate >= endDate) {
            setErrorMessage("La fecha de salida (Check-out) debe ser posterior a la fecha de entrada (Check-in).");
            return;
        }

        const roomId = roomDetails?.id || bookingData?.roomID;
        setIsSubmitting(true);

        try {
            const availabilityRes = await serverAPI.post("/checkBookingAvailability", {
                roomID: roomId,
                start_date: startDate,
                end_date: endDate,
            });

            if (availabilityRes.data && availabilityRes.data.status === "success" && availabilityRes.data.isAvailable) {
                // Room is free for these dates, go to step 2
                setStep(2);
            } else {
                setErrorMessage(availabilityRes.data?.message || "La habitación está ocupada en estas fechas. Por favor, elige otros días.");
            }
        } catch (error: any) {
            console.error("Error checking availability:", error);
            setErrorMessage(error?.response?.data?.message || "Error al verificar la disponibilidad de la habitación.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Final submission to create the duplicate booking
    const handleConfirmBooking = async () => {
        setErrorMessage(null);
        if (!(startDate instanceof Date) || !(endDate instanceof Date)) return;

        setIsSubmitting(true);
        try {
            let clientSecret = `duplicate_booking_${Date.now()}`;

            // Si se selecciona Stripe y no es recepcion, generar payment intent
            if (selectedPaymentMethod === 1) {
                try {
                    const paymentAmountInCents = Math.max(50, Math.round(totalPrice * 100));
                    const purchaseRes = await serverAPI.post("/purchase", {
                        data: {
                            amount: paymentAmountInCents,
                            currency: "eur",
                            description: `Nueva estancia duplicada a partir de #${bookingData?.id}`,
                        },
                    });
                    if (purchaseRes.data && purchaseRes.data.client_secret) {
                        clientSecret = purchaseRes.data.client_secret;
                    }
                } catch (stripeErr: any) {
                    console.warn("Stripe purchase fallback:", stripeErr.message);
                }
            }

            const formattedStart = startDate.toISOString().split("T")[0];
            const formattedEnd = endDate.toISOString().split("T")[0];

            const payload = {
                originalBookingID: bookingData?.id,
                startDate: formattedStart,
                endDate: formattedEnd,
                paymentMethodID: selectedPaymentMethod,
                paymentTransactionID: clientSecret,
                amount: totalPrice,
            };

            const response = await serverAPI.post("/duplicateBooking", payload, {
                headers: { Authorization: cookies.token },
            });

            if (response.data && response.data.status === "success") {
                await Swal.fire({
                    title: "¡Reserva Creada con Éxito!",
                    text: `Se ha generado tu nueva reserva con localizador #${response.data.bookingId}. Tus servicios y huéspedes han sido transferidos correctamente.`,
                    icon: "success",
                    confirmButtonColor: "#c5a059",
                });
                onClose();
                window.location.reload();
            } else {
                setErrorMessage(response.data?.message || "No se pudo formalizar la nueva reserva.");
            }
        } catch (error: any) {
            console.error("Error al formalizar nueva reserva:", error);
            const msg = error?.response?.data?.message || "Ocurrió un error al tramitar la reserva.";
            setErrorMessage(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    const isDarkMode = colorScheme === "dark";

    return (
        <BaseModal title={t("modal_duplicatebooking_title") || "Crear nueva reserva a partir de la cancelada"} show={show} onClose={onClose}>
            <Container fluid style={{ padding: "0 10px" }}>
                {/* Information Header */}
                <div
                    style={{
                        backgroundColor: isDarkMode ? "rgba(197, 160, 89, 0.15)" : "#fdf8ef",
                        border: "1px solid #c5a059",
                        borderRadius: "10px",
                        padding: "14px 18px",
                        marginBottom: "20px",
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                        <span style={{ fontSize: "1.3rem" }}>ℹ️</span>
                        <strong style={{ color: isDarkMode ? "#f1dca7" : "#8a6d3b" }}>
                            Reserva original cancelada #{bookingData?.id}
                        </strong>
                    </div>
                    <p style={{ margin: 0, fontSize: "0.9rem", color: isDarkMode ? "#e2e8f0" : "#4a5568", lineHeight: 1.5 }}>
                        {t("modal_duplicatebooking_info")}
                    </p>
                </div>

                {isLoadingDetails ? (
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                        <Spinner animation="border" variant="primary" />
                        <p style={{ marginTop: "12px", opacity: 0.8 }}>Cargando datos de tu reserva anterior...</p>
                    </div>
                ) : (
                    <>
                        {/* Summary of preserved features */}
                        <div
                            style={{
                                background: isDarkMode ? "rgba(255, 255, 255, 0.04)" : "#f8fafc",
                                border: "1px solid",
                                borderColor: isDarkMode ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0",
                                borderRadius: "10px",
                                padding: "14px",
                                marginBottom: "20px",
                            }}
                        >
                            <h6 style={{ fontWeight: 700, margin: "0 0 10px 0", color: isDarkMode ? "#ffffff" : "#1a202c" }}>
                                📋 Elementos que se transfieren a tu nueva estancia:
                            </h6>
                            <Row>
                                <Col md={4} style={{ marginBottom: "8px" }}>
                                    <span style={{ fontSize: "0.85rem", opacity: 0.75, display: "block" }}>Habitación</span>
                                    <strong style={{ color: "#c5a059" }}>{roomDetails?.name || "Habitación"}</strong>
                                    <span style={{ fontSize: "0.8rem", display: "block", opacity: 0.8 }}>({roomPrice} € / noche)</span>
                                </Col>
                                <Col md={4} style={{ marginBottom: "8px" }}>
                                    <span style={{ fontSize: "0.85rem", opacity: 0.75, display: "block" }}>Régimen</span>
                                    <strong style={{ color: "#c5a059" }}>{planDetails?.name || "Estándar"}</strong>
                                    {planPrice > 0 && <span style={{ fontSize: "0.8rem", display: "block", opacity: 0.8 }}>({planPrice} €)</span>}
                                </Col>
                                <Col md={4} style={{ marginBottom: "8px" }}>
                                    <span style={{ fontSize: "0.85rem", opacity: 0.75, display: "block" }}>Extras contratados</span>
                                    {servicesList.length > 0 ? (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px" }}>
                                            {servicesList.map((s) => (
                                                <Badge key={s.id} bg="secondary" style={{ fontSize: "0.75rem" }}>
                                                    {s.serv_name} ({s.serv_price} €)
                                                </Badge>
                                            ))}
                                        </div>
                                    ) : (
                                        <span style={{ fontSize: "0.85rem", opacity: 0.6 }}>Sin extras</span>
                                    )}
                                </Col>
                            </Row>
                            {guestsList.length > 0 && (
                                <div style={{ borderTop: "1px dashed #cbd5e1", marginTop: "10px", paddingTop: "8px", fontSize: "0.85rem", opacity: 0.85 }}>
                                    👥 <strong>{guestsList.length} huésped(es) registrados:</strong> {guestsList.map((g) => g.guest_name).join(", ")}
                                </div>
                            )}
                        </div>

                        {errorMessage && (
                            <Alert variant="danger" dismissible onClose={() => setErrorMessage(null)}>
                                {errorMessage}
                            </Alert>
                        )}

                        {/* STEP 1: SELECT NEW DATES */}
                        {step === 1 && (
                            <div>
                                <h6 style={{ fontWeight: 800, marginBottom: "14px", color: isDarkMode ? "#ffffff" : "#1a202c" }}>
                                    1. Elige las nuevas fechas de tu estancia
                                </h6>
                                <Row>
                                    <Col md={6} style={{ marginBottom: "16px" }}>
                                        <div style={{ textAlign: "center", marginBottom: "8px", fontWeight: 600 }}>
                                            <span>📅 Entrada (Check-in): </span>
                                            <Badge bg="primary">{startDate instanceof Date ? startDate.toLocaleDateString("es-ES") : "-"}</Badge>
                                        </div>
                                        <Calendar
                                            minDate={new Date()}
                                            maxDate={endDate instanceof Date ? endDate : undefined}
                                            value={startDate}
                                            tileClassName={getCalendarTileClassName}
                                            tileContent={getCalendarTileContent}
                                            onChange={(val) => {
                                                setStartDate(val);
                                                if (val instanceof Date && endDate instanceof Date && val >= endDate) {
                                                    const nextDay = new Date(val);
                                                    nextDay.setDate(nextDay.getDate() + 1);
                                                    setEndDate(nextDay);
                                                }
                                            }}
                                        />
                                    </Col>
                                    <Col md={6} style={{ marginBottom: "16px" }}>
                                        <div style={{ textAlign: "center", marginBottom: "8px", fontWeight: 600 }}>
                                            <span>📅 Salida (Check-out): </span>
                                            <Badge bg="success">{endDate instanceof Date ? endDate.toLocaleDateString("es-ES") : "-"}</Badge>
                                        </div>
                                        <Calendar
                                            minDate={startDate instanceof Date ? new Date(startDate.getTime() + 24 * 60 * 60 * 1000) : new Date()}
                                            value={endDate}
                                            tileClassName={getCalendarTileClassName}
                                            tileContent={getCalendarTileContent}
                                            onChange={(val) => setEndDate(val)}
                                        />
                                    </Col>
                                </Row>

                                {/* Occupancy Legend */}
                                <div style={{ display: "flex", gap: "14px", justifyContent: "center", margin: "8px 0 12px 0", fontSize: "0.8rem", flexWrap: "wrap" }}>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#28a745", display: "inline-block" }}></span>
                                        Disponible
                                    </span>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#fd7e14", display: "inline-block" }}></span>
                                        Ocupación parcial
                                    </span>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#dc3545", display: "inline-block" }}></span>
                                        Habitación seleccionada ocupada
                                    </span>
                                </div>

                                {/* Live Occupancy Banner upon hover */}
                                <div className="calendar-occupancy-banner" style={{ marginBottom: "16px" }}>
                                    <div className="occupancy-banner-title">
                                        <span>📅 Disponibilidad de Habitaciones en el Calendario</span>
                                        {hoveredDateInfo && (
                                            <span className="hovered-date-badge">{hoveredDateInfo.dateStr}</span>
                                        )}
                                    </div>
                                    {hoveredDateInfo ? (
                                        hoveredDateInfo.occupiedRooms.length > 0 ? (
                                            <div className="occupancy-banner-content">
                                                <span style={{ color: "#ff6b6b", fontWeight: 600 }}>
                                                    Habitaciones reservadas en esta fecha ({hoveredDateInfo.occupiedRooms.length}):{" "}
                                                </span>
                                                {hoveredDateInfo.occupiedRooms.join(", ")}
                                            </div>
                                        ) : (
                                            <div className="occupancy-banner-content" style={{ color: "#51cf66" }}>
                                                ✓ Todas las habitaciones se encuentran disponibles en este día.
                                            </div>
                                        )
                                    ) : (
                                        <div className="occupancy-banner-content" style={{ opacity: 0.8 }}>
                                            Pasa el cursor sobre cualquier fecha del calendario para ver el detalle de habitaciones reservadas.
                                        </div>
                                    )}
                                </div>

                                {/* Price breakdown */}
                                <div
                                    style={{
                                        background: isDarkMode ? "rgba(197, 160, 89, 0.1)" : "#f8fafc",
                                        border: "1.5px solid #c5a059",
                                        borderRadius: "10px",
                                        padding: "16px",
                                        margin: "15px 0",
                                    }}
                                >
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.95rem" }}>
                                        <span>Estancia ({nights} {nights === 1 ? "noche" : "noches"} x {roomPrice} €):</span>
                                        <strong>{(roomPrice * nights).toFixed(2)} €</strong>
                                    </div>
                                    {planPrice > 0 && (
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.95rem" }}>
                                            <span>Régimen ({planDetails?.name}):</span>
                                            <strong>{planPrice.toFixed(2)} €</strong>
                                        </div>
                                    )}
                                    {servicesTotal > 0 && (
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.95rem" }}>
                                            <span>Servicios adicionales:</span>
                                            <strong>{servicesTotal.toFixed(2)} €</strong>
                                        </div>
                                    )}
                                    <hr style={{ margin: "10px 0" }} />
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: "1.1rem", fontWeight: 800 }}>Total Estimado:</span>
                                        <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#c5a059" }}>
                                            {totalPrice.toFixed(2)} €
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
                                    <Button variant="outline-secondary" onClick={onClose}>
                                        Cancelar
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={handleProceedToPayment}
                                        disabled={isSubmitting}
                                        style={{ backgroundColor: "#c5a059", borderColor: "#c5a059", fontWeight: 700 }}
                                    >
                                        {isSubmitting ? (
                                            <span>
                                                <Spinner animation="border" size="sm" style={{ marginRight: "6px" }} /> Comprobando disponibilidad...
                                            </span>
                                        ) : (
                                            `Continuar al Pago (${totalPrice.toFixed(2)} €) →`
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: PAYMENT METHOD SELECTION */}
                        {step === 2 && (
                            <div>
                                <h6 style={{ fontWeight: 800, marginBottom: "14px", color: isDarkMode ? "#ffffff" : "#1a202c" }}>
                                    2. Selecciona el método de pago para tu nueva estancia
                                </h6>
                                <p style={{ fontSize: "0.85rem", opacity: 0.8, marginBottom: "15px" }}>
                                    Como la reserva anterior fue cancelada y su pago gestionado/reembolsado, esta nueva estancia requiere formalizar un nuevo método de pago:
                                </p>

                                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
                                    {/* Option 1: Stripe Card */}
                                    <div
                                        onClick={() => setSelectedPaymentMethod(1)}
                                        style={{
                                            border: `2px solid ${selectedPaymentMethod === 1 ? "#c5a059" : (isDarkMode ? "#334155" : "#cbd5e1")}`,
                                            borderRadius: "10px",
                                            padding: "16px",
                                            cursor: "pointer",
                                            backgroundColor: selectedPaymentMethod === 1
                                                ? (isDarkMode ? "rgba(197, 160, 89, 0.15)" : "#fdf8ef")
                                                : "transparent",
                                            transition: "all 0.2s ease",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                checked={selectedPaymentMethod === 1}
                                                onChange={() => setSelectedPaymentMethod(1)}
                                                style={{ accentColor: "#c5a059", transform: "scale(1.2)" }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <strong style={{ fontSize: "1rem", color: isDarkMode ? "#ffffff" : "#1a202c" }}>
                                                        💳 Pagar ahora con Tarjeta (Stripe Seguro)
                                                    </strong>
                                                    <Badge bg="success">Inmediato</Badge>
                                                </div>
                                                <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", opacity: 0.8 }}>
                                                    Abona los {totalPrice.toFixed(2)} € de forma cifrada con tu tarjeta de crédito o débito a través de la pasarela Stripe.
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Option 2: Pay at Reception */}
                                    <div
                                        onClick={() => setSelectedPaymentMethod(2)}
                                        style={{
                                            border: `2px solid ${selectedPaymentMethod === 2 ? "#c5a059" : (isDarkMode ? "#334155" : "#cbd5e1")}`,
                                            borderRadius: "10px",
                                            padding: "16px",
                                            cursor: "pointer",
                                            backgroundColor: selectedPaymentMethod === 2
                                                ? (isDarkMode ? "rgba(197, 160, 89, 0.15)" : "#fdf8ef")
                                                : "transparent",
                                            transition: "all 0.2s ease",
                                        }}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                checked={selectedPaymentMethod === 2}
                                                onChange={() => setSelectedPaymentMethod(2)}
                                                style={{ accentColor: "#c5a059", transform: "scale(1.2)" }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                                    <strong style={{ fontSize: "1rem", color: isDarkMode ? "#ffffff" : "#1a202c" }}>
                                                        🏨 Pagar en el Hotel (Recepción)
                                                    </strong>
                                                    <Badge bg="info">Pagar al Check-in</Badge>
                                                </div>
                                                <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", opacity: 0.8 }}>
                                                    Sin cobro hoy. Abona los {totalPrice.toFixed(2)} € directamente en recepción al realizar el check-in (efectivo o tarjeta).
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "25px" }}>
                                    <Button variant="outline-secondary" onClick={() => setStep(1)} disabled={isSubmitting}>
                                        ← Volver a fechas
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={handleConfirmBooking}
                                        disabled={isSubmitting}
                                        style={{ backgroundColor: "#c5a059", borderColor: "#c5a059", fontWeight: 700, padding: "10px 24px" }}
                                    >
                                        {isSubmitting ? (
                                            <span>
                                                <Spinner animation="border" size="sm" style={{ marginRight: "8px" }} /> Creando nueva reserva...
                                            </span>
                                        ) : (
                                            `Confirmar y Crear Reserva (${totalPrice.toFixed(2)} €)`
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </Container>
        </BaseModal>
    );
};

export default DuplicateBookingModal;