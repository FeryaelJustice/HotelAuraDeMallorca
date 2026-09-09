import React, { useState, useEffect } from "react";
import BaseModal from "./BaseModal";
import { useCookies } from "react-cookie";
import { Booking, Promotion } from "./../../models";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./BookingModal.css";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import { Button, Spinner, Badge, Alert, Form } from "react-bootstrap";
import serverAPI from "./../../services/serverAPI";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";

// Stripe
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import {
    PaymentElement,
    Elements,
    useStripe,
    useElements,
} from "@stripe/react-stripe-js";
const stripePromise = loadStripe(process.env.STRIPE_PUBLISHABLE_KEY ? process.env.STRIPE_PUBLISHABLE_KEY : "");

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
    guest_email?: string;
    isAdult: string | number;
}

interface StripeCheckoutFormProps {
    stripeOptions?: StripeElementsOptions;
    totalPriceToPay: number;
    onPay: (stripeContext: { stripe: any; elements: any }) => Promise<void>;
    isProcessing?: boolean;
}

const StripeCheckoutForm = ({ stripeOptions, totalPriceToPay, onPay, isProcessing }: StripeCheckoutFormProps) => {
    const stripe = useStripe();
    const elements = useElements();
    const [errorMessage, setErrorMessage] = useState<string | undefined>();
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (elements == null || stripe == null) {
            return;
        }

        setIsSubmitting(true);
        setErrorMessage(undefined);

        const { error: submitError } = await elements.submit();
        if (submitError) {
            setErrorMessage(submitError.message);
            setIsSubmitting(false);
            return;
        }

        try {
            await onPay({ stripe, elements });
        } catch (err: any) {
            setErrorMessage(err.message || "Error al procesar el pago.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} style={{ marginTop: "16px" }}>
            <PaymentElement />
            <Button
                variant="primary"
                type="submit"
                disabled={!stripe || !elements || isSubmitting || isProcessing}
                className="mt-4 btn-luxury-primary w-100"
                size="lg"
                style={{ backgroundColor: "#c5a059", borderColor: "#c5a059", fontWeight: 700, padding: "12px" }}
            >
                {isSubmitting || isProcessing ? (
                    <span>
                        <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" style={{ marginRight: "8px" }} />
                        Procesando pago seguro...
                    </span>
                ) : (
                    `Pagar con Tarjeta (${Number(totalPriceToPay).toFixed(2)} €)`
                )}
            </Button>
            {errorMessage && <div className="text-danger mt-3" style={{ fontWeight: 600, textAlign: "center" }}>{errorMessage}</div>}
        </form>
    );
};

const DuplicateBookingModal = ({ colorScheme, show, onClose, bookingData }: DuplicateBookingModalProps) => {
    const { t } = useTranslation();
    const [cookies] = useCookies(["token"]);

    // Steps: 1 = Dates & Configuration, 2 = Coupons, 3 = Payment selection
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
    const [currentUserData, setCurrentUserData] = useState<any>(null);

    // Coupons / Promotions state
    const [publicPromotions, setPublicPromotions] = useState<Promotion[]>([]);
    const [isLoadingPromotions, setIsLoadingPromotions] = useState<boolean>(false);
    const [userSelectedPromoCode, setUserSelectedPromoCode] = useState<string>("");
    const [userSelectedPromoID, setUserSelectedPromoID] = useState<number>(-1);
    const [appliedPromoDiscount, setAppliedPromoDiscount] = useState<number>(0);
    const [promoValidationStatus, setPromoValidationStatus] = useState<{ checked: boolean; valid: boolean; message: string; discount?: number } | null>(null);

    // Payment state
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<number>(1); // 1 = Stripe, 2 = Recepcion
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [stripeOptions, setStripeOptions] = useState<StripeElementsOptions | undefined>({
        mode: "payment",
        amount: 5000,
        currency: "eur",
        appearance: {},
    });

    // Load detailed data of the cancelled booking when modal opens
    useEffect(() => {
        if (show && bookingData && bookingData.id) {
            setStep(1);
            setErrorMessage(null);
            setUserSelectedPromoCode("");
            setUserSelectedPromoID(-1);
            setAppliedPromoDiscount(0);
            setPromoValidationStatus(null);
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

                        if (booking.user_name || booking.user_email) {
                            setCurrentUserData({
                                id: booking.user_id,
                                user_name: booking.user_name,
                                user_surnames: booking.user_surnames,
                                user_email: booking.user_email,
                            });
                        }

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

    // Fetch promotions when entering coupon step
    const fetchPromotions = async () => {
        setIsLoadingPromotions(true);
        let uidParam = "";
        const effectiveUserID = currentUserData?.id;
        if (effectiveUserID) {
            uidParam = `&userID=${effectiveUserID}`;
        } else if (cookies.token) {
            try {
                const loggedRes = await serverAPI.post("/getLoggedUserID", { token: cookies.token });
                if (loggedRes?.data?.userID) {
                    uidParam = `&userID=${loggedRes.data.userID}`;
                }
            } catch (e) {
                console.log("Error verifying session in duplicate booking modal:", e);
            }
        }

        try {
            const res = await serverAPI.get(`/promotions?visible=true${uidParam}`);
            const promos = res.data.data || [];
            const parsedPromos = promos.map((p: any) => new Promotion({
                id: p.id,
                code: p.code,
                discount_price: p.discount_price,
                name: p.name,
                description: p.description,
                start_date: p.start_date,
                end_date: p.end_date,
                is_active: p.is_active,
                is_visible: p.is_visible,
                is_user_exclusive: Boolean(p.is_user_exclusive),
            }));
            setPublicPromotions(parsedPromos);
        } catch (err) {
            console.error("Error fetching promotions for duplicate modal:", err);
        } finally {
            setIsLoadingPromotions(false);
        }
    };

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
    const basePrice = (roomPrice * nights) + planPrice + servicesTotal;
    const discountAmount = appliedPromoDiscount > 0 ? (basePrice * appliedPromoDiscount) / 100 : 0;
    const totalPrice = Math.max(0, Math.round((basePrice - discountAmount) * 100) / 100);

    // Update stripeOptions whenever totalPrice changes
    useEffect(() => {
        const paymentAmountInCents = Math.max(50, Math.round(totalPrice * 100));
        setStripeOptions({
            mode: "payment",
            currency: "eur",
            amount: paymentAmountInCents,
            appearance: {},
        });
    }, [totalPrice]);

    // Check availability and advance from step 1 (Dates) to step 2 (Coupons)
    const handleProceedToCoupons = async () => {
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
                // Room is free for these dates, go to step 2 (Coupons)
                fetchPromotions();
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

    // Validate coupon code manually
    const validatePromoCodeManual = async (codeToValidate?: string) => {
        const code = (codeToValidate || userSelectedPromoCode || "").trim();
        if (!code) {
            setPromoValidationStatus({
                checked: true,
                valid: false,
                message: "Introduce un código de cupón para validar",
            });
            setAppliedPromoDiscount(0);
            setUserSelectedPromoID(-1);
            return;
        }

        try {
            const res = await serverAPI.post("/checkPromoCode", {
                code,
                userID: currentUserData?.id,
            });
            if (res.data && res.data.valid && res.data.promotion) {
                const promo = res.data.promotion;
                setUserSelectedPromoCode(promo.code);
                setUserSelectedPromoID(promo.id);
                setAppliedPromoDiscount(Number(promo.discount_price));
                setPromoValidationStatus({
                    checked: true,
                    valid: true,
                    message: `Cupón "${promo.code}" aplicado con éxito: ¡${promo.discount_price}% de descuento!`,
                    discount: promo.discount_price,
                });
            } else {
                setPromoValidationStatus({
                    checked: true,
                    valid: false,
                    message: res.data?.message || "Cupón no encontrado, inactivo o expirado",
                });
                setAppliedPromoDiscount(0);
                setUserSelectedPromoID(-1);
            }
        } catch (err) {
            setPromoValidationStatus({
                checked: true,
                valid: false,
                message: "Error al verificar el cupón. Inténtalo de nuevo.",
            });
        }
    };

    // Advance from step 2 (Coupons) to step 3 (Payment)
    const handleProceedToPayment = async () => {
        setErrorMessage(null);
        if (userSelectedPromoCode && userSelectedPromoCode.trim() !== "") {
            try {
                const checkRes = await serverAPI.post("/checkPromoCode", {
                    code: userSelectedPromoCode.trim(),
                    userID: currentUserData?.id,
                });
                if (checkRes.data && checkRes.data.valid && checkRes.data.promotion) {
                    const promo = checkRes.data.promotion;
                    setAppliedPromoDiscount(Number(promo.discount_price));
                    setUserSelectedPromoID(promo.id);
                    setStep(3);
                } else {
                    setErrorMessage(checkRes.data?.message || "El cupón introducido no es válido o ha expirado.");
                    return;
                }
            } catch (err) {
                console.error("Error validando cupón:", err);
                setErrorMessage("No se pudo verificar el cupón introducido. Inténtalo de nuevo o continúa sin cupón.");
                return;
            }
        } else {
            setAppliedPromoDiscount(0);
            setUserSelectedPromoID(-1);
            setStep(3);
        }
    };

    // Execute booking creation (used for both Reception and Stripe payment completion)
    const executeDuplicateBooking = async (stripeContext?: { stripe: any; elements: any }) => {
        setErrorMessage(null);
        if (!(startDate instanceof Date) || !(endDate instanceof Date)) return;

        setIsSubmitting(true);
        try {
            let clientSecret = `offline_hotel_pay_${Date.now()}`;

            // Verification of promo expiration before payment
            let effectivePromoID = userSelectedPromoID;
            let effectivePrice = totalPrice;

            if (userSelectedPromoCode && userSelectedPromoCode.trim() !== "") {
                try {
                    const promoVerifyRes = await serverAPI.post("/checkPromoCode", {
                        code: userSelectedPromoCode.trim(),
                        userID: currentUserData?.id,
                    });
                    if (!promoVerifyRes.data || !promoVerifyRes.data.valid) {
                        const confirmContinue = await Swal.fire({
                            title: "Cupón de descuento caducado",
                            text: `El cupón "${userSelectedPromoCode}" ha caducado o ya no está disponible. ¿Deseas continuar con la reserva por el importe original (${basePrice.toFixed(2)} €)?`,
                            icon: "warning",
                            showCancelButton: true,
                            confirmButtonText: "Sí, continuar sin descuento",
                            cancelButtonText: "Cancelar y revisar",
                            confirmButtonColor: "#c5a059",
                        });

                        if (!confirmContinue.isConfirmed) {
                            setIsSubmitting(false);
                            return;
                        }

                        setUserSelectedPromoCode("");
                        setUserSelectedPromoID(-1);
                        setAppliedPromoDiscount(0);
                        setPromoValidationStatus(null);
                        effectivePromoID = -1;
                        effectivePrice = basePrice;
                    }
                } catch (promoErr) {
                    console.error("Error al verificar caducidad del cupón:", promoErr);
                }
            }

            // Si se selecciona Stripe y la pasarela está disponible
            if (selectedPaymentMethod === 1 && process.env.STRIPE_PUBLISHABLE_KEY) {
                if (!stripeContext || !stripeContext.stripe || !stripeContext.elements) {
                    throw new Error("La pasarela de pago seguro Stripe no está lista o no se pudo inicializar.");
                }

                const customerEmail = currentUserData?.user_email || (guestsList && guestsList[0]?.guest_email) || undefined;
                const customerName = `${currentUserData?.user_name || ""} ${currentUserData?.user_surnames || ""}`.trim() || undefined;
                const paymentAmountInCents = Math.max(50, Math.round(effectivePrice * 100));

                const purchaseRes = await serverAPI.post("/purchase", {
                    data: {
                        amount: paymentAmountInCents,
                        currency: "eur",
                        plan: planDetails?.id,
                        email: customerEmail,
                        name: customerName,
                        description: `Reserva Duplicada Hotel Aura - Ref #${bookingData?.id} (${customerName || customerEmail || "Huésped"})`,
                    },
                });

                if (!purchaseRes.data || purchaseRes.data.status !== "success" || !purchaseRes.data.client_secret) {
                    throw new Error("No se pudo inicializar la intención de pago en el servidor.");
                }

                clientSecret = purchaseRes.data.client_secret;

                // Confirmación del pago seguro con Stripe Elements
                const confirmResult = await stripeContext.stripe.confirmPayment({
                    elements: stripeContext.elements,
                    clientSecret: clientSecret,
                    confirmParams: {
                        return_url: window.location.origin,
                    },
                    redirect: "if_required",
                });

                if (confirmResult.error) {
                    throw new Error(confirmResult.error.message || "El banco ha rechazado la transacción.");
                }
            }

            const formattedStart = extractFormattedDate(startDate);
            const formattedEnd = extractFormattedDate(endDate);

            const payload = {
                originalBookingID: Number(bookingData?.id),
                startDate: formattedStart,
                endDate: formattedEnd,
                paymentMethodID: Number(selectedPaymentMethod),
                paymentTransactionID: clientSecret,
                amount: effectivePrice,
                promoID: effectivePromoID > 0 ? effectivePromoID : undefined,
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
                const failMsg = response.data?.message || "No se pudo formalizar la nueva reserva.";
                setErrorMessage(failMsg);
                await Swal.fire({
                    title: "No se pudo crear la reserva",
                    text: failMsg,
                    icon: "error",
                    confirmButtonColor: "#c5a059",
                });
            }
        } catch (error: any) {
            console.error("Error al formalizar nueva reserva:", error);
            const msg = error?.response?.data?.message || error?.message || "Ocurrió un error al tramitar la reserva.";
            setErrorMessage(msg);
            await Swal.fire({
                title: "Error al crear la reserva",
                text: msg,
                icon: "error",
                confirmButtonColor: "#c5a059",
            });
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
                                        onClick={handleProceedToCoupons}
                                        disabled={isSubmitting}
                                        style={{ backgroundColor: "#c5a059", borderColor: "#c5a059", fontWeight: 700 }}
                                    >
                                        {isSubmitting ? (
                                            <span>
                                                <Spinner animation="border" size="sm" style={{ marginRight: "6px" }} /> Comprobando disponibilidad...
                                            </span>
                                        ) : (
                                            "Elegir Cupones de Descuento →"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: COUPONS SELECTION */}
                        {step === 2 && (
                            <div>
                                <h6 style={{ fontWeight: 800, marginBottom: "10px", color: isDarkMode ? "#ffffff" : "#1a202c" }}>
                                    2. Cupones de Descuento
                                </h6>
                                <p style={{ opacity: 0.85, fontSize: "0.9rem", marginBottom: "18px" }}>
                                    Aplica un cupón promocional para disfrutar de descuentos exclusivos en tu nueva estancia. Puedes seleccionar uno de tus cupones, introducir un código privado o continuar sin cupón.
                                </p>

                                {isLoadingPromotions ? (
                                    <div style={{ textAlign: "center", padding: "24px 0" }}>
                                        <Spinner animation="border" size="sm" variant="primary" />
                                        <p style={{ marginTop: "8px", fontSize: "0.85rem", opacity: 0.8 }}>Cargando cupones disponibles...</p>
                                    </div>
                                ) : publicPromotions && publicPromotions.length > 0 ? (
                                    <div style={{ marginBottom: "24px" }}>
                                        <h4 style={{ fontSize: "1rem", color: "#c5a059", marginBottom: "14px", fontWeight: 700 }}>
                                            ✨ Cupones Disponibles para Seleccionar:
                                        </h4>
                                        <div className="promo-cards-luxury-grid">
                                            {publicPromotions.map((promo) => {
                                                const isSelected = userSelectedPromoCode.trim().toUpperCase() === (promo.code || "").trim().toUpperCase();
                                                const startStr = promo.start_date ? new Date(promo.start_date).toLocaleDateString("es-ES") : null;
                                                const endStr = promo.end_date ? new Date(promo.end_date).toLocaleDateString("es-ES") : null;

                                                return (
                                                    <div
                                                        key={promo.id}
                                                        className={`promo-luxury-card ${isSelected ? "is-selected" : ""} ${promo.is_user_exclusive ? "promo-luxury-card--exclusive" : ""}`}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                setUserSelectedPromoCode("");
                                                                setAppliedPromoDiscount(0);
                                                                setUserSelectedPromoID(-1);
                                                                setPromoValidationStatus(null);
                                                            } else {
                                                                setUserSelectedPromoCode(promo.code || "");
                                                                validatePromoCodeManual(promo.code || "");
                                                            }
                                                        }}
                                                        role="button"
                                                        tabIndex={0}
                                                    >
                                                        <div className="promo-luxury-badges-group">
                                                            {promo.is_user_exclusive && (
                                                                <span className="promo-luxury-exclusive-tag">
                                                                    ⭐ Solo para ti
                                                                </span>
                                                            )}
                                                            <span className="promo-luxury-badge">
                                                                -{promo.discount_price}%
                                                            </span>
                                                        </div>

                                                        <div className="promo-luxury-header">
                                                            <span className="promo-luxury-name">
                                                                {promo.name || promo.code}
                                                            </span>
                                                            <span className="promo-luxury-code-box">
                                                                <span>🎟️</span>
                                                                <strong>{promo.code}</strong>
                                                            </span>
                                                        </div>

                                                        {promo.description && (
                                                            <p className="promo-luxury-desc">
                                                                {promo.description}
                                                            </p>
                                                        )}

                                                        {(startStr || endStr) && (
                                                            <div className="promo-luxury-validity">
                                                                <span>⏳</span>
                                                                <span>
                                                                    Válido: {startStr ? startStr : "Ahora"} - {endStr ? endStr : "Indefinido"}
                                                                </span>
                                                            </div>
                                                        )}

                                                        <div className="promo-luxury-action-badge">
                                                            {isSelected ? "✓ Cupón Seleccionado" : "Clic para Seleccionar"}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ) : null}

                                <div className="promo-manual-input-box" style={{ marginBottom: "20px" }}>
                                    <h4 style={{ fontSize: "0.95rem", marginBottom: "8px" }}>
                                        ¿Dispones de un cupón privado o exclusivo?
                                    </h4>
                                    <p style={{ fontSize: "0.84rem", opacity: 0.85, marginBottom: "12px" }}>
                                        Introduce tu código para validarlo y aplicarlo a la reserva:
                                    </p>
                                    <Form
                                        onSubmit={(e: any) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            validatePromoCodeManual();
                                        }}
                                    >
                                        <div style={{ display: "flex", gap: "10px", maxWidth: "440px", marginBottom: "12px" }}>
                                            <Form.Control
                                                type="text"
                                                name="promoCode"
                                                placeholder="Ej: AURA2026"
                                                maxLength={255}
                                                value={userSelectedPromoCode}
                                                onChange={(e: any) => {
                                                    setUserSelectedPromoCode(e.target.value);
                                                    setPromoValidationStatus(null);
                                                }}
                                                style={{ textTransform: "uppercase" }}
                                            />
                                            <Button
                                                variant="outline-primary"
                                                onClick={() => validatePromoCodeManual()}
                                                style={{ whiteSpace: "nowrap", borderColor: "#c5a059", color: "#c5a059" }}
                                            >
                                                Comprobar
                                            </Button>
                                        </div>

                                        {promoValidationStatus && (
                                            <div
                                                style={{
                                                    padding: "10px 14px",
                                                    borderRadius: "8px",
                                                    fontSize: "0.88rem",
                                                    marginBottom: "16px",
                                                    maxWidth: "440px",
                                                    background: promoValidationStatus.valid ? "rgba(40,167,69,0.15)" : "rgba(220,53,69,0.15)",
                                                    border: `1px solid ${promoValidationStatus.valid ? "rgba(40,167,69,0.4)" : "rgba(220,53,69,0.4)"}`,
                                                    color: promoValidationStatus.valid ? "#51cf66" : "#ff6b6b",
                                                }}
                                            >
                                                {promoValidationStatus.message}
                                            </div>
                                        )}
                                    </Form>
                                </div>

                                {/* Summary Box with Discount */}
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
                                        <span>Importe estancia ({nights} {nights === 1 ? "noche" : "noches"}):</span>
                                        <strong>{basePrice.toFixed(2)} €</strong>
                                    </div>
                                    {appliedPromoDiscount > 0 && (
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "0.95rem", color: "#28a745" }}>
                                            <span>Descuento aplicado ({appliedPromoDiscount}%):</span>
                                            <strong>-{discountAmount.toFixed(2)} €</strong>
                                        </div>
                                    )}
                                    <hr style={{ margin: "10px 0" }} />
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                        <span style={{ fontSize: "1.1rem", fontWeight: 800 }}>Total Final:</span>
                                        <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "#c5a059" }}>
                                            {totalPrice.toFixed(2)} €
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
                                    <Button variant="outline-secondary" onClick={() => setStep(1)}>
                                        ← Volver a fechas
                                    </Button>
                                    <Button
                                        variant="primary"
                                        onClick={handleProceedToPayment}
                                        style={{ backgroundColor: "#c5a059", borderColor: "#c5a059", fontWeight: 700 }}
                                    >
                                        Continuar al Pago ({totalPrice.toFixed(2)} €) →
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: PAYMENT METHOD SELECTION & STRIPE ELEMENTS */}
                        {step === 3 && (
                            <div>
                                <h6 style={{ fontWeight: 800, marginBottom: "14px", color: isDarkMode ? "#ffffff" : "#1a202c" }}>
                                    3. Selecciona el método de pago para tu nueva estancia
                                </h6>
                                <p style={{ fontSize: "0.85rem", opacity: 0.8, marginBottom: "15px" }}>
                                    Como la reserva anterior fue cancelada y su cobro reembolsado o cerrado, esta nueva estancia requiere formalizar un nuevo método de pago:
                                </p>

                                <div className="booking-showcase-disclaimer" style={{ marginBottom: "18px" }}>
                                    <span style={{ fontSize: "1.4rem" }}>⚠️</span>
                                    <div>
                                        <strong>AVISO DE DEMOSTRACIÓN / SHOWCASE:</strong>
                                        <p style={{ margin: "4px 0 0", fontSize: "0.86rem", lineHeight: "1.45" }}>
                                            Esta aplicación es un proyecto portfolio demostrativo. Por favor, <strong>NO introduzcas datos de tarjetas reales</strong>. Puedes utilizar las tarjetas de prueba de Stripe o la opción <strong>&quot;Pagar en Recepción&quot;</strong>.
                                        </p>
                                    </div>
                                </div>

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
                                                    Abona los {totalPrice.toFixed(2)} € de forma cifrada con tu tarjeta a través de Stripe Elements.
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

                                {/* Stripe Form or Direct Reception Action */}
                                <div style={{ marginTop: "20px" }}>
                                    {selectedPaymentMethod === 1 ? (
                                        <div>
                                            {stripeOptions && process.env.STRIPE_PUBLISHABLE_KEY ? (
                                                <Elements stripe={stripePromise} options={stripeOptions} key={totalPrice}>
                                                    <StripeCheckoutForm
                                                        stripeOptions={stripeOptions}
                                                        totalPriceToPay={totalPrice}
                                                        isProcessing={isSubmitting}
                                                        onPay={async (stripeCtx) => {
                                                            await executeDuplicateBooking(stripeCtx);
                                                        }}
                                                    />
                                                </Elements>
                                            ) : (
                                                <Alert variant="warning">
                                                    La pasarela de pago Stripe no está configurada o no se encontró la clave pública en el entorno. Puedes seleccionar &quot;Pagar en Recepción&quot; para completar tu reserva.
                                                </Alert>
                                            )}
                                        </div>
                                    ) : (
                                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "15px" }}>
                                            <Button
                                                variant="primary"
                                                onClick={() => executeDuplicateBooking()}
                                                disabled={isSubmitting}
                                                style={{ backgroundColor: "#c5a059", borderColor: "#c5a059", fontWeight: 700, padding: "12px 28px", width: "100%" }}
                                            >
                                                {isSubmitting ? (
                                                    <span>
                                                        <Spinner animation="border" size="sm" style={{ marginRight: "8px" }} /> Creando nueva reserva...
                                                    </span>
                                                ) : (
                                                    `Confirmar y Crear Reserva en Recepción (${totalPrice.toFixed(2)} €)`
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px" }}>
                                    <Button variant="outline-secondary" onClick={() => setStep(2)} disabled={isSubmitting}>
                                        ← Volver a cupones
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