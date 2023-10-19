import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import { Header, Footer } from './components/partials';
import { Home, Services, Contact, UserVerify, NotFound } from './pages';
import ScrollToTop from './ScrollToTop';
import BookingModal from './components/modals/BookingModal';
import UserModal from './components/modals/UserModal';
import Button from 'react-bootstrap/Button';

function App() {
  // const url = process.env.REACT_APP_API_URL;

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [colorScheme, setColorScheme] = useState(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  useEffect(() => {
    document.getElementsByTagName('html')[0].setAttribute('data-bs-theme', colorScheme)
  }, [])

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
    <Router>
      <div className='app'>

        <ScrollToTop />
        <Header colorScheme={colorScheme} onOpenBookingModal={openBookingModal} onOpenUserModal={openUserModal} />
        <main id='main' className='main'>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/userVerification/:token" element={<UserVerify />} />
            <Route path="*" element={<NotFound />} />
          </Routes>


          <Button variant="primary" id="bookBtnNoInHeader" onClick={openBookingModal}>Book</Button>
          <BookingModal show={isBookingModalOpen} onClose={closeBookingModal} />
          <UserModal show={isUserModalOpen} onClose={closeUserModal} />

        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
