import { useState, useRef, useEffect } from 'react';
import './AmbientAudioPlayer.css';

interface AmbientAudioPlayerProps {
    colorScheme: string;
    audioSrc: string;
}

export const AmbientAudioPlayer = ({ colorScheme, audioSrc }: AmbientAudioPlayerProps) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.3);
    const [isMuted, setIsMuted] = useState(false);

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

    return (
        <aside
            className={`ambient-audio-container ${colorScheme === 'dark' ? 'ambient-audio-dark' : 'ambient-audio-light'}`}
            aria-label="Reproductor de sonido ambiente"
        >
            <audio ref={audioRef} src={audioSrc} preload="metadata" />

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
