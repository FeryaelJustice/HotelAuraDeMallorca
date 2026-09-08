import { useState, useEffect } from 'react';
import weatherAPI from '../../services/weatherAPI';
import './WeatherBadge.css';

interface WeatherBadgeProps {
    colorScheme: string;
}

/**
 * Componente: WeatherBadge (Insignia Meteorologica)
 * Que hace: Muestra en la cabecera la temperatura y condicion atmosferica en tiempo real de Mallorca.
 * Por que: Provee contexto climatico dinamico a los visitantes para incentivar su decision de reserva.
 */
export const WeatherBadge = ({ colorScheme }: WeatherBadgeProps) => {
    const [temperature, setTemperature] = useState<number | null>(24);
    const [condition, setCondition] = useState<string>('Soleado');
    const [iconType, setIconType] = useState<'sun' | 'cloud' | 'rain'>('sun');

    useEffect(() => {
        let isMounted = true;
        const params = {
            lat: 39.58130105,
            lon: 2.709183392285786,
        };

        weatherAPI.getFiveDayForecast(params).then((res: any) => {
            if (!isMounted) return;
            if (res && res.data && res.data.list && res.data.list.length > 0) {
                const firstDay = res.data.list[0];
                const weatherObj = firstDay.weather?.[0];
                const main = weatherObj?.main?.toLowerCase() || '';

                if (main.includes('rain') || main.includes('storm')) {
                    setCondition('Lluvia');
                    setIconType('rain');
                } else if (main.includes('cloud')) {
                    setCondition('Nublado');
                    setIconType('cloud');
                } else {
                    setCondition('Despejado');
                    setIconType('sun');
                }

                if (firstDay.raw?.Temperature?.Maximum?.Value) {
                    setTemperature(Math.round(firstDay.raw.Temperature.Maximum.Value));
                } else if (firstDay.raw?.main?.temp) {
                    // OpenWeatherMap is Kelvin unless metric
                    const temp = firstDay.raw.main.temp;
                    setTemperature(Math.round(temp > 100 ? temp - 273.15 : temp));
                }
            }
        }).catch((err: any) => {
            // Graceful fallback to typical Mallorca sunny weather
            console.log('[WeatherBadge] Notice: using default Mallorca climate:', err?.message || err);
        });

        return () => {
            isMounted = false;
        };
    }, []);

    const renderIcon = () => {
        const isDark = colorScheme === 'dark';
        switch (iconType) {
            case 'rain':
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#38bdf8' : '#0284c7'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="16" y1="13" x2="16" y2="21" />
                        <line x1="8" y1="13" x2="8" y2="21" />
                        <line x1="12" y1="15" x2="12" y2="23" />
                        <path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25" />
                    </svg>
                );
            case 'cloud':
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#cbd5e1' : '#475569'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z" />
                    </svg>
                );
            default:
                return (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#fbbf24' : '#d97706'} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="5" fill={isDark ? '#fbbf24' : '#f59e0b'} />
                        <line x1="12" y1="1" x2="12" y2="3" />
                        <line x1="12" y1="21" x2="12" y2="23" />
                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                        <line x1="1" y1="12" x2="3" y2="12" />
                        <line x1="21" y1="12" x2="23" y2="12" />
                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                    </svg>
                );
        }
    };

    return (
        <div
            className={`weather-badge ${colorScheme === 'dark' ? 'weather-badge-dark' : 'weather-badge-light'}`}
            title={`Palma de Mallorca: ${temperature}°C, ${condition}`}
            aria-label={`Tiempo en Palma de Mallorca: ${temperature} grados centigrados, ${condition}`}
        >
            <span className="weather-badge-icon">{renderIcon()}</span>
            <span className="weather-badge-temp">{temperature}°C</span>
            <span className="weather-badge-city">Palma</span>
        </div>
    );
};

export default WeatherBadge;
