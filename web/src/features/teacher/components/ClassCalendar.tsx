import { useState, useMemo } from "react"
import FullCalendar from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/daygrid"
import interactionPlugin from "@fullcalendar/interaction"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog"
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { CalendarDays, Plus, Trash2 } from "lucide-react"

interface CalendarEvent {
    id: string
    title: string
    date: string
    type: "assignment" | "competition" | "event"
    color: string
}

const EVENT_COLORS: Record<string, string> = {
    assignment: "#3b82f6",
    competition: "#f59e0b",
    event: "#8b5cf6",
}

const STORAGE_KEY = "stockify_class_events"

function loadEvents(classId: string): CalendarEvent[] {
    try {
        const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
        return all[classId] || []
    } catch {
        return []
    }
}

function saveEvents(classId: string, events: CalendarEvent[]) {
    try {
        const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
        all[classId] = events
        localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
    } catch { /* ignore */ }
}

export function ClassCalendar({ classId }: { classId: string }) {
    const [events, setEvents] = useState<CalendarEvent[]>(() => loadEvents(classId))
    const [dialogOpen, setDialogOpen] = useState(false)
    const [selectedDate, setSelectedDate] = useState("")
    const [newTitle, setNewTitle] = useState("")
    const [newType, setNewType] = useState<"assignment" | "competition" | "event">("assignment")

    const calendarEvents = useMemo(() =>
        events.map(e => ({
            id: e.id,
            title: e.title,
            date: e.date,
            backgroundColor: e.color,
            borderColor: e.color,
            textColor: "#fff",
        })),
        [events]
    )

    const handleDateClick = (info: { dateStr: string }) => {
        setSelectedDate(info.dateStr)
        setNewTitle("")
        setNewType("assignment")
        setDialogOpen(true)
    }

    const handleAddEvent = () => {
        if (!newTitle.trim()) return
        const newEvent: CalendarEvent = {
            id: `evt-${Date.now()}`,
            title: newTitle.trim(),
            date: selectedDate,
            type: newType,
            color: EVENT_COLORS[newType],
        }
        const updated = [...events, newEvent]
        setEvents(updated)
        saveEvents(classId, updated)
        setDialogOpen(false)
    }

    const handleDeleteEvent = (id: string) => {
        const updated = events.filter(e => e.id !== id)
        setEvents(updated)
        saveEvents(classId, updated)
    }

    return (
        <div className="space-y-4">
            {/* Legend */}
            <div className="flex items-center gap-3 flex-wrap">
                {Object.entries(EVENT_COLORS).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: color }} />
                        <span className="text-xs capitalize text-muted-foreground">{type}</span>
                    </div>
                ))}
                <div className="flex-1" />
                <Badge variant="outline" className="text-xs">
                    {events.length} event{events.length !== 1 ? "s" : ""}
                </Badge>
            </div>

            {/* Calendar */}
            <Card>
                <CardContent className="p-3 [&_.fc]:text-sm [&_.fc-toolbar-title]:text-base [&_.fc-toolbar-title]:font-semibold [&_.fc-button]:text-xs [&_.fc-button]:px-2.5 [&_.fc-button]:py-1 [&_.fc-button]:rounded-md [&_.fc-button-primary]:bg-primary [&_.fc-button-primary]:border-primary [&_.fc-daygrid-day]:cursor-pointer [&_.fc-daygrid-day:hover]:bg-muted/50 [&_.fc-day-today]:bg-primary/5 [&_.fc-event]:text-xs [&_.fc-event]:px-1.5 [&_.fc-event]:py-0.5 [&_.fc-event]:rounded-md [&_.fc-event]:cursor-pointer">
                    <FullCalendar
                        plugins={[dayGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        events={calendarEvents}
                        dateClick={handleDateClick}
                        eventClick={(info) => {
                            if (confirm(`Delete "${info.event.title}"?`)) {
                                handleDeleteEvent(info.event.id)
                            }
                        }}
                        headerToolbar={{
                            left: "prev",
                            center: "title",
                            right: "next",
                        }}
                        height="auto"
                        dayMaxEvents={3}
                    />
                </CardContent>
            </Card>

            {/* Upcoming Events */}
            {events.length > 0 && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" /> Upcoming
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {events
                                .filter(e => new Date(e.date) >= new Date(new Date().toISOString().split("T")[0]))
                                .sort((a, b) => a.date.localeCompare(b.date))
                                .slice(0, 5)
                                .map(event => (
                                    <div key={event.id} className="flex items-center gap-2 text-sm group">
                                        <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: event.color }} />
                                        <span className="flex-1 truncate">{event.title}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(event.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleDeleteEvent(event.id)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Add Event Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Event — {selectedDate}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <Input
                            placeholder="Event title..."
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            autoFocus
                        />
                        <Select value={newType} onValueChange={(v) => setNewType(v as typeof newType)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="assignment">📝 Assignment</SelectItem>
                                <SelectItem value="competition">🏆 Competition</SelectItem>
                                <SelectItem value="event">📅 Event</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleAddEvent} disabled={!newTitle.trim()} className="gap-1.5">
                            <Plus className="h-4 w-4" /> Add Event
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
