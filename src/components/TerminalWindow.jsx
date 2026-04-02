import React, { useRef, useEffect } from 'react'
import gsap from 'gsap'
import './TerminalWindow.css'

// skipAnimation: usato dalle project card dove l'animazione è gestita dal parent (GSAP sulla slot)
export default function TerminalWindow({ children, active, title = '~/.portfolio', skipAnimation = false }) {
  const terminalRef = useRef(null)
  const borderRef   = useRef(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    if (skipAnimation) return
    if (window.innerWidth <= 768) return  // su mobile niente scaleY:0 — crea compositing layer che blocca scroll iOS
    const el = terminalRef.current
    if (!el) return
    gsap.set(el, { scaleY: 0, opacity: 1, transformOrigin: 'top' })
  }, [skipAnimation])

  useEffect(() => {
    if (skipAnimation) return
    if (window.innerWidth <= 768) return  // su mobile il terminale è già visibile
    if (active && !hasAnimated.current) {
      hasAnimated.current = true
      const el     = terminalRef.current
      const border = borderRef.current
      if (!el || !border) return

      gsap.to(el, {
        scaleY: 1,
        duration: 0.4,
        ease: 'power3.out',
        onComplete: () => {
          gsap.fromTo(border,
            { scaleY: 1.07, transformOrigin: 'top' },
            { scaleY: 1, duration: 0.55, ease: 'elastic.out(1, 0.35)' }
          )
        },
      })
    }
  }, [active, skipAnimation])

  return (
    <div ref={terminalRef} className="terminal-window">
      {!skipAnimation && <div ref={borderRef} className="terminal-window-border-bounce" />}
      <div className="terminal-header">
        <span className="terminal-title">{title}</span>
      </div>
      <div className="terminal-body">
        {children}
      </div>
    </div>
  )
}
