
import { useState } from "react"
import { useNavigate, useLocation } from "@tanstack/react-router"
import type { LinkProps } from "@tanstack/react-router"
import { useAuth } from "@/features/auth/AuthContextObject"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Menu, Home, Activity, Trophy, GraduationCap, LogOut, PieChart, BookOpen } from "lucide-react"

interface DashboardLayoutProps {
    children: React.ReactNode
    role: "student" | "teacher"
}

interface NavLink {
    href: LinkProps['to']
    label: string
    icon: React.ComponentType<{ className?: string }>
}

export function DashboardLayout({ children, role }: DashboardLayoutProps) {
    const { logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [open, setOpen] = useState(false)

    const studentLinks: NavLink[] = [
        { href: "/app", label: "Dashboard", icon: Home },
        { href: "/app/trade", label: "Trade", icon: Activity },
        { href: "/app/leaderboard", label: "Leaderboard", icon: Trophy },
        { href: "/app/markets/heatmap", label: "Heatmap", icon: PieChart },
    ]

    const teacherLinks: NavLink[] = [
        { href: "/teacher", label: "Classes", icon: GraduationCap },
        { href: "/teacher/lessons", label: "Lessons", icon: BookOpen },
    ]

    const links = role === "student" ? studentLinks : teacherLinks

    const NavContent = () => (
        <div className="flex flex-col h-full">
            <div className="p-6 border-b">
                <h2 className="font-bold text-xl tracking-tight">Stockify</h2>
            </div>
            <div className="flex-1 py-6 px-4 space-y-2">
                {links.map(link => {
                    const Icon = link.icon
                    const isActive = location.pathname === link.href || location.pathname.startsWith(link.href + "/")
                    return (
                        <Button
                            key={link.href}
                            variant={isActive ? "secondary" : "ghost"}
                            className="w-full justify-start gap-2"
                            onClick={() => {
                                navigate({ to: link.href })
                                setOpen(false)
                            }}
                        >
                            <Icon className="h-4 w-4" />
                            {link.label}
                        </Button>
                    )
                })}
            </div>
            <div className="p-4 border-t">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
                    onClick={() => logout()}
                >
                    <LogOut className="h-4 w-4" />
                    Logout
                </Button>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-background flex">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 flex-col border-r bg-card">
                <NavContent />
            </aside>

            {/* Mobile Header & Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="md:hidden border-b bg-card p-4 flex items-center justify-between">
                    <span className="font-bold">Stockify</span>
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Menu className="h-5 w-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-64">
                            <NavContent />
                        </SheetContent>
                    </Sheet>
                </header>

                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    )
}
