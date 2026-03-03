import { useNavigate } from "@tanstack/react-router"
import { TrendingUp, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PublicNav() {
    const navigate = useNavigate()
    return (
        <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-7xl">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate({ to: "/" })}>
                    <div className="h-8 w-8 rounded-lg gradient-brand shadow-sm flex items-center justify-center">
                        <TrendingUp className="h-4 w-4 text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight">Stockify</span>
                </div>
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
                    <a href="/about" className="hover:text-foreground transition-colors">About</a>
                    <a href="/features" className="hover:text-foreground transition-colors">Features</a>
                    <a href="/pricing" className="hover:text-foreground transition-colors">Pricing</a>
                    <a href="/resources" className="hover:text-foreground transition-colors">Resources</a>
                </div>
                <div className="flex items-center gap-4">
                    <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => navigate({ to: "/auth" })}>Login</Button>
                    <Button onClick={() => navigate({ to: "/auth" })} className="gradient-brand text-white border-0 shadow-md hover:shadow-lg transition-all rounded-full px-6">
                        Get Started <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                </div>
            </div>
        </nav>
    )
}
