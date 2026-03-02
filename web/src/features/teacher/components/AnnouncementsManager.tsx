import { useState } from "react"
import { useClassAnnouncements, useCreateAnnouncement, type Announcement } from "../hooks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2, Plus, Trash2, Megaphone } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

export function AnnouncementsManager({ classId }: { classId: string }) {
    const { data: announcements, isLoading } = useClassAnnouncements(classId)
    const { mutate: createAnnouncement, isPending } = useCreateAnnouncement()

    const [isCreating, setIsCreating] = useState(false)
    const [title, setTitle] = useState("")
    const [content, setContent] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!title || !content) return

        createAnnouncement({
            class_id: classId,
            title,
            content,
            priority: "medium"
        }, {
            onSuccess: () => {
                setIsCreating(false)
                setTitle("")
                setContent("")
            }
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Class Announcements</h3>
                <Button onClick={() => setIsCreating(!isCreating)} variant={isCreating ? "secondary" : "default"}>
                    {isCreating ? "Cancel" : <><Plus className="mr-2 h-4 w-4" /> New Announcement</>}
                </Button>
            </div>

            {isCreating && (
                <Card className="border-dashed bg-muted/30">
                    <CardHeader>
                        <CardTitle className="text-base">Compose Message</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <Input
                                placeholder="Subject / Title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                autoFocus
                            />
                            <Textarea
                                placeholder="Message content..."
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={4}
                            />
                            <div className="flex justify-end">
                                <Button type="submit" disabled={isPending}>
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Post Announcement
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : announcements?.length === 0 ? (
                    <div className="text-center p-8 border rounded-lg bg-muted/10">
                        <Megaphone className="h-8 w-8 mx-auto text-muted-foreground mb-2 opacity-50" />
                        <p className="text-muted-foreground">No announcements posted yet.</p>
                    </div>
                ) : (
                    announcements?.map((item: Announcement) => (
                        <Card key={item.id}>
                            <CardHeader className="py-4">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="text-base flex items-center gap-2">
                                            {item.title}
                                            {item.priority === 'high' && <Badge variant="destructive">Urgent</Badge>}
                                        </CardTitle>
                                        <CardDescription>
                                            {format(new Date(item.created_at), "MMM d, yyyy 'at' h:mm a")}
                                        </CardDescription>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-red-500">
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="py-4 pt-0 text-sm whitespace-pre-wrap">
                                {item.content}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
