import React, { useEffect, useRef } from 'react'
import gsap from 'gsap'
import './Footer.css'

const LINKS = [
  { label: 'github',   url: 'https://github.com/Brutalino',           display: 'github.com/Brutalino' },
  { label: 'linkedin', url: 'https://linkedin.com/in/fabio-marconi',  display: 'linkedin.com/in/fabio-marconi' },
]

const maxLabel = Math.max(...LINKS.map(l => l.label.length))

export default function Footer() {
  const footerRef = useRef(null)

  useEffect(() => {
    const el = footerRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          gsap.to(el, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' })
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <footer className="footer-section" ref={footerRef}>
      <div className="footer-content">
        <div className="footer-links">
          {LINKS.map((link) => (
            <div key={link.label} className="neofetch-line">
              <span className="neofetch-label">{link.label.padEnd(maxLabel)}</span>
              <span className="neofetch-arrow"> → </span>
              <span className="neofetch-value">
                <a href={link.url} target="_blank" rel="noopener noreferrer">
                  {link.display}
                </a>
              </span>
            </div>
          ))}
        </div>
        <div className="footer-copy">
          © 2026 — built with React + Three.js
        </div>
      </div>
    </footer>
  )
}
