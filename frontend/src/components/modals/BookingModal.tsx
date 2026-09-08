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
}

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
const BookingModal = ({ colorScheme, show, onClose }: BookingModalProps) => {

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
    const [userSelectedPromoCode, setUserSelectedPromoCode] = useState<string>("");
    const [userSelectedPromoID, setUserSelectedPromoID] = useState<number>(-1);
    const [userSelectedPromoIsAssociatedWithUser, setUserSelectedPromoIsAssociatedWithUser] = useState<boolean>(false);

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
    const [adults, setAdults] = useState(1);
    const [children, setChildren] = useState(0);
    const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);

    // Guests State
    const [guests, setGuests] = useState<Guest[]>([
        new Guest({ id: null, name: '', surnames: '', email: '', isAdult: false, isSystemUser: false })
    ]);
    const [guestsDataErrors, setGuestsDataErrors] = useState([{ nameError: '', surnamesError: '', emailError: '' }]);
    const [userWantsToBecomeGuest, setUserWantsToBecomeGuest] = useState(false);
    const [isUserGuestAdult, setIsUserGuestAdult] = useState(false);

    // Personal Data State
    const [userPersonalData, setUserPersonalData] = useState({ name: '', dni: '', surnames: '', email: '' });
    const [userPersonalDataErrors, setUserPersonalDataErrors] = useState({ nameError: '', dniError: '', surnamesError: '', emailError: '' });

    // Processing state & Occupancy calendar state
    const [isProcessingBooking, setIsProcessingBooking] = useState(false);
    const [occupancyList, setOccupancyList] = useState<OccupancyRecord[]>([]);
    const [hoveredDateInfo, setHoveredDateInfo] = useState<{ dateStr: string; occupiedRooms: string[] } | null>(null);

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
        return occupancyList.some(item =>
            item.room_id === roomId &&
            item.booking_start_date <= eStr &&
            item.booking_end_date >= sStr
        );
    };

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
        const tooltipText = isSelectedOccupied
            ? `¡Habitación elegida ocupada! (${occupied.join(', ')})`
            : `Ocupadas: ${occupied.join(', ')}`;

        return (
            <div
                className="calendar-tile-badge-wrapper"
                title={tooltipText}
                onMouseEnter={() => setHoveredDateInfo({ dateStr: extractFormattedDate(date), occupiedRooms: occupied })}
                onMouseLeave={() => setHoveredDateInfo(null)}
            >
                <span className={`calendar-occupancy-dot ${isSelectedOccupied ? 'dot-danger' : isFull ? 'dot-full' : 'dot-warning'}`} />
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
                if (i < totalAdults) {
                    nextGuests[i] = { ...nextGuests[i], isAdult: true } as Guest;
                } else {
                    nextGuests[i] = { ...nextGuests[i], isAdult: false } as Guest;
                }
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

    const addGuest = () => {
        if (guests.length < 20) {
            setGuests(prev => [
                ...prev,
                new Guest({ id: null, name: '', surnames: '', email: '', isAdult: false, isSystemUser: false })
            ]);
            setGuestsDataErrors(prev => [
                ...prev,
                { nameError: '', surnamesError: '', emailError: '' }
            ]);
        } else {
            alert('El número máximo permitido es de 20 huéspedes');
        }
    };

    const substractGuest = () => {
        if (guests.length > 1) {
            setGuests(prev => prev.slice(0, -1));
            setGuestsDataErrors(prev => prev.slice(0, -1));
        }
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
        guests.forEach((guest) => {
            const newErrors = { nameError: '', surnamesError: '', emailError: '' };
            if (isEmptyOrSpaces(guest.name)) {
                newErrors.nameError = 'Por favor, introduce un nombre válido';
            }
            if (isEmptyOrSpaces(guest.surnames)) {
                newErrors.surnamesError = 'Por favor, introduce apellidos válidos';
            }
            if (!validateEmail(guest.email)) {
                newErrors.emailError = 'Por favor, introduce un correo electrónico válido';
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

    useEffect(() => {
        if (userWantsToBecomeGuest) {
            const primaryName = userPersonalData.name || userAllData?.name || '';
            const primarySurnames = userPersonalData.surnames || userAllData?.surnames || '';
            const primaryEmail = userPersonalData.email || userAllData?.email || '';

            setGuests(prev => {
                const next = [...prev];
                if (next.length === 0) {
                    next.push(new Guest({ id: null, name: primaryName, surnames: primarySurnames, email: primaryEmail, isAdult: isUserGuestAdult, isSystemUser: true }));
                } else {
                    next[0] = {
                        ...next[0],
                        name: primaryName,
                        surnames: primarySurnames,
                        email: primaryEmail,
                        isAdult: isUserGuestAdult,
                        isSystemUser: true
                    } as Guest;
                }
                return next;
            });
        }
    }, [userWantsToBecomeGuest, isUserGuestAdult, userPersonalData, userAllData]);

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
                let countAdults = 0;
                let countChildren = 0;

                for (let i = 0; i < guests.length; i++) {
                    const guest = guests[i];
                    if (guest.isAdult) {
                        countAdults++;
                    } else {
                        countChildren++;
                    }
                }

                if (countAdults === Number(adults) && countChildren === Number(children)) {
                    setCurrentStep(BookingSteps.StepPromoCode);
                } else {
                    alert(`El desglose de huéspedes (${countAdults} adultos, ${countChildren} niños) no coincide con lo indicado en el paso anterior (${adults} adultos, ${children} niños). Ajusta las casillas correspondientes.`);
                }
                break;
            case BookingSteps.StepPromoCode:
                serverAPI.get('/promotions').then(async res => {
                    let promos = res.data.data;
                    let retrievedPromos: Promotion[] = [];
                    promos.forEach((prm: any) => {
                        retrievedPromos.push(new Promotion({
                            id: prm.id,
                            code: prm.code,
                            discount_price: prm.discount_price,
                            name: prm.name,
                            description: prm.description,
                            start_date: prm.start_date,
                            end_date: prm.end_date
                        }));
                    });

                    if (userSelectedPromoCode && userSelectedPromoCode.trim() !== '') {
                        const promoResult = await getPromoDiscountPercentage(retrievedPromos, userSelectedPromoCode);
                        setAppliedPromoDiscount(promoResult.discountPercentage);
                        setUserSelectedPromoID(promoResult.appliedPromoId);
                        setUserSelectedPromoIsAssociatedWithUser(promoResult.isUserPromo);
                    } else {
                        setAppliedPromoDiscount(0);
                        setUserSelectedPromoID(-1);
                        setUserSelectedPromoIsAssociatedWithUser(false);
                    }

                    setCurrentStep(BookingSteps.StepPaymentMethod);
                }).catch(err => {
                    console.error("Error retrieving promotions:", err);
                    setAppliedPromoDiscount(0);
                    setUserSelectedPromoID(-1);
                    setCurrentStep(BookingSteps.StepPaymentMethod);
                });
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
                // Insert promo applied with booking if its the case
                if (promoID != -1) {
                    // Promo was found
                    await serverAPI.post('/saveBookingWithPromoApplied', { promoID: promoID, bookingID: bookingResponse.data.insertId });
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
                                                value={adults}
                                                onChange={(e: any) => setAdults(Number(e.target.value))}
                                            />
                                        </Col>
                                        <Col md={6}>
                                            <Form.Label>{t("modal_booking_rooms_children")}</Form.Label>
                                            <Form.Control
                                                type="number"
                                                min={0}
                                                max={10}
                                                value={children}
                                                onChange={(e: any) => setChildren(Number(e.target.value))}
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
                                    <div className="userWantsToBecomeGuest" style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', marginBottom: '18px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <Form.Check
                                            type='checkbox'
                                            id="userWantsToBecomeGuest"
                                            name="userWantsToBecomeGuest"
                                            label={t("modal_booking_guests_adduserasguest")}
                                            checked={userWantsToBecomeGuest}
                                            onChange={() => setUserWantsToBecomeGuest(!userWantsToBecomeGuest)}
                                        />
                                        {userWantsToBecomeGuest && (
                                            <div style={{ marginTop: '8px', marginLeft: '24px' }}>
                                                <Form.Check
                                                    type='checkbox'
                                                    id="isLoggedUserGuestAdult"
                                                    name="isLoggedUserGuestAdult"
                                                    label={t("modal_booking_guests_adduserasguest_adult")}
                                                    checked={isUserGuestAdult}
                                                    onChange={() => setIsUserGuestAdult(!isUserGuestAdult)}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {guests.map((guest, index) => {
                                        const isPrimaryUser = userWantsToBecomeGuest && index === 0;
                                        const err = guestsDataErrors[index] || { nameError: '', surnamesError: '', emailError: '' };

                                        return (
                                            <div key={index} className="guest-item-card">
                                                <div className="guest-item-header">
                                                    <span className="guest-item-title">
                                                        👤 Huésped #{index + 1} {isPrimaryUser ? '(Titular de la reserva)' : ''}
                                                    </span>
                                                    <span className="guest-type-badge">
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
                                                                disabled={isPrimaryUser}
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
                                                                disabled={isPrimaryUser}
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
                                                            <Form.Label>{t("modal_booking_guests_guest_email")}</Form.Label>
                                                            <Form.Control
                                                                type="email"
                                                                name="email"
                                                                disabled={isPrimaryUser}
                                                                value={guest.email || ''}
                                                                isInvalid={!!err.emailError}
                                                                onChange={(e: any) => handleGuestsInputChange(index, e)}
                                                                placeholder="email@ejemplo.com"
                                                            />
                                                            <Form.Control.Feedback type='invalid'>
                                                                {err.emailError}
                                                            </Form.Control.Feedback>
                                                        </Form.Group>
                                                    </Col>
                                                </Row>

                                                <div style={{ marginTop: '6px' }}>
                                                    <Form.Check
                                                        type="checkbox"
                                                        id={`isAdult-${index}`}
                                                        name="isAdult"
                                                        label={t("modal_booking_guests_guest_adult")}
                                                        disabled={isPrimaryUser}
                                                        checked={guest.isAdult || false}
                                                        onChange={(e: any) => handleGuestsInputChange(index, e)}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}

                                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px', marginBottom: '16px' }}>
                                        <Button variant="outline-light" size="sm" onClick={addGuest}>
                                            + {t("modal_booking_guests_button_add")}
                                        </Button>
                                        {guests.length > 1 && (
                                            <Button variant="outline-danger" size="sm" onClick={substractGuest}>
                                                - {t("modal_booking_guests_button_remove")}
                                            </Button>
                                        )}
                                    </div>

                                    <div className='bookingNavButtons'>
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
                            <h2>Código Promocional</h2>
                            <p style={{ opacity: 0.85, fontSize: '0.92rem' }}>
                                Si dispones de un código de descuento o cupón de socio, ingrésalo a continuación.
                            </p>
                            <div className='payment-promocode' style={{ maxWidth: '420px', margin: '20px 0' }}>
                                <Form id='promoCodeForm' noValidate onSubmit={(e: any) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    goToNextStep();
                                }}>
                                    <Form.Group className="mb-3" controlId="formPromoCode">
                                        <Form.Label>Cupón de descuento:</Form.Label>
                                        <Form.Control
                                            type="text"
                                            name="promoCode"
                                            placeholder='Ej: VERANO2026'
                                            maxLength={255}
                                            value={userSelectedPromoCode}
                                            onChange={(e: any) => setUserSelectedPromoCode(e.target.value)}
                                        />
                                    </Form.Group>

                                    <div className='bookingNavButtons'>
                                        <Button variant="secondary" type='button' onClick={goToPreviousStep} className="btn-luxury-secondary">
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

                    {/* Step 7: Payment Method */}
                    {currentStep === BookingSteps.StepPaymentMethod && (
                        <div>
                            <h2>{t("modal_booking_payment_title")}</h2>
                            <p style={{ opacity: 0.85, fontSize: '0.9rem', marginBottom: '18px' }}>
                                Selecciona cómo deseas abonar tu estancia. Tu reserva se confirmará al instante.
                            </p>

                            <div className="cards-payment" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                                <div
                                    className={`booking-luxury-card ${checkedPaymentMethod === 1 ? 'selected' : ''}`}
                                    onClick={() => paymentMethodSelected(1)}
                                    role="button"
                                    tabIndex={0}
                                    style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))', minHeight: '110px' }}
                                >
                                    <div className="booking-card-overlay" style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                            <div>
                                                <h4 className="booking-card-title" style={{ margin: 0, fontSize: '1.05rem' }}>💳 Tarjeta de Crédito / Débito</h4>
                                                <span className="booking-card-subtitle" style={{ fontSize: '0.78rem' }}>Pasarela Stripe cifrada SSL</span>
                                            </div>
                                            <div className={`booking-card-pill ${checkedPaymentMethod === 1 ? 'selected' : ''}`}>
                                                {checkedPaymentMethod === 1 ? '✓ Activo' : 'Elegir'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className={`booking-luxury-card ${checkedPaymentMethod === 2 ? 'selected' : ''}`}
                                    onClick={() => paymentMethodSelected(2)}
                                    role="button"
                                    tabIndex={0}
                                    style={{ background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))', minHeight: '110px' }}
                                >
                                    <div className="booking-card-overlay" style={{ padding: '16px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                            <div>
                                                <h4 className="booking-card-title" style={{ margin: 0, fontSize: '1.05rem' }}>🏨 Pagar en Recepción</h4>
                                                <span className="booking-card-subtitle" style={{ fontSize: '0.78rem' }}>Abona a tu llegada en el hotel</span>
                                            </div>
                                            <div className={`booking-card-pill ${checkedPaymentMethod === 2 ? 'selected' : ''}`}>
                                                {checkedPaymentMethod === 2 ? '✓ Activo' : 'Elegir'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className='payment-selected'>
                                {checkedPaymentMethod === 1 ? (
                                    <div className="stripe" style={{ background: 'rgba(255,255,255,0.03)', padding: '18px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <h4 style={{ fontSize: '1.05rem', marginBottom: '12px' }}>Pago con Tarjeta Segura</h4>
                                        {process.env.STRIPE_PUBLISHABLE_KEY ? (
                                            <Elements stripe={stripePromise} options={stripeOptions}>
                                                <StripeCheckoutForm
                                                    plan={checkedPlan ? checkedPlan : -1}
                                                    stripeOptions={stripeOptions}
                                                    totalPriceToPay={totalPriceToPay}
                                                    onPay={bookingProcess}
                                                />
                                            </Elements>
                                        ) : (
                                            <div style={{ textAlign: 'center', padding: '16px' }}>
                                                <p style={{ opacity: 0.9 }}>Pasarela Stripe simulada de prueba. Haz clic para formalizar tu reserva:</p>
                                                <Button
                                                    variant="primary"
                                                    className="btn-luxury-primary"
                                                    disabled={isProcessingBooking}
                                                    onClick={() => bookingProcess(null)}
                                                >
                                                    {isProcessingBooking ? 'Procesando reserva...' : `Confirmar y Pagar ${totalPriceToPay.toFixed(2)} €`}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                                        <h4 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>🏨 Pago al Check-in en el Hotel</h4>
                                        <p style={{ fontSize: '0.9rem', opacity: 0.85, maxWidth: '480px', margin: '0 auto 16px auto' }}>
                                            Tu reserva se confirmará inmediatamente sin cargos anticipados. Podrás abonar el total de <strong>{totalPriceToPay.toFixed(2)} €</strong> en efectivo o tarjeta a tu llegada.
                                        </p>
                                        <Button
                                            variant="primary"
                                            className="btn-luxury-primary"
                                            disabled={isProcessingBooking}
                                            onClick={() => bookingProcess(null)}
                                            style={{ minWidth: '240px' }}
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

                            <div className="booking-digital-pass">
                                <h4 style={{ margin: 0, fontWeight: 700, letterSpacing: '1px' }}>HOTEL AURA DE MALLORCA</h4>
                                <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', opacity: 0.8 }}>Pase de Check-in Digital</span>

                                <div className="booking-qr-wrapper">
                                    <QRCodeSVG
                                        value={`AURA-MALLORCA-BK-${selectedRoomID || 'RES'}-${Date.now()}`}
                                        size={140}
                                        level="H"
                                    />
                                </div>

                                <div className="booking-pass-details">
                                    <div className="booking-pass-field">
                                        <span className="booking-pass-field-label">Titular</span>
                                        <span className="booking-pass-field-value">{userPersonalData.name || 'Huésped'} {userPersonalData.surnames}</span>
                                    </div>
                                    <div className="booking-pass-field">
                                        <span className="booking-pass-field-label">Plan</span>
                                        <span className="booking-pass-field-value">{checkedPlan === 2 ? 'VIP Luxury' : 'Básico'}</span>
                                    </div>
                                    <div className="booking-pass-field">
                                        <span className="booking-pass-field-label">Check-in</span>
                                        <span className="booking-pass-field-value">{startDate ? new Date(startDate as any).toLocaleDateString('es-ES') : '-'}</span>
                                    </div>
                                    <div className="booking-pass-field">
                                        <span className="booking-pass-field-label">Check-out</span>
                                        <span className="booking-pass-field-value">{endDate ? new Date(endDate as any).toLocaleDateString('es-ES') : '-'}</span>
                                    </div>
                                </div>

                                <div style={{ marginTop: '16px' }}>
                                    <Button variant="outline-primary" size="sm" onClick={() => window.print()} style={{ marginRight: '8px' }}>
                                        🖨️ Imprimir Pase
                                    </Button>
                                </div>
                            </div>

                            <div style={{ textAlign: 'center', marginTop: '20px' }}>
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
