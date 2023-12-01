import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import Button from 'react-bootstrap/Button'
import Form from 'react-bootstrap/Form';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
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

type PricesToPayBackup = {
    [key in BookingSteps]: number; // Assume the value is a number, adjust as needed
};

// Booking step: calendar properties
type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

// BOOKING MODAL COMPONENT
const BookingModal = ({ colorScheme, show, onClose }: BookingModalProps) => {

    const { t } = useTranslation();

    const handleClose = () => {
        // De cualquier forma cuando lo cierre, vaciar el modal de data
        resetBookingModal();
        onClose();
    }

    // Stripe
    const [totalPriceToPay, setTotalPriceToPay] = useState<number>(0);
    const [pricesToPayBackup, setPricesToPayBackup] = useState<PricesToPayBackup | undefined>(undefined);
    const [comesFromNextSteps, setComesFromNextSteps] = useState<boolean>(false)
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
            const paymentData = {
                amount: totalPriceToPay * 100, // Due to how Stripe works, if you send 1 euro, it charges 0.01 euros.
                currency: stripeOptions.currency,
                plan: plan
            }

            bookingProcess(paymentData);
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
    const [cookies, setCookie, removeCookie] = useCookies(['token', 'cookieConsent']);
    const [currentStep, setCurrentStep] = useState(BookingSteps.StepPersonalData);
    const [userAllData, setUserAllData] = useState<User>();
    const [bookingFinalMessage, setBookingFinalMessage] = useState("");
    // const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [userSelectedPromoCode, setUserSelectedPromoCode] = useState<string>(""); // the promo code that user puts on payment and will apply
    const [userSelectedPromoID, setUserSelectedPromoID] = useState<number>(-1); // the selected promo id retrieved with the promo code
    const [userSelectedPromoIsAssociatedWithUser, setUserSelectedPromoIsAssociatedWithUser] = useState<boolean>(false);

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

    // Only once, on initialization
    useEffect(() => {
        // User data
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
                        dni: res.user_dni,
                        password: res.user_password,
                        verified: res.user_verified,
                        enabled: res.user_enabled
                    }))
                }).catch(err => console.log(err));
            } catch (err) {
                console.log(err);
            }
        } else {
            setUserAllData(new User())
        }

        // Services
        serverAPI.get('/services').then(res => {
            const services = res.data.data;
            let retrievedServices: Service[] = [];
            services.forEach((service: any) => {
                retrievedServices.push(new Service({ id: service.id, name: service.serv_name, description: service.serv_description, price: service.serv_price, availabilityStart: new Date(service.serv_availability_start), availabilityEnd: new Date(service.serv_availability_end), imageURL: API_URL_BASE + "/" + service.imageURL }))
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
        }).catch
            (err => console.log(err))

        // Rooms
        serverAPI.get('/rooms').then(res => {
            let rooms = res.data.data;
            let retrievedRooms: Room[] = [];
            rooms.forEach((room: any) => {
                retrievedRooms.push(new Room({ id: room.id, name: room.room_name, description: room.room_description, price: room.room_price, availabilityStart: new Date(room.room_availability_start), availabilityEnd: new Date(room.room_availability_end), imageURL: API_URL_BASE + "/" + room.imageURL }))
            })
            setRooms(retrievedRooms)
        }).catch
            (err => console.log(err))

        // Plans
        serverAPI.get('/plans').then(res => {
            let plans = res.data.data;
            let retrievedPlans: Plan[] = [];
            plans.forEach((plan: any) => {
                retrievedPlans.push(new Plan({ id: plan.id, name: plan.plan_name, description: plan.plan_description, price: plan.plan_price, imageURL: API_URL_BASE + "/" + plan.imageURL }))
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
            (err => console.log(err))

        // Payment methods
        serverAPI.get('/paymentmethods').then(res => {
            let paymentMethodss = res.data.data;
            let retrievedPaymentMethods: PaymentMethod[] = [];
            paymentMethodss.forEach((pm: any) => {
                retrievedPaymentMethods.push(new PaymentMethod({ id: pm.id, name: pm.payment_method_name.toLowerCase() }))
            })
            setPaymentMethods(retrievedPaymentMethods)
        }).catch
            (err => console.log(err))

        // Weather information (5 days)
        const params = {
            lat: 39.58130105,
            lon: 2.709183392285786,
        };
        weatherAPI.get('data/2.5/forecast', { params }).then(res => {
            postWeatherDataToDB(res.data.list);

            // Esto es si quisieramos mantenerlo en un useState
            // const forecastFiveDaysList = res.data.list;
            // const fiveDaysListObj: Weather[] = [];
            // forecastFiveDaysList.forEach((forecastDay: any) => {
            //     const day = new Date(forecastDay.dt_txt)
            //     fiveDaysListObj.push(new Weather({ id: null, date: day, affectedServiceID: null, state: forecastDay.weather[0].main }))
            // });
        }).catch(err => console.log('WEATHER API ERROR: ' + err.message))

        // Get promotions
        // serverAPI.get('/promotions').then(res => {
        //     let promos = res.data.data;
        //     let retrievedPromos: Promotion[] = [];
        //     promos.forEach((prm: any) => {
        //         retrievedPromos.push(new Promotion({ id: prm.id, code: prm.code, discount_price: prm.discount_price, name: prm.name, description: prm.description, start_date: prm.start_date, end_date: prm.end_date }))
        //     })
        //     setPromotions(retrievedPromos);
        // }).catch(err => console.log(err))
    }, [cookies])

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

    // Logica de navegacion por el modal
    const goToNextStep = async () => {
        setComesFromNextSteps(false);

        // Lógica específica para cada paso
        switch (currentStep) {
            case BookingSteps.StepPersonalData:
                serverAPI.post('/checkUserExists', { email: userPersonalData.email, dni: userPersonalData.dni }).then(_ => {
                    setCurrentStep(BookingSteps.StepPlan);
                }).catch(error => {
                    if (error && error.response && error.response.data && error.response.data.message) {
                        alert(error.response.data.message)
                    }
                })
                break;
            case BookingSteps.StepPlan:
                if (checkedPlan === 1) {
                    // Basic selected
                    setTotalPriceToPay((plans[0].price ? plans[0].price : 50));

                    // After the step, backup the step price
                    setPricesToPayBackup({
                        ...pricesToPayBackup!,
                        [BookingSteps.StepPlan]: (plans[0].price ? plans[0].price : 50),
                    });
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

                    // Update price to all selected services
                    let totalServicesPrice = 0;
                    for (const [key, value] of Object.entries(updatedSelectedServicesIDs)) {
                        // console.log(`${key}: ${value}`);
                        if (value) {
                            // Si es true, es que esta seleccionado
                            const res = await serverAPI.get('/service/' + key)
                            if (res) {
                                totalServicesPrice += res.data.data[0].serv_price;
                            }
                        }
                    }

                    // Sum all the services prices + the plan price itself (we dont append it to the current total price to pay to make sure its the first step from 0)
                    setTotalPriceToPay(totalServicesPrice + (plans[1].price ? plans[1].price : 150))

                    // After the step, backup the step price
                    setPricesToPayBackup({
                        ...pricesToPayBackup!,
                        [BookingSteps.StepChooseServices]: totalServicesPrice,
                        [BookingSteps.StepPlan]: (plans[1].price ? plans[1].price : 150),
                    });
                }
                setCurrentStep(BookingSteps.StepChooseRoom);
                break;
            case BookingSteps.StepChooseRoom:
                if (selectedRoomID != null) {
                    // asegurarse que adultos son 10 o menos y con niños igual
                    if (adults <= 10 && children <= 10) {
                        // Check booking availability
                        const availabilityResponse = await serverAPI.post('/checkBookingAvailability', { roomID: selectedRoomID, start_date: startDate, end_date: endDate });

                        if (availabilityResponse.data && availabilityResponse.data.status === "success") {
                            if (availabilityResponse.data.isAvailable) {
                                // Check if startDate is Today
                                const extractedStartDate = Array.isArray(startDate) ? startDate[0] : startDate;
                                const formattedStartDate = extractedStartDate ? new Date(extractedStartDate).toLocaleDateString('es-ES', {
                                    year: 'numeric',
                                    month: '2-digit',
                                    day: '2-digit',
                                }) : 'N/A';
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

                                if (formattedStartDate != formattedCurrentDate && formattedStartDate !== formattedTomorrowDate) {
                                    // Get weather forecast
                                    serverAPI.get('/weather').then(res => {
                                        // Check if the startDate is in good weather conditions
                                        if (checkCanBookBasedOnWeather(res.data.data)) {
                                            // Check selectedPlan and do some logic depending
                                            if (checkedPlan == 2) {
                                                serverAPI.get('/room/' + selectedRoomID).then(async res => {
                                                    // Seleccionó vip, por lo que no elige servicios, todos estan incluidos
                                                    // Crear una copia del estado actual
                                                    const updatedSelectedServicesIDs = { ...selectedServicesIDs };
                                                    // Establecer todos los valores en true
                                                    Object.keys(updatedSelectedServicesIDs).forEach(key => {
                                                        updatedSelectedServicesIDs[key] = true;
                                                    });
                                                    setSelectedServicesIDs(updatedSelectedServicesIDs)

                                                    // Update price to all selected services
                                                    let totalServicesPrice = 0;
                                                    for (const [key, value] of Object.entries(updatedSelectedServicesIDs)) {
                                                        // console.log(`${key}: ${value}`);
                                                        if (value) {
                                                            // Si es true, es que esta seleccionado
                                                            const resp = await serverAPI.get('/service/' + key)
                                                            if (resp) {
                                                                totalServicesPrice += resp.data.data[0].serv_price;
                                                            }
                                                        }
                                                    }

                                                    // If comes from previous step to control the check plan vip
                                                    if (comesFromNextSteps) {
                                                        setTotalPriceToPay(totalPriceToPay + res.data.data[0].room_price + totalServicesPrice)
                                                    } else {
                                                        setTotalPriceToPay(totalPriceToPay + res.data.data[0].room_price)
                                                    }

                                                    // After the step, backup the step price
                                                    setPricesToPayBackup({
                                                        ...pricesToPayBackup!,
                                                        [BookingSteps.StepChooseRoom]: res.data.data[0].room_price,
                                                        [BookingSteps.StepChooseServices]: totalServicesPrice,
                                                    });
                                                }).catch(err => console.log(err))

                                                setCurrentStep(BookingSteps.StepFillGuests);
                                            } else {
                                                serverAPI.get('/room/' + selectedRoomID).then(res => {
                                                    setTotalPriceToPay(totalPriceToPay + res.data.data[0].room_price)

                                                    // After the step, backup the step price
                                                    setPricesToPayBackup({
                                                        ...pricesToPayBackup!,
                                                        [BookingSteps.StepChooseRoom]: res.data.data[0].room_price,
                                                    });
                                                }).catch(err => console.log(err))

                                                setCurrentStep(BookingSteps.StepChooseServices);
                                            }
                                        } else {
                                            alert("You can't book a service on booking start date: " + startDate?.toString() + " due to bad weather conditions: " + WeatherStates.RAIN + ", choose another start date for your booking!")
                                        }
                                    })
                                } else {
                                    alert('You cannot put the start day of your booking in the day of today or tomorrow!')
                                }
                            } else {
                                if (availabilityResponse.data.available) {
                                    const list = availabilityResponse.data.available.join(' / ');
                                    alert("Cannot book these dates; they're occupied. List of available dates: " + list);
                                } else {
                                    alert("Cannot book these dates; they're occupied");
                                }
                            }
                        } else {
                            alert("No rooms available on those dates");
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
                        const res = await serverAPI.get('/service/' + key)
                        if (res) {
                            totalServicesPrice += res.data.data[0].serv_price;
                        }
                    }
                }

                setTotalPriceToPay(totalPriceToPay + totalServicesPrice)

                // After the step, backup the step price
                setPricesToPayBackup({
                    ...pricesToPayBackup!,
                    [BookingSteps.StepChooseServices]: totalServicesPrice,
                });

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
                    setCurrentStep(BookingSteps.StepPromoCode);
                } else {
                    alert("Adults and children are not matching in number with a previous step! Please make it match or change the number of adults/children!")
                }
                break;
            case BookingSteps.StepPromoCode:
                // Get promotions
                serverAPI.get('/promotions').then(async res => {
                    let promos = res.data.data;
                    let retrievedPromos: Promotion[] = [];
                    promos.forEach((prm: any) => {
                        retrievedPromos.push(new Promotion({ id: prm.id, code: prm.code, discount_price: prm.discount_price, name: prm.name, description: prm.description, start_date: prm.start_date, end_date: prm.end_date }))
                    })
                    // setPromotions(retrievedPromos);

                    // Check promos before payment and update its price with the promo that applies, and if not it wont have a valid value
                    const afterPromosTotalPriceAndPromoIDIfApplied = await getUpdatedTotalPriceToPayWithPromos(retrievedPromos, totalPriceToPay, userSelectedPromoCode)
                    const updatedPrice = afterPromosTotalPriceAndPromoIDIfApplied.updatedTotalPrice ? afterPromosTotalPriceAndPromoIDIfApplied.updatedTotalPrice : totalPriceToPay;
                    const promoID = afterPromosTotalPriceAndPromoIDIfApplied.appliedPromoId ? afterPromosTotalPriceAndPromoIDIfApplied.appliedPromoId : -1; // -1 means no promo applied

                    setTotalPriceToPay(updatedPrice)
                    setUserSelectedPromoID(promoID)

                    setCurrentStep(BookingSteps.StepPaymentMethod);
                }).catch(err => {
                    console.log(err)
                    alert("Error recovering promo codes, can't continue with booking: " + err)
                })
                break;
            case BookingSteps.StepPaymentMethod:
                // Migrado a usarlo directamente en un método en los propios forms de stripe, paypal o whatever
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
        setComesFromNextSteps(true);

        let priceToDiscount = 0;
        let priceResult = 0;

        switch (currentStep) {
            case BookingSteps.StepPersonalData:
                alert("You can't turn back, you are in the first step!")
                break;
            case BookingSteps.StepPlan:
                setCurrentStep(BookingSteps.StepPersonalData);
                break;
            case BookingSteps.StepChooseRoom:
                // Restore price backup of the previous step (we discount what we have on that step)
                if (checkedPlan == 2) {
                    priceToDiscount = (pricesToPayBackup?.[BookingSteps.StepPlan] || 0) + (pricesToPayBackup?.[BookingSteps.StepChooseServices] || 0)
                } else {
                    priceToDiscount = pricesToPayBackup?.[BookingSteps.StepPlan] || 0
                }
                priceResult = totalPriceToPay - priceToDiscount;

                if (priceResult >= 0) {
                    setTotalPriceToPay(priceResult);
                } else {
                    setTotalPriceToPay(0)
                }

                if (checkedPlan == 2) {
                    // Empty selected step previous step of where we are price backup and the services step due to the checked plan vip
                    setPricesToPayBackup((prevPrices) => {
                        const updatedPrices = { ...prevPrices! };
                        updatedPrices[BookingSteps.StepPlan] = 0;
                        updatedPrices[BookingSteps.StepChooseServices] = 0;
                        return updatedPrices;
                    });
                } else {
                    // Empty selected step previous step of where we are price backup
                    setPricesToPayBackup((prevPrices) => {
                        const updatedPrices = { ...prevPrices! };
                        updatedPrices[BookingSteps.StepPlan] = 0;
                        return updatedPrices;
                    });
                }

                setCurrentStep(BookingSteps.StepPlan);
                break;
            case BookingSteps.StepChooseServices:
                // Restore price backup of the previous step (we discount what we have on that step)
                priceToDiscount = pricesToPayBackup?.[BookingSteps.StepChooseRoom] || 0;
                priceResult = totalPriceToPay - priceToDiscount;

                if (priceResult >= 0) {
                    setTotalPriceToPay(priceResult);
                } else {
                    resetBookingModal();
                }

                // Empty selected step previous step of where we are price backup
                setPricesToPayBackup((prevPrices) => {
                    const updatedPrices = { ...prevPrices! };
                    updatedPrices[BookingSteps.StepChooseRoom] = 0;
                    return updatedPrices;
                });

                setCurrentStep(BookingSteps.StepChooseRoom);
                break;
            case BookingSteps.StepFillGuests:
                // Restore price backup of the previous step (we discount what we have on that step)
                if (checkedPlan == 2) {
                    priceToDiscount = (pricesToPayBackup?.[BookingSteps.StepChooseServices] || 0) + (pricesToPayBackup?.[BookingSteps.StepChooseRoom] || 0) + (pricesToPayBackup?.[BookingSteps.StepPlan] || 0)
                } else {
                    priceToDiscount = pricesToPayBackup?.[BookingSteps.StepChooseServices] || 0
                }
                priceResult = totalPriceToPay - priceToDiscount;

                if (priceResult >= 0) {
                    setTotalPriceToPay(priceResult);
                }

                if (checkedPlan == 2) {
                    // Empty selected step previous step of where we are price backup and the 2nd previous due to the checked plan vip
                    setPricesToPayBackup((prevPrices) => {
                        const updatedPrices = { ...prevPrices! };
                        updatedPrices[BookingSteps.StepChooseServices] = 0;
                        updatedPrices[BookingSteps.StepChooseRoom] = 0;
                        updatedPrices[BookingSteps.StepPlan] = 0;
                        return updatedPrices;
                    });

                    setCurrentStep(BookingSteps.StepPlan);
                } else {
                    // Empty selected step previous step of where we are price backup
                    setPricesToPayBackup((prevPrices) => {
                        const updatedPrices = { ...prevPrices! };
                        updatedPrices[BookingSteps.StepChooseServices] = 0;
                        return updatedPrices;
                    });

                    setCurrentStep(BookingSteps.StepChooseServices);
                }
                break;
            case BookingSteps.StepPromoCode:
                setCurrentStep(BookingSteps.StepFillGuests);
                break;
            case BookingSteps.StepPaymentMethod:
                // Para volver a promo codes, restauramos lo descontado
                priceToDiscount = pricesToPayBackup?.[BookingSteps.StepPromoCode] || 0;
                priceResult = totalPriceToPay + priceToDiscount; // in this case, we sum because the promo was a discount, not an addition to the price

                if (priceResult >= 0) {
                    setTotalPriceToPay(priceResult);
                }
                setCurrentStep(BookingSteps.StepPromoCode);
                break;
            case BookingSteps.StepConfirmation:
                alert("You can't turn back, you already did the booking!")
                break;
            default:
                break;
        }
    }

    async function bookingProcess(paymentData: any) {
        try {
            // Check room availability
            const availabilityResponse = await serverAPI.post('/checkBookingAvailability', { roomID: selectedRoomID, start_date: startDate, end_date: endDate });

            if (availabilityResponse.data && availabilityResponse.data.status === "success") {
                if (availabilityResponse.data.isAvailable) {
                    // Check if the user exists
                    let userID = userAllData?.id;
                    if (!cookies.token) {
                        userID = await createUser();
                    }

                    // Process payment
                    const clientSecret = await doPayment(paymentData);

                    if (clientSecret && clientSecret !== undefined && clientSecret !== null && clientSecret !== '') {
                        // Make the booking
                        await doBooking(userID, clientSecret, totalPriceToPay, userSelectedPromoID);
                        // await doBooking(userID, clientSecret, updatedPrice, promoID);
                    } else {
                        alert('Error on payment, try again');
                    }
                } else {
                    if (availabilityResponse.data.available) {
                        const list = availabilityResponse.data.available.join(' / ');
                        alert("Cannot book these dates; they're occupied. List of available dates: " + list);
                    } else {
                        alert("Cannot book these dates; they're occupied");
                    }
                }
            } else {
                alert("No rooms available on those dates");
            }
        } catch (error: any) {
            console.log('Error during the booking process:', error);
            if (error && error.response && error.response.data) {
                if (error.response.data.message) {
                    alert(error.response.data.message)
                }
                if (error.response.data.message) {
                    alert(error.response.data.message)
                }
            }
            await cancelBooking();
            // } finally {
            //     removeCookie('token');
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
        await serverAPI.post('/cancel-payment', { client_secret: paymentTransactionID })
        const deleteUser = await serverAPI.delete('/user', {
            headers: {
                Authorization: cookies.token
            }
        });
        if (deleteUser) {
            removeCookie('token')
        }
    }

    async function createUser() {
        try {
            if (cookies.cookieConsent) {
                const userToCreate = { email: userPersonalData.email, dni: userPersonalData.dni, name: userPersonalData.name, surnames: userPersonalData.surnames, password: "1234", roleID: 1 };
                const res = await serverAPI.post('/register', userToCreate);

                setCookie('token', res.data.cookieJWT);;

                const newUserAllData: User = {
                    id: res.data.insertId,
                    ...userToCreate,
                    verified: false,
                    enabled: true,
                };

                // Update the state with the new userAllData
                setUserAllData(newUserAllData);

                return res.data.insertId;
            } else {
                alert('No se pudo crear el usuario ni enviar email de confirmación')
                return null;
            }
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
    const [userPersonalData, setUserPersonalData] = useState({ name: '', dni: '', surnames: '', email: '' });
    const [userPersonalDataErrors, setUserPersonalDataErrors] = useState({ nameError: '', dniError: '', surnamesError: '', emailError: '' });

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

    // Step choose Plan
    const [plans, setPlans] = useState<Plan[]>([])
    const [checkedPlan, setCheckedPlan] = useState<number | null>(1);

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
        onChangeStartDate(newStartDate);
    }

    const handleEndDateChange = (newEndDate: Value) => {
        onChangeEndDate(newEndDate);
    }

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

    const serviceSelected = (serviceID: any) => {
        if (selectedServicesIDs[serviceID]) {
            setSelectedServicesIDs(prevState => ({ ...prevState, [serviceID]: false }));
        } else {
            setSelectedServicesIDs(prevState => ({ ...prevState, [serviceID]: true }));
        }
    }

    // Step fill guests
    const [guests, setGuests] = useState<Guest[]>([
        new Guest({ id: null, name: '', surnames: '', email: '', isAdult: false, isSystemUser: false })
    ]);
    const [guestsDataErrors, setGuestsDataErrors] = useState([{ nameError: '', surnamesError: '', emailError: '' }]);
    const [userWantsToBecomeGuest, setUserWantsToBecomeGuest] = useState(false);
    const [isUserGuestAdult, setIsUserGuestAdult] = useState(false);

    const addGuest = () => {
        if (guests.length < 20) {
            // Maximum we allow 20 guests, 10 adults and 10 childs
            setGuests([...guests, { id: null, name: '', surnames: '', email: '', isAdult: false, isSystemUser: false }]);
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

    // On change user wants to become a guest
    useEffect(() => {
        if (userWantsToBecomeGuest) {
            if (cookies && cookies.token) {
                getAllLoggedUserData().then((data: any) => {
                    let user: any = data.data;
                    const newUserAsGuest = new Guest({ id: user.id, name: user.user_name, surnames: user.user_surnames, email: user.user_email, isAdult: isUserGuestAdult, isSystemUser: true })
                    setGuests([newUserAsGuest, ...guests]);
                    setGuestsDataErrors([{ nameError: '', surnamesError: '', emailError: '' }, ...guestsDataErrors])
                }).catch(err => console.log(err));
            } else {
                const newUserAsGuest = new Guest({ id: null, name: userPersonalData.name, surnames: userPersonalData.surnames, email: userPersonalData.email, isAdult: isUserGuestAdult, isSystemUser: true })
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

    // On change user wants to become guest is an adult checkbox
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

    const paymentMethodSelected = (paymentMethodID: any) => {
        setCheckedPaymentMethod(paymentMethodID);
    };

    // FUNCTIONS TO CHECK FOR PROMOS

    // Get the discount percentage for a promotion
    async function getPromoDiscount(promoId: number): Promise<number> {
        try {
            const response = await serverAPI.get(`/get-promo-discount/${promoId}`);
            return response.data.data.discount;
        } catch (error) {
            console.log('Error getting promo discount:', error);
            return 0;
        }
    }
    async function getUpdatedTotalPriceToPayWithPromos(promotions: Promotion[], totalPriceToPay: number, userSelectedPromoCode: string) {
        // Check promos before payment and update its price with the promo that applies, and if not it wont have a valid value (default totalPriceToPay or -1 in appliedPromoId)

        let updatedTotalPrice = totalPriceToPay;
        let appliedPromoId: number = -1;
        let selectedPromoIsAssociatedWithUser = false;

        if (userSelectedPromoCode != "") {
            // Find the promotion with the selected promo code
            const selectedPromo = promotions.find(promo => promo.code === userSelectedPromoCode);

            if (selectedPromo) {
                try {
                    // Make parallel requests to getUserAssociatedPromos and getPromoDiscount
                    const [userPromosResponse, discount] = await Promise.all([
                        serverAPI.post('/getUserAssociatedPromos', { userID: userAllData?.id }),
                        getPromoDiscount(selectedPromo.id ? selectedPromo.id : -1),
                    ]);

                    const promoDiscountOfTotalPrice = (totalPriceToPay * discount) / 100
                    const userAssociatedPromos: Promotion[] = userPromosResponse.data.results;

                    // With userSelectedPromoIsAssociatedWithUser we control if we apply the promotion of user of one time and set it to used, or use a normal promotion code with dates

                    const currentDate = new Date();
                    const promoStartDate = selectedPromo.start_date ? new Date(selectedPromo.start_date) : null;
                    const promoEndDate = selectedPromo.end_date ? new Date(selectedPromo.end_date) : null;

                    // We check user associated promos
                    userAssociatedPromos.forEach(async (userPromo: any) => {
                        // Retrieved user associated promo and selected global promo from all retrieved promos are matching
                        if ((userPromo.promotion_id === selectedPromo.id) && !userSelectedPromoIsAssociatedWithUser) {
                            // User has this promotion
                            // We check it's not used
                            if (!userPromo.isUsed) {
                                selectedPromoIsAssociatedWithUser = true;
                                setUserSelectedPromoIsAssociatedWithUser(selectedPromoIsAssociatedWithUser)
                                // Ensure promoStartDate and promoEndDate are defined before further processing
                                if (promoStartDate && promoEndDate) {
                                    // Convert dates to "YYYY-MM-DD" format from db
                                    const currentDateString = currentDate.toISOString().slice(0, 10);
                                    const promoStartDateString = promoStartDate.toISOString().slice(0, 10);
                                    const promoEndDateString = promoEndDate.toISOString().slice(0, 10);

                                    // Check if promo is in dates or the promo is for the user
                                    if (promoStartDateString <= currentDateString && currentDateString <= promoEndDateString) {
                                        // Backup the discount
                                        setPricesToPayBackup({
                                            ...pricesToPayBackup!,
                                            [BookingSteps.StepPromoCode]: promoDiscountOfTotalPrice,
                                        });

                                        // Apply the discount to the total price
                                        updatedTotalPrice -= promoDiscountOfTotalPrice;
                                        updatedTotalPrice = parseFloat(updatedTotalPrice.toFixed());
                                        // Set the applied promo ID
                                        appliedPromoId = selectedPromo.id ? selectedPromo.id : -1;

                                        // Set promo associated with user to be used
                                        // await serverAPI.post('/setUserPromoUsed', { promoID: appliedPromoId, userID: userAllData?.id }, { headers: { 'Authorization': cookies.token } });
                                    }
                                } else {
                                    // If dates not properly defined, we don't do anything
                                    setPricesToPayBackup({
                                        ...pricesToPayBackup!,
                                        [BookingSteps.StepPromoCode]: 0,
                                    });
                                }
                            } else {
                                // If used, we don't do anything
                                setPricesToPayBackup({
                                    ...pricesToPayBackup!,
                                    [BookingSteps.StepPromoCode]: 0,
                                });
                            }
                        }
                    });

                    // If we didn't find user associated promos matching this selected promo
                    if (!selectedPromoIsAssociatedWithUser) {
                        // User hasn't this promotion

                        // Ensure promoStartDate and promoEndDate are defined before further processing
                        if (promoStartDate && promoEndDate) {
                            // Convert dates to "YYYY-MM-DD" format
                            const currentDateString = currentDate.toISOString().slice(0, 10);
                            const promoStartDateString = promoStartDate.toISOString().slice(0, 10);
                            const promoEndDateString = promoEndDate.toISOString().slice(0, 10);

                            // Check if promo is in dates or the promo is for the user
                            if (promoStartDateString <= currentDateString && currentDateString <= promoEndDateString) {
                                // Backup the discount
                                setPricesToPayBackup({
                                    ...pricesToPayBackup!,
                                    [BookingSteps.StepPromoCode]: promoDiscountOfTotalPrice,
                                });

                                // Apply the discount to the total price
                                updatedTotalPrice -= promoDiscountOfTotalPrice;
                                updatedTotalPrice = parseFloat(updatedTotalPrice.toFixed());
                                // Set the applied promo ID
                                appliedPromoId = selectedPromo.id ? selectedPromo.id : -1;
                            }
                        } else {
                            // If dates not properly defined, we don't do anything
                            setPricesToPayBackup({
                                ...pricesToPayBackup!,
                                [BookingSteps.StepPromoCode]: 0,
                            });
                        }
                    }

                } catch (error) {
                    setPricesToPayBackup({
                        ...pricesToPayBackup!,
                        [BookingSteps.StepPromoCode]: 0,
                    });
                    console.log(error);
                }
            }
        }

        return { updatedTotalPrice, appliedPromoId };
    }

    // RESET
    const resetBookingModal = () => {
        setCurrentStep(BookingSteps.StepPersonalData)
        if (cookies.token) {
            // Si ya esta logeado, no pedir los datos personales
            setCurrentStep(BookingSteps.StepPlan)
        }
        setUserPersonalData({ name: '', surnames: '', email: '', dni: '' });
        setUserPersonalDataErrors({ nameError: '', surnamesError: '', emailError: '', dniError: '' })
        setGuests([
            new Guest({ id: null, name: '', surnames: '', email: '', isAdult: false, isSystemUser: false })
        ]);
        setGuestsDataErrors([{ nameError: '', surnamesError: '', emailError: '' }])
        setCheckedPlan(1)
        onChangeStartDate(new Date())
        onChangeEndDate(new Date())
        setAdults(1)
        setChildren(0)
        setFilteredRooms([])
        setTotalPriceToPay(0);
        setPricesToPayBackup(undefined);
    }

    // When close, reset modal data
    useEffect(() => {
        if (!show && !cookies.token) {
            resetBookingModal();
        }
    }, [show])

    return (
        <BaseModal title={t("book")} show={show} onClose={handleClose}>
            <div>

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

                            <Form.Group className="mb-3" controlId="formDNI">
                                <Form.Label>{t("modal_booking_personaldata_dni_label")}</Form.Label>
                                <Form.Control type="text" name="dni" minLength={9} maxLength={9} pattern="[0-9]{8}[A-Za-z]{1}" placeholder={t("modal_booking_personaldata_dni_placeholder")} value={userPersonalData.dni} onChange={handlePersonalDataChange} isInvalid={!!userPersonalDataErrors.dniError} required />
                                <Form.Text className="text-muted">
                                    {t("modal_booking_personaldata_dni_description")}
                                </Form.Text>
                                <Form.Control.Feedback type='invalid'>
                                    {userPersonalDataErrors.dniError}
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
                                            <Card key={plan.id ? (plan.id + Math.random() * (1000 - 1)) : Math.random()} style={{ width: '300px', height: '180px', padding: '0', marginTop: '20px', marginBottom: '10px', border: colorScheme !== "light" ? '2px solid white' : '2px solid black', borderRadius: '12px' }}>
                                                <Card.Body style={{ backgroundImage: `url(${plan.imageURL})`, backgroundSize: 'cover', color: '#FFFFFF', textShadow: '2px 2px #000000', fontSize: '1.01em', fontWeight: '500' }}>
                                                    <Card.Title style={{fontWeight: '800'}}>{t("modal_booking_plans_card_title", { name: plan.name })}</Card.Title>
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
                                {!cookies.token && (
                                    <Button variant="secondary" onClick={goToPreviousStep}>
                                        {t("modal_booking_previousstep")}
                                    </Button>
                                )}

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
                                        <Calendar minDate={startDate instanceof Date ? new Date(startDate.getTime() + 24 * 60 * 60 * 1000) : undefined} onChange={handleEndDateChange} value={endDate} />
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
                                                    <Card style={{ backgroundImage: `url(${room.imageURL})`, backgroundSize: 'cover', marginTop: '10px', marginBottom: '10px', border: colorScheme !== "light" ? '2px solid white' : '2px solid black', borderRadius: '12px' }}>
                                                        <Card.Body style={{ color: '#FFFFFF', textShadow: '2px 2px #000000', fontSize: '1.01em', fontWeight: '600' }}>
                                                            <Card.Title style={{fontWeight: '800'}}>{room.name}</Card.Title>
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
                                    {services && services.length > 0 ? (
                                        <div>
                                            {services.map((service) => (
                                                <Row key={service.id ? (service.id + Math.random() * (1000 - 1)) : Math.random()} md={12} className="mb-12">
                                                    <Card style={{ backgroundImage: `url(${service.imageURL})`, backgroundSize: 'cover', marginTop: '10px', marginBottom: '10px', border: colorScheme !== "light" ? '2px solid white' : '2px solid black', borderRadius: '12px' }}>
                                                        <Card.Body style={{ color: '#FFFFFF', textShadow: '2px 2px #000000', fontSize: '1.01em', fontWeight: '600' }}>
                                                            <Card.Title style={{fontWeight: '800'}}>{service.name}</Card.Title>
                                                            <Card.Text style={{}}>
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
                                        </div>) : (
                                        <div>
                                            <h4>No services found</h4>
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
                    currentStep === BookingSteps.StepPromoCode && (
                        <div>
                            <h2>Promo code (optional)</h2>
                            <br />
                            <div className='payment-promocode'>
                                <Form id='promoCodeForm' noValidate onSubmit={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    goToNextStep();
                                }}>
                                    <Form.Label>Promo code:</Form.Label>
                                    <Form.Control
                                        type="text"
                                        name="promoCode"
                                        placeholder='Promotion code'
                                        maxLength={255}
                                        value={userSelectedPromoCode}
                                        onChange={(e) => setUserSelectedPromoCode(e.target.value)}
                                    />
                                    <div className='bookingNavButtons'>
                                        <Button variant="secondary" type='button' onClick={goToPreviousStep}>
                                            {t("modal_booking_previousstep")}
                                        </Button>

                                        <Button variant='primary' type='submit'>
                                            {t("modal_booking_nextstep")}
                                        </Button>
                                    </div>
                                </Form>
                                <br />
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

                                {/* <Button variant='primary' onClick={goToNextStep}>
                                {t("modal_booking_nextstep")}
                            </Button> */}
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

                {(currentStep !== BookingSteps.StepPersonalData && currentStep !== BookingSteps.StepConfirmation) && (
                    // Show the current price to pay in all steps
                    <p>{t("priceToPay")} {totalPriceToPay}</p>
                )}
            </div>
        </BaseModal >
    );
};

export default BookingModal;
