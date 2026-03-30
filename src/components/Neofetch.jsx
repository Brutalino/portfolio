import React, { useState, useEffect, useRef } from 'react'

const ASCII_LOGO = [
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⡴⠞⢳⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⡔⠋⠀⢰⠎⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⢆⣤⡞⠃⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣼⢠⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀',
  '⠀⠀⠀⠀⢀⣀⣾⢳⠀⠀⠀⠀⢸⢠⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀',
  '⣀⡤⠴⠊⠉⠀⠀⠈⠳⡀⠀⠀⠘⢎⠢⣀⣀⣀⠀⠀⠀⠀⠀⠀⠀',
  '⠳⣄⠀⠀⡠⡤⡀⠀⠘⣇⡀⠀⠀⠀⠉⠓⠒⠺⠭⢵⣦⡀⠀⠀⠀',
  '⠀⢹⡆⠀⢷⡇⠁⠀⠀⣸⠇⠀⠀⠀⠀⠀⢠⢤⠀⠀⠘⢷⣆⡀⠀',
  '⠀⠀⠘⠒⢤⡄⠖⢾⣭⣤⣄⠀⡔⢢⠀⡀⠎⣸⠀⠀⠀⠀⠹⣿⡀',
  '⠀⠀⢀⡤⠜⠃⠀⠀⠘⠛⣿⢸⠀⡼⢠⠃⣤⡟⠀⠀⠀⠀⠀⣿⡇',
  '⠀⠀⠸⠶⠖⢏⠀⠀⢀⡤⠤⠇⣴⠏⡾⢱⡏⠁⠀⠀⠀⠀⢠⣿⠃',
  '⠀⠀⠀⠀⠀⠈⣇⡀⠿⠀⠀⠀⡽⣰⢶⡼⠇⠀⠀⠀⠀⣠⣿⠟⠀',
  '⠀⠀⠀⠀⠀⠀⠈⠳⢤⣀⡶⠤⣷⣅⡀⠀⠀⠀⣀⡠⢔⠕⠁⠀⠀',
  '⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠙⠫⠿⠿⠿⠛⠋⠁⠀⠀⠀⠀',
]

const NEOFETCH_LINES = [
  { label: 'name',      value: 'Fabio Marconi'                       },
  { label: 'role',      value: 'AI Engineer & Full-Stack Dev'        },
  { label: 'passions',  value: 'AI, Automation, Robotics' },
  { label: 'location',  value: 'Bolzano, Italy'                      },
  { label: 'email',     value: 'fab.mar.2000@gmail.com'              },
  { label: 'github',    value: 'github.com/Brutalino'                },
]

const maxLabel = Math.max(...NEOFETCH_LINES.map(l => l.label.length))

// Which color index from theme.colors to use per label
const LABEL_COLOR_INDICES = [1, 2, 3, 4, 5, 6]

export default function Neofetch({ active, theme }) {
  const [typedCommand, setTypedCommand] = useState('')
  const [showOutput, setShowOutput] = useState(false)
  const [visibleLines, setVisibleLines] = useState(0)
  const [showColors, setShowColors] = useState(false)
  const [cursorVisible, setCursorVisible] = useState(true)
  const hasPlayed = useRef(false)

  useEffect(() => {
    const interval = setInterval(() => setCursorVisible(v => !v), 530)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (active && !hasPlayed.current) {
      hasPlayed.current = true
      setTimeout(() => startTyping(), 600)
    }
  }, [active])

  const startTyping = () => {
    const command = 'neofetch'
    let i = 0

    const typeInterval = setInterval(() => {
      i++
      setTypedCommand(command.slice(0, i))
      if (i >= command.length) {
        clearInterval(typeInterval)
        setTimeout(() => {
          setShowOutput(true)
          let line = 0
          const lineInterval = setInterval(() => {
            line++
            setVisibleLines(line)
            if (line >= NEOFETCH_LINES.length + ASCII_LOGO.length) {
              clearInterval(lineInterval)
              setTimeout(() => setShowColors(true), 150)
            }
          }, 60)
        }, 800)
      }
    }, 120)
  }

  const colors = theme?.colors || []

  return (
    <div className="neofetch">
      <div className="neofetch-prompt">
        <span className="prompt-symbol">❯ </span>
        <span>{typedCommand}</span>
        <span className="cursor" style={{ opacity: cursorVisible ? 1 : 0 }}>▋</span>
      </div>

      {showOutput && (
        <div className="neofetch-output">
          <div className="neofetch-layout">
            {/* Logo colonna sinistra */}
            <div className="neofetch-logo">
              {ASCII_LOGO.map((line, i) => (
                <div key={i} className="neofetch-logo-line" style={{
                  opacity: i < visibleLines ? 1 : 0,
                  transition: 'opacity 0.15s ease',
                }}>
                  {line}
                </div>
              ))}
            </div>

            {/* Info colonna destra */}
            <div className="neofetch-info">
              <div className="neofetch-header" style={{
                opacity: visibleLines > 0 ? 1 : 0,
                transition: 'opacity 0.15s ease',
              }}>
                <span className="neofetch-label">Fabio_Marconi</span>
                <span className="neofetch-at">@</span>
                <span className="neofetch-label">portfolio</span>
              </div>

              <div className="neofetch-separator-line" style={{
                opacity: visibleLines > 1 ? 1 : 0,
                transition: 'opacity 0.15s ease',
              }}>
                ─────────────────
              </div>

              {NEOFETCH_LINES.map((line, i) => {
                const lineIndex = i + 2
                const labelColor = colors[LABEL_COLOR_INDICES[i]] || 'var(--accent-color)'
                return (
                  <div key={i} className="neofetch-line" style={{
                    opacity: lineIndex < visibleLines ? 1 : 0,
                    transition: 'opacity 0.15s ease',
                  }}>
                    <span className="neofetch-label" style={{ color: labelColor }}>
                      {line.label.padEnd(maxLabel)}
                    </span>
                    <span className="neofetch-arrow"> → </span>
                    <span className="neofetch-value">{line.value}</span>
                  </div>
                )
              })}

              {showColors && colors.length > 0 && (
                <div className="neofetch-colors">
                  <div className="neofetch-color-row">
                    {colors.slice(0, 8).map((c, i) => (
                      <span key={i} className="neofetch-color-block" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="neofetch-color-row">
                    {colors.slice(8, 16).map((c, i) => (
                      <span key={i} className="neofetch-color-block" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
