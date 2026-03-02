import { useNavigate } from "@tanstack/react-router"
// import { useAuth } from "@/features/auth/AuthContextObject"
import { useTeacherClasses } from "./hooks"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Users } from "lucide-react"
import { AppShell } from "@/components/layout/AppShell"
import { MarketStatusTile } from "./components/MarketStatusTile"
import { EmptyState } from "@/components/ui/states"

export function TeacherDashboard() {
    const navigate = useNavigate()
    const { data: classes } = useTeacherClasses()


    return (
        <AppShell role="teacher">
            <div className="p-8 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Teacher Console</h1>
                        <p className="text-muted-foreground mr-4">Manage your classes and students.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button className="flex items-center gap-2">
                            <Plus className="h-4 w-4" /> New Class
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <MarketStatusTile />
                    {classes?.map(cls => (
                        <Card key={cls.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate({ to: `/teacher/class/${cls.id}` })}>
                            <CardHeader>
                                <CardTitle>{cls.name}</CardTitle>
                                <CardDescription>Section: {cls.section || 'N/A'}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <Users className="mr-2 h-4 w-4" />
                                    <span>Manage Class</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {classes?.length === 0 && (
                        <div className="col-span-full rounded-lg border bg-card">
                            <EmptyState
                                icon={<Users className="h-6 w-6" />}
                                title="No classes yet"
                                description="Create your first class to get started."
                            />
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    )
}
