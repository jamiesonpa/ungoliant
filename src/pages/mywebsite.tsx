"use client"

import Head from 'next/head';
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'

function GalagaLikeAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let lastParticleGroupTime = 0
    let lastMissileFireTime = 0
    let shotsFired = 0

    const particles: {
      x: number
      y: number
      speed: number
      size: number
      targeted: boolean
      id: number
      angle: number
    }[] = []

    const missiles: {
      x: number
      y: number
      targetId: number
      trail: { x: number; y: number; opacity: number }[]
    }[] = []

    const explosions: {
      x: number
      y: number
      radius: number
      opacity: number
    }[] = []

    const player = {
      x: 0,
      y: 0,
      size: 10,
      angle: 0,
      orbitProgress: 0,
      orbitSpeed: 0.004,
      vx: 0,
    }

    const maxParticles = 5
    const particleGroupInterval = 10000 // 10 seconds
    const missileFireInterval = 1000 // 1 second
    const missileSpeed = 1.5 // Reduced by 70% from 5

    let particleIdCounter = 0

    const createParticleFormation = () => {
      const formationWidth = canvas.width * 0.2
      const formationHeight = canvas.height * 0.4
      const startX = canvas.width * 0.99 // Start 1% from the right edge
      const startY = canvas.height / 2 - formationHeight / 2

      for (let i = 0; i < maxParticles; i++) {
        const randomX = startX + Math.random() * formationWidth
        const randomY = startY + Math.random() * formationHeight
        const randomSpeed = (0.1 + Math.random() * 0.2) * 1.5 // Speed between 0.15 and 0.45 (50% faster)
        const size = 6 // Size of the triangle

        particles.push({
          x: randomX,
          y: randomY,
          speed: randomSpeed,
          size: size,
          targeted: false,
          id: particleIdCounter++,
          angle: Math.PI // Initial angle (pointing left)
        })
      }
    }

    const drawParticle = (particle: typeof particles[0]) => {
      ctx.fillStyle = 'rgba(255, 99, 71, 0.8)' // Muted red color
      ctx.save()
      ctx.translate(particle.x, particle.y)
      ctx.rotate(particle.angle)
      ctx.beginPath()
      ctx.moveTo(particle.size, 0)
      ctx.lineTo(-particle.size / 2, -particle.size / 2)
      ctx.lineTo(-particle.size / 2, particle.size / 2)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    const drawPlayer = () => {
      ctx.save()
      ctx.translate(player.x, player.y)
      ctx.rotate(player.angle)
      ctx.fillStyle = 'rgba(173, 216, 230, 0.8)' // Muted light blue color
      ctx.beginPath()
      ctx.moveTo(player.size, 0)
      ctx.lineTo(-player.size, -player.size / 2)
      ctx.lineTo(-player.size, player.size / 2)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    const drawMissile = (missile: typeof missiles[0]) => {
      // Draw missile trail
      ctx.beginPath()
      missile.trail.forEach((point) => {
        ctx.strokeStyle = `rgba(255, 255, 255, ${point.opacity})`
        ctx.moveTo(point.x, point.y)
        ctx.lineTo(point.x + 2, point.y) // Draw a 2px wide line
        ctx.stroke()
      })

      // Draw missile head
      ctx.strokeStyle = 'rgba(255, 255, 255, 1)'
      ctx.beginPath()
      ctx.moveTo(missile.x, missile.y)
      ctx.lineTo(missile.x + 2, missile.y) // Draw a 2px wide line
      ctx.stroke()
    }

    const drawExplosion = (explosion: typeof explosions[0]) => {
      ctx.fillStyle = `rgba(255, 255, 255, ${explosion.opacity})`
      ctx.beginPath()
      ctx.arc(explosion.x, explosion.y, explosion.radius, 0, Math.PI * 2)
      ctx.fill()
      window.dispatchEvent(new CustomEvent('explosion'))
    }

    const updatePlayer = () => {
      const orbitWidth = canvas.width * 0.1
      const orbitHeight = canvas.height * 0.05
      const centerX = canvas.width * 0.2
      const centerY = canvas.height * 0.5

      const prevX = player.x
      player.x = centerX + Math.cos(player.orbitProgress) * orbitWidth
      player.y = centerY + Math.sin(player.orbitProgress) * orbitHeight

      player.vx = player.x - prevX

      const nextX = centerX + Math.cos(player.orbitProgress + 0.1) * orbitWidth
      const nextY = centerY + Math.sin(player.orbitProgress + 0.1) * orbitHeight

      player.angle = Math.atan2(nextY - player.y, nextX - player.x)

      player.orbitProgress += player.orbitSpeed
      if (player.orbitProgress > Math.PI * 2) {
        player.orbitProgress -= Math.PI * 2
      }
    }

    const shootMissile = (timestamp: number) => {
      if (timestamp - lastMissileFireTime > missileFireInterval && 
          missiles.length < maxParticles && 
          particles.length > 0 &&
          player.vx > 0) { // Only shoot when moving right
        
        // Sort particles by distance to player
        const sortedParticles = particles
          .filter(p => !p.targeted && p.x < canvas.width) // Only target particles on screen
          .sort((a, b) => {
            const distA = Math.sqrt(Math.pow(a.x - player.x, 2) + Math.pow(a.y - player.y, 2))
            const distB = Math.sqrt(Math.pow(b.x - player.x, 2) + Math.pow(b.y - player.y, 2))
            return distA - distB
          })

        if (sortedParticles.length > 0) {
          const target = sortedParticles[0]
          missiles.push({
            x: player.x,
            y: player.y,
            targetId: target.id,
            trail: []
          })
          target.targeted = true
          lastMissileFireTime = timestamp
          shotsFired++
          window.dispatchEvent(new CustomEvent('missileFired'))

          // Check if 5 shots have been fired
          if (shotsFired === 5) {
            setTimeout(() => {
              const remainingTargets = particles.filter(p => !p.targeted && p.x < canvas.width)
              if (remainingTargets.length > 0) {
                shotsFired = 0 // Reset shot count
                lastMissileFireTime = 0 // Allow immediate firing
              }
            }, 1000) // Wait 1 second before checking
          }
        }
      }
    }

    const updateMissile = (missile: typeof missiles[0], index: number) => {
      const target = particles.find(p => p.id === missile.targetId)
      if (!target) {
        missiles.splice(index, 1)
        return
      }

      const dx = target.x - missile.x
      const dy = target.y - missile.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance < target.size + 5) { // Increased collision radius
        explosions.push({
          x: target.x,
          y: target.y,
          radius: 1,
          opacity: 1
        })
        particles.splice(particles.indexOf(target), 1)
        missiles.splice(index, 1)
      } else {
        const angle = Math.atan2(dy, dx)
        missile.x += Math.cos(angle) * missileSpeed
        missile.y += Math.sin(angle) * missileSpeed

        // Update missile trail
        missile.trail.unshift({ x: missile.x, y: missile.y, opacity: 0.8 })
        if (missile.trail.length > 5) {
          missile.trail.pop()
        }
        missile.trail.forEach((point) => {
          point.opacity -= 0.15 // Fade out the trail
        })
      }
    }

    const updateParticle = (particle: typeof particles[0]) => {
      // Move the particle in the direction it's facing
      particle.x += Math.cos(particle.angle) * particle.speed
      particle.y += Math.sin(particle.angle) * particle.speed

      // Randomly change direction
      if (Math.random() < 0.02) { // 2% chance to change direction each frame
        particle.angle += (Math.random() - 0.5) * Math.PI / 9 // +/- 20 degrees in radians
      }

      // Wrap around the screen
      if (particle.x < -particle.size) particle.x = canvas.width + particle.size
      if (particle.y < -particle.size) particle.y = canvas.height + particle.size
      if (particle.y > canvas.height + particle.size) particle.y = -particle.size
    }

    const draw = (timestamp: number) => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      if (timestamp - lastParticleGroupTime > particleGroupInterval && particles.length === 0) {
        createParticleFormation()
        lastParticleGroupTime = timestamp
      }

      particles.forEach((particle) => {
        updateParticle(particle)
        drawParticle(particle)
      })

      updatePlayer()
      drawPlayer()

      shootMissile(timestamp)

      missiles.forEach((missile, index) => {
        drawMissile(missile)
        updateMissile(missile, index)
      })

      explosions.forEach((explosion, index) => {
        drawExplosion(explosion)
        explosion.radius += 0.5
        explosion.opacity -= 0.05
        if (explosion.opacity <= 0) {
          explosions.splice(index, 1)
        }
      })

      animationFrameId = requestAnimationFrame(draw)
    }

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    resizeCanvas()
    draw(0)

    window.addEventListener('resize', resizeCanvas)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-0" />
}

export default function ScrollableStoryLandingPageComponent() {



  const toLowerCase = (text: string) => {
    return text.replace(/[A-Z]/g, (match) => match.toLowerCase());
  };
  
  const [currentSection, setCurrentSection] = useState(0)
  const [hasScrolled, setHasScrolled] = useState(false)
  const [aim9xcounter, setaim9xcounter] = useState(0)
  const [aim120counter, setaim120counter] = useState(0)
  const [stingercounter, setstingercounter] = useState(0)
  const [ungoliantcounter, setungoliantcounter] = useState(0)
  const [rightCounter, setRightCounter] = useState(0)
  const containerRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: containerRef })

  const counterOpacity = useTransform(scrollYProgress, [0, 0.1], [1, 0])

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      const windowHeight = window.innerHeight
      const newSection = Math.floor(scrollPosition / (windowHeight * 2)) // Adjusted for increased spacing
      setCurrentSection(newSection)

      if (!hasScrolled && scrollPosition > 0) {
        setHasScrolled(true)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasScrolled])

  const handleMissileFired = useCallback(() => {
    setaim9xcounter(prev => prev - 500000)
    setaim120counter(prev => prev -1000000)
    setstingercounter(prev => prev -100000)
    setungoliantcounter(prev => prev -5000)
  }, [])

  const handleExplosion = useCallback(() => {
    setRightCounter(prev => prev - 1000)
  }, [])

  useEffect(() => {
    window.addEventListener('missileFired', handleMissileFired)
    window.addEventListener('explosion', handleExplosion)
    return () => {
      window.removeEventListener('missileFired', handleMissileFired)
      window.removeEventListener('explosion', handleExplosion)
    }
  }, [handleMissileFired, handleExplosion])

  const costAsymmetryRatioaim9x = aim9xcounter && rightCounter ? ((rightCounter / aim9xcounter) * 100).toFixed(1) : '0.0';
  const costAsymmetryRatioaim120 = aim120counter && rightCounter ? ((rightCounter / aim120counter) *100).toFixed(1) : '0.0'
  const costAsymmetryRatiostinger = stingercounter && rightCounter ? ((rightCounter / stingercounter)*100).toFixed(1) : '0.0'
  const costAsymmetryRatioungoliant = ungoliantcounter && rightCounter ? ((rightCounter / ungoliantcounter)*100).toFixed(1) : '0.0'

  const sections = [
    {
      title: toLowerCase("MAINTAINING AIR DOMINANCE HAS BECOME AN ECONOMIC INSANITY"),
      description: "",
      links: [
        {
          text: toLowerCase("F18 SHOOTS DOWN HOUTHI ONE-WAY ATTACK DRONE WITH AIM-120"),
          url: "https://www.twz.com/air/navy-super-hornet-pilot-is-first-u-s-female-aviator-to-shoot-down-an-enemy-aerial-threat"
        },
        {
          text: toLowerCase("F22 SHOOTS DOWN CHINESE SURVEILLANCE BALLOON USING AIM-9X SIDEWINDER"),
          url: "https://theaviationgeekclub.com/heres-why-the-usaf-f-22-used-the-aim-9x-rather-than-the-gun-to-shoot-down-the-chinese-spy-balloon-and-why-the-sidewinder-dont-need-to-see-something-hot-in-order-to/"
        },
        {
          text: toLowerCase("F-15E SQUADRON DESTROYS 70 IRANIAN DRONES AND BALLISTIC MISSILES USING AIM-120S AND OTHER ORDNANCE"),
          url: "https://www.newsargus.com/news/local/f-15e-strike-eagles-shoot-down-iranian-drones/article_261eeacf-285a-53c0-8d7d-ec56e7d7a2b1.html"
        },
      ]
    },
    {
      title: toLowerCase("The Future of Group 2-4 cUAS is not $1,000,000 AIM-120s"),
      description: "",
      imageUrl: "/images/f16.png",
      imageAlt: toLowerCase("White outline drawing of an F-16 fighter jet with an AIM-120 missile on a black background")
    },
    {
      title: toLowerCase("It's not $500,000 AIM-9Xs"),
      description: "",
      imageUrl: "/images/f22.png",
      imageAlt: toLowerCase("White outline drawing of an F-22 Raptor fighter jet with an AIM-9X missile")
    },
    {
      title: toLowerCase("And it isn't $100,000 FIM-92 Stingers"),
      description: "",
      imageUrl: "/images/stinger2.png",
      imageAlt: toLowerCase("White outline drawing of a Stinger missile launcher on a black background")
    },
    {
      title: (<>fpv drone visual acquisition is reactive, short-range, and slow</>),
      description: "",
      imageUrl: "/images/drone1.png", 
      imageAlt: "White outline drawing of a Stinger missile launcher on a black background"
    },
    {
      
      title:(<>the future is symmetric, <em>cost-effective</em>, air-to-air dominance</>),
      description: "",
      imageUrl: "/images/side_view_website_transparent-1.png",
      imageAlt: "Side view of a futuristic unmanned aerial vehicle (UAV)"
    },
    {
      title: (<>offensive counter-air with <em>threat-matched</em> kinetic effects</>),
      description: "",
      imageUrl: "/images/frontal_view_website_transparent-1.png",
      imageAlt: "Frontal view of a sleek, futuristic unmanned aerial vehicle (UAV)"
    },
    {
      title: (<>match the cost, minimize the threat, maximize the impact</>),
      description: "",
      imageUrl: "/images/isometric_website_transparent-1.png",
      imageAlt: "Isometric view of a futuristic unmanned aerial vehicle (UAV) in flight"
    },
    {
      title: (<>contact us</>),
      description: "info@ungoliant.ai",
      imageUrl: "/images/ungoliant_logo_white.png",
      imageAlt: "The Ungoliant Logo"
    }
  ]

  const progressBarHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"])

  return (
      <>
        <Head>
          {/* Basic favicon */}
          <link rel="icon" href="/favicon.ico" />
  
          {/* Multiple sizes for different devices */}
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
  
          {/* Apple Touch Icon for iOS */}
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  
          {/* Manifest for PWA support */}
          <link rel="manifest" href="/site.webmanifest" />
  
          {/* Optional: Customize theme color for mobile browsers */}
          <meta name="theme-color" content="#ffffff" />
        </Head>
  
        <div ref={containerRef} className="bg-black text-white">
          <GalagaLikeAnimation />
  
          {/* Semi-transparent white layer */}
          <div className="fixed inset-0 bg-white opacity-10 pointer-events-none z-10" />
  
          <nav className="fixed top-0 left-0 right-0 z-50 bg-black bg-opacity-50 backdrop-blur-md">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between h-16">
                <div className="flex-shrink-0">
                  {/* Replace "UNGOLIANT" text with an image */}
                  <a href="#" className="text-white font-bold text-xl hover:text-gray-300 fixed left-[10vw] top-[calc(-2vh+2rem)] transition-colors">
                    <img src="/images/ungoliant_logo_white.png" alt="Ungoliant Logo" className="h-11 w-auto" />
                  </a>
                </div>
                <div className="flex space-x-4">
                  <Link href="/contact" className="text-white hover:text-gray-300 transition-colors"></Link>
                  <a href="#" className="text-white hover:text-gray-300 transition-colors"></a>
                </div>
              </div>
            </div>
          </nav>
  
          <motion.div
            className="fixed left-0 top-0 bottom-0 w-1 bg-white z-30"
            style={{ height: progressBarHeight }}
          />
  
          {/* Left Counter Label */}
          <motion.div className="fixed left-[10vw] bottom-[calc(21vh+2rem)] z-50 text-sky-300 text-lg font-semibold text-center" style={{ opacity: counterOpacity }}>
            <span className="underline">operational costs (friendly)</span>
          </motion.div>
  
          {/* Left Counters */}
          <motion.div className="fixed left-[10vw] bottom-[21vh] z-50 text-white text-xl font-bold" style={{ opacity: counterOpacity }}>
            <span>aim-120: </span>${aim120counter.toLocaleString()}
          </motion.div>
          <motion.div className="fixed left-[10vw] bottom-[19vh] z-50 text-white text-xl font-bold" style={{ opacity: counterOpacity }}>
            <span>aim-9x: </span>${aim9xcounter.toLocaleString()}
          </motion.div>
          <motion.div className="fixed left-[10vw] bottom-[17vh] z-50 text-white text-xl font-bold" style={{ opacity: counterOpacity }}>
            <span>stinger: </span>${stingercounter.toLocaleString()}
          </motion.div>
          <motion.div className="fixed left-[10vw] bottom-[15vh] z-50 text-white text-xl font-bold" style={{ opacity: counterOpacity }}>
            <span>ungoliant: </span>${ungoliantcounter.toLocaleString()}
          </motion.div>
  
          {/* Cost Asymmetry Ratios */}
          <motion.div className="fixed left-1/2 bottom-[calc(21vh)] z-50 text-white text-xl font-bold transform -translate-x-1/2 text-center" style={{ opacity: counterOpacity }}>
            <div className="text-lg mb-1 underline">cost efficiency</div>
            <div><span>aim-120: </span>{costAsymmetryRatioaim120}%</div>
          </motion.div>
          <motion.div className="fixed left-1/2 bottom-[calc(19vh)] z-50 text-white text-xl font-bold transform -translate-x-1/2 text-center" style={{ opacity: counterOpacity }}>
            <div><span>aim-9x: </span>{costAsymmetryRatioaim9x}%</div>
          </motion.div>
          <motion.div className="fixed left-1/2 bottom-[calc(17vh)] z-50 text-white text-xl font-bold transform -translate-x-1/2 text-center" style={{ opacity: counterOpacity }}>
            <div><span>stinger: </span>{costAsymmetryRatiostinger}%</div>
          </motion.div>
          <motion.div className="fixed left-1/2 bottom-[calc(15vh)] z-50 text-white text-xl font-bold transform -translate-x-1/2 text-center" style={{ opacity: counterOpacity }}>
            <div><span>ungoliant: </span>{costAsymmetryRatioungoliant}%</div>
          </motion.div>
  
          {/* Right Counter Label */}
          <motion.div className="fixed right-[10vw] bottom-[calc(21vh+2rem)] z-50 text-red-300 text-lg font-semibold text-center" style={{ opacity: counterOpacity }}>
            <span className="underline">operational costs (opfor)</span>
          </motion.div>
  
          {/* Right Counter */}
          <motion.div className="fixed right-[10vw] bottom-[21vh] z-50 text-white text-2xl font-bold" style={{ opacity: counterOpacity }}>
            ${rightCounter.toLocaleString()}
          </motion.div>
  
          {/* Main Section */}
          <div className="h-screen flex items-start justify-center pt-[21vh]">
            <AnimatePresence>
              <motion.h1 key="title" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 5 }} className="text-4xl font-bold text-center">
                a new microcosm in air-to-air dominance
              </motion.h1>
            </AnimatePresence>
          </div>
  
          {/* Sections */}
          {sections.map((section, index) => (
            <motion.div key={index} className="min-h-[200vh] flex items-center justify-center relative z-20" initial={{ opacity: 0 }} animate={{ opacity: hasScrolled && currentSection === index ? 1 : 0 }} transition={{ duration: 0.5 }}>
              <div className="text-center max-w-6xl mx-auto px-4 sticky top-1/2 transform -translate-y-1/2">
                <motion.h2 className="mb-4 text-4xl font-bold" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2, duration: 0.8 }}>
                  {section.title}
                </motion.h2>
                <motion.p className="text-xl mb-8" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }}>
                  {section.description}
                </motion.p>
                {section.imageUrl ? (
                  <motion.div className="w-full max-w-5xl mx-auto h-[675px] rounded-lg overflow-hidden" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }}>
                    <Image src={section.imageUrl} alt={section.imageAlt} width={1200} height={675} className="object-contain w-full h-full" onError={(e) => { e.currentTarget.src = "/placeholder.svg?height=675&width=1200"; }} />
                  </motion.div>
                ) : section.links ? (
                  <motion.ul className="list-none p-0 space-y-4" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.6, duration: 0.8 }}>
                    {section.links.map((link, linkIndex) => (
                      <li key={linkIndex} className="text-xl text-left">
                        <Link href={link.url} className="text-blue-400 hover:text-blue-300 transition-colors">
                          {link.text}
                        </Link>
                      </li>
                    ))}
                  </motion.ul>
                ) : null}
              </div>
            </motion.div>
          ))}
        </div>
      </>
    );
  }