import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import { Booking, Payment, PaymentMethod, PaymentTransaction, Plan, Room, Service, User, Guest, Weather } from './../../models';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useCookies } from 'react-cookie';
import { isEmptyOrSpaces, validateEmail } from './../../utils';
import './BookingModal.css'
import { API_URL } from './../../services/consts';
import serverAPI from './../../services/serverAPI';
import weatherAPI from "./../../services/weatherAPI";

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
    show: boolean,
    onClose: () => void;
}

enum BookingSteps {
    StepPersonalData,
    StepPlan,
    StepChooseRoom,
    StepChooseServices,
    StepFillGuests,
    StepPaymentMethod,
    StepConfirmation,
}

// Booking step: calendar properties
type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

// BOOKING MODAL COMPONENT
const BookingModal = ({ show, onClose }: BookingModalProps) => {

    const { t } = useTranslation();

    const handleClose = () => {
        // De cualquier forma cuando lo cierre, vaciar el modal de data
        resetBookingModal();
        onClose();
    }

    // Stripe
    const [totalPriceToPay, setTotalPriceToPay] = useState<number>(0);
    const [stripeOptions, setStripeOptions] = useState<StripeElementsOptions | undefined>({
        mode: 'payment',
        amount: 200,
        currency: 'eur',
        // Fully customizable with appearance API.
        appearance: {
            /*...*/
        },
    });
    const [paymentTransactionID, setPaymentTransactionID] = useState<string>();
    const [transactionIDIsSet, setTransactionIDIsSet] = useState<boolean>(false);

    // STRIPE FORM
    const StripeCheckoutForm = ({ plan, stripeOptions, totalPriceToPay }: any) => {
        const stripe = useStripe();
        const elements = useElements();

        const [errorMessage, setErrorMessage] = useState<string | undefined>();

        const handleSubmit = async (event: any) => {
            event.preventDefault();
            if (elements == null) {
                return;
            }

            // Trigger form validation and wallet collection
            const { error: submitError } = await elements.submit();
            if (submitError) {
                // Show error to your customer
                setErrorMessage(submitError.message);
                return;
            }

            // Create the PaymentIntent and obtain clientSecret from your server endpoint
            let data = {
                amount: totalPriceToPay,
                currency: stripeOptions.currency,
                plan: plan
            }

            const postToServer = (data: any) => {
                return new Promise((resolve, reject) => {
                    serverAPI
                        .post('/api/purchase', { data })
                        .then((response) => {
                            resolve(response.data.client_secret);
                        })
                        .catch((error) => {
                            reject(error);
                        });
                });
            };
            postToServer(data)
                .then((clientSecret: any) => {
                    setPaymentTransactionID(clientSecret);
                    setTransactionIDIsSet(true)
                    pay();
                })
                .catch((error) => {
                    console.error('Error in postToServer:', error);
                });
        };

        return (
            <form onSubmit={handleSubmit}>
                <PaymentElement />
                <button type="submit" disabled={!stripe || !elements}>
                    Pay
                </button>
                {/* Show error message to your customers */}
                {errorMessage && <div>{errorMessage}</div>}
            </form>
        );
    };

    // Booking Modal
    const [cookies, setCookie, removeCookie] = useCookies(['token']);
    const [currentStep, setCurrentStep] = useState(BookingSteps.StepPersonalData);
    const [userAllData, setUserAllData] = useState<User>();
    const [bookingFinalMessage, setBookingFinalMessage] = useState("");
    const [weatherFiveDaysForecastList, setWeatherFiveDaysForecastList] = useState<Weather[]>();

    // Get JWT user data
    async function getAllLoggedUserData(): Promise<any> {
        const currentUser = await serverAPI.post('/api/currentUser', cookies);
        if (currentUser) {
            const getLoggedUserData = await serverAPI.get('/api/loggedUser/' + currentUser.data.userID).catch(err => {
                removeCookie('token')
                console.error(err)
            });
            if (getLoggedUserData) {
                return getLoggedUserData.data;
            } else {
                removeCookie('token');
            }
        }
    }

    useEffect(() => {
        if (cookies.token) {
            // Si ya esta logeado, no pedir los datos personales
            setCurrentStep(BookingSteps.StepPlan)

            // Si esta logeado, tener los datos completos del usuario
            try {
                getAllLoggedUserData().then(resp => {
                    let res = resp.data;
                    setUserAllData(new User({
                        id: res.id,
                        name: res.user_name,
                        surnames: res.user_surnames,
                        email: res.user_email,
                        password: res.user_password_hash,
                        verified: res.user_verified,
                    }))
                }).catch(err => console.error(err));
            } catch (err) {
                console.error(err);
            }
        } else {
            setUserAllData(new User())
        }
    }, [cookies])

    // Logica de navegacion por el modal
    const goToNextStep = async () => {
        // Lógica específica para cada paso
        switch (currentStep) {
            case BookingSteps.StepPersonalData:
                setCurrentStep(BookingSteps.StepPlan);
                break;
            case BookingSteps.StepPlan:
                if (checkedPlan === 1) {
                    // Basic selected
                    setTotalPriceToPay(totalPriceToPay + (plans[0].price ? plans[0].price : 50));
                } else if (checkedPlan === 2) {
                    // VIP selected

                    // Seleccionó vip, por lo que no elige servicios, todos estan incluidos
                    // Crear una copia del estado actual
                    const updatedSelectedServicesIDs = { ...selectedServicesIDs };
                    // Establecer todos los valores en true
                    Object.keys(updatedSelectedServicesIDs).forEach(key => {
                        updatedSelectedServicesIDs[key] = true;
                    });
                    setSelectedServicesIDs(updatedSelectedServicesIDs)

                    setTotalPriceToPay(totalPriceToPay + (plans[1].price ? plans[1].price : 150));
                }
                // setCheckedPlan(1)
                setCurrentStep(BookingSteps.StepChooseRoom);
                break;
            case BookingSteps.StepChooseRoom:
                serverAPI.get('/api/room/' + selectedRoomID).then(res => {
                    setTotalPriceToPay(totalPriceToPay + res.data.data[0].room_price)
                }).catch(err => console.error(err))

                if (selectedRoomID != null) {
                    // asegurarse que adultos son 10 o menos y con niños igual
                    if (adults <= 10 && children <= 10) {
                        if (checkedPlan == 2) {
                            setCurrentStep(BookingSteps.StepFillGuests);
                        } else {
                            setCurrentStep(BookingSteps.StepChooseServices);
                        }
                    } else {
                        alert('Adults: maximum 10. Children: maximum 10.')
                    }
                } else {
                    alert('No room selected')
                }
                // setCurrentStep(BookingSteps.StepChooseServices);

                break;
            case BookingSteps.StepChooseServices:
                let totalServicesPrice = 0;
                for (const [key, value] of Object.entries(selectedServicesIDs)) {
                    // console.log(`${key}: ${value}`);
                    if (value) {
                        // Si es true, es que esta seleccionado
                        const res = await serverAPI.get('/api/service/' + key)
                        if (res) {
                            totalServicesPrice += res.data.data[0].serv_price;
                        }
                    }
                }

                setTotalPriceToPay(totalPriceToPay + totalServicesPrice)
                setCurrentStep(BookingSteps.StepFillGuests);
                break;
            case BookingSteps.StepFillGuests:
                // Asegurarse que corresponde el numero de niños y adultos con lo marcado ahora
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

                if (countAdults == adults && countChildren == children) {
                    setCurrentStep(BookingSteps.StepPaymentMethod);
                } else {
                    alert("Adults and children are not matching in number with a previous step! Please make it match or change the number of adults/children!")
                }
                break;
            case BookingSteps.StepPaymentMethod:
                // Primero pagar
                try {
                    if (transactionIDIsSet && paymentTransactionID && paymentTransactionID != undefined && paymentTransactionID != null && paymentTransactionID != '') {
                        // Si no esta logeado, crear usuario con default password y lo seteamos al user global de este modal con todos los datos
                        if (!cookies.token) {
                            try {
                                createUser();
                            } catch (err) {
                                console.error(err);
                            }
                        } else {
                            // Después realizar la reserva
                            doBooking(userAllData?.id)
                        }
                    } else {
                        alert('Error on payment, try again')
                    }
                } catch (error) {
                    // Manejo de errores
                    console.error('Error al realizar la reserva:', error);
                }
                break;
            case BookingSteps.StepConfirmation:
                resetBookingModal();
                onClose();
                break;
            default:
                break;
        }
    };

    // Logica de navegacion por el modal, paso atrás
    const goToPreviousStep = async () => {
        switch (currentStep) {
            case BookingSteps.StepPersonalData:
                alert("You can't turn back, you are in the first step!")
                break;
            case BookingSteps.StepPlan:
                setCurrentStep(BookingSteps.StepPersonalData);
                break;
            case BookingSteps.StepChooseRoom:
                setCurrentStep(BookingSteps.StepPlan);
                break;
            case BookingSteps.StepChooseServices:
                setCurrentStep(BookingSteps.StepChooseRoom);
                break;
            case BookingSteps.StepFillGuests:
                if (checkedPlan == 2) {
                    setCurrentStep(BookingSteps.StepChooseRoom);
                } else {
                    setCurrentStep(BookingSteps.StepChooseServices);
                }
                break;
            case BookingSteps.StepPaymentMethod:
                setCurrentStep(BookingSteps.StepFillGuests);
                break;
            case BookingSteps.StepConfirmation:
                alert("You can't turn back, you already did the booking!")
                break;
            default:
                break;
        }
    }

    async function cancelBooking() {
        await serverAPI.post('/api/cancel-payment', { client_secret: paymentTransactionID })
        const deleteUser = await serverAPI.delete('/api/user/' + userAllData?.id, {
            headers: {
                Authorization: cookies.token
            }
        });
        if (deleteUser) {
            removeCookie('token')
        }
    }

    // nos aseguramos de hacer el booking con el nuevo usuario, o el ya existente
    function doBooking(user_id: any) {
        const booking = new Booking({
            id: null,
            userID: user_id,
            planID: checkedPlan,
            roomID: selectedRoomID,
            startDate: startDate as Date,
            endDate: endDate as Date,
        });

        const bookingData = {
            booking,
            selectedServicesIDs,
            guests
        }

        const payment = new Payment({
            id: null,
            userID: user_id,
            bookingID: booking.id,
            amount: totalPriceToPay * 100, // Debido a cómo funciona stripe, si le envías 1 euro él cobra 0,01 euros.
            date: new Date(),
            paymentMethodID: checkedPaymentMethod
        });

        try {
            // First, check if room is available and not used on that dates
            serverAPI.post('/api/checkBookingAvalability', bookingData).then(availabilityResponse => {
                console.log(availabilityResponse.data)

                // Make the API call for booking, and there we will also insert the booking services and booking guests
                serverAPI.post('/api/booking', bookingData).then(bookingResponse => {
                    if (bookingResponse.data.status == "success") {
                        // Make the API call for payment
                        payment.bookingID = bookingResponse.data.insertId;
                        serverAPI.post('/api/payment', payment).then(paymentResponse => {
                            if (paymentResponse) {
                                let paymentTransaction = new PaymentTransaction({ id: null, payment_id: paymentResponse.data.insertId, transaction_id: paymentTransactionID ? paymentTransactionID : '' })
                                serverAPI.post('/api/paymentTransaction', paymentTransaction).then(paymentTransResponse => {
                                    if (paymentTransResponse) {
                                        // Si todo ha ido correcto, pasar al next screen y Empty data on next screen
                                        if (!cookies.token) {
                                            // Si no tiene cookies, quiere decir que se registró el usuario de la primera pantalla
                                            setBookingFinalMessage(prevMsg => prevMsg + 'Se ha registrado tu usuario y enviado un correo de confirmación de cuenta / ')
                                        }
                                        setCurrentStep(BookingSteps.StepConfirmation);
                                    }
                                }).catch(err => {
                                    console.error(err)
                                    if (err.response.data && err.response.data.msg) {
                                        alert(err.response.data.msg)
                                    }
                                })
                            }
                        }).catch(err => {
                            console.error(err)
                            if (err.response.data && err.response.data.msg) {
                                alert(err.response.data.msg)
                            }
                        })
                    }
                }).catch(err => {
                    console.error(err)
                    if (err.response.data && err.response.data.msg) {
                        alert(err.response.data.msg)
                    }
                })
            }).catch((err) => {
                console.error(err)
                if (err.response && err.response.data) {
                    alert(err.response.data.msg)
                }
                cancelBooking();
                onClose();
                resetBookingModal();
            })
        } catch (error) {
            console.error('Error al realizar la reserva:', error);
        } finally {
            removeCookie('token');
        }
    }

    function createUser() {
        const userToCreate = { email: userPersonalData.email, name: userPersonalData.name, surnames: userPersonalData.surnames, password: "1234" };
        // si el id es null, es que es nuevo usuario y no esta logeado, por lo tanto crearlo en la base de datos antes de la reserva
        serverAPI.post('/api/register', userToCreate).then(res => {
            console.log('registered successfully' + res)
            setCookie('token', res.data.cookieJWT)

            // After successful registration, send a request to generate and send a confirmation email
            serverAPI.get(API_URL + `/api/user/sendConfirmationEmail/${res.data.insertId}`)
                .then(response => {
                    console.log('Confirmation email sent successfully', response);
                })
                .catch(error => {
                    console.error('Error sending confirmation email', error);
                    setBookingFinalMessage(prev => prev + "Error sending confirmation email / ")
                });

            const newUserAllData: User = {
                id: res.data.insertId,
                ...userToCreate,
                verified: false
            };

            // Update the state with the new userAllData
            setUserAllData(newUserAllData);

            doBooking(res.data.insertId)

        }).catch(err => {
            console.error(err)
            if (err.response.data && err.response.data.message) {
                alert(err.response.data.message)
            }
            onClose();
            resetBookingModal();
        })
    }

    // Step Personal data Form
    const [userPersonalData, setUserPersonalData] = useState({ name: '', surnames: '', email: '' });
    const [userPersonalDataErrors, setUserPersonalDataErrors] = useState({ nameError: '', surnamesError: '', emailError: '' });

    const validatePersonalDataForm = () => {
        const { name, surnames, email } = userPersonalData;
        const newErrors = { nameError: '', surnamesError: '', emailError: '' }

        if (isEmptyOrSpaces(name)) {
            newErrors.nameError = 'Please enter a valid name'
        }
        if (isEmptyOrSpaces(surnames)) {
            newErrors.surnamesError = 'Please enter valid surnames'
        }
        if (!validateEmail(email)) {
            newErrors.emailError = 'Please enter a valid email'
        }

        return newErrors;
    }

    const handlePersonalDataSubmit = (event: React.ChangeEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();

        //let form = event.currentTarget;
        const formErrors = validatePersonalDataForm();

        if (formErrors.nameError == '' && formErrors.surnamesError == '' && formErrors.emailError == '') {
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

    // Step choose Plan
    const [plans, setPlans] = useState<Plan[]>([])
    const [checkedPlan, setCheckedPlan] = useState<number | null>(1);

    useEffect(() => {
        serverAPI.get('/api/plans').then(res => {
            let plans = res.data.data;
            let retrievedPlans: Plan[] = [];
            plans.forEach((plan: any) => {
                retrievedPlans.push(new Plan({ id: plan.id, name: plan.plan_name, description: plan.plan_description, price: plan.plan_price }))
            })
            setPlans(retrievedPlans)
            setStripeOptions({
                mode: 'payment',
                amount: 200,
                currency: 'eur',
                // Fully customizable with appearance API.
                appearance: {
                    /*...*/
                },
            })
        }).catch
            (err => console.error(err))

        // Weather information (5 days)
        const params = {
            lat: 39.58130105,
            lon: 2.709183392285786,
        };
        weatherAPI.get('data/2.5/forecast', { params }).then(res => {
            const forecastFiveDaysList = res.data.list;
            const fiveDaysListObj: Weather[] = [];
            forecastFiveDaysList.forEach((forecastDay: any) => {
                const day = new Date(forecastDay.dt_txt)
                // day.setHours(0, 0, 0, 0)
                fiveDaysListObj.push(new Weather({ id: null, date: day, affectedServiceID: null, state: forecastDay.weather[0].main }))
            });
            setWeatherFiveDaysForecastList(fiveDaysListObj)
        }).catch(err => console.error(err))
    }, [])

    const selectPlan = (planID: any) => {
        setCheckedPlan(planID);
    };

    // Step booking
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const [startDate, onChangeStartDate] = useState<Value>(new Date());
    const [endDate, onChangeEndDate] = useState<Value>(tomorrow);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoomID, setSelectedRoomID] = useState<number | null>(null);

    const handleStartDateChange = (newStartDate: Value) => {
        // const params = {
        //     lat: 39.58130105,
        //     lon: 2.709183392285786,
        // };
        // weatherAPI.get('data/2.5/forecast', { params }).then(res => {
        //     console.log(res)
        // }).catch(err => console.error(err))
        onChangeStartDate(newStartDate);
    }

    const handleEndDateChange = (newEndDate: Value) => {
        // const params = {
        //     lat: 39.58130105,
        //     lon: 2.709183392285786,
        // };
        // weatherAPI.get('data/2.5/forecast', { params }).then(res => {
        //     console.log(res)
        // }).catch(err => console.error(err))
        onChangeEndDate(newEndDate);
    }


    // Get rooms
    useEffect(() => {
        serverAPI.get('/api/rooms').then(res => {
            let rooms = res.data.data;
            let retrievedRooms: Room[] = [];
            rooms.forEach((room: any) => {
                retrievedRooms.push(new Room({ id: room.id, name: room.room_name, description: room.room_description, price: room.room_price, availabilityStart: new Date(room.room_availability_start), availabilityEnd: new Date(room.room_availability_end) }))
            })
            setRooms(retrievedRooms)
        }).catch
            (err => console.error(err))
    }, []) // only once

    const [adults, setAdults] = useState(1);
    const [children, setChildren] = useState(0);
    const [filteredRooms, setFilteredRooms] = useState<Room[]>([])

    // Filter rooms
    useEffect(() => {
        setFilteredRooms(
            rooms.filter((room) => {
                if (startDate && endDate && room && room.availabilityStart && room.availabilityEnd) {
                    return room.availabilityStart <= startDate && room.availabilityEnd >= endDate;
                } else {
                    const now = new Date();
                    if (room && room.availabilityStart && room.availabilityEnd) {
                        return room.availabilityStart <= now && room.availabilityEnd >= now;
                    }
                }
            })
        );
    }, [rooms, startDate, endDate, adults, children]);

    const roomSelected = (roomID: any) => {
        setSelectedRoomID(roomID)
    }

    // Step choose services
    const [services, setServices] = useState<Service[]>([])
    const [selectedServicesIDs, setSelectedServicesIDs] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
        serverAPI.get('/api/services').then(res => {
            let servicess = res.data.data;
            let retrievedServices: Service[] = [];
            servicess.forEach((service: any) => {
                retrievedServices.push(new Service({ id: service.id, name: service.serv_name, description: service.serv_description, price: service.serv_price, availabilityStart: new Date(service.serv_availability_start), availabilityEnd: new Date(service.serv_availability_end), imageURL: null }))
            })
            setServices(retrievedServices)

            // Create an array of key-value pairs for selectedServicesIDs
            const keyValuePairArray = retrievedServices.map(service => ({
                [service.id ? service.id : (Math.random() * (retrievedServices.length - 0))]: false
            }));
            // Merge the array of key-value pairs into a single object
            const selectedServicesObject = Object.assign({}, ...keyValuePairArray);
            // Update the state with the object
            setSelectedServicesIDs(selectedServicesObject);

            // Get and set services images
            serverAPI.post('/api/servicesImages', { services: servicess }).then(res => {
                const responseData = res.data.data;

                // Update the imageURL property of matching services
                setServices((prevServices) => {
                    return prevServices.map((service) => {
                        const matchingData = responseData.find((data: any) => data.serviceID === service.id);
                        if (matchingData) {
                            return { ...service, imageURL: API_URL + "/" + matchingData.mediaURL };
                        }
                        return service; // No match found, return the original service
                    });
                });

            }).catch(err => { console.error(err) });
        }).catch
            (err => console.error(err))
    }, []);

    const serviceSelected = (serviceID: any) => {
        if (selectedServicesIDs[serviceID]) {
            setSelectedServicesIDs(prevState => ({ ...prevState, [serviceID]: false }));
        } else {
            setSelectedServicesIDs(prevState => ({ ...prevState, [serviceID]: true }));
        }
    }

    // Step fill guests
    const [guests, setGuests] = useState<Guest[]>([
        new Guest({ id: null, name: '', surnames: '', email: '', isAdult: false })
    ]);
    const [guestsDataErrors, setGuestsDataErrors] = useState([{ nameError: '', surnamesError: '', emailError: '' }]);
    const [userWantsToBecomeGuest, setUserWantsToBecomeGuest] = useState(false);
    const [isUserGuestAdult, setIsUserGuestAdult] = useState(false);

    const addGuest = () => {
        if (guests.length < 20) {
            // Maximum we allow 20 guests, 10 adults and 10 childs
            setGuests([...guests, { id: null, name: '', surnames: '', email: '', isAdult: false }]);
            setGuestsDataErrors([...guestsDataErrors, { nameError: '', surnamesError: '', emailError: '' }])
        } else {
            alert('The maximum is 20 guests')
        }
    };

    const substractGuest = () => {
        if (guests.length > 1) {
            const updatedGuests = guests.slice(0, -1);
            setGuests(updatedGuests);
            const updatedErrors = guestsDataErrors.slice(0, -1);
            setGuestsDataErrors(updatedErrors);
        }
    }

    const handleGuestsInputChange = (index: any, event: any) => {
        const { name, value, type, checked } = event.target;
        const updatedGuests = [...guests];
        updatedGuests[index] = {
            ...updatedGuests[index],
            [name]: type === 'checkbox' ? checked : value
        };
        setGuests(updatedGuests);
    };

    const validateGuestsDataForm = () => {
        let errors = [{ nameError: '', surnamesError: '', emailError: '' }];
        guests.forEach((guest, index) => {
            if (index === 0) {
                errors = [];
            }
            const { name, surnames, email } = guest;
            const newErrors = { nameError: '', surnamesError: '', emailError: '' };

            if (isEmptyOrSpaces(name)) {
                newErrors.nameError = 'Please enter a valid name'
            }
            if (isEmptyOrSpaces(surnames)) {
                newErrors.surnamesError = 'Please enter valid surnames'
            }
            if (!validateEmail(email)) {
                newErrors.emailError = 'Please enter a valid email'
            }
            errors.push(newErrors)
        })

        return errors;
    }

    const handleGuestsSubmit = (event: any) => {
        event.preventDefault();
        event.stopPropagation();

        //let form = event.currentTarget;
        const formErrors = validateGuestsDataForm();
        let isAnError = false;

        formErrors.forEach((formError) => {
            if (formError.nameError !== '' || formError.surnamesError !== '' || formError.emailError !== '') {
                isAnError = true;
                return;
            }
        })

        if (!isAnError) {
            // Filter out guests with specific values for id, name, surnames, and isAdult (EXTRA FORM VALIDATION SECURITY)
            const filteredGuests = guests.filter(guest => {
                return (
                    guest.id !== null ||
                    guest.name !== '' ||
                    guest.email !== '' ||
                    guest.surnames !== '' ||
                    guest.isAdult !== false
                );
            });
            setGuests(filteredGuests)

            goToNextStep();
        } else {
            setGuestsDataErrors(formErrors)
        }
    };

    useEffect(() => {
        if (userWantsToBecomeGuest) {
            if (cookies && cookies.token) {
                getAllLoggedUserData().then((data: any) => {
                    let user: any = data.data;
                    const newUserAsGuest = new Guest({ id: user.id, name: user.user_name, surnames: user.user_surnames, email: user.user_email, isAdult: isUserGuestAdult })
                    setGuests([newUserAsGuest, ...guests]);
                    setGuestsDataErrors([{ nameError: '', surnamesError: '', emailError: '' }, ...guestsDataErrors])
                }).catch(err => console.error(err));
            } else {
                const newUserAsGuest = new Guest({ id: null, name: userPersonalData.name, surnames: userPersonalData.surnames, email: userPersonalData.email, isAdult: isUserGuestAdult })
                setGuests([newUserAsGuest, ...guests]);
                setGuestsDataErrors([{ nameError: '', surnamesError: '', emailError: '' }, ...guestsDataErrors])
            }
        } else {
            if (guests.length > 1) {
                setGuests(prevGuests => prevGuests.slice(1));
                setGuestsDataErrors(prevErrors => prevErrors.slice(1));
            }
        }
    }, [userWantsToBecomeGuest]);

    useEffect(() => {
        setGuests(prevGuests => {
            return prevGuests.map((guest, index) => {
                if (index === 0) {
                    return { ...guest, isAdult: isUserGuestAdult };
                }
                return guest;
            })
        });
    }, [isUserGuestAdult]);

    // Step choose payment method and pay
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
    const [checkedPaymentMethod, setCheckedPaymentMethod] = useState<number | null>(1);

    useEffect(() => {
        serverAPI.get('/api/paymentmethods').then(res => {
            let paymentMethodss = res.data.data;
            let retrievedPaymentMethods: PaymentMethod[] = [];
            paymentMethodss.forEach((pm: any) => {
                retrievedPaymentMethods.push(new PaymentMethod({ id: pm.id, name: pm.payment_method_name.toLowerCase() }))
            })
            setPaymentMethods(retrievedPaymentMethods)
        }).catch
            (err => console.error(err))
    }, []);

    const paymentMethodSelected = (paymentMethodID: any) => {
        setCheckedPaymentMethod(paymentMethodID);
    };

    const pay = () => {
        // console.log(paymentTransactionID)
        goToNextStep();
    }

    // RESET
    const resetBookingModal = () => {
        setCurrentStep(BookingSteps.StepPersonalData)
        if (cookies.token) {
            // Si ya esta logeado, no pedir los datos personales
            setCurrentStep(BookingSteps.StepPlan)
        }
        setUserPersonalData({ name: '', surnames: '', email: '' });
        setUserPersonalDataErrors({ nameError: '', surnamesError: '', emailError: '' })
        setGuests([
            new Guest({ id: null, name: '', surnames: '', email: '', isAdult: false })
        ]);
        setGuestsDataErrors([{ nameError: '', surnamesError: '', emailError: '' }])
        setCheckedPlan(1)
        onChangeStartDate(new Date())
        onChangeEndDate(new Date())
        setAdults(1)
        setChildren(0)
        setFilteredRooms([])
    }

    // Step confirmation

    // When close, reset
    useEffect(() => {
        if (!show && !cookies.token) {
            resetBookingModal();
        }
    }, [show])

    return (
        <BaseModal title={t("book")} show={show} onClose={handleClose}>
            {currentStep === BookingSteps.StepPersonalData && (
                <div>
                    <h2>{t("modal_booking_personaldata_title")}</h2>

                    <Form id='personalDataForm' noValidate onSubmit={handlePersonalDataSubmit}>
                        <Form.Group className="mb-3" controlId="formName">
                            <Form.Label>{t("modal_booking_personaldata_name_label")}</Form.Label>
                            <Form.Control type="text" name="name" placeholder={t("modal_booking_personaldata_name_placeholder")} value={userPersonalData.name} onChange={handlePersonalDataChange} isInvalid={!!userPersonalDataErrors.nameError} required />
                            <Form.Control.Feedback type='invalid'>
                                {userPersonalDataErrors.nameError}
                            </Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formSurnames">
                            <Form.Label>{t("modal_booking_personaldata_surnames_label")}</Form.Label>
                            <Form.Control type="text" name="surnames" placeholder={t("modal_booking_personaldata_surnames_placeholder")} value={userPersonalData.surnames} onChange={handlePersonalDataChange} isInvalid={!!userPersonalDataErrors.surnamesError} required />
                            <Form.Control.Feedback type='invalid'>
                                {userPersonalDataErrors.surnamesError}
                            </Form.Control.Feedback>
                        </Form.Group>

                        <Form.Group className="mb-3" controlId="formEmail">
                            <Form.Label>{t("modal_booking_personaldata_email_label")}</Form.Label>
                            <Form.Control type="email" name="email" placeholder={t("modal_booking_personaldata_email_placeholder")} value={userPersonalData.email} onChange={handlePersonalDataChange} isInvalid={!!userPersonalDataErrors.emailError} required />
                            <Form.Text className="text-muted">
                                {t("modal_booking_personaldata_email_description")}
                            </Form.Text>
                            <Form.Control.Feedback type='invalid'>
                                {userPersonalDataErrors.emailError}
                            </Form.Control.Feedback>
                        </Form.Group>

                        <Form.Label><em>{t("modal_booking_personaldata_infodefaultaccount")}</em><br /><strong>{t("modal_booking_personaldata_infodefaultaccount_important")}</strong></Form.Label>

                        <div className='bookingNavButtons'>
                            <span>.</span>
                            <Button variant='primary' type='submit'>
                                {t("modal_booking_nextstep")}
                            </Button>
                        </div>
                    </Form>
                </div>
            )
            }

            {
                currentStep === BookingSteps.StepPlan && (
                    <div>
                        <h2>{t("modal_booking_plans_title")}</h2>
                        <div className="cards-plan">
                            {plans && plans.length > 0 ? (
                                <div>
                                    {plans.map((plan) => (
                                        <Card key={plan.id ? (plan.id + Math.random() * (1000 - 1)) : Math.random()}>
                                            <Card.Body>
                                                <Card.Title>{t("modal_booking_plans_card_title", { name: plan.name })}</Card.Title>
                                                <Card.Text>
                                                    <span>{plan.description}</span>
                                                    <br />
                                                    <span>{t("modal_booking_plans_card_text_price", { price: plan.price })}</span>
                                                </Card.Text>
                                                <Form.Check
                                                    type="radio"
                                                    name="pricing-plan"
                                                    value={plan.name?.toLowerCase()}
                                                    checked={checkedPlan === plan.id}
                                                    onChange={() => selectPlan(plan.id)}
                                                />
                                            </Card.Body>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div>
                                    <h4>No plans found</h4>
                                </div>
                            )}
                        </div>

                        <div className='bookingNavButtons'>
                            <Button variant="secondary" onClick={goToPreviousStep}>
                                {t("modal_booking_previousstep")}
                            </Button>

                            <Button variant='primary' onClick={goToNextStep}>
                                {t("modal_booking_nextstep")}
                            </Button>
                        </div>

                    </div>
                )
            }

            {
                currentStep === BookingSteps.StepChooseRoom && (
                    <div className='bookingContainer'>
                        <Container>
                            <Row className="mt-12">
                                <Col>
                                    <h2>{t("modal_booking_rooms_title")}</h2>
                                </Col>
                            </Row>
                            <br />
                            {/* Inputs de fechas */}
                            <Row className="mt-12">
                                <Col md={6}>
                                    <h3>{t("modal_booking_rooms_startdate")}</h3>
                                    <Calendar minDate={new Date()} maxDate={endDate instanceof Date ? endDate : undefined} onChange={handleStartDateChange} value={startDate} />
                                </Col>
                                <Col md={6}>
                                    <h3>{t("modal_booking_rooms_enddate")}</h3>
                                    <Calendar minDate={startDate instanceof Date ? startDate : undefined} onChange={handleEndDateChange} value={endDate} />
                                </Col>
                            </Row>
                            <br />
                            {/* Inputs de adultos y niños */}
                            <Row className="mt-12">
                                <Col md={6}>
                                    <Form.Label>{t("modal_booking_rooms_adults")}</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={adults}
                                        onChange={(e) => setAdults(e.target.value as unknown as number)}
                                    />
                                </Col>
                                <Col md={6}>
                                    <Form.Label>{t("modal_booking_rooms_children")}</Form.Label>
                                    <Form.Control
                                        type="number"
                                        min={0}
                                        max={10}
                                        value={children}
                                        onChange={(e) => setChildren(e.target.value as unknown as number)}
                                    />
                                </Col>
                            </Row>
                            <br />
                            <Row className='mt-12'>
                                <span><em>{t("modal_booking_rooms_info_adultschildren")}</em></span>
                                <hr />
                            </Row>
                            <br />
                            {/* Room list */}
                            <Row className="mt-12">
                                {filteredRooms && filteredRooms.length > 0 ? (
                                    <div>
                                        <h4>{t("modal_booking_rooms_found")}</h4>
                                        {filteredRooms.map((room) => (
                                            <Row key={room.id ? (room.id + Math.random() * (1000 - 1)) : Math.random()} md={12} className="mb-12">
                                                <Card>
                                                    <Card.Body>
                                                        <Card.Title>{room.name}</Card.Title>
                                                        <Card.Text>
                                                            <span>{room.description}</span>
                                                            <br />
                                                            <span>{t("modal_booking_rooms_card_text_price", { price: room.price })}</span>
                                                            <br />
                                                            <span>{t("modal_booking_rooms_card_text_availabilityDates", { availabilityStart: room.availabilityStart?.toISOString().split('T')[0], availabilityEnd: room.availabilityEnd?.toISOString().split('T')[0] })}</span>
                                                        </Card.Text>
                                                        <Form.Check type="radio"
                                                            name="pricing-plan"
                                                            value={selectedRoomID?.toString()}
                                                            checked={selectedRoomID === room.id}
                                                            onChange={() => roomSelected(room.id)}
                                                            onClick={() => roomSelected(room.id)} label="Book" />
                                                    </Card.Body>
                                                </Card>
                                            </Row>
                                        ))}
                                    </div>
                                ) : (
                                    <div>
                                        <h4>No rooms found</h4>
                                    </div>
                                )}
                            </Row>

                            <div className='bookingNavButtons'>
                                <Button variant="secondary" onClick={goToPreviousStep}>
                                    {t("modal_booking_previousstep")}
                                </Button>

                                <Button variant='primary' onClick={goToNextStep}>
                                    {t("modal_booking_nextstep")}
                                </Button>
                            </div>
                        </Container>
                    </div>
                )
            }

            {
                currentStep === BookingSteps.StepChooseServices && (
                    <div className='servicesContainer'>
                        <Container>
                            <Row className="mt-12">
                                <Col>
                                    <h2>{t("modal_booking_services_title")}</h2>
                                    <em>({t("modal_booking_services_optional")})</em>
                                </Col>
                            </Row>
                            <br />
                            {/* Services list */}
                            <Row className="mt-12">
                                {services.map((service) => (
                                    <Row key={service.id ? (service.id + Math.random() * (1000 - 1)) : Math.random()} md={12} className="mb-12">
                                        <Card style={{ backgroundImage: `url(${service.imageURL})`, backgroundSize: 'cover' }}>
                                            <Card.Body>
                                                <Card.Title>{service.name}</Card.Title>
                                                <Card.Text>
                                                    <span>{service.description}</span>
                                                    <br />
                                                    <span>{t("modal_booking_services_card_text_price", { price: service.price })}</span>
                                                    <br />
                                                    <span>{t("modal_booking_services_card_text_availabilityDates", { availabilityStart: service.availabilityStart?.toISOString().split('T')[0], availabilityEnd: service.availabilityEnd?.toISOString().split('T')[0] })}</span>
                                                </Card.Text>
                                                <Form.Check
                                                    type="checkbox"
                                                    name="service"
                                                    value={service.id ? service.id : -1}
                                                    checked={selectedServicesIDs[service.id ? service.id : 1]}
                                                    label={t("modal_booking_services_card_choose")}
                                                    onChange={() => serviceSelected(service.id)} />
                                            </Card.Body>
                                        </Card>
                                    </Row>
                                ))}
                            </Row>

                            <div className='bookingNavButtons'>
                                <Button variant="secondary" onClick={goToPreviousStep}>
                                    {t("modal_booking_previousstep")}
                                </Button>

                                <Button variant='primary' onClick={goToNextStep}>
                                    {t("modal_booking_nextstep")}
                                </Button>
                            </div>
                        </Container>
                    </div>
                )
            }

            {
                currentStep === BookingSteps.StepFillGuests && (
                    <div>
                        <div className='fillguests-info'>
                            <span>{t("modal_booking_guests_info", { adults, children })}</span>
                        </div>
                        <div className='fillguests-content'>
                            <Container>
                                <Form id='fillGuestsForm' noValidate onSubmit={handleGuestsSubmit}>
                                    {guests.map((guest, index) => (
                                        <Row key={index}>
                                            <Row><strong>{t("modal_booking_guests_guestindex", { index })}</strong></Row>
                                            <Row>
                                                <Col>
                                                    <Form.Group controlId={`name-${index}`}>
                                                        <Form.Label>{t("modal_booking_guests_guest_name")}</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="name"
                                                            disabled={userWantsToBecomeGuest && index === 0}
                                                            value={guest.name ? guest.name : ''}
                                                            isInvalid={!!guestsDataErrors[index].nameError}
                                                            onChange={(e) => handleGuestsInputChange(index, e)}
                                                        />    <Form.Control.Feedback type='invalid'>
                                                            {guestsDataErrors[index].nameError}
                                                        </Form.Control.Feedback>
                                                    </Form.Group>
                                                </Col>
                                                <Col>
                                                    <Form.Group controlId={`surname-${index}`}>
                                                        <Form.Label>{t("modal_booking_guests_guest_surnames")}</Form.Label>
                                                        <Form.Control
                                                            type="text"
                                                            name="surnames"
                                                            disabled={userWantsToBecomeGuest && index === 0}
                                                            value={guest.surnames ? guest.surnames : ''}
                                                            isInvalid={!!guestsDataErrors[index].surnamesError}
                                                            onChange={(e) => handleGuestsInputChange(index, e)}
                                                        />    <Form.Control.Feedback type='invalid'>
                                                            {guestsDataErrors[index].surnamesError}
                                                        </Form.Control.Feedback>
                                                    </Form.Group>
                                                </Col>
                                                <Col>
                                                    <Form.Group controlId={`email-${index}`}>
                                                        <Form.Label>{t("modal_booking_guests_guest_email")}</Form.Label>
                                                        <Form.Control
                                                            type="email"
                                                            name="email"
                                                            disabled={userWantsToBecomeGuest && index === 0}
                                                            value={guest.email ? guest.email : ''}
                                                            isInvalid={!!guestsDataErrors[index].emailError}
                                                            onChange={(e) => handleGuestsInputChange(index, e)}
                                                        />    <Form.Control.Feedback type='invalid'>
                                                            {guestsDataErrors[index].emailError}
                                                        </Form.Control.Feedback>
                                                    </Form.Group>
                                                </Col>
                                                <Col>
                                                    <div className='isAdultFillGuest'>
                                                        <Form.Group controlId={`isAdult-${index}`}>
                                                            <Form.Check
                                                                type="checkbox"
                                                                label={t("modal_booking_guests_guest_adult")}
                                                                name="isAdult"
                                                                disabled={userWantsToBecomeGuest && index === 0}
                                                                checked={guest.isAdult ? guest.isAdult : false}
                                                                onChange={(e) => handleGuestsInputChange(index, e)}
                                                            />
                                                        </Form.Group>
                                                    </div>
                                                </Col></Row>
                                        </Row>
                                    ))}
                                    <br />
                                    <Button variant="success" onClick={addGuest}>
                                        {t("modal_booking_guests_button_add")}
                                    </Button>
                                    <Button variant="success" onClick={substractGuest}>
                                        {t("modal_booking_guests_button_remove")}
                                    </Button>
                                    <br />
                                    <br />
                                    <div className='userWantsToBecomeGuest'>
                                        <Form.Check type='checkbox' name="userWantsToBecomeGuest" label={t("modal_booking_guests_adduserasguest")} checked={userWantsToBecomeGuest} onChange={() => setUserWantsToBecomeGuest(!userWantsToBecomeGuest)} />
                                        {userWantsToBecomeGuest && (
                                            <Form.Check type='checkbox' name="isLoggedUserGuestAdult" label={t("modal_booking_guests_adduserasguest_adult")} checked={isUserGuestAdult} onChange={() => setIsUserGuestAdult(!isUserGuestAdult)} />
                                        )}
                                        <br />
                                        <br />
                                    </div>

                                    <div className='bookingNavButtons'>
                                        <Button variant="secondary" type='button' onClick={goToPreviousStep}>
                                            {t("modal_booking_previousstep")}
                                        </Button>

                                        <Button variant='primary' type='submit'>
                                            {t("modal_booking_nextstep")}
                                        </Button>
                                    </div>
                                </Form>
                            </Container>
                        </div>
                    </div>
                )
            }

            {
                currentStep === BookingSteps.StepPaymentMethod && (
                    <div>
                        <h2>{t("modal_booking_payment_title")}</h2>
                        <div className="cards-payment">
                            {paymentMethods.map((paymentMethod) => (
                                <Card key={paymentMethod.id ? (paymentMethod.id + Math.random() * (1000 - 1)) : Math.random()}>
                                    <Card.Body>
                                        <Card.Title>{paymentMethod.name}</Card.Title>
                                        <Form.Check
                                            type="radio"
                                            name="payment-method"
                                            value={paymentMethod.id?.toString()}
                                            checked={checkedPaymentMethod === paymentMethod.id}
                                            onChange={() => paymentMethodSelected(paymentMethod.id)}
                                        />
                                    </Card.Body>
                                </Card>
                            ))}
                        </div>
                        <div className='payment-selected'>
                            {checkedPaymentMethod == 1 ? (
                                <div className="stripe">
                                    <h4>Stripe</h4>
                                    <Elements stripe={stripePromise} options={stripeOptions}>
                                        <StripeCheckoutForm plan={checkedPlan ? checkedPlan : -1} stripeOptions={stripeOptions} totalPriceToPay={totalPriceToPay} />
                                    </Elements>
                                </div>
                            ) : checkedPaymentMethod == 2 ? (
                                <div className='paypal'>
                                    <h4>Paypal</h4>
                                    <em>Not available</em>
                                </div>
                            ) : null}
                        </div>
                        <div className='bookingNavButtons'>
                            <Button variant="secondary" onClick={goToPreviousStep}>
                                {t("modal_booking_previousstep")}
                            </Button>

                            <Button variant='primary' onClick={goToNextStep}>
                                {t("modal_booking_nextstep")}
                            </Button>
                        </div>
                    </div>
                )
            }

            {
                currentStep === BookingSteps.StepConfirmation && (
                    <div>
                        <h2>{t("modal_booking_completed_title")}</h2>
                        <p>{bookingFinalMessage}</p>
                        <Button variant='primary' onClick={goToNextStep}>{t("modal_booking_completed_close")}</Button>
                    </div>
                )
            }
        </BaseModal >
    );
};

export default BookingModal;
