import React, { useRef, useEffect, useState, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { AsciiRenderer, OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { themes } from './themes'
import TerminalWindow from './components/TerminalWindow'
import Neofetch from './components/Neofetch'
import ProjectsSection from './components/ProjectsSection'
import TechStackSection from './components/TechStackSection'
import Footer from './components/Footer'

gsap.registerPlugin(ScrollTrigger)

// Disabilita il ripristino automatico della posizione di scroll del browser
if (typeof window !== 'undefined') {
  history.scrollRestoration = 'manual'
}

// Ref globale per comunicare lo scroll progress a Three.js
const scrollState = { progress: 0, scale: 1 }

function AsciiFace() {
  const ref = useRef()
  const { scene } = useGLTF('/head_planes_-_reference.glb')
  const [modelPos, setModelPos] = useState([0, 1, 0])

  useEffect(() => {
    // Calcola il centro del bounding box del modello e corregge l'offset orizzontale.
    // Il risultato viene salvato in stato così R3F usa il valore corretto ad ogni re-render
    // (se usassimo scene.position direttamente, verrebbe sovrascritto dal prop position ad ogni render)
    const box = new THREE.Box3().setFromObject(scene)
    const center = new THREE.Vector3()
    box.getCenter(center)
    setModelPos([-center.x - 0.2, 1, 0])

    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: 'white',
          roughness: 0.5,
          metalness: 0.2
        })
      }
    })
  }, [scene])

  useFrame(() => {
    if (ref.current) {
      // Rotazione: 360° giro completo + 45° verso destra (guida lo sguardo)
      ref.current.rotation.y = scrollState.progress * Math.PI * 2 + scrollState.progress * (Math.PI / 4)
      // Scala: il modello 3D si rimpicciolisce (non il container CSS)
      const s = 2.2 * scrollState.scale
      ref.current.scale.set(s, s, s)
    }
  })

  return <primitive object={scene} ref={ref} scale={1} position={modelPos} />
}

// Luce che segue la camera
function CameraLight() {
  const lightRef = useRef()
  const { camera } = useThree()

  useFrame(() => {
    if (lightRef.current) {
      lightRef.current.position.copy(camera.position)
    }
  })

  return <directionalLight ref={lightRef} intensity={2} />
}

// Resetta la camera alla posizione di default quando lo scroll è attivo
// Così OrbitControls non interferisce con la rotazione finale
const DEFAULT_CAM = new THREE.Vector3(0, 0, 10)
function ScrollCameraReset() {
  const { camera } = useThree()

  useFrame(() => {
    if (scrollState.progress > 0.01) {
      // La forza del reset cresce con il quadrato del progress
      // Primo scroll: quasi impercettibile. A metà scroll: moderato. Fine: completo.
      const t = scrollState.progress * scrollState.progress
      camera.position.lerp(DEFAULT_CAM, t * 0.06)
      camera.lookAt(0, 0, 0)
    }
  })

  return null
}

// ============================================================
// EFFETTO DISTORSIONE GRAVITAZIONALE ASCII
// Fisica: velocità + inerzia + drift nello spazio
// Il cursore "esplode" i caratteri che poi fluttuano,
// rallentano, tremano e tornano con bounce
// ============================================================
// ── FINE TUNING ──────────────────────────────────────────────
// RAGGIO: area di impatto del cerchio. Più grande = esplode prima di toccare il modello
const DISTORTION_RADIUS = 30

// FORZA ESPLOSIONE: velocità iniziale dei caratteri. Più alto = volano più lontano/veloce
const PUSH_SPEED = 3.5

// FRIZIONE SPAZIO: quanto rallentano nel vuoto. 1.0 = zero frizione, 0.95 = tanta frizione
// Più vicino a 1 = fluttuano più a lungo prima di fermarsi
const DRIFT_FRICTION = 0.985

// SOGLIA STOP: velocità sotto cui parte il tremolio. Più basso = fluttuano più a lungo
const DRIFT_STOP_THRESHOLD = 0.15

// DISTANZA MAX: quanto lontano possono andare. Rallentano gradualmente avvicinandosi al limite
const MAX_DRIFT_DISTANCE = 500

// TREMOLIO: durata (ms) e intensità (px di oscillazione). Più alto = più visibile
const TREMBLE_DURATION = 600
const TREMBLE_INTENSITY = 8

// BOUNCE RITORNO: durata (ms). Più alto = ritorno più lento/morbido
const BOUNCE_DURATION = 500

// BOWLING: quanto conta la direzione. Più alto = più differenza tra davanti e dietro
// bowlingMultiplier = BOWLING_MIN + max(0, dot) * BOWLING_RANGE
const BOWLING_MIN = 0.4       // spinta minima (caratteri dietro al cursore)
const BOWLING_RANGE = 2.1     // spinta extra per i caratteri davanti (totale max = MIN + RANGE)

// SPEED BOOST: quanto la velocità del cursore amplifica la spinta
// speedBoost = 1 + cursorSpeed / SPEED_DIVISOR, clampato a SPEED_MAX
const SPEED_DIVISOR = 8       // più basso = boost più aggressivo
const SPEED_MAX_BOOST = 4     // moltiplicatore massimo
// ─────────────────────────────────────────────────────────────

function useAsciiDistortion(containerRef, currentTheme, delayedMouseRef) {
  const cellStates = useRef(new Map())
  const metricsRef = useRef({ charWidth: 0, lineHeight: 0 })
  const lastFrameTime = useRef(0)
  const prevMouse = useRef({ x: 0, y: 0 })
  const cursorVelocity = useRef(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Crea il canvas overlay
    const canvas = document.createElement('canvas')
    canvas.style.position = 'absolute'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.pointerEvents = 'none'
    canvas.style.zIndex = '10'
    container.style.position = 'relative'
    container.appendChild(canvas)
    const ctx = canvas.getContext('2d')

    let rafId
    let lastMetricsUpdate = 0

    const animate = (now) => {
      rafId = requestAnimationFrame(animate)

      const dt = Math.min((now - (lastFrameTime.current || now)) / 16.67, 3)
      lastFrameTime.current = now

      const table = container.querySelector('table')
      if (!table) return
      const td = table.querySelector('td')
      if (!td) return

      // Aggiorna metriche ogni 500ms
      if (now - lastMetricsUpdate > 500) {
        lastMetricsUpdate = now
        const tdRect = td.getBoundingClientRect()
        canvas.width = tdRect.width * devicePixelRatio
        canvas.height = tdRect.height * devicePixelRatio
        canvas.style.width = tdRect.width + 'px'
        canvas.style.height = tdRect.height + 'px'
        ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)

        const rawHtml = td.innerHTML
        const lines = rawHtml.split(/<br\s*\/?>/i)
        const rowCount = lines.length
        const colCount = lines[0] ? lines[0].replace(/&nbsp;/g, ' ').replace(/<[^>]*>/g, '').length : 1

        const tdStyle = window.getComputedStyle(td)
        const tableStyle = window.getComputedStyle(table)
        ctx.font = `${tdStyle.fontSize} ${tdStyle.fontFamily}`
        const measuredCharWidth = ctx.measureText('@').width
        const letterSpacing = parseFloat(tableStyle.letterSpacing) || 0
        const realCharWidth = measuredCharWidth + letterSpacing

        if (rowCount > 0 && colCount > 0) {
          metricsRef.current = {
            charWidth: realCharWidth,
            lineHeight: tdRect.height / rowCount,
            rows: rowCount,
            cols: colCount,
            tableLeft: tdRect.left,
            tableTop: tdRect.top,
            tableWidth: tdRect.width,
            tableHeight: tdRect.height
          }
        }
      }

      const m = metricsRef.current
      if (!m.charWidth || !m.lineHeight) return

      const rawHtml = td.innerHTML
      const lines = rawHtml.split(/<br\s*\/?>/i)
      const grid = lines.map(line => line.replace(/&nbsp;/g, ' ').replace(/<[^>]*>/g, ''))

      const mx = delayedMouseRef.current.x - m.tableLeft
      const my = delayedMouseRef.current.y - m.tableTop

      const cdx = delayedMouseRef.current.x - prevMouse.current.x
      const cdy = delayedMouseRef.current.y - prevMouse.current.y
      const cursorSpeed = Math.sqrt(cdx * cdx + cdy * cdy)
      const cursorDirX = cursorSpeed > 0.5 ? cdx / cursorSpeed : 0
      const cursorDirY = cursorSpeed > 0.5 ? cdy / cursorSpeed : 0
      prevMouse.current = { x: delayedMouseRef.current.x, y: delayedMouseRef.current.y }
      const speedBoost = Math.min(1 + cursorSpeed / SPEED_DIVISOR, SPEED_MAX_BOOST)

      const centerCol = Math.floor(mx / m.charWidth)
      const centerRow = Math.floor(my / m.lineHeight)
      const cellRadiusX = Math.ceil(DISTORTION_RADIUS / m.charWidth) + 1
      const cellRadiusY = Math.ceil(DISTORTION_RADIUS / m.lineHeight) + 1

      if (mx >= 0 && mx < m.tableWidth && my >= 0 && my < m.tableHeight) {
        for (let r = Math.max(0, centerRow - cellRadiusY); r <= Math.min(grid.length - 1, centerRow + cellRadiusY); r++) {
          const row = grid[r]
          if (!row) continue
          for (let c = Math.max(0, centerCol - cellRadiusX); c <= Math.min(row.length - 1, centerCol + cellRadiusX); c++) {
            const char = row[c]
            if (!char || char === ' ' || char === '.') continue

            const cellCenterX = c * m.charWidth + m.charWidth / 2
            const cellCenterY = r * m.lineHeight + m.lineHeight / 2
            const dx = cellCenterX - mx
            const dy = cellCenterY - my
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (dist < DISTORTION_RADIUS) {
              const key = `${r}-${c}`
              const existing = cellStates.current.get(key)

              const cellDirX = dist > 0 ? dx / dist : 0
              const cellDirY = dist > 0 ? dy / dist : 0
              const dot = cursorDirX * cellDirX + cursorDirY * cellDirY
              const bowlingMultiplier = BOWLING_MIN + Math.max(0, dot) * BOWLING_RANGE

              const force = Math.pow(1 - dist / DISTORTION_RADIUS, 2) * PUSH_SPEED * speedBoost * bowlingMultiplier

              const baseAngle = Math.atan2(dy, dx)
              const chaos = (Math.random() - 0.5) * 0.8
              const angle = baseAngle + chaos
              const chaosForce = force * (0.7 + Math.random() * 0.6)
              const velX = Math.cos(angle) * chaosForce
              const velY = Math.sin(angle) * chaosForce

              if (!existing || existing.state !== 'drifting' || existing.speed > DRIFT_STOP_THRESHOLD * 3) {
                const prevVx = existing ? existing.velX : 0
                const prevVy = existing ? existing.velY : 0
                const prevOx = existing ? existing.offsetX : 0
                const prevOy = existing ? existing.offsetY : 0

                cellStates.current.set(key, {
                  state: 'drifting',
                  row: r,
                  col: c,
                  velX: prevVx * 0.5 + velX,
                  velY: prevVy * 0.5 + velY,
                  offsetX: prevOx,
                  offsetY: prevOy,
                  char,
                })
              }
            }
          }
        }
      }

      for (const [key, cell] of cellStates.current) {
        if (grid[cell.row] && grid[cell.row][cell.col]) {
          cell.char = grid[cell.row][cell.col]
        }
        if (!cell.char || cell.char === ' ') {
          cellStates.current.delete(key)
          continue
        }

        if (cell.state === 'drifting') {
          cell.offsetX += cell.velX * dt
          cell.offsetY += cell.velY * dt
          cell.velX *= Math.pow(DRIFT_FRICTION, dt)
          cell.velY *= Math.pow(DRIFT_FRICTION, dt)

          const driftDist = Math.sqrt(cell.offsetX * cell.offsetX + cell.offsetY * cell.offsetY)
          if (driftDist > MAX_DRIFT_DISTANCE * 0.5) {
            const brakeFactor = (driftDist - MAX_DRIFT_DISTANCE * 0.5) / (MAX_DRIFT_DISTANCE * 0.5)
            const extraFriction = 1 - brakeFactor * 0.08 * dt
            cell.velX *= extraFriction
            cell.velY *= extraFriction
          }
          if (driftDist > MAX_DRIFT_DISTANCE) {
            const scale = MAX_DRIFT_DISTANCE / driftDist
            cell.offsetX *= scale
            cell.offsetY *= scale
          }

          const speed = Math.sqrt(cell.velX * cell.velX + cell.velY * cell.velY)
          cell.speed = speed
          if (speed < DRIFT_STOP_THRESHOLD) {
            cell.state = 'trembling'
            cell.startTime = now
            cell.driftX = cell.offsetX
            cell.driftY = cell.offsetY
          }
        }

        if (cell.state === 'trembling') {
          const elapsed = now - cell.startTime
          if (elapsed >= TREMBLE_DURATION) {
            cell.state = 'bouncing'
            cell.startTime = now
          } else {
            const decay = 1 - elapsed / TREMBLE_DURATION
            cell.offsetX = cell.driftX + (Math.random() - 0.5) * TREMBLE_INTENSITY * decay
            cell.offsetY = cell.driftY + (Math.random() - 0.5) * TREMBLE_INTENSITY * decay
          }
        }

        if (cell.state === 'bouncing') {
          const elapsed = now - cell.startTime
          if (elapsed >= BOUNCE_DURATION) {
            cellStates.current.delete(key)
            continue
          }
          const t = elapsed / BOUNCE_DURATION
          const spring = 1 - Math.pow(1 - t, 3) * Math.cos(t * Math.PI * 2.5)
          cell.offsetX = cell.driftX * (1 - spring)
          cell.offsetY = cell.driftY * (1 - spring)
        }
      }

      ctx.clearRect(0, 0, m.tableWidth, m.tableHeight)
      if (cellStates.current.size === 0) return

      const computedStyle = window.getComputedStyle(td)
      ctx.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`
      ctx.textBaseline = 'top'

      for (const [, cell] of cellStates.current) {
        const origX = cell.col * m.charWidth
        const origY = cell.row * m.lineHeight

        ctx.fillStyle = currentTheme.background
        ctx.fillRect(origX - 3, origY - 1, m.charWidth + 5, m.lineHeight + 6)

        ctx.fillStyle = currentTheme.foreground
        ctx.fillText(cell.char, origX + cell.offsetX, origY + cell.offsetY)
      }
    }

    rafId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafId)
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
    }
  }, [containerRef, currentTheme])
}

export default function App() {
  const [currentTheme, setCurrentTheme] = useState(themes.monochrome)
  const [themeOpen, setThemeOpen] = useState(false)
  const [terminalActive, setTerminalActive] = useState(false)
  const canvasContainerRef = useRef(null)
  const faceWrapperRef = useRef(null)
  const aboutRef = useRef(null)
  const cursorRef = useRef(null)
  const scrollIndicatorRef = useRef(null)
  const mouse = useRef({ x: 0, y: 0 })
  const delayedMouse = useRef({ x: 0, y: 0 })

  useAsciiDistortion(canvasContainerRef, currentTheme, delayedMouse)

  // Tema → CSS vars
  // Reset scroll position al mount (evita ripristino browser)
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--bg-color', currentTheme.background)
    root.style.setProperty('--fg-color', currentTheme.foreground)
    root.style.setProperty('--accent-color', currentTheme.accent)
    root.style.setProperty('--border-hover-color', currentTheme.borderHover)
  }, [currentTheme])

  // GSAP ScrollTrigger — anima il volto durante lo scroll
  // Tutto guidato da un unico progress smoothed per evitare blocchi/desync
  useEffect(() => {
    const wrapper = faceWrapperRef.current
    if (!wrapper) return

    let rawProgress = 0
    let smoothProgress = 0
    let rawExit = 0
    let rafId

    const st = ScrollTrigger.create({
      trigger: '.scroll-spacer',
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        rawProgress = self.progress
      },
    })

    // Il volto esce insieme all'about-section — stessa sezione, stesso scroll
    const stExit = ScrollTrigger.create({
      trigger: '.about-section',
      start: 'top top',
      end: 'bottom top',
      onUpdate: (self) => {
        rawExit = self.progress
      },
    })

    // Loop di smoothing — lerp alto per seguire lo scroll senza blocchi
    const smoothLoop = () => {
      rafId = requestAnimationFrame(smoothLoop)

      // Lerp 0.18 = più reattivo al primo scroll, niente blocchi
      smoothProgress += (rawProgress - smoothProgress) * 0.18
      if (Math.abs(smoothProgress - rawProgress) < 0.0005) smoothProgress = rawProgress

      scrollState.progress = smoothProgress

      // ── FINE TUNING POSIZIONE FINALE ────────────────────────
      const FINAL_SCALE = 0.65
      scrollState.scale = 1 - smoothProgress * (1 - FINAL_SCALE)

      const OFFSET_FRACTION = 1 / 3
      const containerWidth = Math.min(window.innerWidth, 1440)
      const maxOffset = containerWidth * OFFSET_FRACTION
      const x = -smoothProgress * maxOffset
      // ─────────────────────────────────────────────────────────

      // Exit senza lerp: segue il rawExit pixel per pixel, sync perfetto con about-section
      const exitY = -rawExit * window.innerHeight

      wrapper.style.transform = `translateX(${x}px) translateY(${exitY}px)`

      // Attiva il terminale quando lo scroll raggiunge la fine
      if (smoothProgress >= 0.95) {
        setTerminalActive(true)
      }
    }
    smoothLoop()

    return () => {
      cancelAnimationFrame(rafId)
      st.kill()
      stExit.kill()
    }
  }, [])

  // Cursore con ritardo
  useEffect(() => {
    const handleMouseMove = (e) => { mouse.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', handleMouseMove)
    const animate = () => {
      const delaySpeed = 0.07
      delayedMouse.current.x += (mouse.current.x - delayedMouse.current.x) * delaySpeed
      delayedMouse.current.y += (mouse.current.y - delayedMouse.current.y) * delaySpeed
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${delayedMouse.current.x}px, ${delayedMouse.current.y}px, 0) translate(-50%, -50%)`
      }
      requestAnimationFrame(animate)
    }
    animate()
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useEffect(() => {
    const el = scrollIndicatorRef.current
    if (!el) return
    const st = ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: '15% top',
      onUpdate: (self) => {
        gsap.set(el, { opacity: 0.35 * (1 - self.progress) })
      },
    })
    return () => st.kill()
  }, [])

  return (
    <div className="page">

      {/* VOLTO ASCII — fixed, animato da GSAP con lo scroll */}
      <div className="face-wrapper" ref={faceWrapperRef}>
        <div className="face-canvas" ref={canvasContainerRef}>
          <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
            <color attach="background" args={['black']} />
            <ambientLight intensity={0.1} />
            <CameraLight />

            <Suspense fallback={null}>
              <AsciiFace />
            </Suspense>

            <AsciiRenderer
              fgColor={currentTheme.foreground}
              bgColor="transparent"
              characters="  .:-+*=%@#"
              resolution={0.15}
            />
            <ScrollCameraReset />
            <OrbitControls enableZoom={false} enablePan={false} />
          </Canvas>
        </div>
      </div>

      {/* NAVBAR — email centro, nav+tema destra */}
      <nav className="topbar">
        <div className="topbar-inner">
        <div className="topbar-center">
          <a href="mailto:fabio@example.com" className="topbar-email">fab.mar.2000@gmail.com</a>
        </div>
        <div className="topbar-right">
          <a className="topbar-link" onClick={() => document.querySelector('.about-section')?.scrollIntoView({ behavior: 'smooth' })}>about</a>
          <a className="topbar-link" onClick={() => { const el = document.querySelector('.projects-scroll-zone'); if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (window.innerHeight - el.offsetHeight) / 2, behavior: 'smooth' }) }}>work</a>
          <a className="topbar-link" onClick={() => document.querySelector('.footer-section')?.scrollIntoView({ behavior: 'smooth' })}>contact</a>
          <div className="theme-dropdown">
            <button className="theme-dropdown-btn" onClick={() => setThemeOpen(o => !o)}>
              {currentTheme.name} ▾
            </button>
            {themeOpen && (
              <div className="theme-dropdown-menu">
                {Object.values(themes).map((t) => (
                  <button
                    key={t.name}
                    className={`theme-dropdown-item ${currentTheme.name === t.name ? 'active' : ''}`}
                    onClick={() => { setCurrentTheme(t); setThemeOpen(false) }}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        </div>
      </nav>

      {/* ═══════ SEZIONI SCROLLABILI ═══════ */}
      <div className="content-container">

        {/* SCROLL SPACER — l'animazione del volto avviene durante questo scroll */}
        {/* 300vh totale = 200vh di scroll effettivo → ogni tick ~4.5% → più fluido */}
        <div className="scroll-spacer">

          {/* HERO — il volto è centrato e grande */}
          <section className="hero-section">
            <div className="hero-left">
              <span className="hero-greeting">Hello! I'm</span>
              <span className="hero-name">FABIO</span>
              <span className="hero-name">MARCONI</span>
            </div>
            <div className="hero-right">
              <span className="hero-greeting">An</span>
              <span className="hero-role-primary">AI ENGINEER</span>
              <span className="hero-role-secondary">FULL-STACK DEV</span>
            </div>
            <div className="scroll-indicator" ref={scrollIndicatorRef}>scroll</div>
          </section>

          {/* Spacer extra per dare più respiro all'animazione */}
          <div style={{ height: '100vh' }} />

          {/* ABOUT — il volto è a sinistra, terminale + bio a destra */}
          <section className="about-section" ref={aboutRef}>
            <div className="about-content">
              <TerminalWindow active={terminalActive}>
                <Neofetch active={terminalActive} theme={currentTheme} />
              </TerminalWindow>
              <div className="about-bio">
                <p className="bio-text">
                  Fresh Computer Science graduate from UniBz with a genuine obsession for understanding
                  how things work. From the math behind a neural network to the last line of a deploy
                  script. I gravitate toward AI, automation and robotics, and I'm at my best when a
                  problem requires connecting dots across disciplines.
                </p>
                <p className="bio-text">
                  My thesis pushed real-time action detection in video streams using CNNs and LSTMs.
                  Outside of ML I've built full-stack crypto trading platforms, cross-platform mobile
                  apps and whatever else seemed worth learning at the time. I write clean code, ask a
                  lot of questions and ship things that work.
                </p>
                <p className="bio-text">
                  I use AI heavily in my workflow, as a tool, not a replacement for thinking. I believe
                  human judgment is necessary at every step of the process. Vibe coding is not
                  engineering. Understanding what you're building and why will always matter more
                  than how fast you generated it.
                </p>
              </div>
            </div>
          </section>

        </div>

        {/* ═══════ SEZIONI POST-SCROLL ═══════ */}
        <ProjectsSection />
        <TechStackSection />
        <Footer />

      </div>

      {/* CURSORE — sopra a tutto */}
      <div ref={cursorRef} className="custom-cursor"></div>
    </div>
  )
}
