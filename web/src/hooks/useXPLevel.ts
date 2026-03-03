import { useState, useEffect, useMemo } from "react"
import { useChallenges } from "@/features/challenges/hooks"

const XP_PER_LEVEL = 100
const STORAGE_KEY = "stockify_last_level"

export function computeLevel(xp: number) {
    return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1)
}

export function xpForNextLevel(xp: number) {
    const level = computeLevel(xp)
    return level * XP_PER_LEVEL
}

export function useXPLevel() {
    const { data: challenges = [] } = useChallenges()
    const [showLevelUp, setShowLevelUp] = useState(false)

    const totalXp = useMemo(
        () => challenges.filter(c => c.completed).reduce((sum, c) => sum + c.xp_reward, 0),
        [challenges]
    )

    const level = computeLevel(totalXp)
    const nextLevelXp = xpForNextLevel(totalXp)
    const progress = totalXp > 0 ? ((totalXp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100 : 0

    useEffect(() => {
        const lastLevel = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10)
        localStorage.setItem(STORAGE_KEY, String(level))
        if (level > lastLevel && lastLevel > 0) {
            const id = requestAnimationFrame(() => setShowLevelUp(true))
            return () => cancelAnimationFrame(id)
        }
    }, [level])

    const dismissLevelUp = () => setShowLevelUp(false)

    return { totalXp, level, nextLevelXp, progress, showLevelUp, dismissLevelUp }
}
