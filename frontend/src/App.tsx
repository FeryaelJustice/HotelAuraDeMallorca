import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import { useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import { Header, Footer } from './components/partials';
import { Home } from './pages/Home';
const Services = lazy(() => import('./pages/Services').then(m => ({ default: m.Services })));
const Coupons = lazy(() => import('./pages/Coupons').then(m => ({ default: m.Coupons })));
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
const BookingModal = lazy(() => import('./components/modals/BookingModal'));
const UserModal = lazy(() => import('./components/modals/UserModal'));
const ViewImageModal = lazy(() => import('./components/modals/ViewImageModal'));
const DuplicateBookingModal = lazy(() => import('./components/modals/DuplicateBookingModal'));
const TechStackModal = lazy(() => import('./components/modals/TechStackModal'));
import AmbientAudioPlayer from './components/partials/AmbientAudioPlayer';
import { useTranslation } from "react-i18next";
import CustomCookieConsent from './components/partials/CustomCookieConsent';
import { useCookies } from 'react-cookie';
import serverAPI from './services/serverAPI';
import { UserRoles } from "./constants";
import { Role, Booking } from './models/index';
import Swal from 'sweetalert2';

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

    // Color scheme: persistent in localStorage, defaults to 'light'
    const [colorScheme, setColorScheme] = useState<string>(() => {
        if (typeof window !== "undefined") {
            const saved = localStorage.getItem('aura_theme');
            if (saved === 'dark' || saved === 'light') return saved;
        }
        return 'light'; // Por defecto es claro
    });

    const toggleColorScheme = () => {
        const nextTheme = colorScheme === 'dark' ? 'light' : 'dark';
        setColorScheme(nextTheme);
        if (typeof window !== "undefined") {
            localStorage.setItem('aura_theme', nextTheme);
        }
        document.documentElement.setAttribute('data-bs-theme', nextTheme);
    };

    // Translations
    const { t } = useTranslation();

    // Cookies
    const [cookies, _, removeCookie] = useCookies(['token', 'refreshToken', 'cookieConsent']);

    // Logged user role
    const [currentUserRole, setCurrentUserRole] = useState<Role>({ id: null, name: UserRoles.CLIENT })

    // Tech Stack modal
    const [isTechModalOpen, setIsTechModalOpen] = useState(false);

    // Audio player is managed by AmbientAudioPlayer component

    useEffect(() => {
        document.documentElement.setAttribute('data-bs-theme', colorScheme);
        if (typeof window !== "undefined") {
            localStorage.setItem('aura_theme', colorScheme);
        }
    }, [colorScheme]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const hasSeenNotice = sessionStorage.getItem('aura_backend_notice_shown');
            if (!hasSeenNotice) {
                sessionStorage.setItem('aura_backend_notice_shown', 'true');
                const isDark = colorScheme === 'dark';
                Swal.fire({
                    icon: 'info',
                    title: 'Aviso sobre el servicio',
                    text: 'El backend esta alojado en un servicio gratuito de Render que suspende el servidor por inactividad. Si es la primera solicitud, puede tardar entre 1 y 2 minutos en arrancar. Si notas alguna carga lenta o fallo temporal al inicio, espera unos instantes; la web funciona correctamente.',
                    confirmButtonText: 'Entendido',
                    confirmButtonColor: '#0d6efd',
                    background: isDark ? '#1a1a24' : '#ffffff',
                    color: isDark ? '#f8fafc' : '#0f172a',
                    showClass: {
                        backdrop: 'swal2-noanimation'
                    },
                    hideClass: {
                        backdrop: 'swal2-noanimation'
                    }
                });
            }
        }
    }, []);

    useEffect(() => {
        if (cookies.token) {
            // Verificamos en el verify user del backend la base de datos con el access token
            getAllLoggedUserData();
            serverAPI.get('/bookingsByUser', { headers: { 'Authorization': cookies.token } }).then(res => {
                setUserHasBookings(res.data.data.length > 0);
            }).catch(err => console.log(err));
        }
    }, [cookies]);

    // Book modal
    const [bookingInitialPromoCode, setBookingInitialPromoCode] = useState<string | null>(null);

    const openBookingModal = (promoCode?: string) => {
        if (typeof promoCode === 'string' && promoCode.trim()) {
            setBookingInitialPromoCode(promoCode.trim());
        } else {
            setBookingInitialPromoCode(null);
        }
        setIsBookingModalOpen(true);
    };

    const closeBookingModal = () => {
        setIsBookingModalOpen(false);
        setBookingInitialPromoCode(null);
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
            removeCookie('token', { path: '/' });
            removeCookie('refreshToken', { path: '/' });
        });
        if (loggedUserID) {
            const getLoggedUserData = await serverAPI.get('/loggedUser/' + loggedUserID.data.userID, { headers: { 'Authorization': cookies.token } }).catch(err => {
                removeCookie('token', { path: '/' });
                removeCookie('refreshToken', { path: '/' });
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

                    <ScrollToTop colorScheme={colorScheme} />
                    <Header colorScheme={colorScheme} onToggleTheme={toggleColorScheme} onOpenBookingModal={openBookingModal} onOpenUserModal={openUserModal} currentUserRole={currentUserRole} userHasBookings={userHasBookings} />
                    <main id='main' className='main'>
                        <Routes>
                            <Route path="/" element={<Home colorScheme={colorScheme} />} />
                            <Route path="/services" element={<Services colorScheme={colorScheme} openImagePreviewModal={openImagePreviewModal} onOpenBookingModal={openBookingModal} />} />
                            <Route path="/cupones" element={<Coupons colorScheme={colorScheme} onOpenBookingModal={openBookingModal} />} />
                            <Route path="/contact" element={<Contact colorScheme={colorScheme} />} />
                            <Route path="/userVerification/:token" element={<UserVerify colorScheme={colorScheme} />} />
                            <Route path="/user-bookings" element={<UserBookings colorScheme={colorScheme} userHasBookings={userHasBookings} openDuplicateBookingModal={openDuplicateBookingModal} onOpenBookingModal={openBookingModal} onOpenUserModal={openUserModal} />} />
                            <Route path="/admin" element={<Admin colorScheme={colorScheme} />} />
                            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                            <Route path="/legal-notice" element={<LegalNotice />} />
                            <Route path="/cookies-policy" element={<CookiePolicy />} />
                            <Route path="/terms-of-use" element={<TermsOfUse />} />
                            <Route path="*" element={<NotFound />} />
                        </Routes>

                        {isBookingModalOpen && (
                            <Suspense fallback={null}>
                                <BookingModal show={isBookingModalOpen} onClose={closeBookingModal} colorScheme={colorScheme} initialPromoCode={bookingInitialPromoCode} />
                            </Suspense>
                        )}
                        {isUserModalOpen && (
                            <Suspense fallback={null}>
                                <UserModal show={isUserModalOpen} onClose={closeUserModal} colorScheme={colorScheme} />
                            </Suspense>
                        )}
                        {isImageViewModalOpen && (
                            <Suspense fallback={null}>
                                <ViewImageModal show={isImageViewModalOpen} onClose={closeImageViewModal} colorScheme={colorScheme} imagePreviewData={imagePreviewData} />
                            </Suspense>
                        )}
                        {isDuplicateBookingModalOpen && (
                            <Suspense fallback={null}>
                                <DuplicateBookingModal show={isDuplicateBookingModalOpen} onClose={closeDuplicateBookingModal} colorScheme={colorScheme} bookingData={duplicateBookingData} />
                            </Suspense>
                        )}

                        <CustomCookieConsent colorScheme={colorScheme} />
                        <AmbientAudioPlayer colorScheme={colorScheme} audioSrc={summerParty} />

                        {isTechModalOpen && (
                            <Suspense fallback={null}>
                                <TechStackModal show={isTechModalOpen} onClose={() => setIsTechModalOpen(false)} colorScheme={colorScheme} />
                            </Suspense>
                        )}
                    </main>
                    <Footer colorScheme={colorScheme} onOpenTechModal={() => setIsTechModalOpen(true)} />
                </div>
            </Router>
        </Suspense>
    )
}

export default App
