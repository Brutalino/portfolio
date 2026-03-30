import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import {
  SiHtml5, SiCss, SiJavascript, SiTypescript, SiPython, SiC,
  SiReact, SiNodedotjs, SiMongodb, SiGit, SiLinux, SiGnubash,
  SiScikitlearn, SiTensorflow, SiNumpy, SiPandas,
  SiBlender, SiUnrealengine, SiAnthropic, SiJson,
  SiAndroidstudio, SiSwift,
} from 'react-icons/si'
import { FaJava } from 'react-icons/fa'
import { DiPhotoshop } from 'react-icons/di'
import { BsDatabase, BsImage } from 'react-icons/bs'
import { TbBrain, TbEye, TbChartLine, TbApi } from 'react-icons/tb'

gsap.registerPlugin(ScrollTrigger)

const TECHS = [
  { icon: FaJava,          name: 'Java'           },
  { icon: SiPython,        name: 'Python'         },
  { icon: SiC,             name: 'C'              },
  { icon: SiJavascript,    name: 'JavaScript'     },
  { icon: SiTypescript,    name: 'TypeScript'     },
  { icon: SiHtml5,         name: 'HTML'           },
  { icon: SiCss,           name: 'CSS'            },
  { icon: SiReact,         name: 'React'          },
  { icon: SiReact,         name: 'React Native'   },
  { icon: SiAndroidstudio, name: 'Android Studio' },
  { icon: SiSwift,         name: 'SwiftUI'        },
  { icon: SiNodedotjs,     name: 'Node.js'        },
  { icon: BsDatabase,      name: 'SQL'            },
  { icon: SiMongodb,       name: 'MongoDB'        },
  { icon: TbApi,           name: 'API'            },
  { icon: SiJson,          name: 'JSON'           },
  { icon: SiLinux,         name: 'Linux'          },
  { icon: SiGnubash,       name: 'Bash'           },
  { icon: SiGit,           name: 'Git'            },
  { icon: SiAnthropic,     name: 'Claude'         },
  { icon: SiScikitlearn,   name: 'scikit-learn'   },
  { icon: SiTensorflow,    name: 'TensorFlow'     },
  { icon: SiNumpy,         name: 'NumPy'          },
  { icon: SiPandas,        name: 'Pandas'         },
  { icon: TbBrain,         name: 'Deep Learning'  },
  { icon: TbEye,           name: 'Comp. Vision'   },
  { icon: TbEye,           name: 'CNN'            },
  { icon: TbChartLine,     name: 'LSTM'           },
  { icon: DiPhotoshop,     name: 'Photoshop'      },
  { icon: BsImage,         name: 'Lightroom'      },
  { icon: SiBlender,       name: 'Blender'        },
  { icon: SiUnrealengine,  name: 'Unreal Engine'  },
  { icon: SiReact,         name: 'JSX'            },
]

export default function TechStackSection() {
  const sectionRef = useRef(null)
  const itemsRef = useRef([])

  useEffect(() => {
    const items = itemsRef.current.filter(Boolean)
    gsap.set(items, { opacity: 0, y: 20 })

    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: 'top 75%',
      onEnter: () => {
        gsap.to(items, {
          opacity: 1,
          y: 0,
          duration: 0.4,
          ease: 'power3.out',
          stagger: 0.04,
        })
      },
    })

    return () => st.kill()
  }, [])

  return (
    <section className="techstack-section" ref={sectionRef}>
      <div className="techstack-grid-container">
        <h2 className="techstack-title">Tech Stack</h2>
        <div className="techstack-grid">
          {TECHS.map((tech, i) => {
            const Icon = tech.icon
            return (
              <div
                key={`${tech.name}-${i}`}
                className="tech-card"
                ref={el => itemsRef.current[i] = el}
              >
                <Icon className="tech-icon" />
                <span className="tech-name">{tech.name}</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
