import * as React from "react"
import { useNavigate } from "@tanstack/react-router"
import {
    LineChart,
    LayoutDashboard,
    GraduationCap,
    Trophy,
    BookOpenText,
    Swords,
    LogOut,
    Moon,
    Sun,
    Laptop,
    PieChart
} from "lucide-react"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import { useTheme } from "next-themes"

export function GlobalCommandPalette() {
    const [open, setOpen] = React.useState(false)
    const { setTheme } = useTheme()
    const navigate = useNavigate()

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [])

    return (
        <>
            <div className="hidden md:flex flex-1 items-center space-x-2 w-full max-w-sm ml-auto mr-auto">
                <button
                    onClick={() => setOpen(true)}
                    className="inline-flex items-center whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input hover:bg-accent hover:text-accent-foreground px-4 py-2 relative h-8 w-full justify-start rounded-[0.5rem] bg-muted/50 text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
                >
                    <span className="hidden lg:inline-flex">Search symbols or commands...</span>
                    <span className="inline-flex lg:hidden">Search...</span>
                    <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                </button>
            </div>

            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>

                    <CommandGroup heading="Market Data">
                        <CommandItem onSelect={() => runCommand(() => navigate({ to: "/app/markets/heatmap" }))}>
                            <PieChart className="mr-2 h-4 w-4" />
                            <span>Sector Heatmap</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate({ to: "/app/trade/$symbol", params: { symbol: "AAPL" } }))}>
                            <LineChart className="mr-2 h-4 w-4" />
                            <span>Trade Apple (AAPL)</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate({ to: "/app/trade/$symbol", params: { symbol: "MSFT" } }))}>
                            <LineChart className="mr-2 h-4 w-4" />
                            <span>Trade Microsoft (MSFT)</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate({ to: "/app/trade/$symbol", params: { symbol: "TSLA" } }))}>
                            <LineChart className="mr-2 h-4 w-4" />
                            <span>Trade Tesla (TSLA)</span>
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />

                    <CommandGroup heading="Quick Links">
                        <CommandItem onSelect={() => runCommand(() => navigate({ to: "/app" }))}>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>Student Dashboard</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate({ to: "/app/learn" }))}>
                            <GraduationCap className="mr-2 h-4 w-4" />
                            <span>Learn Hub</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate({ to: "/app/leaderboard" }))}>
                            <Trophy className="mr-2 h-4 w-4" />
                            <span>Leaderboard</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate({ to: "/app/journal" }))}>
                            <BookOpenText className="mr-2 h-4 w-4" />
                            <span>Trading Journal</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => navigate({ to: "/app/challenges" }))}>
                            <Swords className="mr-2 h-4 w-4" />
                            <span>Active Challenges</span>
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />

                    <CommandGroup heading="Theme Settings">
                        <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
                            <Sun className="mr-2 h-4 w-4" />
                            <span>Light Mode</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
                            <Moon className="mr-2 h-4 w-4" />
                            <span>Dark Mode</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
                            <Laptop className="mr-2 h-4 w-4" />
                            <span>System Theme</span>
                        </CommandItem>
                    </CommandGroup>

                    <CommandSeparator />
                    <CommandGroup heading="Account">
                        <CommandItem onSelect={() => runCommand(() => navigate({ to: "/auth" }))}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </CommandItem>
                    </CommandGroup>

                </CommandList>
            </CommandDialog>
        </>
    )
}
