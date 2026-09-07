import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import { Header, Footer } from './components/partials';
import { Home } from './pages/Home';
const Services = lazy(() => import('./pages/Services').then(m => ({ default: m.Services })));
const Contact = lazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));
const UserVerify = lazy(() => import('./pages/UserVerify').then(m => ({ default: m.UserVerify })));
const UserBookings = lazy(() => import('./pages/UserBookings').then(m => ({ default: m.UserBookings })));
const Admin = lazy(() => import('./pages/Admin').then(m => ({ default: m.Admin })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const LegalNotice = lazy(() => import('./pages/LegalNotice').then(m => ({ default: m.LegalNotice })));
const CookiePolicy = lazy(() => import('./pages/CookiePolicy').then(m => ({ default: m.CookiePolicy })));
const TermsOfUse = lazy(() => import('./pages/TermsOfUse').then(m => ({ default: m.TermsOfUse })));
const NotFound = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })));

import ScrollToTop from './ScrollToTop';
import BookingModal from './components/modals/BookingModal';
import UserModal from './components/modals/UserModal';
import ViewImageModal from './components/modals/ViewImageModal';
import DuplicateBookingModal from './components/modals/DuplicateBookingModal';
import Button from 'react-bootstrap/Button';
import { useTranslation } from "react-i18next";
import CookieConsent from "react-cookie-consent";
import { useCookies } from 'react-cookie';
import serverAPI from './services/serverAPI';
import { UserRoles } from "./constants";
import { Role, Booking } from './models/index';

import summerParty from './assets/music/summer-party.mp3'

function App() {
    // MODALS
    // Booking modal
    const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
    // User modal
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    // Image preview modal
    const [isImageViewModalOpen, setIsImageViewModalOpen] = useState(false);
    const [imagePreviewData, setImagePreviewData] = useState({});
    // Duplicate booking modal
    const [isDuplicateBookingModalOpen, setIsDuplicateBookingModalOpen] = useState(false);
    const [duplicateBookingData, setDuplicatedBookingData] = useState<Booking>(new Booking());

    // User has bookings
    const [userHasBookings, setUserHasBookings] = useState(false);

    // Color scheme
    const [colorScheme, setColorScheme] = useState(
        typeof window !== "undefined" && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    );

    // Translations
    const { t } = useTranslation();

    // Cookies
    const [cookies, _, removeCookie] = useCookies(['token', 'cookieConsent']);

    // Logged user role
    const [currentUserRole, setCurrentUserRole] = useState<Role>({ id: null, name: UserRoles.CLIENT })

    // Audio player
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);

    const toggleAudio = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.volume = 0.25;
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-bs-theme', colorScheme)

        // background music
        if (audioRef.current) {
            audioRef.current.loop = true;
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        }
    }, [])

    useEffect(() => {
        if (cookies.token) {
            // Verificamos en el verify user del backend la base de datos con el access token
            getAllLoggedUserData()
            serverAPI.get('/bookingsByUser', { headers: { 'Authorization': cookies.token } }).then(res => {
                setUserHasBookings(res.data.data.length > 0)
            }).catch(err => console.log(err))
        }
    }, [cookies])

    // Color theme listener with proper cleanup to prevent memory leaks
    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return;
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (event: MediaQueryListEvent) => {
            const newColorScheme = event.matches ? "dark" : "light";
            document.documentElement.setAttribute('data-bs-theme', newColorScheme);
            setColorScheme(newColorScheme);
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    // Book modal
    const openBookingModal = () => {
        setIsBookingModalOpen(true);
    };

    const closeBookingModal = () => {
        setIsBookingModalOpen(false);
    };

    // User modal
    const openUserModal = () => {
        setIsUserModalOpen(true);
    };

    const closeUserModal = () => {
        setIsUserModalOpen(false);
    };

    // Image preview modal
    const openImagePreviewModal = (src: string, title: string, description: string) => {
        setIsImageViewModalOpen(true);
        setImagePreviewData({
            src: src,
            title: title,
            description: description
        })
    }

    const closeImageViewModal = () => {
        setIsImageViewModalOpen(false);
    }

    // Duplicate booking modal
    const openDuplicateBookingModal = (booking: Booking) => {
        setIsDuplicateBookingModalOpen(true);
        setDuplicatedBookingData(booking)
    }

    const closeDuplicateBookingModal = () => {
        setIsDuplicateBookingModalOpen(false);
    }


    // Get JWT user data to set user role for app (currently used in header only)
    async function getAllLoggedUserData() {
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
                const userRole = await serverAPI.get('/getUserRole/' + loggedUserID.data.userID, { headers: { 'Authorization': cookies.token } })
                setCurrentUserRole(new Role({ id: userRole.data.data.id, name: userRole.data.data.name }))
                return getLoggedUserData.data;
            }
        }
    }

    return (
        <Suspense fallback="loading">
            <Router>
                <div className='app'>

                    <ScrollToTop />
                    <Header colorScheme={colorScheme} onOpenBookingModal={openBookingModal} onOpenUserModal={openUserModal} currentUserRole={currentUserRole} userHasBookings={userHasBookings} />
                    <main id='main' className='main'>
                        <Routes>
                            <Route path="/" element={<Home colorScheme={colorScheme} />} />
                            <Route path="/services" element={<Services colorScheme={colorScheme} openImagePreviewModal={openImagePreviewModal} />} />
                            <Route path="/contact" element={<Contact colorScheme={colorScheme} />} />
                            <Route path="/userVerification/:token" element={<UserVerify colorScheme={colorScheme} />} />
                            <Route path="/user-bookings" element={<UserBookings colorScheme={colorScheme} userHasBookings={userHasBookings} openDuplicateBookingModal={openDuplicateBookingModal} />} />
                            <Route path="/admin" element={<Admin colorScheme={colorScheme} />} />
                            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                            <Route path="/legal-notice" element={<LegalNotice />} />
                            <Route path="/cookies-policy" element={<CookiePolicy />} />
                            <Route path="/terms-of-use" element={<TermsOfUse />} />
                            <Route path="*" element={<NotFound />} />
                        </Routes>

                        <Button variant="primary" id="bookBtnNoInHeader" onClick={openBookingModal}>{t("book")}</Button>
                        <BookingModal show={isBookingModalOpen} onClose={closeBookingModal} colorScheme={colorScheme} />
                        <UserModal show={isUserModalOpen} onClose={closeUserModal} colorScheme={colorScheme} />
                        <ViewImageModal show={isImageViewModalOpen} onClose={closeImageViewModal} colorScheme={colorScheme} imagePreviewData={imagePreviewData} />
                        <DuplicateBookingModal show={isDuplicateBookingModalOpen} onClose={closeDuplicateBookingModal} colorScheme={colorScheme} bookingData={duplicateBookingData} />

                        <CookieConsent location='bottom' buttonText='Sure, I accept!' cookieName='cookieConsent' enableDeclineButton style={{ background: "#2B373B" }} buttonStyle={{ color: "#4e503b", fontSize: "13px" }} expires={150}>
                            {t("app_name")} uses cookies to its basic funcionality and to enhance the user experience.
                        </CookieConsent>
                        <div>
                            <button onClick={toggleAudio}>{isPlaying ? 'Pause Audio' : 'Play Audio'}</button>
                            <audio ref={audioRef} src={summerParty} />
                        </div>
                    </main>
                    <Footer colorScheme={colorScheme} />
                </div>
            </Router>
        </Suspense>
    )
}

export default App
