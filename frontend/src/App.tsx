import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import { useState, useEffect, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import { Header, Footer } from './components/partials';
import { Home, Services, Contact, UserVerify, NotFound, Admin } from './pages';
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

  useEffect(() => {
    document.getElementsByTagName('html')[0].setAttribute('data-bs-theme', colorScheme)

    // background music
    const audio = new Audio(summerParty)
    audio.loop = true;
    audio.play();

    // user
    if (cookies.token) {
      getAllLoggedUserData()
    }

    return () => {
      audio.pause();
      audio.currentTime = 0;
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
              <Route path="/" element={<Home />} />
              <Route path="/services" element={<Services />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/userVerification/:token" element={<UserVerify />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>


            <Button variant="primary" id="bookBtnNoInHeader" onClick={openBookingModal}>{t("book")}</Button>
            <BookingModal show={isBookingModalOpen} onClose={closeBookingModal} />
            <UserModal show={isUserModalOpen} onClose={closeUserModal} />

            <CookieConsent>This website uses cookies to enhance the user experience.</CookieConsent>
          </main>
          <Footer />
        </div>
      </Router>
    </Suspense>
  )

  // Get JWT user data
  async function getAllLoggedUserData(): Promise<any> {
    const currentUser = await serverAPI.post('/api/currentUser', cookies);
    if (currentUser) {
      const getLoggedUserData = await serverAPI.get('/api/loggedUser/' + currentUser.data.userID).catch(err => {
        removeCookie('token')
        console.error(err)
      });
      if (getLoggedUserData) {
        const userRole = await serverAPI.get('/api/getUserRole/' + currentUser.data.userID)
        setCurrentUserRole(new Role({ id: userRole.data.data.id, name: userRole.data.data.name }))
        return getLoggedUserData.data;
      } else {
        removeCookie('token');
      }
    }
  }
}

export default App
