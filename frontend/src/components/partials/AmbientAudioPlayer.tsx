import { useState, useRef, useEffect } from 'react';
import './AmbientAudioPlayer.css';

interface AmbientAudioPlayerProps {
    colorScheme: string;
    audioSrc: string;
}

/**
 * Componente: AmbientAudioPlayer (Reproductor de Audio Ambiental)
 * Que hace: Reproduce una pista musical relajante con control de volumen, muteo y barra de progreso.
 * Por que: Enriquece la atmosfera inmersiva mediterranea del sitio web respetando el consentimiento del usuario.
 */
export const AmbientAudioPlayer = ({ colorScheme, audioSrc }: AmbientAudioPlayerProps) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.3);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.loop = true;
            audioRef.current.volume = volume;
        }
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        };
    }, []);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.volume = isMuted ? 0 : volume;
            audioRef.current.play().then(() => {
                setIsPlaying(true);
            }).catch((err) => {
                console.warn('Audio play was prevented or failed:', err);
            });
        }
    };

    const handleRestart = () => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = 0;
        setCurrentTime(0);
        if (!isPlaying) {
            audioRef.current.volume = isMuted ? 0 : volume;
            audioRef.current.play().then(() => {
                setIsPlaying(true);
            }).catch((err) => {
                console.warn('Audio play was prevented or failed on restart:', err);
            });
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration || 0);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const targetTime = parseFloat(e.target.value);
        setCurrentTime(targetTime);
        if (audioRef.current) {
            audioRef.current.currentTime = targetTime;
        }
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (audioRef.current) {
            audioRef.current.volume = newVolume;
            if (newVolume > 0 && isMuted) {
                setIsMuted(false);
            }
        }
    };

    const formatTime = (timeInSeconds: number): string => {
        if (isNaN(timeInSeconds) || timeInSeconds < 0) return '00:00';
        const minutes = Math.floor(timeInSeconds / 60);
        const seconds = Math.floor(timeInSeconds % 60);
        const padM = minutes < 10 ? `0${minutes}` : `${minutes}`;
        const padS = seconds < 10 ? `0${seconds}` : `${seconds}`;
        return `${padM}:${padS}`;
    };

    return (
        <aside
            className={`ambient-audio-container ${colorScheme === 'dark' ? 'ambient-audio-dark' : 'ambient-audio-light'}`}
            aria-label="Reproductor de sonido ambiente"
        >
            <audio
                ref={audioRef}
                src={audioSrc}
                preload="metadata"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
            />

            <button
                type="button"
                className="ambient-audio-toggle-btn"
                onClick={togglePlay}
                aria-label={isPlaying ? "Pausar música ambiente" : "Reproducir música ambiente"}
                title={isPlaying ? "Pausar Aura Soundscape" : "Reproducir Aura Soundscape"}
            >
                {isPlaying ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="6" y="4" width="4" height="16" rx="1" />
                        <rect x="14" y="4" width="4" height="16" rx="1" />
                    </svg>
                ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                    </svg>
                )}
            </button>

            <button
                type="button"
                className="ambient-audio-btn-secondary"
                onClick={handleRestart}
                aria-label="Reiniciar pista de audio"
                title="Reiniciar canción desde el inicio"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10"></polyline>
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
            </button>

            <div className={`ambient-equalizer ${isPlaying ? 'is-playing' : ''}`} aria-hidden="true">
                <span className="ambient-bar" />
                <span className="ambient-bar" />
                <span className="ambient-bar" />
                <span className="ambient-bar" />
            </div>

            <div className="ambient-audio-label">
                <span>Aura Sound</span>
                <span className="ambient-audio-sub">{isPlaying ? 'Mallorca Vibes' : 'En pausa'}</span>
            </div>

            {/* Time progress slider and counter */}
            <div className="ambient-progress-control" title="Progreso de reproducción">
                <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.5"
                    value={currentTime}
                    onChange={handleSeek}
                    className="ambient-time-slider"
                    aria-label="Posición de tiempo de reproducción"
                />
                <div className="ambient-time-display">
                    <span>{formatTime(currentTime)}</span>
                    <span className="ambient-time-divider">/</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            <div className="ambient-volume-control" title="Volumen">
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="ambient-volume-slider"
                    aria-label="Control de volumen de música ambiental"
                />
            </div>
        </aside>
    );
};

export default AmbientAudioPlayer;
