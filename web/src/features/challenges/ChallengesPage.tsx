import { useState, type CSSProperties } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { AppShell } from "@/components/layout/AppShell"
import { useChallenges, useAchievements, useActivityData, type Challenge, type Achievement } from "@/features/challenges/hooks"
import { ActivityCalendar } from "@/features/challenges/ActivityCalendar"
import {
    Trophy, Target, Flame, Star, CheckCircle2,
    Shield, PenLine, BarChart3, Zap, Lock, Medal, CalendarDays
} from "lucide-react"

// Map emoji icon to Lucide component
const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: CSSProperties }>> = {
    "🎯": Target, "📊": BarChart3, "🏆": Trophy, "📝": PenLine,
    "🛡️": Shield, "⚡": Zap, "💡": Star, "🔥": Flame, "🎖️": Medal,
}
function getIcon(icon: string) { return ICON_MAP[icon] ?? Star }

function ChallengeCard({ challenge }: { challenge: Challenge }) {
    const progress = Math.min(100, (challenge.progress / challenge.target) * 100)
    const completed = challenge.completed
    const Icon = getIcon(challenge.icon)

    return (
        <Card className={`overflow-hidden ${completed ? 'border-[hsl(var(--chart-up))]/30 bg-[hsl(var(--chart-up))]/5' : ''}`}>
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${completed ? 'bg-[hsl(var(--chart-up))]/10' : 'bg-primary/10'}`}>
                        {completed ? <CheckCircle2 className="h-5 w-5 text-[hsl(var(--chart-up))]" /> : <Icon className="h-5 w-5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm mb-0.5">{challenge.title}</h3>
                        <p className="text-xs text-muted-foreground">{challenge.description}</p>

                        <div className="mt-2.5">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                                <span>{challenge.progress}/{challenge.target}</span>
                                <span className="flex items-center gap-0.5"><Zap className="h-3 w-3 text-[hsl(var(--warning))]" />{challenge.xp_reward} XP</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${completed ? 'bg-[hsl(var(--chart-up))]' : 'bg-primary'}`} style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function AchievementBadge({ achievement }: { achievement: Achievement }) {
    const unlocked = !!achievement.earned_at
    const Icon = getIcon(achievement.icon)
    const color = unlocked ? "#10b981" : "#6b7280"

    return (
        <div className={`text-center group ${unlocked ? '' : 'opacity-40'}`}>
            <div
                className={`h-16 w-16 mx-auto rounded-2xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110 ${unlocked ? '' : 'grayscale'}`}
                style={{ backgroundColor: `${color}15` }}
            >
                {unlocked ? (
                    <Icon className="h-7 w-7" style={{ color }} />
                ) : (
                    <Lock className="h-6 w-6 text-muted-foreground/50" />
                )}
            </div>
            <div className="text-xs font-semibold">{achievement.title}</div>
            <div className="text-[10px] text-muted-foreground">{achievement.description}</div>
            {unlocked && achievement.earned_at && (
                <div className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(achievement.earned_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </div>
            )}
        </div>
    )
}

export function ChallengesPage() {
    const [tab, setTab] = useState("challenges")
    const { data: challenges = [] } = useChallenges()
    const { data: achievements = [] } = useAchievements()
    const activity = useActivityData()

    const totalXp = challenges.filter(c => c.completed).reduce((s, c) => s + c.xp_reward, 0)
    const unlockedCount = achievements.filter(a => !!a.earned_at).length

    return (
        <AppShell role="student">
            <div className="p-4 md:p-8 space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Challenges & Achievements</h1>
                        <p className="text-sm text-muted-foreground mt-1">Complete missions and unlock badges to prove your skills.</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5">
                            <Trophy className="h-4 w-4 text-[hsl(var(--warning))]" />
                            <span className="font-bold">{unlockedCount}/{achievements.length}</span>
                            <span className="text-muted-foreground">badges</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Zap className="h-4 w-4 text-[hsl(var(--warning))]" />
                            <span className="font-bold stat-number">{totalXp}</span>
                            <span className="text-muted-foreground">XP earned</span>
                        </div>
                    </div>
                </div>

                <Tabs value={tab} onValueChange={setTab}>
                    <TabsList>
                        <TabsTrigger value="challenges" className="gap-1.5"><Target className="h-3.5 w-3.5" />Missions</TabsTrigger>
                        <TabsTrigger value="achievements" className="gap-1.5"><Trophy className="h-3.5 w-3.5" />Achievements</TabsTrigger>
                        <TabsTrigger value="activity" className="gap-1.5"><CalendarDays className="h-3.5 w-3.5" />Activity</TabsTrigger>
                    </TabsList>

                    <TabsContent value="challenges" className="mt-4">
                        <div className="grid gap-3 md:grid-cols-2">
                            {challenges.map(c => <ChallengeCard key={c.id} challenge={c} />)}
                        </div>
                    </TabsContent>

                    <TabsContent value="achievements" className="mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Achievement Collection</CardTitle>
                                <CardDescription>{unlockedCount} of {achievements.length} unlocked</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-6">
                                    {achievements.map(a => <AchievementBadge key={a.id} achievement={a} />)}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="activity" className="mt-4">
                        <ActivityCalendar
                            data={activity.activityData}
                            streak={activity.streak}
                            longestStreak={activity.longestStreak}
                            totalXp={activity.totalXp}
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </AppShell>
    )
}
