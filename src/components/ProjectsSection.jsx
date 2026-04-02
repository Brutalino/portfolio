import React, { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import TerminalWindow from './TerminalWindow'
import './ProjectsSection.css'

gsap.registerPlugin(ScrollTrigger)

// ─── AGGIUNGI PROGETTI QUI ───────────────────────────────────────────────────
// I primi 3 vanno nel tiling animato. Dal 4° in poi → griglia sotto.
const PROJECTS = [
  {
    name: 'f1-cli',
    description:
      'A terminal-based F1 live timing viewer that taps directly into the official F1 SignalR stream — the same feed that powers the F1 app. Displays driver positions, gaps, intervals, sector times, tire compounds and pit stop data in a fully responsive terminal UI. Supports F1TV authentication (Access, Pro, Premium) with token persistence, interactive keybindings to toggle views, and a demo mode for testing without a subscription.',
    tech: 'Python, FastF1, Rich, SignalR, F1TV API',
    link: 'github.com/Brutalino/f1-cli',
  },
  {
    name: 'gsf-lsta-tad',
    description:
      'Bachelor thesis — end-to-end Temporal Action Detection on EPIC-Kitchens-100. A frozen GSF backbone (InceptionV3 + Gate-Shift-Fuse) extracts spatio-temporal features at stride σ=4, fed into a trainable Convolutional LSTA cell. Five parallel heads predict actionness, start/end boundaries and 97 verb + 300 noun classes via multi-task loss. Inference uses a 9-step post-processing pipeline: sliding-window averaging, boundary detection, greedy matching, class-wise temporal NMS and duration filtering.',
    tech: 'Python, PyTorch, CUDA, GSF, LSTA, EPIC-Kitchens-100',
    link: 'github.com/Brutalino',
  },
  {
    name: 'kitchen-buddy',
    description:
      'A cross-platform mobile app to manage pantry and fridge inventory and cut food waste. Scan any product barcode to auto-fill entries via the OpenFoodFacts API. Tracks expiration dates with tiered alerts (3 / 7 / 30 days), marks items as open or frozen to adjust shelf life automatically, monitors ripeness for fresh produce and offers advanced filtering by storage location, category, recently added and more. Full CRUD with on-device persistence via AsyncStorage.',
    tech: 'React Native, Expo, TypeScript, Context API, AsyncStorage, OpenFoodFacts API',
    link: 'github.com/Brutalino/Kitchen-Buddy',
  },
  // Dal 4° in poi appaiono nella griglia sotto — aggiungi qui:
]
// ─────────────────────────────────────────────────────────────────────────────

const FEATURED = PROJECTS.slice(0, 3)
const MORE     = PROJECTS.slice(3)

const LAYOUTS = {
  1: [{ left: '25%', width: '50%' }],
  2: [{ left: '5%',  width: '44%' }, { left: '51%', width: '44%' }],
  3: [{ left: '4%',  width: '29%' }, { left: '35%', width: '29%' }, { left: '66%', width: '30%' }],
}

const CARD_DELAYS = [400, 1600, 2800]

// ─── Card animata (tiling) ───────────────────────────────────────────────────
function ProjectCard({ project, cardRef, active }) {
  const [typedCommand, setTypedCommand] = useState('')
  const [showOutput, setShowOutput]     = useState(false)
  const [cursorVisible, setCursorVisible] = useState(true)

  useEffect(() => {
    const iv = setInterval(() => setCursorVisible(v => !v), 530)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => {
    if (!active) return
    const timer = setTimeout(() => {
      const command = `cat ${project.name}.md`
      let i = 0
      const iv = setInterval(() => {
        i++
        setTypedCommand(command.slice(0, i))
        if (i >= command.length) {
          clearIv()
          setTimeout(() => setShowOutput(true), 700)
        }
      }, 100)
      function clearIv() { clearInterval(iv) }
    }, 350)
    return () => clearTimeout(timer)
  }, [active])

  return (
    <div ref={cardRef} className="project-slot">
      <TerminalWindow skipAnimation title={`~/.projects/${project.name}`}>
        <div className="neofetch">
          <div className="neofetch-prompt">
            <span className="prompt-symbol">❯ </span>
            <span>{typedCommand}</span>
            <span className="cursor" style={{ opacity: cursorVisible ? 1 : 0 }}>▋</span>
          </div>
          {showOutput && <ProjectBody project={project} />}
        </div>
      </TerminalWindow>
    </div>
  )
}

// ─── Card compatta con hover expand ─────────────────────────────────────────
function MoreProjectCard({ project, index }) {
  const wrapRef    = useRef(null)
  const contentRef = useRef(null)
  const borderRef  = useRef(null)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          gsap.to(el, {
            opacity: 1, y: 0, scale: 1, duration: 0.7,
            delay: (index % 4) * 0.08,
            ease: 'back.out(2.8)',
          })
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const content = contentRef.current
    const border  = borderRef.current
    if (!content || !border) return

    gsap.killTweensOf([content, border])

    if (hovered) {
      gsap.to(content, { maxHeight: content.scrollHeight, duration: 0.35, ease: 'power3.out' })
      gsap.fromTo(border,
        { scaleY: 1.07, transformOrigin: 'top' },
        { scaleY: 1, duration: 0.55, ease: 'elastic.out(1, 0.35)', delay: 0.22 }
      )
    } else {
      gsap.fromTo(border,
        { scaleY: 0.95, transformOrigin: 'top' },
        { scaleY: 1, duration: 0.45, ease: 'elastic.out(1, 0.4)' }
      )
      gsap.to(content, { maxHeight: 0, duration: 0.28, ease: 'power3.in', delay: 0.06 })
    }
  }, [hovered])

  return (
    <div
      ref={wrapRef}
      className={`more-project-card ${hovered ? 'expanded' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Bordo separato dal flusso — scala senza spostare il layout */}
      <div ref={borderRef} className="more-project-border" />
      <TerminalWindow skipAnimation title={`~/.projects/${project.name}`}>
        <div className="neofetch">
          <div className="neofetch-prompt">
            <span className="prompt-symbol">❯ </span>
            <span>{`cat ${project.name}.md`}</span>
          </div>
          <div ref={contentRef} className="more-project-expand">
            <ProjectBody project={project} />
          </div>
        </div>
      </TerminalWindow>
    </div>
  )
}

// ─── Contenuto condiviso tra card animata e statica ──────────────────────────
function ProjectBody({ project }) {
  return (
    <div className="project-output">
      <div className="project-name">{project.name}</div>
      <div className="neofetch-separator-line">────────────────────</div>
      <p className="project-description">{project.description}</p>
      <div className="neofetch-line">
        <span className="neofetch-label">tech</span>
        <span className="neofetch-arrow"> → </span>
        <span className="neofetch-value">{project.tech}</span>
      </div>
      <div className="neofetch-line">
        <span className="neofetch-label">link</span>
        <span className="neofetch-arrow"> → </span>
        <span className="neofetch-value">
          <a href={`https://${project.link}`} target="_blank" rel="noopener noreferrer">
            {project.link}
          </a>
        </span>
      </div>
    </div>
  )
}

// ─── Sezione principale ──────────────────────────────────────────────────────
export default function ProjectsSection() {
  const [activeCards, setActiveCards] = useState([false, false, false])
  const zoneRef   = useRef(null)
  const cardRefs  = useRef([React.createRef(), React.createRef(), React.createRef()])
  const hasStarted = useRef(false)


  const startSequence = () => {
    if (hasStarted.current) return
    hasStarted.current = true

    // Mobile: skip GSAP positioning — CSS handles layout, just activate typing effects
    if (window.innerWidth <= 768) {
      FEATURED.forEach((_, i) => {
        setTimeout(() => {
          setActiveCards(prev => { const next = [...prev]; next[i] = true; return next })
        }, CARD_DELAYS[i])
      })
      return
    }

    FEATURED.forEach((_, i) => {
      setTimeout(() => {
        const el = cardRefs.current[i].current
        if (!el) return

        const newCount = i + 1
        const layout   = LAYOUTS[newCount]

        for (let j = 0; j < i; j++) {
          const prev = cardRefs.current[j].current
          if (prev && layout[j]) {
            gsap.to(prev, { left: layout[j].left, width: layout[j].width, duration: 0.65, ease: 'back.out(1.8)' })
          }
        }

        gsap.set(el, { left: layout[i].left, width: layout[i].width })
        gsap.to(el, { opacity: 1, scale: 1, y: 0, duration: 0.55, ease: 'back.out(2.5)' })

        setActiveCards(prev => { const next = [...prev]; next[i] = true; return next })
      }, CARD_DELAYS[i])
    })
  }

  useEffect(() => {
    const zone = zoneRef.current
    if (!zone) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          startSequence()
          observer.disconnect()
        }
      },
      { threshold: 0.1 }
    )
    observer.observe(zone)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      {/* Tiling animato — primi 3 */}
      <div className="projects-scroll-zone" ref={zoneRef}>
        <div className="projects-sticky">
          {FEATURED.map((project, i) => (
            <ProjectCard
              key={project.name}
              project={project}
              cardRef={cardRefs.current[i]}
              active={activeCards[i]}
            />
          ))}
        </div>
      </div>

      {/* Griglia extra — dal 4° progetto in poi */}
      {MORE.length > 0 && (
        <div className="more-projects-section">
          <h3 className="more-projects-title">more projects</h3>
        <div className="more-projects-grid">
            {MORE.map((project, i) => (
              <MoreProjectCard key={project.name} project={project} index={i} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}
