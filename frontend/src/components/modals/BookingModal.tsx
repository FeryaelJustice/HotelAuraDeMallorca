import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import Spinner from 'react-bootstrap/Spinner';
import { Booking, Payment, PaymentMethod, PaymentTransaction, Plan, Room, Service, User, Guest, Promotion } from './../../models';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useCookies } from 'react-cookie';
import { isEmptyOrSpaces, validateEmail, validateDNI } from './../../utils';
import './BookingModal.css'
import { API_URL_BASE } from './../../services/consts';
import { WeatherStates } from './../../constants';
import serverAPI from './../../services/serverAPI';
import weatherAPI from "./../../services/weatherAPI";
import { QRCodeSVG } from 'qrcode.react';

import { useTranslation } from "react-i18next";

// Stripe
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js'
import {
    PaymentElement,
    Elements,
    useStripe,
    useElements,
} from '@stripe/react-stripe-js';
const stripePromise = loadStripe(process.env.STRIPE_PUBLISHABLE_KEY ? process.env.STRIPE_PUBLISHABLE_KEY : '');

interface BookingModalProps {
    colorScheme: string,
    show: boolean,
    onClose: () => void;
    initialPromoCode?: string | null;
}

/**
 * Enumeracion: BookingSteps
 * Que hace: Define la maquina de estados de los 8 pasos secuenciales del proceso de reserva:
 * 1. Datos personales y fechas en calendario
 * 2. Seleccion de plan (Basic / VIP)
 * 3. Seleccion de habitacion disponible
 * 4. Extras y servicios contratables
 * 5. Registro de huespedes y menores
 * 6. Aplicacion de codigo promocional
 * 7. Checkout con Stripe o pasarela de pago
 * 8. Pantalla final de confirmacion con QR
 */
enum BookingSteps {
    StepPersonalData,
    StepPlan,
    StepChooseRoom,
    StepChooseServices,
    StepFillGuests,
    StepPromoCode,
    StepPaymentMethod,
    StepConfirmation,
}

// Booking step: calendar properties
type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface OccupancyRecord {
    id: number;
    room_id: number;
    room_name: string;
    booking_start_date: string;
    booking_end_date: string;
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
    onReset?: () => void;
}

interface ErrorBoundaryState {
    hasError: boolean;
}

class BookingErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error("Booking modal runtime error caught:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '30px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)', margin: '20px 0' }}>
                    <h4 style={{ color: '#ef4444', fontWeight: 700 }}>Se ha producido un error inesperado</h4>
                    <p style={{ opacity: 0.85, fontSize: '0.9rem' }}>Los datos se han salvaguardado. Pulsa el botón para reiniciar el asistente de reserva.</p>
                    <Button variant="primary" onClick={() => { this.setState({ hasError: false }); this.props.onReset?.(); }}>
                        Reiniciar Reserva
                    </Button>
                </div>
            );
        }
        return this.props.children;
    }
}

interface StripeCheckoutFormProps {
    plan: any;
    stripeOptions?: StripeElementsOptions;
    totalPriceToPay: number;
    onPay: (paymentData: any) => Promise<void>;
}

const StripeCheckoutForm = ({ plan, stripeOptions, totalPriceToPay, onPay }: StripeCheckoutFormProps) => {
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

        const paymentData = {
            amount: Math.max(50, Math.round(totalPriceToPay * 100)),
            currency: stripeOptions?.currency || 'eur',
            plan: plan
        };

        try {
            await onPay(paymentData);
        } catch (err: any) {
            setErrorMessage(err.message || 'Payment processing failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <PaymentElement />
            <Button variant="primary" type="submit" disabled={!stripe || !elements || isSubmitting} className="mt-3">
                {isSubmitting ? 'Processing...' : `Pay €${totalPriceToPay.toFixed(2)}`}
            </Button>
            {errorMessage && <div className="text-danger mt-2">{errorMessage}</div>}
        </form>
    );
};

// BOOKING MODAL COMPONENT
const BookingModal = ({ colorScheme, show, onClose, initialPromoCode }: BookingModalProps) => {

    const { t } = useTranslation();

    const handleClose = () => {
        resetBookingModal();
        onClose();
    };

    // Stripe and Price States
    const [totalPriceToPay, setTotalPriceToPay] = useState<number>(0);
    const [appliedPromoDiscount, setAppliedPromoDiscount] = useState<number>(0);
    const [stripeOptions, setStripeOptions] = useState<StripeElementsOptions | undefined>({
        mode: 'payment',
        amount: 5000,
        currency: 'eur',
        appearance: {},
    });
    const [paymentTransactionID, setPaymentTransactionID] = useState<string>();

    // Booking Modal
    const [cookies, setCookie, removeCookie] = useCookies(['token', 'cookieConsent']);
    const [currentStep, setCurrentStep] = useState(cookies.token ? BookingSteps.StepPlan : BookingSteps.StepPersonalData);
    const [userAllData, setUserAllData] = useState<User>();
    const [bookingFinalMessage, setBookingFinalMessage] = useState("");
    const [createdBookingId, setCreatedBookingId] = useState<number | null>(null);
    const [userSelectedPromoCode, setUserSelectedPromoCode] = useState<string>("");
    const [userSelectedPromoID, setUserSelectedPromoID] = useState<number>(-1);
    const [userSelectedPromoIsAssociatedWithUser, setUserSelectedPromoIsAssociatedWithUser] = useState<boolean>(false);
    const [publicPromotions, setPublicPromotions] = useState<Promotion[]>([]);
    const [promoValidationStatus, setPromoValidationStatus] = useState<{ checked: boolean; valid: boolean; message: string; discount?: number } | null>(null);

    // Titular as Guest 1 state
    const [isTitularStayingAsGuest1, setIsTitularStayingAsGuest1] = useState<boolean>(true);

    // Plans, Rooms, Services, Payment Methods State
    const [plans, setPlans] = useState<Plan[]>([]);
    const [checkedPlan, setCheckedPlan] = useState<number | null>(1);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoomID, setSelectedRoomID] = useState<number | null>(null);
    const [services, setServices] = useState<Service[]>([]);
    const [selectedServicesIDs, setSelectedServicesIDs] = useState<{ [key: string]: boolean }>({});
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [checkedPaymentMethod, setCheckedPaymentMethod] = useState<number | null>(1);

    // Dates (default today + 2 to today + 5 to satisfy 48h advance booking policy)
    const defaultStart = new Date();
    defaultStart.setDate(defaultStart.getDate() + 2);
    defaultStart.setHours(12, 0, 0, 0);

    const defaultEnd = new Date();
    defaultEnd.setDate(defaultEnd.getDate() + 5);
    defaultEnd.setHours(12, 0, 0, 0);

    const [startDate, onChangeStartDate] = useState<Value>(defaultStart);
    const [endDate, onChangeEndDate] = useState<Value>(defaultEnd);
    const [adults, setAdults] = useState<number>(1);
    const [children, setChildren] = useState<number>(0);
    const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);

    // Guests State
    const [guests, setGuests] = useState<Guest[]>([
        new Guest({ id: null, name: '', surnames: '', email: '', isAdult: true, isSystemUser: false })
    ]);
    const [guestsDataErrors, setGuestsDataErrors] = useState([{ nameError: '', surnamesError: '', emailError: '' }]);
    const [userWantsToBecomeGuest, setUserWantsToBecomeGuest] = useState(false);
    const [isUserGuestAdult, setIsUserGuestAdult] = useState(true);

    // Personal Data State
    const [userPersonalData, setUserPersonalData] = useState({ name: '', dni: '', surnames: '', email: '' });
    const [userPersonalDataErrors, setUserPersonalDataErrors] = useState({ nameError: '', dniError: '', surnamesError: '', emailError: '' });

    // Processing state & Occupancy calendar state
    const [isProcessingBooking, setIsProcessingBooking] = useState(false);
    const [occupancyList, setOccupancyList] = useState<OccupancyRecord[]>([]);
    const [hoveredDateInfo, setHoveredDateInfo] = useState<{ dateStr: string; occupiedRooms: string[] } | null>(null);

    // Handle initial promo code passed from external navigation (e.g. /cupones)
    useEffect(() => {
        if (initialPromoCode && initialPromoCode.trim()) {
            const cleanCode = initialPromoCode.trim();
            setUserSelectedPromoCode(cleanCode);
            // Auto check promo
            serverAPI.post('/checkPromoCode', { code: cleanCode })
                .then(res => {
                    if (res.data && res.data.valid && res.data.promotion) {
                        setPromoValidationStatus({
                            checked: true,
                            valid: true,
                            message: `Cupón ${res.data.promotion.code} activado (${res.data.promotion.discount_price}% de descuento)`,
                            discount: res.data.promotion.discount_price,
                        });
                        setAppliedPromoDiscount(Number(res.data.promotion.discount_price));
                        setUserSelectedPromoID(res.data.promotion.id);
                    }
                })
                .catch(() => {});
        }
    }, [initialPromoCode, show]);

    // Fetch calendar occupancy from backend
    const fetchOccupancy = async () => {
        try {
            const res = await serverAPI.get('/bookingOccupancy');
            if (res.data && res.data.status === 'success') {
                setOccupancyList(res.data.data || []);
            }
        } catch (err) {
            console.log('Error fetching occupancy:', err);
        }
    };

    const fetchPublicPromotions = async () => {
        try {
            const res = await serverAPI.get('/promotions?visible=true');
            if (res.data && res.data.data) {
                const promos = res.data.data.map((p: any) => new Promotion({
                    id: p.id,
                    code: p.code,
                    discount_price: p.discount_price,
                    name: p.name,
                    description: p.description,
                    start_date: p.start_date,
                    end_date: p.end_date,
                    is_active: p.is_active,
                    is_visible: p.is_visible,
                }));
                setPublicPromotions(promos);
            }
        } catch (err) {
            console.log('Error fetching public promotions:', err);
        }
    };

    // Helpers to query occupancy by date
    const getOccupiedRoomsForDate = (date: Date): string[] => {
        const dStr = extractFormattedDate(date);
        const roomsSet = new Set<string>();
        occupancyList.forEach(item => {
            if (dStr >= item.booking_start_date && dStr <= item.booking_end_date) {
                roomsSet.add(item.room_name);
            }
        });
        return Array.from(roomsSet);
    };

    const isDateOccupiedForSelectedRoom = (date: Date): boolean => {
        if (!selectedRoomID) return false;
        const dStr = extractFormattedDate(date);
        return occupancyList.some(item =>
            item.room_id === selectedRoomID &&
            dStr >= item.booking_start_date &&
            dStr <= item.booking_end_date
        );
    };

    const isRoomOccupiedInSelectedRange = (roomId: number): boolean => {
        if (!startDate || !endDate) return false;
        const sStr = extractFormattedDate(startDate);
        const eStr = extractFormattedDate(endDate);
        const isStrictRange = sStr < eStr;
        return occupancyList.some(item => {
            if (item.room_id !== roomId) return false;
            if (isStrictRange) {
                return item.booking_start_date < eStr && item.booking_end_date > sStr;
            }
            return item.booking_start_date <= eStr && item.booking_end_date >= sStr;
        });
    };

    // Reactive unselection: If dates change and selected room is occupied, deselect it
    useEffect(() => {
        if (selectedRoomID && isRoomOccupiedInSelectedRange(selectedRoomID)) {
            setSelectedRoomID(null);
        }
    }, [startDate, endDate, occupancyList]);

    const getCalendarTileClassName = ({ date, view }: { date: Date; view: string }) => {
        if (view !== 'month') return '';
        const occupied = getOccupiedRoomsForDate(date);
        if (occupied.length === 0) return 'calendar-tile-free';

        if (selectedRoomID && isDateOccupiedForSelectedRoom(date)) {
            return 'calendar-tile-occupied-selected';
        }
        if (rooms.length > 0 && occupied.length >= rooms.length) {
            return 'calendar-tile-occupied-full';
        }
        return 'calendar-tile-occupied-partial';
    };

    const getCalendarTileContent = ({ date, view }: { date: Date; view: string }) => {
        if (view !== 'month') return null;
        const occupied = getOccupiedRoomsForDate(date);
        if (occupied.length === 0) return null;

        const isSelectedOccupied = selectedRoomID ? isDateOccupiedForSelectedRoom(date) : false;
        const isFull = rooms.length > 0 && occupied.length >= rooms.length;
        const badgeClass = isSelectedOccupied ? 'occupied-badge-danger' : isFull ? 'occupied-badge-full' : 'occupied-badge-partial';
        const badgeText = isSelectedOccupied ? 'Ocupada' : isFull ? 'Completo' : `${occupied.length} ocup`;
        const tooltipText = isSelectedOccupied
            ? `Habitación elegida ocupada en esta fecha (${occupied.join(', ')})`
            : `Habitaciones ocupadas (${occupied.length}): ${occupied.join(', ')}`;

        return (
            <div
                className="calendar-tile-full-overlay"
                title={tooltipText}
                onMouseEnter={() => setHoveredDateInfo({ dateStr: extractFormattedDate(date), occupiedRooms: occupied })}
                onMouseLeave={() => setHoveredDateInfo(null)}
            >
                <span className={`calendar-tile-status-tag ${badgeClass}`}>
                    {badgeText}
                </span>
            </div>
        );
    };

    // Deterministic price calculation helper
    const computeTotalPrice = (): number => {
        let total = 0;

        // 1. Plan price
        const currentPlan = plans.find(p => p.id === checkedPlan);
        if (currentPlan && currentPlan.price) {
            total += Number(currentPlan.price);
        }

        // 2. Room price * number of nights
        if (selectedRoomID && startDate && endDate) {
            const currentRoom = rooms.find(r => r.id === selectedRoomID);
            if (currentRoom && currentRoom.price) {
                const sDate = new Date(startDate as Date);
                const eDate = new Date(endDate as Date);
                const diffTime = eDate.getTime() - sDate.getTime();
                const nights = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
                total += Number(currentRoom.price) * nights;
            }
        }

        // 3. Services (VIP plan checkedPlan === 2 includes all services for 0€ extra)
        if (checkedPlan !== 2) {
            services.forEach(service => {
                if (service.id && selectedServicesIDs[service.id] && service.price) {
                    total += Number(service.price);
                }
            });
        }

        // 4. Promo discount percentage
        if (appliedPromoDiscount > 0) {
            total = total * (1 - appliedPromoDiscount / 100);
        }

        return Math.max(0, Math.round(total * 100) / 100);
    };

    // Reactive price update
    useEffect(() => {
        const calculatedPrice = computeTotalPrice();
        setTotalPriceToPay(calculatedPrice);
        setStripeOptions(prev => ({
            ...prev,
            mode: 'payment',
            currency: 'eur',
            amount: Math.max(100, Math.round(calculatedPrice * 100)),
        }));
    }, [checkedPlan, selectedRoomID, startDate, endDate, selectedServicesIDs, appliedPromoDiscount, plans, rooms, services]);

    // Get JWT user data
    async function getAllLoggedUserData(): Promise<any> {
        const loggedUserID = await serverAPI.post('/getLoggedUserID', { token: cookies.token }).catch(err => {
            console.log(err)
            removeCookie('token');
        });
        if (loggedUserID) {
            const getLoggedUserData = await serverAPI.get('/loggedUser/' + loggedUserID.data.userID, { headers: { 'Authorization': cookies.token } }).catch(err => {
                removeCookie('token')
                console.log(err)
            });
            if (getLoggedUserData) {
                return getLoggedUserData.data;
            }
        }
    }

    function extractFormattedDate(date: any) {
        const inputDateString = date;
        const inputDate = new Date(inputDateString);

        // Extract the date components (year, month, and day)
        const year = inputDate.getFullYear();
        const month = (inputDate.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed, so we add 1
        const day = inputDate.getDate().toString().padStart(2, '0');

        // Create the 'yyyy-mm-dd' formatted date
        const formattedDate = `${year}-${month}-${day}`;
        return formattedDate;
    }

    // JIT Fetchers with in-memory state caching to prevent repeated calls
    const fetchPlans = async () => {
        if (plans.length > 0) return;
        try {
            const res = await serverAPI.get('/plans');
            const data = res.data.data;
            const retrievedPlans: Plan[] = [];
            data.forEach((plan: any) => {
                retrievedPlans.push(new Plan({
                    id: plan.id,
                    name: plan.plan_name,
                    description: plan.plan_description,
                    price: plan.plan_price,
                    imageURL: API_URL_BASE + "/" + plan.imageURL
                }));
            });
            setPlans(retrievedPlans);
        } catch (err) {
            console.log('Error loading plans:', err);
        }
    };

    const fetchRooms = async () => {
        if (rooms.length > 0) return;
        try {
            const res = await serverAPI.get('/rooms');
            const data = res.data.data;
            const retrievedRooms: Room[] = [];
            const currentYear = new Date().getFullYear();
            data.forEach((room: any) => {
                let aStart = new Date(room.room_availability_start);
                let aEnd = new Date(room.room_availability_end);
                if (isNaN(aStart.getTime()) || aStart.getFullYear() < currentYear) {
                    aStart = new Date('2024-01-01');
                }
                if (isNaN(aEnd.getTime()) || aEnd.getFullYear() < currentYear) {
                    aEnd = new Date('2035-12-31');
                }
                retrievedRooms.push(new Room({
                    id: room.id,
                    name: room.room_name,
                    description: room.room_description,
                    price: room.room_price,
                    availabilityStart: aStart,
                    availabilityEnd: aEnd,
                    imageURL: API_URL_BASE + "/" + room.imageURL
                }));
            });
            setRooms(retrievedRooms);
        } catch (err) {
            console.log('Error loading rooms:', err);
        }
    };

    const fetchServices = async () => {
        if (services.length > 0) return;
        try {
            const res = await serverAPI.get('/services');
            const data = res.data.data;
            const retrievedServices: Service[] = [];
            const currentYear = new Date().getFullYear();
            data.forEach((service: any) => {
                let aStart = new Date(service.serv_availability_start);
                let aEnd = new Date(service.serv_availability_end);
                if (isNaN(aStart.getTime()) || aStart.getFullYear() < currentYear) {
                    aStart = new Date('2024-01-01');
                }
                if (isNaN(aEnd.getTime()) || aEnd.getFullYear() < currentYear) {
                    aEnd = new Date('2035-12-31');
                }
                retrievedServices.push(new Service({
                    id: service.id,
                    name: service.serv_name,
                    description: service.serv_description,
                    price: service.serv_price,
                    availabilityStart: aStart,
                    availabilityEnd: aEnd,
                    imageURL: API_URL_BASE + "/" + service.imageURL
                }));
            });
            setServices(retrievedServices);

            const keyValuePairArray = retrievedServices.map(service => ({
                [service.id ? service.id : (Math.random() * (retrievedServices.length - 0))]: false
            }));
            const selectedServicesObject = Object.assign({}, ...keyValuePairArray);
            setSelectedServicesIDs(prev => ({ ...selectedServicesObject, ...prev }));
        } catch (err) {
            console.log('Error loading services:', err);
        }
    };

    const fetchPaymentMethods = async () => {
        if (paymentMethods.length > 0) return;
        try {
            const res = await serverAPI.get('/paymentmethods');
            const paymentMethodss = res.data.data;
            const retrievedPaymentMethods: PaymentMethod[] = [];
            paymentMethodss.forEach((pm: any) => {
                retrievedPaymentMethods.push(new PaymentMethod({ id: pm.id, name: pm.payment_method_name.toLowerCase() }));
            });
            setPaymentMethods(retrievedPaymentMethods);
        } catch (err) {
            console.log('Error loading payment methods:', err);
        }
    };

    const fetchWeatherData = async () => {
        try {
            const params = {
                lat: 39.58130105,
                lon: 2.709183392285786,
            };
            const res: any = await weatherAPI.getFiveDayForecast(params);
            if (res?.data?.list) {
                postWeatherDataToDB(res.data.list);
            }
        } catch (err: any) {
            console.log('WEATHER API ERROR: ' + err.message);
        }
    };

    // JIT: Just-In-Time fetching per step when modal is open
    useEffect(() => {
        if (!show) return;

        // User data if logged in
        if (cookies.token) {
            if (currentStep === BookingSteps.StepPersonalData) {
                setCurrentStep(BookingSteps.StepPlan);
            }
            if (!userAllData?.id) {
                getAllLoggedUserData().then(resp => {
                    if (resp && resp.data) {
                        const res = resp.data;
                        const loggedUser = new User({
                            id: res.id,
                            name: res.user_name,
                            surnames: res.user_surnames,
                            email: res.user_email,
                            dni: res.user_dni,
                            password: res.user_password,
                            verified: res.user_verified,
                            enabled: res.user_enabled
                        });
                        setUserAllData(loggedUser);
                        setUserPersonalData({
                            name: res.user_name || '',
                            surnames: res.user_surnames || '',
                            email: res.user_email || '',
                            dni: res.user_dni || ''
                        });
                    }
                }).catch(err => console.log(err));
            } else if (!userPersonalData.email && userAllData.email) {
                setUserPersonalData({
                    name: userAllData.name || '',
                    surnames: userAllData.surnames || '',
                    email: userAllData.email || '',
                    dni: userAllData.dni || ''
                });
            }
        } else {
            setUserAllData(new User());
        }

        // Step-specific fetching
        switch (currentStep) {
            case BookingSteps.StepPlan:
                fetchPlans();
                break;
            case BookingSteps.StepChooseRoom:
                fetchRooms();
                fetchOccupancy();
                fetchWeatherData();
                break;
            case BookingSteps.StepChooseServices:
                fetchServices();
                break;
            case BookingSteps.StepPromoCode:
                fetchPublicPromotions();
                break;
            case BookingSteps.StepPaymentMethod:
                fetchPaymentMethods();
                break;
            default:
                break;
        }
    }, [show, currentStep, cookies.token]);

    async function postWeatherDataToDB(weatherData: any) {
        try {
            await serverAPI.post('/insert-weather', {
                list: weatherData,
            });
        } catch (error) {
            console.log('Error inserting weather data:', error);
        }
    }

    function checkCanBookBasedOnWeather(weatherData: any) {
        // Funcionalidad característica: comprobar el tiempo antes de seguir, ya que es a los servicios a lo que afecta (el data viene de nuestro db, con previamente insertado los datos de la weather api)
        let canBook = true;
        const startDateFormat = extractFormattedDate(startDate)
        weatherData.forEach((weatherForecast: any) => {
            const foreDateFormat = extractFormattedDate(weatherForecast.weather_date)
            if (startDateFormat == foreDateFormat && weatherForecast.weather_state == WeatherStates.RAIN) {
                canBook = false;
                return;
            }
        })
        return canBook;
    }

    // Guests management methods
    const syncGuestsWithCount = () => {
        const totalAdults = Math.max(1, Number(adults));
        const totalChildren = Math.max(0, Number(children));
        const totalRequired = totalAdults + totalChildren;

        setGuests(prev => {
            const nextGuests = [...prev];
            while (nextGuests.length < totalRequired) {
                const isAdult = nextGuests.length < totalAdults;
                nextGuests.push(new Guest({
                    id: null,
                    name: '',
                    surnames: '',
                    email: '',
                    isAdult: isAdult,
                    isSystemUser: false
                }));
            }
            if (nextGuests.length > totalRequired) {
                nextGuests.length = totalRequired;
            }
            for (let i = 0; i < nextGuests.length; i++) {
                const isAdult = i < totalAdults;
                nextGuests[i] = {
                    ...nextGuests[i],
                    isAdult: isAdult
                } as Guest;
            }

            // Sync Guest 1 (Titular or first adult)
            if (cookies.token) {
                if (isTitularStayingAsGuest1) {
                    const titularName = userAllData?.name || userPersonalData.name || '';
                    const titularSurnames = userAllData?.surnames || userPersonalData.surnames || '';
                    const titularEmail = userAllData?.email || userPersonalData.email || '';
                    nextGuests[0] = {
                        ...nextGuests[0],
                        name: titularName,
                        surnames: titularSurnames,
                        email: titularEmail,
                        isAdult: true,
                        isSystemUser: true
                    } as Guest;
                } else {
                    nextGuests[0] = {
                        ...nextGuests[0],
                        isAdult: true,
                        isSystemUser: false
                    } as Guest;
                }
            } else {
                // Not logged in: prefill from Step 1 personal data if empty
                nextGuests[0] = {
                    ...nextGuests[0],
                    name: nextGuests[0].name || userPersonalData.name || '',
                    surnames: nextGuests[0].surnames || userPersonalData.surnames || '',
                    email: nextGuests[0].email || userPersonalData.email || '',
                    isAdult: true,
                    isSystemUser: false
                } as Guest;
            }

            return nextGuests;
        });

        setGuestsDataErrors(prev => {
            const nextErrors = [...prev];
            while (nextErrors.length < totalRequired) {
                nextErrors.push({ nameError: '', surnamesError: '', emailError: '' });
            }
            if (nextErrors.length > totalRequired) {
                nextErrors.length = totalRequired;
            }
            return nextErrors;
        });
    };

    const handleTitularStayingToggle = (checked: boolean) => {
        setIsTitularStayingAsGuest1(checked);
        setGuests(prev => {
            if (prev.length === 0) return prev;
            const next = [...prev];
            if (checked) {
                const titularName = userAllData?.name || userPersonalData.name || '';
                const titularSurnames = userAllData?.surnames || userPersonalData.surnames || '';
                const titularEmail = userAllData?.email || userPersonalData.email || '';
                next[0] = {
                    ...next[0],
                    name: titularName,
                    surnames: titularSurnames,
                    email: titularEmail,
                    isAdult: true,
                    isSystemUser: true
                } as Guest;
            } else {
                next[0] = {
                    ...next[0],
                    name: '',
                    surnames: '',
                    email: '',
                    isAdult: true,
                    isSystemUser: false
                } as Guest;
            }
            return next;
        });
    };

    const handleGuestsInputChange = (index: number, event: any) => {
        const { name, value, type, checked } = event.target;
        const updatedGuests = [...guests];
        updatedGuests[index] = {
            ...updatedGuests[index],
            [name]: type === 'checkbox' ? checked : value
        } as Guest;
        setGuests(updatedGuests);

        if (guestsDataErrors[index]) {
            const updatedErrors = [...guestsDataErrors];
            updatedErrors[index] = {
                ...updatedErrors[index],
                [`${name}Error`]: ''
            };
            setGuestsDataErrors(updatedErrors);
        }
    };

    const validateGuestsDataForm = () => {
        const errors: { nameError: string; surnamesError: string; emailError: string }[] = [];
        guests.forEach((guest, index) => {
            const newErrors = { nameError: '', surnamesError: '', emailError: '' };
            if (isEmptyOrSpaces(guest.name)) {
                newErrors.nameError = 'Por favor, introduce un nombre válido';
            }
            if (isEmptyOrSpaces(guest.surnames)) {
                newErrors.surnamesError = 'Por favor, introduce apellidos válidos';
            }
            if (index === 0) {
                // Huésped 1 email mandatory
                if (isEmptyOrSpaces(guest.email) || !validateEmail(guest.email)) {
                    newErrors.emailError = 'Por favor, introduce un correo electrónico válido para el huésped principal';
                }
            } else {
                // Huésped 2+ email optional, but format checked if provided
                if (!isEmptyOrSpaces(guest.email) && !validateEmail(guest.email)) {
                    newErrors.emailError = 'El formato del correo electrónico no es válido';
                }
            }
            errors.push(newErrors);
        });
        return errors;
    };

    const handleGuestsSubmit = (event: any) => {
        event.preventDefault();
        event.stopPropagation();
        const formErrors = validateGuestsDataForm();
        const hasError = formErrors.some(e => e.nameError !== '' || e.surnamesError !== '' || e.emailError !== '');
        if (!hasError) {
            goToNextStep();
        } else {
            setGuestsDataErrors(formErrors);
        }
    };

    const validatePromoCodeManual = async (codeToValidate?: string) => {
        const code = (codeToValidate || userSelectedPromoCode || '').trim();
        if (!code) {
            setPromoValidationStatus({
                checked: true,
                valid: false,
                message: 'Introduce un código de cupón para validar',
            });
            setAppliedPromoDiscount(0);
            setUserSelectedPromoID(-1);
            return;
        }

        try {
            const res = await serverAPI.post('/checkPromoCode', { code });
            if (res.data && res.data.valid && res.data.promotion) {
                const promo = res.data.promotion;
                setUserSelectedPromoCode(promo.code);
                setUserSelectedPromoID(promo.id);
                setAppliedPromoDiscount(Number(promo.discount_price));
                setPromoValidationStatus({
                    checked: true,
                    valid: true,
                    message: `Cupón "${promo.code}" aplicado con éxito: ¡${promo.discount_price}% de descuento!`,
                    discount: promo.discount_price
                });
            } else {
                setPromoValidationStatus({
                    checked: true,
                    valid: false,
                    message: res.data?.message || 'Cupón no encontrado, inactivo o expirado',
                });
                setAppliedPromoDiscount(0);
                setUserSelectedPromoID(-1);
            }
        } catch (err) {
            setPromoValidationStatus({
                checked: true,
                valid: false,
                message: 'Error al verificar el cupón. Inténtalo de nuevo.',
            });
        }
    };

    // Navigation logic: Next Step
    const goToNextStep = async () => {
        switch (currentStep) {
            case BookingSteps.StepPersonalData:
                serverAPI.post('/checkUserExists', { email: userPersonalData.email, dni: userPersonalData.dni }).then(_ => {
                    setCurrentStep(BookingSteps.StepPlan);
                }).catch(error => {
                    if (error && error.response && error.response.data && error.response.data.message) {
                        alert(error.response.data.message);
                    }
                });
                break;
            case BookingSteps.StepPlan:
                if (checkedPlan === 2) {
                    // VIP selected: all services included automatically
                    const allServicesSelected: { [key: string]: boolean } = {};
                    services.forEach(s => {
                        if (s.id) allServicesSelected[s.id] = true;
                    });
                    setSelectedServicesIDs(allServicesSelected);
                }
                setCurrentStep(BookingSteps.StepChooseRoom);
                break;
            case BookingSteps.StepChooseRoom:
                if (selectedRoomID != null) {
                    if (isRoomOccupiedInSelectedRange(selectedRoomID)) {
                        alert("La habitación seleccionada está ocupada en las fechas elegidas. Por favor selecciona otra habitación o cambia las fechas en el calendario.");
                        return;
                    }
                    if (adults <= 10 && children <= 10) {
                        try {
                            const availabilityResponse = await serverAPI.post('/checkBookingAvailability', {
                                roomID: selectedRoomID,
                                start_date: startDate,
                                end_date: endDate
                            });

                            if (availabilityResponse.data && availabilityResponse.data.status === "success") {
                                if (availabilityResponse.data.isAvailable) {
                                    const extractedStartDate = startDate ? new Date(startDate as Date) : new Date();
                                    const formattedStartDate = extractedStartDate.toLocaleDateString('es-ES', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                    });
                                    const currentDate = new Date();
                                    const formattedCurrentDate = currentDate.toLocaleDateString('es-ES', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                    });
                                    const tomorrowDate = new Date();
                                    tomorrowDate.setDate(currentDate.getDate() + 1);
                                    const formattedTomorrowDate = tomorrowDate.toLocaleDateString('es-ES', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                    });

                                    if (formattedStartDate !== formattedCurrentDate && formattedStartDate !== formattedTomorrowDate) {
                                        serverAPI.get('/weather').then(res => {
                                            if (checkCanBookBasedOnWeather(res.data.data)) {
                                                if (checkedPlan === 2) {
                                                    // VIP plan skips choosing services (already included)
                                                    syncGuestsWithCount();
                                                    setCurrentStep(BookingSteps.StepFillGuests);
                                                } else {
                                                    setCurrentStep(BookingSteps.StepChooseServices);
                                                }
                                            } else {
                                                alert("No es posible reservar en la fecha de inicio debido a condiciones meteorológicas adversas (" + WeatherStates.RAIN + "). ¡Por favor selecciona otra fecha!");
                                            }
                                        }).catch(() => {
                                            if (checkedPlan === 2) {
                                                syncGuestsWithCount();
                                                setCurrentStep(BookingSteps.StepFillGuests);
                                            } else {
                                                setCurrentStep(BookingSteps.StepChooseServices);
                                            }
                                        });
                                    } else {
                                        alert('La política de antelación exige un mínimo de 48 horas de antelación para la fecha de llegada.');
                                    }
                                } else {
                                    alert(availabilityResponse.data.message || "Las fechas seleccionadas ya están ocupadas para esta habitación.");
                                }
                            } else {
                                alert("No hay habitaciones disponibles para esas fechas.");
                            }
                        } catch (err: any) {
                            console.error("Availability error:", err);
                            alert("Error comprobando la disponibilidad de la habitación. Por favor, inténtalo de nuevo.");
                        }
                    } else {
                        alert('Máximo 10 adultos y 10 niños permitidos.');
                    }
                } else {
                    alert('Por favor selecciona una habitación para continuar.');
                }
                break;
            case BookingSteps.StepChooseServices:
                syncGuestsWithCount();
                setCurrentStep(BookingSteps.StepFillGuests);
                break;
            case BookingSteps.StepFillGuests:
                fetchPublicPromotions();
                setCurrentStep(BookingSteps.StepPromoCode);
                break;
            case BookingSteps.StepPromoCode:
                if (userSelectedPromoCode && userSelectedPromoCode.trim() !== '') {
                    try {
                        const checkRes = await serverAPI.post('/checkPromoCode', { code: userSelectedPromoCode.trim() });
                        if (checkRes.data && checkRes.data.valid && checkRes.data.promotion) {
                            const promo = checkRes.data.promotion;
                            setAppliedPromoDiscount(Number(promo.discount_price));
                            setUserSelectedPromoID(promo.id);
                            setUserSelectedPromoIsAssociatedWithUser(false);
                            setCurrentStep(BookingSteps.StepPaymentMethod);
                        } else {
                            alert(checkRes.data?.message || 'El cupón introducido no es válido o ha expirado.');
                            return;
                        }
                    } catch (err) {
                        console.error('Error validando cupón:', err);
                        alert('No se pudo verificar el cupón introducido. Inténtalo de nuevo o continúa sin cupón.');
                        return;
                    }
                } else {
                    setAppliedPromoDiscount(0);
                    setUserSelectedPromoID(-1);
                    setUserSelectedPromoIsAssociatedWithUser(false);
                    setCurrentStep(BookingSteps.StepPaymentMethod);
                }
                break;
            case BookingSteps.StepPaymentMethod:
                break;
            case BookingSteps.StepConfirmation:
                resetBookingModal();
                onClose();
                break;
            default:
                break;
        }
    };

    // Navigation logic: Previous Step
    const goToPreviousStep = () => {
        switch (currentStep) {
            case BookingSteps.StepPersonalData:
                break;
            case BookingSteps.StepPlan:
                if (!cookies.token) {
                    setCurrentStep(BookingSteps.StepPersonalData);
                }
                break;
            case BookingSteps.StepChooseRoom:
                setCurrentStep(BookingSteps.StepPlan);
                break;
            case BookingSteps.StepChooseServices:
                setCurrentStep(BookingSteps.StepChooseRoom);
                break;
            case BookingSteps.StepFillGuests:
                if (checkedPlan === 2) {
                    setCurrentStep(BookingSteps.StepChooseRoom);
                } else {
                    setCurrentStep(BookingSteps.StepChooseServices);
                }
                break;
            case BookingSteps.StepPromoCode:
                setCurrentStep(BookingSteps.StepFillGuests);
                break;
            case BookingSteps.StepPaymentMethod:
                setCurrentStep(BookingSteps.StepPromoCode);
                break;
            case BookingSteps.StepConfirmation:
                break;
            default:
                break;
        }
    };

    async function bookingProcess(paymentData: any) {
        setIsProcessingBooking(true);
        try {
            // Check room availability
            const availabilityResponse = await serverAPI.post('/checkBookingAvailability', {
                roomID: selectedRoomID,
                start_date: startDate,
                end_date: endDate
            });

            if (availabilityResponse.data && availabilityResponse.data.status === "success") {
                if (availabilityResponse.data.isAvailable) {
                    // Check if the user exists
                    let userID = userAllData?.id;
                    if (!cookies.token) {
                        userID = await createUser();
                        if (!userID) {
                            alert('No se pudo registrar la cuenta para formalizar la reserva. Revisa los datos introducidos.');
                            setIsProcessingBooking(false);
                            return;
                        }
                    }

                    // Process payment (Stripe vs Hotel Reception fallback)
                    let clientSecret = `offline_hotel_pay_${Date.now()}`;
                    if (checkedPaymentMethod === 1 && process.env.STRIPE_PUBLISHABLE_KEY) {
                        clientSecret = await doPayment(paymentData);
                        if (!clientSecret) {
                            alert('Error procesando el pago en línea. Por favor, prueba de nuevo o elige pagar en recepción.');
                            setIsProcessingBooking(false);
                            return;
                        }
                    }

                    // Make the booking in database
                    await doBooking(userID, clientSecret, totalPriceToPay, userSelectedPromoID);
                } else {
                    if (availabilityResponse.data.available) {
                        const list = availabilityResponse.data.available.join(' / ');
                        alert("No es posible reservar en estas fechas porque la habitación está ocupada. Fechas libres: " + list);
                    } else {
                        alert(availabilityResponse.data.message || "No es posible reservar en estas fechas porque la habitación está ocupada.");
                    }
                }
            } else {
                alert("No hay habitaciones disponibles en las fechas solicitadas.");
            }
        } catch (error: any) {
            console.log('Error during the booking process:', error);
            if (error && error.response && error.response.data && error.response.data.message) {
                alert(error.response.data.message);
            } else {
                alert("Ocurrió un error procesando tu reserva. Por favor, inténtalo de nuevo.");
            }
            await cancelBooking().catch(e => console.log('Rollback notice:', e));
        } finally {
            setIsProcessingBooking(false);
        }
    }

    async function doPayment(paymentData: any) {
        try {
            const response = await serverAPI.post('/purchase', { data: paymentData });
            return response.data.client_secret;
        } catch (error) {
            console.log('Error processing payment:', error);
            throw error;
        }
    }

    async function cancelBooking() {
        if (paymentTransactionID) {
            await serverAPI.post('/cancel-payment', { client_secret: paymentTransactionID }).catch(() => {});
        }
    }

    async function createUser() {
        try {
            const userToCreate = {
                email: userPersonalData.email,
                dni: userPersonalData.dni,
                name: userPersonalData.name,
                surnames: userPersonalData.surnames,
                password: "AuraHotel2026!",
                roleID: 1
            };
            const res = await serverAPI.post('/register', userToCreate);

            if (res.data && res.data.cookieJWT) {
                setCookie('token', res.data.cookieJWT);
            }

            const newUserAllData: User = {
                id: res.data.insertId,
                ...userToCreate,
                verified: false,
                enabled: true,
            };

            setUserAllData(newUserAllData);
            return res.data.insertId;
        } catch (error) {
            console.log('Error creating user:', error);
            return null;
        }
    }

    // nos aseguramos de hacer el booking con el nuevo usuario, o el ya existente
    async function doBooking(user_id: any, paymentTransactionID: any, updatedPrice: number, promoID: number) {
        try {
            const booking = new Booking({
                id: null,
                userID: user_id,
                planID: checkedPlan,
                roomID: selectedRoomID,
                startDate: startDate as Date,
                endDate: endDate as Date,
                isCancelled: false
            });

            const bookingData = {
                booking,
                selectedServicesIDs,
                guests
            };

            // Make the API call for booking, and there we will also insert the booking services and booking guests
            const bookingResponse = await serverAPI.post('/createBooking', bookingData);

            if (bookingResponse.data.status === "success") {
                const newBookingId = bookingResponse.data.insertId;
                setCreatedBookingId(newBookingId);

                // Insert promo applied with booking if its the case
                if (promoID != -1) {
                    // Promo was found
                    await serverAPI.post('/saveBookingWithPromoApplied', { promoID: promoID, bookingID: newBookingId });
                }

                // Make the API call for payment
                const payment = new Payment({
                    id: null,
                    userID: user_id,
                    bookingID: bookingResponse.data.insertId,
                    amount: updatedPrice,
                    date: new Date(),
                    paymentMethodID: checkedPaymentMethod
                });

                const paymentResponse = await serverAPI.post('/payment', payment);

                if (paymentResponse) {
                    const paymentTransaction = new PaymentTransaction({ id: null, payment_id: paymentResponse.data.insertId, transaction_id: paymentTransactionID ? paymentTransactionID : '' });

                    const paymentTransResponse = await serverAPI.post('/paymentTransaction', paymentTransaction);

                    setPaymentTransactionID(paymentTransactionID)

                    if (paymentTransResponse) {
                        // If everything went well, proceed to the next screen and empty data on the next screen

                        if (userSelectedPromoIsAssociatedWithUser) {
                            // Set promo associated with user to be used
                            await serverAPI.post('/setUserPromoUsed', { promoID: userSelectedPromoID, userID: userAllData?.id }, { headers: { 'Authorization': cookies.token } });
                        }

                        if (!cookies.token) {
                            // If there are no cookies, it means that the user from the first screen has registered
                            setBookingFinalMessage(prevMsg => prevMsg + 'Your user has been registered, and a confirmation email has been sent / ');
                        }
                        setCurrentStep(BookingSteps.StepConfirmation);
                    }
                }
            }
        } catch (error) {
            console.log('Error making the booking:', error);
            throw error;
        }
    }

    // Step Personal data Form
    const validatePersonalDataForm = () => {
        const { name, surnames, email, dni } = userPersonalData;
        const newErrors = { nameError: '', surnamesError: '', emailError: '', dniError: '' }

        if (isEmptyOrSpaces(name)) {
            newErrors.nameError = 'Please enter a valid name'
        }
        if (isEmptyOrSpaces(surnames)) {
            newErrors.surnamesError = 'Please enter valid surnames'
        }
        if (!validateEmail(email)) {
            newErrors.emailError = 'Please enter a valid email'
        }
        if (!validateDNI(dni)) {
            newErrors.dniError = 'Please enter a valid dni/id'
        }

        return newErrors;
    }

    const handlePersonalDataSubmit = (event: React.ChangeEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();

        //let form = event.currentTarget;
        const formErrors = validatePersonalDataForm();

        if (formErrors.nameError == '' && formErrors.surnamesError == '' && formErrors.emailError == '' && formErrors.dniError == '') {
            goToNextStep();
        } else {
            setUserPersonalDataErrors(formErrors)
        }
    }

    const handlePersonalDataChange = (event: any) => {
        setUserPersonalData({ ...userPersonalData, [event.target.name]: event.target.value });
        if (!!userPersonalDataErrors[event.target.name as keyof Object]) {
            setUserPersonalDataErrors({ ...userPersonalDataErrors, [event.target.name]: null })
        }
    }

    const selectPlan = (planID: any) => {
        setCheckedPlan(planID);
    };

    const handleStartDateChange = (newStartDate: Value) => {
        onChangeStartDate(newStartDate);
    }

    const handleEndDateChange = (newEndDate: Value) => {
        onChangeEndDate(newEndDate);
    }

    // Filter rooms
    useEffect(() => {
        setFilteredRooms(
            rooms.filter((room) => {
                if (startDate && endDate && room) {
                    const roomStart = room.availabilityStart || new Date('2024-01-01');
                    const roomEnd = room.availabilityEnd || new Date('2035-12-31');
                    return roomStart <= startDate && roomEnd >= endDate;
                } else if (room) {
                    const now = new Date();
                    const roomStart = room.availabilityStart || new Date('2024-01-01');
                    const roomEnd = room.availabilityEnd || new Date('2035-12-31');
                    return roomStart <= now && roomEnd >= now;
                }
                return false;
            })
        );
    }, [rooms, startDate, endDate, adults, children]);

    const roomSelected = (roomID: any) => {
        setSelectedRoomID(roomID)
    }

    const serviceSelected = (serviceID: any) => {
        if (selectedServicesIDs[serviceID]) {
            setSelectedServicesIDs(prevState => ({ ...prevState, [serviceID]: false }));
        } else {
            setSelectedServicesIDs(prevState => ({ ...prevState, [serviceID]: true }));
        }
    }

    const paymentMethodSelected = (paymentMethodID: any) => {
        setCheckedPaymentMethod(paymentMethodID);
    };

    // FUNCTIONS TO CHECK FOR PROMOS
    async function getPromoDiscount(promoId: number): Promise<number> {
        try {
            const response = await serverAPI.get(`/get-promo-discount/${promoId}`);
            return response.data.data.discount;
        } catch (error) {
            console.log('Error getting promo discount:', error);
            return 0;
        }
    }

    async function getPromoDiscountPercentage(promotions: Promotion[], userSelectedPromoCode: string): Promise<{ discountPercentage: number, appliedPromoId: number, isUserPromo: boolean }> {
        let discountPercentage = 0;
        let appliedPromoId = -1;
        let isUserPromo = false;

        if (userSelectedPromoCode && userSelectedPromoCode.trim() !== '') {
            const selectedPromo = promotions.find(promo => promo.code === userSelectedPromoCode.trim());
            if (selectedPromo) {
                try {
                    const [userPromosResponse, discount] = await Promise.all([
                        serverAPI.post('/getUserAssociatedPromos', { userID: userAllData?.id }),
                        getPromoDiscount(selectedPromo.id ? selectedPromo.id : -1),
                    ]);

                    const userAssociatedPromos: Promotion[] = userPromosResponse.data.results || [];
                    const currentDate = new Date();
                    const promoStartDate = selectedPromo.start_date ? new Date(selectedPromo.start_date) : null;
                    const promoEndDate = selectedPromo.end_date ? new Date(selectedPromo.end_date) : null;

                    for (const userPromo of userAssociatedPromos as any[]) {
                        if (userPromo.promotion_id === selectedPromo.id && !userPromo.isUsed) {
                            if (promoStartDate && promoEndDate) {
                                const currentDateString = currentDate.toISOString().slice(0, 10);
                                const promoStartDateString = promoStartDate.toISOString().slice(0, 10);
                                const promoEndDateString = promoEndDate.toISOString().slice(0, 10);
                                if (promoStartDateString <= currentDateString && currentDateString <= promoEndDateString) {
                                    discountPercentage = discount;
                                    appliedPromoId = selectedPromo.id ? selectedPromo.id : -1;
                                    isUserPromo = true;
                                    break;
                                }
                            }
                        }
                    }

                    if (!isUserPromo && promoStartDate && promoEndDate) {
                        const currentDateString = currentDate.toISOString().slice(0, 10);
                        const promoStartDateString = promoStartDate.toISOString().slice(0, 10);
                        const promoEndDateString = promoEndDate.toISOString().slice(0, 10);
                        if (promoStartDateString <= currentDateString && currentDateString <= promoEndDateString) {
                            discountPercentage = discount;
                            appliedPromoId = selectedPromo.id ? selectedPromo.id : -1;
                        }
                    }
                } catch (error) {
                    console.log('Error verifying promo code:', error);
                }
            }
        }

        return { discountPercentage, appliedPromoId, isUserPromo };
    }

    // RESET
    const resetBookingModal = () => {
        setCurrentStep(BookingSteps.StepPersonalData);
        if (cookies.token) {
            setCurrentStep(BookingSteps.StepPlan);
        }
        setUserPersonalData({ name: '', surnames: '', email: '', dni: '' });
        setUserPersonalDataErrors({ nameError: '', surnamesError: '', emailError: '', dniError: '' });
        setGuests([
            new Guest({ id: null, name: '', surnames: '', email: '', isAdult: false, isSystemUser: false })
        ]);
        setGuestsDataErrors([{ nameError: '', surnamesError: '', emailError: '' }]);
        setCheckedPlan(1);
        const resetStart = new Date();
        resetStart.setDate(resetStart.getDate() + 2);
        resetStart.setHours(12, 0, 0, 0);
        const resetEnd = new Date();
        resetEnd.setDate(resetEnd.getDate() + 5);
        resetEnd.setHours(12, 0, 0, 0);
        onChangeStartDate(resetStart);
        onChangeEndDate(resetEnd);
        setAdults(1);
        setChildren(0);
        setFilteredRooms([]);
        setSelectedRoomID(null);
        setAppliedPromoDiscount(0);
        setUserSelectedPromoCode("");
        setUserSelectedPromoID(-1);
    };

    // When close, reset modal data
    useEffect(() => {
        if (!show && !cookies.token) {
            resetBookingModal();
        }
    }, [show])

    const allStepsConfig = [
        { step: BookingSteps.StepPersonalData, title: 'Datos' },
        { step: BookingSteps.StepPlan, title: 'Plan' },
        { step: BookingSteps.StepChooseRoom, title: 'Habitación' },
        { step: BookingSteps.StepChooseServices, title: 'Servicios' },
        { step: BookingSteps.StepFillGuests, title: 'Huéspedes' },
        { step: BookingSteps.StepPromoCode, title: 'Cupón' },
        { step: BookingSteps.StepPaymentMethod, title: 'Pago' },
        { step: BookingSteps.StepConfirmation, title: 'Confirmado' }
    ];

    const stepsConfig = cookies.token
        ? allStepsConfig.filter(s => s.step !== BookingSteps.StepPersonalData)
        : allStepsConfig;

    return (
        <BaseModal title={t("book")} show={show} onClose={handleClose}>
            <BookingErrorBoundary onReset={resetBookingModal}>
                <div>
                    {/* Visual Stepper */}
                    <div className="booking-stepper" role="progressbar" aria-valuenow={currentStep + 1} aria-valuemin={1} aria-valuemax={stepsConfig.length}>
                        {stepsConfig.map((item, idx) => {
                            const isActive = currentStep === item.step;
                            const isCompleted = currentStep > item.step;
                            return (
                                <div
                                    key={item.step}
                                    className={`booking-stepper-item ${isActive ? 'is-active' : ''} ${isCompleted ? 'is-completed' : ''}`}
                                >
                                    <div className="booking-stepper-circle">
                                        {isCompleted ? '✓' : idx + 1}
                                    </div>
                                    <span className="booking-stepper-title">{item.title}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Step 1: Personal Data (Unregistered users) */}
                    {currentStep === BookingSteps.StepPersonalData && (
                        <div>
                            <h2>{t("modal_booking_personaldata_title")}</h2>

                            <Form id='personalDataForm' noValidate onSubmit={handlePersonalDataSubmit}>
                                <Form.Group className="mb-3" controlId="formName">
                                    <Form.Label>{t("modal_booking_personaldata_name_label")}</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="name"
                                        placeholder={t("modal_booking_personaldata_name_placeholder")}
                                        value={userPersonalData.name}
                                        onChange={handlePersonalDataChange}
                                        isInvalid={!!userPersonalDataErrors.nameError}
                                        required
                                    />
                                    <Form.Control.Feedback type='invalid'>
                                        {userPersonalDataErrors.nameError}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="formSurnames">
                                    <Form.Label>{t("modal_booking_personaldata_surnames_label")}</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="surnames"
                                        placeholder={t("modal_booking_personaldata_surnames_placeholder")}
                                        value={userPersonalData.surnames}
                                        onChange={handlePersonalDataChange}
                                        isInvalid={!!userPersonalDataErrors.surnamesError}
                                        required
                                    />
                                    <Form.Control.Feedback type='invalid'>
                                        {userPersonalDataErrors.surnamesError}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="formEmail">
                                    <Form.Label>{t("modal_booking_personaldata_email_label")}</Form.Label>
                                    <Form.Control
                                        type="email"
                                        name="email"
                                        placeholder={t("modal_booking_personaldata_email_placeholder")}
                                        value={userPersonalData.email}
                                        onChange={handlePersonalDataChange}
                                        isInvalid={!!userPersonalDataErrors.emailError}
                                        required
                                    />
                                    <Form.Text className="text-muted">
                                        {t("modal_booking_personaldata_email_description")}
                                    </Form.Text>
                                    <Form.Control.Feedback type='invalid'>
                                        {userPersonalDataErrors.emailError}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Form.Group className="mb-3" controlId="formDNI">
                                    <Form.Label>{t("modal_booking_personaldata_dni_label")}</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="dni"
                                        minLength={9}
                                        maxLength={9}
                                        pattern="[0-9]{8}[A-Za-z]{1}"
                                        placeholder={t("modal_booking_personaldata_dni_placeholder")}
                                        value={userPersonalData.dni}
                                        onChange={handlePersonalDataChange}
                                        isInvalid={!!userPersonalDataErrors.dniError}
                                        required
                                    />
                                    <Form.Text className="text-muted">
                                        {t("modal_booking_personaldata_dni_description")}
                                    </Form.Text>
                                    <Form.Control.Feedback type='invalid'>
                                        {userPersonalDataErrors.dniError}
                                    </Form.Control.Feedback>
                                </Form.Group>

                                <Form.Label>
                                    <em>{t("modal_booking_personaldata_infodefaultaccount")}</em><br />
                                    <strong>{t("modal_booking_personaldata_infodefaultaccount_important")}</strong>
                                </Form.Label>

                                <div className='bookingNavButtons'>
                                    <span />
                                    <Button variant='primary' type='submit' className="btn-luxury-primary">
                                        {t("modal_booking_nextstep")} →
                                    </Button>
                                </div>
                            </Form>
                        </div>
                    )}

                    {/* Step 2: Plans */}
                    {currentStep === BookingSteps.StepPlan && (
                        <div>
                            <h2>{t("modal_booking_plans_title")}</h2>
                            <p style={{ opacity: 0.85, fontSize: '0.92rem', marginBottom: '16px' }}>
                                Escoge la experiencia que mejor se adapte a tu estancia en Aura de Mallorca.
                            </p>
                            <div className="cards-plan" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                                {plans && plans.length > 0 ? (
                                    plans.map((plan) => {
                                        const isSelected = checkedPlan === plan.id;
                                        return (
                                            <div
                                                key={plan.id}
                                                className={`booking-luxury-card ${isSelected ? 'selected' : ''}`}
                                                onClick={() => selectPlan(plan.id)}
                                                style={{ backgroundImage: `url(${plan.imageURL})` }}
                                                role="button"
                                                tabIndex={0}
                                            >
                                                <div className="booking-card-overlay">
                                                    <div className="booking-card-header">
                                                        <div>
                                                            <h3 className="booking-card-title">{plan.name}</h3>
                                                            <span className="booking-card-subtitle">{plan.description}</span>
                                                        </div>
                                                        <span className="booking-card-badge booking-badge-luxury">
                                                            {plan.price ? `${plan.price} €` : 'Básico'}
                                                        </span>
                                                    </div>
                                                    <div className="booking-card-footer">
                                                        <div className={`booking-card-pill ${isSelected ? 'selected' : ''}`}>
                                                            {isSelected ? '✓ Plan Seleccionado' : 'Seleccionar Plan'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div>
                                        <h4>No se encontraron planes disponibles</h4>
                                    </div>
                                )}
                            </div>

                            <div className='bookingNavButtons'>
                                {!cookies.token && (
                                    <Button variant="secondary" onClick={goToPreviousStep} className="btn-luxury-secondary">
                                        ← {t("modal_booking_previousstep")}
                                    </Button>
                                )}

                                <Button variant='primary' onClick={goToNextStep} className="btn-luxury-primary">
                                    {t("modal_booking_nextstep")} →
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Choose Dates & Room */}
                    {currentStep === BookingSteps.StepChooseRoom && (
                        <div className='bookingContainer'>
                            <Container>
                                <Row className="mb-3">
                                    <Col>
                                        <h2>{t("modal_booking_rooms_title")}</h2>
                                        <div className="booking-weather-card">
                                            <span style={{ fontSize: '1.4rem' }}>☀️</span>
                                            <div>
                                                <strong>Garantía Meteorológica Aura:</strong>
                                                <div style={{ fontSize: '0.82rem', opacity: 0.9 }}>
                                                    Verificamos el clima en tiempo real de Mallorca. Si llueve en tu fecha de llegada, podrás reprogramar o cambiar de fecha sin penalización.
                                                </div>
                                            </div>
                                        </div>
                                    </Col>
                                </Row>

                                {/* Section 1: Dates and Guests */}
                                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                    <h3 style={{ fontSize: '1.15rem', marginBottom: '14px', color: '#c5a059', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span>1. Fechas de Estancia y Ocupación</span>
                                    </h3>

                                    <Row>
                                        <Col md={6} className="mb-3">
                                            <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '0.92rem' }}>
                                                📅 {t("modal_booking_rooms_startdate")}
                                            </div>
                                            <Calendar
                                                minDate={new Date()}
                                                maxDate={endDate instanceof Date ? endDate : undefined}
                                                onChange={handleStartDateChange}
                                                value={startDate}
                                                tileClassName={getCalendarTileClassName}
                                                tileContent={getCalendarTileContent}
                                            />
                                        </Col>
                                        <Col md={6} className="mb-3">
                                            <div style={{ fontWeight: 600, marginBottom: '8px', fontSize: '0.92rem' }}>
                                                📅 {t("modal_booking_rooms_enddate")}
                                            </div>
                                            <Calendar
                                                minDate={startDate instanceof Date ? new Date(startDate.getTime() + 24 * 60 * 60 * 1000) : undefined}
                                                onChange={handleEndDateChange}
                                                value={endDate}
                                                tileClassName={getCalendarTileClassName}
                                                tileContent={getCalendarTileContent}
                                            />
                                        </Col>
                                    </Row>

                                    {/* Occupancy Legend */}
                                    <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', margin: '8px 0 12px 0', fontSize: '0.8rem', flexWrap: 'wrap' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#28a745', display: 'inline-block' }}></span>
                                            Disponible
                                        </span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fd7e14', display: 'inline-block' }}></span>
                                            Ocupación parcial
                                        </span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc3545', display: 'inline-block' }}></span>
                                            Habitación seleccionada ocupada
                                        </span>
                                    </div>

                                    {/* Live Occupancy Banner upon hover */}
                                    <div className="calendar-occupancy-banner">
                                        <div className="occupancy-banner-title">
                                            <span>📅 Disponibilidad de Habitaciones en el Calendario</span>
                                            {hoveredDateInfo && (
                                                <span className="hovered-date-badge">{hoveredDateInfo.dateStr}</span>
                                            )}
                                        </div>
                                        {hoveredDateInfo ? (
                                            hoveredDateInfo.occupiedRooms.length > 0 ? (
                                                <div className="occupancy-banner-content">
                                                    <span style={{ color: '#ff6b6b', fontWeight: 600 }}>
                                                        Habitaciones reservadas en esta fecha ({hoveredDateInfo.occupiedRooms.length}):{' '}
                                                    </span>
                                                    {hoveredDateInfo.occupiedRooms.join(', ')}
                                                </div>
                                            ) : (
                                                <div className="occupancy-banner-content" style={{ color: '#51cf66' }}>
                                                    ✓ Todas las habitaciones se encuentran disponibles en este día.
                                                </div>
                                            )
                                        ) : (
                                            <div className="occupancy-banner-content" style={{ opacity: 0.8 }}>
                                                Pasa el cursor sobre cualquier fecha del calendario para ver el detalle de habitaciones reservadas.
                                            </div>
                                        )}
                                    </div>

                                    {/* Guests Count */}
                                    <Row className="mt-3">
                                        <Col md={6}>
                                            <Form.Label>{t("modal_booking_rooms_adults")}</Form.Label>
                                            <Form.Control
                                                type="number"
                                                min={1}
                                                max={10}
                                                value={Math.max(1, adults)}
                                                onChange={(e: any) => setAdults(Math.max(1, Math.min(10, Number(e.target.value) || 1)))}
                                            />
                                        </Col>
                                        <Col md={6}>
                                            <Form.Label>{t("modal_booking_rooms_children")}</Form.Label>
                                            <Form.Control
                                                type="number"
                                                min={0}
                                                max={10}
                                                value={Math.max(0, children)}
                                                onChange={(e: any) => setChildren(Math.max(0, Math.min(10, Number(e.target.value) || 0)))}
                                            />
                                        </Col>
                                    </Row>
                                    <div style={{ marginTop: '8px', fontSize: '0.8rem', opacity: 0.8 }}>
                                        <em>{t("modal_booking_rooms_info_adultschildren")}</em>
                                    </div>
                                </div>

                                {/* Section 2: Room Selection */}
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                                        <h3 style={{ fontSize: '1.15rem', color: '#c5a059', margin: 0 }}>
                                            2. Selección de Habitación
                                        </h3>
                                        <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                                            Estancia:{' '}
                                            <strong>
                                                {startDate && endDate
                                                    ? `${Math.max(1, Math.round(((endDate as Date).getTime() - (startDate as Date).getTime()) / (1000 * 60 * 60 * 24)))} noches`
                                                    : '1 noche'}
                                            </strong>
                                        </span>
                                    </div>

                                    {filteredRooms && filteredRooms.length > 0 ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '16px' }}>
                                            {filteredRooms.map((room) => {
                                                const isOccupied = room.id ? isRoomOccupiedInSelectedRange(room.id) : false;
                                                const isSelected = selectedRoomID === room.id;
                                                const nightsCount = startDate && endDate
                                                    ? Math.max(1, Math.round(((endDate as Date).getTime() - (startDate as Date).getTime()) / (1000 * 60 * 60 * 24)))
                                                    : 1;
                                                const totalRoomPrice = nightsCount * (room.price || 0);

                                                return (
                                                    <div
                                                        key={room.id}
                                                        className={`booking-luxury-card ${isSelected ? 'selected' : ''} ${isOccupied ? 'is-disabled' : ''}`}
                                                        onClick={() => {
                                                            if (isOccupied) {
                                                                alert(`La habitación "${room.name}" no está disponible en las fechas elegidas. Por favor escoge otra habitación o cambia las fechas.`);
                                                            } else {
                                                                roomSelected(room.id);
                                                            }
                                                        }}
                                                        style={{ backgroundImage: `url(${room.imageURL})`, minHeight: '230px' }}
                                                        role="button"
                                                        tabIndex={0}
                                                    >
                                                        <div className="booking-card-overlay">
                                                            <div className="booking-card-header">
                                                                <div>
                                                                    <h4 className="booking-card-title">{room.name}</h4>
                                                                    <span className="booking-card-subtitle">{room.description}</span>
                                                                </div>
                                                                <div style={{ textAlign: 'right' }}>
                                                                    <span className="booking-card-badge booking-badge-price">
                                                                        {room.price} € / noche
                                                                    </span>
                                                                    {isOccupied ? (
                                                                        <div className="booking-card-badge" style={{ background: 'rgba(220,53,69,0.9)', marginTop: '4px' }}>
                                                                            ⚠️ Ocupada en estas fechas
                                                                        </div>
                                                                    ) : (
                                                                        <div className="booking-card-badge" style={{ background: 'rgba(40,167,69,0.9)', marginTop: '4px' }}>
                                                                            ✓ Disponible ({nightsCount} n: {totalRoomPrice} €)
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="booking-card-footer">
                                                                <div className={`booking-card-pill ${isSelected ? 'selected' : ''}`}>
                                                                    {isOccupied ? 'No disponible' : isSelected ? '✓ Habitación Seleccionada' : 'Elegir esta habitación'}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div style={{ padding: '20px', textAlign: 'center', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                            <h4>No hay habitaciones disponibles para los criterios seleccionados</h4>
                                        </div>
                                    )}
                                </div>

                                <div className='bookingNavButtons' style={{ marginTop: '24px' }}>
                                    <Button variant="secondary" onClick={goToPreviousStep} className="btn-luxury-secondary">
                                        ← {t("modal_booking_previousstep")}
                                    </Button>

                                    <Button variant='primary' onClick={goToNextStep} className="btn-luxury-primary">
                                        {t("modal_booking_nextstep")} →
                                    </Button>
                                </div>
                            </Container>
                        </div>
                    )}

                    {/* Step 4: Services */}
                    {currentStep === BookingSteps.StepChooseServices && (
                        <div className='servicesContainer'>
                            <Container>
                                <Row className="mb-2">
                                    <Col>
                                        <h2>{t("modal_booking_services_title")}</h2>
                                        <span style={{ fontSize: '0.88rem', opacity: 0.85 }}>({t("modal_booking_services_optional")})</span>
                                        {checkedPlan === 2 && (
                                            <div style={{ marginTop: '8px', padding: '10px 14px', background: 'rgba(197,160,89,0.15)', border: '1px solid rgba(197,160,89,0.4)', borderRadius: '8px', fontSize: '0.85rem' }}>
                                                ⭐ <strong>Plan VIP Activado:</strong> Todos los servicios adicionales están incluidos sin coste añadido en tu tarifa.
                                            </div>
                                        )}
                                    </Col>
                                </Row>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
                                    {services && services.length > 0 ? (
                                        services.map((service) => {
                                            const isSelected = selectedServicesIDs[service.id || 0];
                                            const isVipIncluded = checkedPlan === 2;

                                            return (
                                                <div
                                                    key={service.id}
                                                    className={`booking-luxury-card ${isSelected ? 'selected' : ''}`}
                                                    onClick={() => !isVipIncluded && serviceSelected(service.id)}
                                                    style={{ backgroundImage: `url(${service.imageURL})`, minHeight: '200px' }}
                                                    role="button"
                                                    tabIndex={0}
                                                >
                                                    <div className="booking-card-overlay">
                                                        <div className="booking-card-header">
                                                            <div>
                                                                <h4 className="booking-card-title">{service.name}</h4>
                                                                <span className="booking-card-subtitle">{service.description}</span>
                                                            </div>
                                                            <div style={{ textAlign: 'right' }}>
                                                                {isVipIncluded ? (
                                                                    <span className="booking-card-badge booking-badge-luxury">
                                                                        ⭐ Incluido VIP
                                                                    </span>
                                                                ) : (
                                                                    <span className="booking-card-badge booking-badge-price">
                                                                        {service.price ? `${service.price} €` : 'Gratuito'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="booking-card-footer">
                                                            <div className={`booking-card-pill ${isSelected ? 'selected' : ''}`}>
                                                                {isSelected ? '✓ Servicio Añadido' : '+ Añadir Servicio'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div>
                                            <h4>No hay servicios disponibles</h4>
                                        </div>
                                    )}
                                </div>

                                <div className='bookingNavButtons' style={{ marginTop: '24px' }}>
                                    <Button variant="secondary" onClick={goToPreviousStep} className="btn-luxury-secondary">
                                        ← {t("modal_booking_previousstep")}
                                    </Button>

                                    <Button variant='primary' onClick={goToNextStep} className="btn-luxury-primary">
                                        {t("modal_booking_nextstep")} →
                                    </Button>
                                </div>
                            </Container>
                        </div>
                    )}

                    {/* Step 5: Fill Guests */}
                    {currentStep === BookingSteps.StepFillGuests && (
                        <div>
                            <div className='fillguests-info' style={{ marginBottom: '16px' }}>
                                <span style={{ fontSize: '0.95rem' }}>{t("modal_booking_guests_info", { adults, children })}</span>
                            </div>

                            <Container>
                                <Form id='fillGuestsForm' noValidate onSubmit={handleGuestsSubmit}>
                                    {cookies.token && (
                                        <div className="titular-reservation-banner">
                                            <div className="titular-reservation-header">
                                                <strong>📋 Datos del Titular de la Reserva</strong>
                                                <span className="titular-reservation-badge">Sesión Activa</span>
                                            </div>
                                            <p className="titular-reservation-info">
                                                <strong>{userAllData?.name || userPersonalData.name} {userAllData?.surnames || userPersonalData.surnames}</strong> - {userAllData?.email || userPersonalData.email} {userAllData?.dni ? `(DNI: ${userAllData.dni})` : ''}
                                            </p>
                                            <div className="titular-staying-checkbox">
                                                <Form.Check
                                                    type="checkbox"
                                                    id="isTitularStayingAsGuest1"
                                                    label="¿El titular de la reserva se aloja como Huésped 1?"
                                                    checked={isTitularStayingAsGuest1}
                                                    onChange={(e: any) => handleTitularStayingToggle(e.target.checked)}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {guests.map((guest, index) => {
                                        const isTitularGuest = cookies.token && isTitularStayingAsGuest1 && index === 0;
                                        const err = guestsDataErrors[index] || { nameError: '', surnamesError: '', emailError: '' };

                                        return (
                                            <div key={index} className="guest-item-card">
                                                <div className="guest-item-header">
                                                    <span className="guest-item-title">
                                                        👤 Huésped #{index + 1} {isTitularGuest ? '(Titular de la reserva)' : ''}
                                                    </span>
                                                    <span className={`guest-card-locked-badge ${guest.isAdult ? 'adult' : 'child'}`}>
                                                        {guest.isAdult ? 'Adulto (+18)' : 'Menor / Niño'}
                                                    </span>
                                                </div>

                                                <Row>
                                                    <Col md={4}>
                                                        <Form.Group controlId={`name-${index}`} className="mb-2">
                                                            <Form.Label>{t("modal_booking_guests_guest_name")}</Form.Label>
                                                            <Form.Control
                                                                type="text"
                                                                name="name"
                                                                disabled={isTitularGuest}
                                                                value={guest.name || ''}
                                                                isInvalid={!!err.nameError}
                                                                onChange={(e: any) => handleGuestsInputChange(index, e)}
                                                                placeholder="Nombre"
                                                            />
                                                            <Form.Control.Feedback type='invalid'>
                                                                {err.nameError}
                                                            </Form.Control.Feedback>
                                                        </Form.Group>
                                                    </Col>
                                                    <Col md={4}>
                                                        <Form.Group controlId={`surname-${index}`} className="mb-2">
                                                            <Form.Label>{t("modal_booking_guests_guest_surnames")}</Form.Label>
                                                            <Form.Control
                                                                type="text"
                                                                name="surnames"
                                                                disabled={isTitularGuest}
                                                                value={guest.surnames || ''}
                                                                isInvalid={!!err.surnamesError}
                                                                onChange={(e: any) => handleGuestsInputChange(index, e)}
                                                                placeholder="Apellidos"
                                                            />
                                                            <Form.Control.Feedback type='invalid'>
                                                                {err.surnamesError}
                                                            </Form.Control.Feedback>
                                                        </Form.Group>
                                                    </Col>
                                                    <Col md={4}>
                                                        <Form.Group controlId={`email-${index}`} className="mb-2">
                                                            <Form.Label>
                                                                {index === 0
                                                                    ? `${t("modal_booking_guests_guest_email")} (obligatorio)`
                                                                    : `${t("modal_booking_guests_guest_email")} (opcional)`}
                                                            </Form.Label>
                                                            <Form.Control
                                                                type="email"
                                                                name="email"
                                                                disabled={isTitularGuest}
                                                                value={guest.email || ''}
                                                                isInvalid={!!err.emailError}
                                                                onChange={(e: any) => handleGuestsInputChange(index, e)}
                                                                placeholder={index === 0 ? "email@ejemplo.com" : "email@ejemplo.com (opcional)"}
                                                            />
                                                            <Form.Control.Feedback type='invalid'>
                                                                {err.emailError}
                                                            </Form.Control.Feedback>
                                                        </Form.Group>
                                                    </Col>
                                                </Row>
                                            </div>
                                        );
                                    })}

                                    <div className='bookingNavButtons' style={{ marginTop: '20px' }}>
                                        <Button variant="secondary" type='button' onClick={goToPreviousStep} className="btn-luxury-secondary">
                                            ← {t("modal_booking_previousstep")}
                                        </Button>

                                        <Button variant='primary' type='submit' className="btn-luxury-primary">
                                            {t("modal_booking_nextstep")} →
                                        </Button>
                                    </div>
                                </Form>
                            </Container>
                        </div>
                    )}

                    {/* Step 6: Promo Code */}
                    {currentStep === BookingSteps.StepPromoCode && (
                        <div>
                            <h2>Cupones de Descuento</h2>
                            <p style={{ opacity: 0.85, fontSize: '0.92rem', marginBottom: '20px' }}>
                                Aplica un cupón promocional para disfrutar de descuentos exclusivos en tu reserva.
                            </p>

                            {publicPromotions && publicPromotions.length > 0 && (
                                <div style={{ marginBottom: '24px' }}>
                                    <h4 style={{ fontSize: '1.05rem', color: '#c5a059', marginBottom: '14px', fontWeight: 700 }}>
                                        ✨ Cupones Disponibles para Seleccionar:
                                    </h4>
                                    <div className="promo-cards-luxury-grid">
                                        {publicPromotions.map((promo) => {
                                            const isSelected = userSelectedPromoCode.trim().toUpperCase() === (promo.code || '').trim().toUpperCase();
                                            const startStr = promo.start_date ? new Date(promo.start_date).toLocaleDateString('es-ES') : null;
                                            const endStr = promo.end_date ? new Date(promo.end_date).toLocaleDateString('es-ES') : null;

                                            return (
                                                <div
                                                    key={promo.id}
                                                    className={`promo-luxury-card ${isSelected ? 'is-selected' : ''}`}
                                                    onClick={() => {
                                                        if (isSelected) {
                                                            setUserSelectedPromoCode('');
                                                            setAppliedPromoDiscount(0);
                                                            setUserSelectedPromoID(-1);
                                                            setPromoValidationStatus(null);
                                                        } else {
                                                            setUserSelectedPromoCode(promo.code || '');
                                                            validatePromoCodeManual(promo.code || '');
                                                        }
                                                    }}
                                                    role="button"
                                                    tabIndex={0}
                                                >
                                                    <span className="promo-luxury-badge">
                                                        -{promo.discount_price}%
                                                    </span>

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
                                                                Válido: {startStr ? startStr : 'Ahora'} - {endStr ? endStr : 'Indefinido'}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="promo-luxury-action-badge">
                                                        {isSelected ? '✓ Cupón Seleccionado' : 'Clic para Seleccionar'}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div className="promo-manual-input-box">
                                <h4 style={{ fontSize: '1rem', marginBottom: '8px' }}>
                                    ¿Dispones de un cupón privado o exclusivo?
                                </h4>
                                <p style={{ fontSize: '0.84rem', opacity: 0.85, marginBottom: '12px' }}>
                                    Introduce tu código para validarlo y aplicarlo a la reserva:
                                </p>
                                <Form
                                    id='promoCodeForm'
                                    noValidate
                                    onSubmit={(e: any) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        goToNextStep();
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '8px', maxWidth: '440px', marginBottom: '12px' }}>
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
                                            style={{ textTransform: 'uppercase' }}
                                        />
                                        <Button
                                            variant="outline-primary"
                                            type="button"
                                            onClick={() => validatePromoCodeManual()}
                                        >
                                            Validar
                                        </Button>
                                    </div>

                                    {promoValidationStatus && (
                                        <div
                                            style={{
                                                padding: '10px 14px',
                                                borderRadius: '8px',
                                                fontSize: '0.88rem',
                                                marginBottom: '16px',
                                                maxWidth: '440px',
                                                background: promoValidationStatus.valid ? 'rgba(40,167,69,0.15)' : 'rgba(220,53,69,0.15)',
                                                border: `1px solid ${promoValidationStatus.valid ? 'rgba(40,167,69,0.4)' : 'rgba(220,53,69,0.4)'}`,
                                                color: promoValidationStatus.valid ? '#51cf66' : '#ff6b6b'
                                            }}
                                        >
                                            {promoValidationStatus.message}
                                        </div>
                                    )}

                                    <div className='bookingNavButtons'>
                                        <Button variant="secondary" onClick={goToPreviousStep} className="btn-luxury-secondary">
                                            ← {t("modal_booking_previousstep")}
                                        </Button>
                                        <Button variant='primary' type='submit' className="btn-luxury-primary">
                                            {t("modal_booking_nextstep")} →
                                        </Button>
                                    </div>
                                </Form>
                            </div>
                        </div>
                    )}

                    {/* Step 7: Payment */}
                    {currentStep === BookingSteps.StepPayment && (
                        <div>
                            <h2>{t("modal_booking_payment_title")}</h2>
                            <p style={{ opacity: 0.85, fontSize: '0.92rem', marginBottom: '20px' }}>
                                Selecciona cómo deseas abonar tu estancia en el Hotel Aura de Mallorca.
                            </p>

                            <div className="booking-showcase-disclaimer">
                                <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                                <div>
                                    <strong>AVISO IMPORTANTE DE DEMOSTRACIÓN / SHOWCASE:</strong>
                                    <p style={{ margin: '4px 0 0', fontSize: '0.86rem', lineHeight: '1.45' }}>
                                        Esta aplicación es un proyecto portfolio demostrativo. Por favor, <strong>NO introduzcas datos de tarjetas reales</strong>. Si deseas completar la reserva de prueba de manera inmediata y gratuita, utiliza la opción <strong>&quot;Pagar en Recepción&quot;</strong>.
                                    </p>
                                </div>
                            </div>

                            <div className="cards-payment">
                                {paymentMethods.map((method) => {
                                    const isSelected = checkedPaymentMethod === method.id;
                                    return (
                                        <div
                                            key={method.id}
                                            className={`payment-method-card ${isSelected ? 'is-selected' : ''}`}
                                            onClick={() => setCheckedPaymentMethod(method.id)}
                                            role="button"
                                            tabIndex={0}
                                        >
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>
                                                    {method.name === 'Stripe' ? 'Tarjeta Bancaria (Stripe)' : (method.name === 'Hotel Reception' ? 'Pagar en Recepción' : method.name)}
                                                </h4>
                                                <span style={{ fontSize: '0.8rem', opacity: 0.75 }}>
                                                    {method.name === 'Stripe' ? 'Pago seguro en línea' : 'Sin cargos por adelantado'}
                                                </span>
                                            </div>
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                checked={isSelected}
                                                onChange={() => setCheckedPaymentMethod(method.id)}
                                                style={{ width: '18px', height: '18px', accentColor: '#0d6efd' }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="payment-action-area" style={{ marginTop: '24px' }}>
                                {checkedPaymentMethod === 1 ? (
                                    <div>
                                        {stripeOptions && process.env.STRIPE_PUBLISHABLE_KEY && (
                                            <Elements stripe={stripePromise} options={stripeOptions}>
                                                <CheckoutForm onPay={async (paymentData: any) => {
                                                    await handleSubmitBooking(paymentData);
                                                }} />
                                            </Elements>
                                        )}
                                        {!process.env.STRIPE_PUBLISHABLE_KEY && (
                                            <div style={{ textAlign: 'center', padding: '20px' }}>
                                                <p style={{ opacity: 0.85, marginBottom: '14px' }}>
                                                    Modo simulación Stripe activo. Haz clic para confirmar tu reserva de demostración:
                                                </p>
                                                <Button
                                                    variant="primary"
                                                    size="lg"
                                                    disabled={isProcessingBooking}
                                                    onClick={() => handleSubmitBooking(null)}
                                                    className="btn-luxury-primary"
                                                >
                                                    {isProcessingBooking ? (
                                                        <span>
                                                            <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" style={{ marginRight: '8px' }} />
                                                            Confirmando reserva...
                                                        </span>
                                                    ) : (
                                                        `Confirmar Reserva (${totalPriceToPay.toFixed(2)} €)`
                                                    )}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '20px' }}>
                                        <p style={{ opacity: 0.85, marginBottom: '14px' }}>
                                            Has elegido pagar cómodamente en la recepción del hotel a tu llegada.
                                        </p>
                                        <Button
                                            variant="primary"
                                            size="lg"
                                            disabled={isProcessingBooking}
                                            onClick={() => handleSubmitBooking(null)}
                                            className="btn-luxury-primary"
                                        >
                                            {isProcessingBooking ? (
                                                <span>
                                                    <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" style={{ marginRight: '8px' }} />
                                                    Confirmando reserva...
                                                </span>
                                            ) : (
                                                `Confirmar Reserva (${totalPriceToPay.toFixed(2)} €)`
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className='bookingNavButtons' style={{ marginTop: '20px' }}>
                                <Button variant="secondary" onClick={goToPreviousStep} className="btn-luxury-secondary">
                                    ← {t("modal_booking_previousstep")}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Step 8: Confirmation */}
                    {currentStep === BookingSteps.StepConfirmation && (
                        <div>
                            <h2>{t("modal_booking_completed_title")}</h2>
                            <p style={{ color: '#51cf66', fontWeight: 600 }}>{bookingFinalMessage}</p>

                            {/* Pass Container with printable ID */}
                            <div id="aura-printable-hotel-pass" className="booking-digital-pass" style={{ textAlign: 'left', position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #c5a059', paddingBottom: '12px', marginBottom: '16px' }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontWeight: 800, letterSpacing: '1px', color: '#c5a059', fontSize: '1.3rem' }}>
                                            HOTEL AURA DE MALLORCA
                                        </h3>
                                        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.85 }}>
                                            Boutique & Spa Retreat - Pase Oficial de Huésped
                                        </span>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', display: 'block', opacity: 0.7 }}>
                                            Localizador Oficial
                                        </span>
                                        <strong style={{ fontSize: '1.05rem', color: '#0d6efd', fontFamily: 'monospace' }}>
                                            AURA-BK-{createdBookingId || selectedRoomID || '101'}
                                        </strong>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <div className="booking-qr-wrapper" style={{ margin: 0, padding: '10px', background: '#ffffff', borderRadius: '10px', display: 'inline-block' }}>
                                        <QRCodeSVG
                                            value={`AURA-BK-${createdBookingId || selectedRoomID || '101'}`}
                                            size={135}
                                            level="H"
                                            includeMargin={true}
                                        />
                                        <div style={{ textAlign: 'center', fontSize: '0.68rem', color: '#334155', fontWeight: 800, marginTop: '4px' }}>
                                            AURA-BK-{createdBookingId || selectedRoomID || '101'}
                                        </div>
                                    </div>

                                    <div className="booking-pass-details" style={{ flex: 1, margin: 0 }}>
                                        <div className="booking-pass-field">
                                            <span className="booking-pass-field-label">Titular de la Reserva</span>
                                            <span className="booking-pass-field-value">
                                                {userPersonalData.name || 'Huésped'} {userPersonalData.surnames}
                                            </span>
                                        </div>
                                        <div className="booking-pass-field">
                                            <span className="booking-pass-field-label">Documento DNI / Pasaporte</span>
                                            <span className="booking-pass-field-value">
                                                {userPersonalData.dni || '-'}
                                            </span>
                                        </div>
                                        <div className="booking-pass-field">
                                            <span className="booking-pass-field-label">Habitación Asignada</span>
                                            <span className="booking-pass-field-value">
                                                {rooms.find(r => r.id === selectedRoomID)?.name || 'Suite Seleccionada'}
                                            </span>
                                        </div>
                                        <div className="booking-pass-field">
                                            <span className="booking-pass-field-label">Régimen & Plan</span>
                                            <span className="booking-pass-field-value">
                                                {plans.find(p => p.id === checkedPlan)?.name || (checkedPlan === 2 ? 'VIP Luxury' : 'Básico')}
                                            </span>
                                        </div>
                                        <div className="booking-pass-field">
                                            <span className="booking-pass-field-label">Fecha de Entrada (Check-in)</span>
                                            <span className="booking-pass-field-value" style={{ color: '#10b981' }}>
                                                {startDate ? new Date(startDate as any).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                            </span>
                                        </div>
                                        <div className="booking-pass-field">
                                            <span className="booking-pass-field-label">Fecha de Salida (Check-out)</span>
                                            <span className="booking-pass-field-value" style={{ color: '#ef4444' }}>
                                                {endDate ? new Date(endDate as any).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                                            </span>
                                        </div>
                                        <div className="booking-pass-field">
                                            <span className="booking-pass-field-label">Huéspedes Totales</span>
                                            <span className="booking-pass-field-value">
                                                {adults} {adults === 1 ? 'Adulto' : 'Adultos'}{children > 0 ? `, ${children} Niños` : ''}
                                            </span>
                                        </div>
                                        <div className="booking-pass-field">
                                            <span className="booking-pass-field-label">Total Liquidado</span>
                                            <span className="booking-pass-field-value">
                                                {Number(totalPriceToPay).toFixed(2)} €
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="no-print" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                                    <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => window.print()}
                                        style={{ fontWeight: 700, borderRadius: '8px', padding: '6px 16px' }}
                                    >
                                        🖨️ Imprimir Pase de Check-in
                                    </Button>
                                </div>
                            </div>

                            <div className="no-print" style={{ textAlign: 'center', marginTop: '20px' }}>
                                <Button variant='primary' onClick={goToNextStep} className="btn-luxury-primary">
                                    {t("modal_booking_completed_close")}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Bottom Price Summary Bar */}
                    {(currentStep !== BookingSteps.StepPersonalData && currentStep !== BookingSteps.StepConfirmation) && (
                        <div className="booking-price-breakdown">
                            <div>
                                <span>Total estimado de la estancia</span>
                                {appliedPromoDiscount > 0 && (
                                    <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: '#198754', fontWeight: 600 }}>
                                        ({appliedPromoDiscount}% dto. cupón aplicado)
                                    </span>
                                )}
                            </div>
                            <div className="booking-price-breakdown-total">
                                {Number(totalPriceToPay).toFixed(2)} €
                            </div>
                        </div>
                    )}
                </div>
            </BookingErrorBoundary>
        </BaseModal>
    );
};

export default BookingModal;
