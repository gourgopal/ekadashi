'use client'

import { useEffect, useState, useRef } from 'react'

interface KirtanPlayerProps {
  nowPlayingLabel: string
  playLabel: string
  pauseLabel: string
  volumeLabel: string
}

export default function KirtanPlayer({
  nowPlayingLabel,
  playLabel,
  pauseLabel,
  volumeLabel,
}: KirtanPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(0.4)
  const [showVolume, setShowVolume] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    audio.loop = true
    setLoaded(true)
    return () => { audio.pause() }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().catch(() => {
        // Autoplay blocked — that's fine
      })
      setIsPlaying(true)
    }
  }

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value)
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
  }

  return (
    <div className="audio-player" id="kirtan-player">
      {/* Hidden audio element — replace /audio/kirtan.mp3 with your file */}
      <audio ref={audioRef} preload="none">
        <source src="/audio/kirtan.mp3" type="audio/mpeg" />
        Your browser does not support audio.
      </audio>

      <div className="max-w-7xl mx-auto flex items-center gap-4">
        {/* Om icon */}
        <span
          className={`text-xl select-none ${isPlaying ? 'animate-pulse-slow' : ''}`}
          style={{ color: '#F4C430' }}
          aria-hidden="true"
        >
          ॐ
        </span>

        {/* Play / Pause button */}
        <button
          id="kirtan-play-pause"
          onClick={togglePlay}
          className="flex items-center justify-center w-9 h-9 rounded-full transition-all"
          style={{
            background: isPlaying
              ? 'rgba(244,196,48,0.2)'
              : 'linear-gradient(135deg,#F4C430,#e8a820)',
            border: isPlaying ? '1px solid rgba(244,196,48,0.5)' : 'none',
            boxShadow: isPlaying ? 'none' : '0 4px 16px rgba(244,196,48,0.4)',
          }}
          aria-label={isPlaying ? pauseLabel : playLabel}
        >
          {isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"
              style={{ color: '#F4C430' }}>
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"
              style={{ color: '#1a0a00' }}>
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Track info */}
        <div className="flex flex-col min-w-0">
          <span
            className="text-xs font-medium truncate"
            style={{ color: '#F4C430' }}
          >
            {nowPlayingLabel}
          </span>
          <span
            className="text-xs truncate hidden sm:block"
            style={{ color: 'rgba(210,180,140,0.5)' }}
          >
            Hare Krishna Bhajan
          </span>
        </div>

        {/* Visualizer bars (CSS animation when playing) */}
        <div className="hidden sm:flex items-end gap-0.5 h-5 ml-2">
          {[3, 5, 7, 4, 6, 3, 5].map((h, i) => (
            <div
              key={i}
              className="w-0.5 rounded-sm"
              style={{
                height: isPlaying ? `${h * 3}px` : '4px',
                background: '#F4C430',
                opacity: isPlaying ? 0.8 : 0.3,
                transition: 'height 0.3s ease',
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Volume */}
        <div className="relative flex items-center gap-2">
          <button
            id="kirtan-volume-btn"
            onClick={() => setShowVolume(!showVolume)}
            className="text-sm transition-colors"
            style={{ color: 'rgba(210,180,140,0.6)', background: 'none', border: 'none', cursor: 'pointer' }}
            aria-label={volumeLabel}
          >
            {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
          </button>

          {showVolume && (
            <input
              id="kirtan-volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={handleVolume}
              className="w-20 accent-yellow-400"
              aria-label={volumeLabel}
            />
          )}
        </div>
      </div>
    </div>
  )
}
