import { useState } from "react"
import { useNavigate, useLocation } from "@tanstack/react-router"
import type { LinkProps } from "@tanstack/react-router"
import { useAuth } from "@/features/auth/AuthContextObject"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Home, Activity, Trophy, GraduationCap, LogOut, ChevronLeft, ChevronRight, PieChart, BookOpen, PenLine, Target, Dice1, BarChart3, Settings } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"
import { CompetitionBanner } from "@/components/competition-banner"
import { useActiveCompetition } from "@/features/student/hooks"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/lib/api"
import { GlobalCommandPalette } from "./GlobalCommandPalette"
import { OnboardingTour } from "./OnboardingTour"
import { NotificationMenu } from "./NotificationMenu"

interface AppShellProps {
    children: React.ReactNode
    role: "student" | "teacher"
}

interface NavLink {
    href: LinkProps['to']
    label: string
    icon: React.ComponentType<{ className?: string }>
}

export function AppShell({ children, role }: AppShellProps) {
    const { logout, user } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [mobileOpen, setMobileOpen] = useState(false)
    const { data: studentCompetition } = useActiveCompetition()

    const { data: teacherHasActiveCompetition } = useQuery({
        queryKey: ["teacherActiveCompetition", user?.id, role],
        queryFn: async () => {
            if (!user || role !== "teacher") return false
            const { data: classes, error: classErr } = await supabase
                .from("classes")
                .select("id")
                .eq("teacher_id", user.id)
            if (classErr) throw classErr
            const classIds = (classes || []).map((c) => c.id)
            if (classIds.length === 0) return false
            const { data: competitions, error: compErr } = await supabase
                .from("competitions")
                .select("id,status")
                .in("class_id", classIds)
                .eq("status", "active")
                .limit(1)
            if (compErr) throw compErr
            return (competitions || []).length > 0
        },
        enabled: !!user && role === "teacher"
    })

    const competitionStatus: "active" | "ended" = role === "student"
        ? (studentCompetition?.id ? "active" : "ended")
        : (teacherHasActiveCompetition ? "active" : "ended")

    const studentLinks: NavLink[] = [
        { href: "/app", label: "Dashboard", icon: Home },
        { href: "/app/trade", label: "Trade", icon: Activity },
        { href: "/app/portfolio", label: "Portfolio", icon: PieChart },
        { href: "/app/leaderboard", label: "Leaderboard", icon: Trophy },
        { href: "/app/learn", label: "Learn", icon: BookOpen },
        { href: "/app/journal", label: "Journal", icon: PenLine },
        { href: "/app/challenges", label: "Challenges", icon: Target },
        { href: "/app/stock-research", label: "Research", icon: BarChart3 },
        { href: "/app/casino", label: "Casino Math", icon: Dice1 },
        { href: "/app/settings", label: "Settings", icon: Settings },
    ]

    const teacherLinks: NavLink[] = [
        { href: "/teacher", label: "Classes", icon: GraduationCap },
    ]

    const links = role === "student" ? studentLinks : teacherLinks

    const NavItems = () => (
        <nav className="space-y-1" aria-label="Main Navigation">
            {links.map((link, idx) => {
                const Icon = link.icon
                const isActive = location.pathname === link.href || location.pathname.startsWith(link.href + "/")
                return (
                    <Button
                        key={link.href}
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                            "w-full justify-start gap-3 transition-all duration-300 group animate-slide-up",
                            isActive ? "bg-primary/10 text-primary font-semibold shadow-[inset_4px_0_0_0_hsl(var(--primary))]" : "hover:bg-muted/50",
                            !sidebarOpen && "justify-center px-2"
                        )}
                        style={{ animationDelay: `${idx * 50}ms` }}
                        title={!sidebarOpen ? link.label : undefined}
                        aria-label={link.label}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => {
                            navigate({ to: link.href })
                            setMobileOpen(false)
                        }}
                    >
                        <Icon className={cn("h-5 w-5 shrink-0 transition-all duration-300 group-hover:scale-110", isActive ? "text-primary drop-shadow-[0_0_8px_var(--primary)]" : "text-muted-foreground group-hover:text-foreground")} aria-hidden="true" />
                        {sidebarOpen && <span>{link.label}</span>}
                    </Button>
                )
            })}
        </nav>
    )

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <CompetitionBanner status={competitionStatus} />
            <OnboardingTour />

            <div className="flex-1 flex overflow-hidden">
                {/* Desktop Sidebar */}
                <aside
                    className={cn(
                        "hidden md:flex flex-col border-r glass z-10 transition-all duration-300",
                        sidebarOpen ? "w-64" : "w-16"
                    )}
                >
                    <div className={cn("p-4 border-b flex items-center", sidebarOpen ? "justify-between" : "justify-center")}>
                        {sidebarOpen && <span className="font-bold text-xl tracking-tight">Stockify</span>}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
                        >
                            {sidebarOpen ? <ChevronLeft className="h-4 w-4" aria-hidden="true" /> : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
                        </Button>
                    </div>

                    <div className="flex-1 py-6 px-3">
                        <NavItems />
                    </div>

                    <div className="p-3 border-t space-y-2">
                        {/* User Profile / Logout */}
                        <div className={cn("flex items-center gap-3 px-2 py-2", !sidebarOpen && "justify-center")}>
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <span className="font-bold text-xs">{user?.email?.charAt(0).toUpperCase()}</span>
                            </div>
                            {sidebarOpen && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{user?.email}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{role}</p>
                                </div>
                            )}
                        </div>

                        {sidebarOpen && (
                            <div className="flex items-center justify-between px-2">
                                <span className="text-xs text-muted-foreground">Theme</span>
                                <ThemeToggle />
                            </div>
                        )}
                        {!sidebarOpen && (
                            <div className="flex justify-center">
                                <ThemeToggle />
                            </div>
                        )}

                        <Button
                            variant="ghost"
                            className={cn("w-full justify-start gap-3 text-destructive hover:bg-destructive/10", !sidebarOpen && "justify-center px-2")}
                            onClick={() => logout()}
                        >
                            <LogOut className="h-5 w-5 shrink-0" />
                            {sidebarOpen && "Logout"}
                        </Button>
                    </div>
                </aside>

                {/* Mobile & Main Content */}
                <div className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden">
                    {/* Ambient premium background gradient */}
                    <div className="absolute top-0 left-0 right-0 h-[500px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-transparent pointer-events-none -z-0" />

                    {/* Topbar */}
                    <header className="border-b glass h-14 flex items-center justify-between px-4 sticky top-0 z-20">
                        <div className="flex items-center gap-3 md:hidden">
                            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" aria-label="Open menu">
                                        <Menu className="h-5 w-5" aria-hidden="true" />
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="p-0 w-72">
                                    <div className="flex flex-col h-full">
                                        <div className="p-6 border-b">
                                            <h2 className="font-bold text-xl tracking-tight">Stockify</h2>
                                        </div>
                                        <div className="flex-1 py-6 px-4">
                                            <div className="space-y-1">
                                                {links.map(link => {
                                                    const Icon = link.icon
                                                    const isActive = location.pathname === link.href || location.pathname.startsWith(link.href + "/")
                                                    return (
                                                        <Button
                                                            key={link.href}
                                                            variant={isActive ? "secondary" : "ghost"}
                                                            className="w-full justify-start gap-3"
                                                            onClick={() => {
                                                                navigate({ to: link.href })
                                                                setMobileOpen(false)
                                                            }}
                                                        >
                                                            <Icon className="h-5 w-5" />
                                                            {link.label}
                                                        </Button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                        <div className="p-4 border-t">
                                            <Button
                                                variant="ghost"
                                                className="w-full justify-start gap-2 text-destructive"
                                                onClick={() => logout()}
                                            >
                                                <LogOut className="h-4 w-4" />
                                                Logout
                                            </Button>
                                        </div>
                                    </div>
                                </SheetContent>
                            </Sheet>
                            <span className="font-bold md:hidden">Stockify</span>
                        </div>

                        {/* Global Symbol Search / Command Palette */}
                        <div className="flex-1 flex items-center justify-end gap-4 ml-auto">
                            <GlobalCommandPalette />

                            {/* Notifications Bell */}
                            <NotificationMenu />

                            {/* Mobile User Profile */}
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex md:hidden items-center justify-center shrink-0">
                                <span className="font-bold text-xs">{user?.email?.charAt(0).toUpperCase()}</span>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 overflow-auto bg-muted/10 relative">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    )
}
