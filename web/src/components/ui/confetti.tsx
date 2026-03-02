import { useCallback, useRef, useEffect, useState } from "react"

interface Particle {
    x: number; y: number; vx: number; vy: number
    color: string; size: number; rotation: number; rotSpeed: number
    life: number
}

const COLORS = ["#ff6b6b", "#feca57", "#48dbfb", "#ff9ff3", "#54a0ff", "#5f27cd", "#01a3a4", "#f368e0"]

export function useConfetti() {
    const [active, setActive] = useState(false)
    const fire = useCallback(() => setActive(true), [])
    const done = useCallback(() => setActive(false), [])
    return { active, fire, done }
}

export function ConfettiCanvas({ active, onDone }: { active: boolean; onDone: () => void }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const animationRef = useRef<number>(0)

    useEffect(() => {
        if (!active) return
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return

        canvas.width = window.innerWidth
        canvas.height = window.innerHeight

        const particles: Particle[] = []
        for (let i = 0; i < 150; i++) {
            particles.push({
                x: canvas.width / 2 + (Math.random() - 0.5) * 200,
                y: canvas.height / 2,
                vx: (Math.random() - 0.5) * 16,
                vy: Math.random() * -18 - 4,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                size: Math.random() * 8 + 4,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.3,
                life: 1,
            })
        }

        let frame = 0
        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height)
            let alive = false

            for (const p of particles) {
                if (p.life <= 0) continue
                alive = true
                p.x += p.vx
                p.y += p.vy
                p.vy += 0.4
                p.vx *= 0.99
                p.rotation += p.rotSpeed
                p.life -= 0.012

                ctx.save()
                ctx.translate(p.x, p.y)
                ctx.rotate(p.rotation)
                ctx.globalAlpha = Math.max(0, p.life)
                ctx.fillStyle = p.color
                ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
                ctx.restore()
            }

            frame++
            if (alive && frame < 200) {
                animationRef.current = requestAnimationFrame(animate)
            } else {
                ctx.clearRect(0, 0, canvas.width, canvas.height)
                onDone()
            }
        }

        animationRef.current = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(animationRef.current)
    }, [active, onDone])

    if (!active) return null

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none z-[9999]"
            style={{ width: "100vw", height: "100vh" }}
        />
    )
}
