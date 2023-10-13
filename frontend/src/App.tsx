import './App.css'
import 'bootstrap/dist/css/bootstrap.min.css';
import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import { Header, Footer } from './components/partials';
import { Home, Services, Contact, NotFound } from './pages';
import ScrollToTop from './ScrollToTop';
import BookingModal from './components/modals/BookingModal';
import Button from 'react-bootstrap/Button';

function App() {
  // const url = process.env.REACT_APP_API_URL;

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [colorScheme, setColorScheme] = useState(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

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

  return (
    <Router>
      <div className='app'>

        <ScrollToTop />
        <Header colorScheme={colorScheme} onOpenBookingModal={openBookingModal} />
        <main id='main' className='main'>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>


          <Button variant="primary" id="bookBtnNoInHeader" onClick={openBookingModal}>Book</Button>
          <BookingModal show={isBookingModalOpen} onClose={closeBookingModal} />

        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
