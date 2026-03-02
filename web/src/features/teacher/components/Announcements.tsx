import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { toast } from "sonner"

export function Announcements({ classId: _classId }: { classId: string }) {
    const [message, setMessage] = useState("")

    const handleSend = () => {
        if (!message.trim()) return
        toast.success("Announcement broadcasted to class")
        setMessage("")
    }

    return (
        <Card className="border-none shadow-none">
            <CardHeader className="px-0">
                <CardTitle>Class Announcements</CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-4">
                <div className="space-y-2">
                    <Textarea
                        placeholder="Type a message to broadcast to all students..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        rows={4}
                    />
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleSend} disabled={!message.trim()}>
                        Broadcast Message
                    </Button>
                </div>

                <div className="pt-6">
                    <h3 className="text-sm font-medium mb-4">Recent History</h3>
                    <div className="space-y-4">
                        <div className="text-sm border-l-2 border-primary pl-4 py-1">
                            <p className="font-medium text-xs text-muted-foreground mb-1">Yesterday, 10:00 AM</p>
                            <p>Remember to close your positions before Friday!</p>
                        </div>
                        <div className="text-sm border-l-2 border-muted pl-4 py-1">
                            <p className="font-medium text-xs text-muted-foreground mb-1">Mon, 9:00 AM</p>
                            <p>Welcome to the Spring Trading Competition.</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
