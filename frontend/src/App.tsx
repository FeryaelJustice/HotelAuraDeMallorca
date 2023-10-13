// import { useState } from 'react'
import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import { Header, Footer } from './components/partials';
import { Home, Services, Contact, NotFound } from './pages';
import ScrollToTop from './ScrollToTop';

function App() {
  // const url = process.env.REACT_APP_API_URL;
  return (
    <Router>
      <div className='app'>

        <ScrollToTop />
        <Header />
        <main id='main' className='main'>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App
