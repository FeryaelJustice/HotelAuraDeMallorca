import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import { useState, useEffect, useRef, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import { Header, Footer } from './components/partials';
import { Home, Services, Contact, UserVerify, NotFound, Admin, PrivacyPolicy, LegalNotice, CookiePolicy } from './pages';
import ScrollToTop from './ScrollToTop';
import BookingModal from './components/modals/BookingModal';
import UserModal from './components/modals/UserModal';
import Button from 'react-bootstrap/Button';
import { useTranslation } from "react-i18next";
import CookieConsent from "react-cookie-consent";
import { useCookies } from 'react-cookie';
import serverAPI from './services/serverAPI';
import { UserRoles } from "./constants";
import { Role } from './models/index';

import summerParty from './assets/music/summer-party.mp3'

function App() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [colorScheme, setColorScheme] = useState(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const { t } = useTranslation();

  const [cookies, _, removeCookie] = useCookies(['token']);
  const [currentUserRole, setCurrentUserRole] = useState<Role>({ id: null, name: UserRoles.CLIENT })

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
    document.getElementsByTagName('html')[0].setAttribute('data-bs-theme', colorScheme)

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
      getAllLoggedUserData()
    }
  }, [cookies])

  // Color theme listener
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    const newColorScheme = event.matches ? "dark" : "light";
    document.getElementsByTagName('html')[0].setAttribute('data-bs-theme', newColorScheme)
    setColorScheme(newColorScheme);
  });

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

  return (
    <Suspense fallback="loading">
      <Router>
        <div className='app'>

          <ScrollToTop />
          <Header colorScheme={colorScheme} onOpenBookingModal={openBookingModal} onOpenUserModal={openUserModal} currentUserRole={currentUserRole} />
          <main id='main' className='main'>
            <Routes>
              <Route path="/" element={<Home colorScheme={colorScheme} />} />
              <Route path="/services" element={<Services colorScheme={colorScheme} />} />
              <Route path="/contact" element={<Contact colorScheme={colorScheme} />} />
              <Route path="/userVerification/:token" element={<UserVerify colorScheme={colorScheme} />} />
              <Route path="/admin" element={<Admin colorScheme={colorScheme} />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/legal-notice" element={<LegalNotice />} />
              <Route path="/cookies-policy" element={<CookiePolicy />} />
              <Route path="*" element={<NotFound />} />
            </Routes>

            <Button variant="primary" id="bookBtnNoInHeader" onClick={openBookingModal}>{t("book")}</Button>
            <BookingModal show={isBookingModalOpen} onClose={closeBookingModal} colorScheme={colorScheme} />
            <UserModal show={isUserModalOpen} onClose={closeUserModal} colorScheme={colorScheme} />

            <CookieConsent>This website uses cookies to enhance the user experience.</CookieConsent>
            <div>
              <button onClick={toggleAudio}>{isPlaying ? 'Pause Audio' : 'Play Audio'}</button>
              <audio ref={audioRef} src={summerParty} />
            </div>
          </main>
          <Footer />
        </div>
      </Router>
    </Suspense>
  )

  // Get JWT user data
  async function getAllLoggedUserData(): Promise<any> {
    const loggedUserID = await serverAPI.post('/getLoggedUserID', { token: cookies.token });
    if (loggedUserID) {
      const getLoggedUserData = await serverAPI.get('/loggedUser/' + loggedUserID.data.userID).catch(err => {
        removeCookie('token')
        console.error(err)
      });
      if (getLoggedUserData) {
        const userRole = await serverAPI.get('/getUserRole/' + loggedUserID.data.userID)
        setCurrentUserRole(new Role({ id: userRole.data.data.id, name: userRole.data.data.name }))
        return getLoggedUserData.data;
      } else {
        removeCookie('token');
      }
    }
  }
}

export default App
