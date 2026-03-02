import { useState } from "react"
import { Bell, Check, Clock, Info } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"

interface Notification {
    id: string
    title: string
    description: string
    time: string
    read: boolean
    type: "info" | "success" | "warning"
}

// Initial mock data, but structure matches what we'll eventually pull from DB
const initialNotifs: Notification[] = [
    {
        id: "1",
        title: "Market Open",
        description: "The market is now open for trading.",
        time: "2m ago",
        read: false,
        type: "info"
    },
    {
        id: "2",
        title: "Trade Filled",
        description: "Your limit order for 10 AAPL @ $175.00 has been filled.",
        time: "1h ago",
        read: false,
        type: "success"
    },
    {
        id: "3",
        title: "New Assignment",
        description: "Your teacher has posted a new module: Understanding RSI.",
        time: "Yesterday",
        read: true,
        type: "info"
    }
]

export function NotificationMenu() {
    const [notifications, setNotifications] = useState(initialNotifs)
    const unreadCount = notifications.filter(n => !n.read).length

    const markAllRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })))
    }

    const markRead = (id: string) => {
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n))
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary animate-pulse" />
                    )}
                    <span className="sr-only">Notifications</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
                <div className="flex items-center justify-between border-b px-4 py-3">
                    <p className="font-semibold text-sm">Notifications</p>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-muted-foreground h-auto px-2 py-1"
                            onClick={markAllRead}
                        >
                            <Check className="mr-1 h-3 w-3" />
                            Mark all read
                        </Button>
                    )}
                </div>
                <div className="max-h-[300px] overflow-auto">
                    {notifications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                            <Bell className="h-8 w-8 mb-2 opacity-50" />
                            <p className="text-sm">No new notifications</p>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            {notifications.map((notif) => (
                                <button
                                    key={notif.id}
                                    onClick={() => markRead(notif.id)}
                                    className={`flex items-start gap-3 p-4 text-left transition-colors hover:bg-muted/50 ${!notif.read ? 'bg-muted/20' : ''}`}
                                >
                                    <div className={`mt-0.5 rounded-full p-1.5 ${notif.type === 'success' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                        <Info className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 space-y-1 overflow-hidden">
                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`text-sm font-medium leading-none ${!notif.read ? '' : 'text-muted-foreground'}`}>
                                                {notif.title}
                                            </p>
                                            {!notif.read && (
                                                <span className="h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {notif.description}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground flex items-center pt-1">
                                            <Clock className="mr-1 h-3 w-3" />
                                            {notif.time}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
