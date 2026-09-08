import { useState, useEffect } from 'react';
import './index.css';

interface ScrollToTopProps {
    colorScheme?: string;
}

export const ScrollToTop = ({ colorScheme }: ScrollToTopProps) => {
    const [showTopBtn, setShowTopBtn] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 180) {
                setShowTopBtn(true);
            } else {
                setShowTopBtn(false);
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const goToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    const isDark = colorScheme === 'dark';

    return (
        <button
            type="button"
            className={`scroll-to-top-btn ${isDark ? 'scroll-to-top-dark' : 'scroll-to-top-light'} ${showTopBtn ? 'is-visible' : 'is-hidden'}`}
            onClick={goToTop}
            aria-label="Volver arriba"
            title="Volver arriba"
        >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="18 15 12 9 6 15" />
            </svg>
        </button>
    );
};

export default ScrollToTop;