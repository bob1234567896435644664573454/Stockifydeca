import { useState, useEffect } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { useAuth } from "@/features/auth/AuthContextObject"
import { supabase } from "@/lib/api"
import {
    Settings, Mail, Github, User, Bell, Shield, Palette,
    CheckCircle2, XCircle, Loader2, Link2, Unlink
} from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

interface ConnectionStatus {
    gmail: { connected: boolean; email?: string; connectedAt?: string }
    github: { connected: boolean; username?: string; avatarUrl?: string; connectedAt?: string }
}

export function SettingsPage() {
    const { user } = useAuth()
    const [connections, setConnections] = useState<ConnectionStatus>({
        gmail: { connected: false },
        github: { connected: false },
    })
    const [, setLoading] = useState(true)
    const [connecting, setConnecting] = useState<string | null>(null)
    const [notifications, setNotifications] = useState({
        tradeConfirmations: true,
        dailyDigest: false,
        competitionUpdates: true,
        aiInsights: true,
    })

    useEffect(() => {
        loadConnections()
    }, [user])

    const loadConnections = async () => {
        if (!user) return
        setLoading(true)
        try {
            const [gmailRes, githubRes] = await Promise.all([
                supabase.from("gmail_connections").select("*").eq("user_id", user.id).maybeSingle(),
                supabase.from("github_connections").select("*").eq("user_id", user.id).maybeSingle(),
            ])
            setConnections({
                gmail: gmailRes.data ? { connected: true, email: gmailRes.data.email, connectedAt: gmailRes.data.connected_at } : { connected: false },
                github: githubRes.data ? { connected: true, username: githubRes.data.github_username, avatarUrl: githubRes.data.github_avatar_url, connectedAt: githubRes.data.connected_at } : { connected: false },
            })
        } catch (err) {
            console.error("Failed to load connections:", err)
        } finally {
            setLoading(false)
        }
    }

    const connectGmail = async () => {
        setConnecting("gmail")
        try {
            // In production, this would trigger OAuth flow
            // For demo, we use the user's auth email
            const email = user?.email || "user@gmail.com"
            const { error } = await supabase.from("gmail_connections").upsert({
                user_id: user!.id,
                email,
                connected_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" })
            if (error) throw error
            setConnections(c => ({ ...c, gmail: { connected: true, email, connectedAt: new Date().toISOString() } }))
        } catch (err) {
            console.error("Gmail connection failed:", err)
        } finally {
            setConnecting(null)
        }
    }

    const disconnectGmail = async () => {
        setConnecting("gmail")
        try {
            await supabase.from("gmail_connections").delete().eq("user_id", user!.id)
            setConnections(c => ({ ...c, gmail: { connected: false } }))
        } catch (err) {
            console.error("Gmail disconnect failed:", err)
        } finally {
            setConnecting(null)
        }
    }

    const connectGithub = async () => {
        setConnecting("github")
        try {
            // In production, this would trigger GitHub OAuth
            const meta = user?.user_metadata || {}
            const username = meta.user_name || meta.preferred_username || user?.email?.split("@")[0] || "user"
            const avatarUrl = meta.avatar_url || `https://github.com/${username}.png`
            const { error } = await supabase.from("github_connections").upsert({
                user_id: user!.id,
                github_username: username,
                github_avatar_url: avatarUrl,
                connected_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" })
            if (error) throw error
            setConnections(c => ({ ...c, github: { connected: true, username, avatarUrl, connectedAt: new Date().toISOString() } }))
        } catch (err) {
            console.error("GitHub connection failed:", err)
        } finally {
            setConnecting(null)
        }
    }

    const disconnectGithub = async () => {
        setConnecting("github")
        try {
            await supabase.from("github_connections").delete().eq("user_id", user!.id)
            setConnections(c => ({ ...c, github: { connected: false } }))
        } catch (err) {
            console.error("GitHub disconnect failed:", err)
        } finally {
            setConnecting(null)
        }
    }

    return (
        <AppShell role="student">
            <div className="p-6 max-w-4xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                        <Settings className="h-8 w-8 text-primary" /> Settings
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage your account, connections, and preferences.</p>
                </div>

                {/* Profile */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Profile</CardTitle>
                        <CardDescription>Your account information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                                {user?.email?.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <div className="font-bold text-lg">{user?.user_metadata?.display_name || user?.email}</div>
                                <div className="text-sm text-muted-foreground">{user?.email}</div>
                                <Badge variant="secondary" className="mt-1 capitalize">{user?.app_metadata?.role || "student"}</Badge>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Connected Services */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Link2 className="h-5 w-5" /> Connected Services</CardTitle>
                        <CardDescription>Connect external services to enhance your Stockify experience.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Gmail Connection */}
                        <div className="flex items-center justify-between p-4 rounded-xl border bg-card/50">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                                    <Mail className="h-6 w-6 text-red-500" />
                                </div>
                                <div>
                                    <div className="font-bold flex items-center gap-2">
                                        Gmail
                                        {connections.gmail.connected ? (
                                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                                                <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">
                                                <XCircle className="h-3 w-3 mr-1" /> Not Connected
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {connections.gmail.connected
                                            ? `Connected as ${connections.gmail.email}`
                                            : "Receive trade confirmations and portfolio reports via email."
                                        }
                                    </div>
                                </div>
                            </div>
                            {connections.gmail.connected ? (
                                <Button variant="outline" size="sm" onClick={disconnectGmail} disabled={connecting === "gmail"}>
                                    {connecting === "gmail" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4 mr-1" />}
                                    Disconnect
                                </Button>
                            ) : (
                                <Button size="sm" onClick={connectGmail} disabled={connecting === "gmail"} className="gradient-brand text-white">
                                    {connecting === "gmail" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Link2 className="h-4 w-4 mr-1" />}
                                    Connect
                                </Button>
                            )}
                        </div>

                        {/* GitHub Connection */}
                        <div className="flex items-center justify-between p-4 rounded-xl border bg-card/50">
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-gray-500/10 flex items-center justify-center">
                                    <Github className="h-6 w-6" />
                                </div>
                                <div>
                                    <div className="font-bold flex items-center gap-2">
                                        GitHub
                                        {connections.github.connected ? (
                                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                                                <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">
                                                <XCircle className="h-3 w-3 mr-1" /> Not Connected
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                        {connections.github.connected
                                            ? `Connected as @${connections.github.username}`
                                            : "Link your GitHub for project-based learning and code challenges."
                                        }
                                    </div>
                                </div>
                            </div>
                            {connections.github.connected ? (
                                <Button variant="outline" size="sm" onClick={disconnectGithub} disabled={connecting === "github"}>
                                    {connecting === "github" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlink className="h-4 w-4 mr-1" />}
                                    Disconnect
                                </Button>
                            ) : (
                                <Button size="sm" onClick={connectGithub} disabled={connecting === "github"} className="gradient-brand text-white">
                                    {connecting === "github" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Link2 className="h-4 w-4 mr-1" />}
                                    Connect
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Notifications */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" /> Notifications</CardTitle>
                        <CardDescription>Choose what notifications you receive.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[
                            { key: "tradeConfirmations" as const, label: "Trade Confirmations", desc: "Get notified when your orders are filled." },
                            { key: "dailyDigest" as const, label: "Daily Digest", desc: "Receive a daily summary of your portfolio performance." },
                            { key: "competitionUpdates" as const, label: "Competition Updates", desc: "Leaderboard changes and competition announcements." },
                            { key: "aiInsights" as const, label: "AI Insights", desc: "Personalized insights from your AI mentor." },
                        ].map(item => (
                            <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                                <div>
                                    <div className="font-medium text-sm">{item.label}</div>
                                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                                </div>
                                <Switch
                                    checked={notifications[item.key]}
                                    onCheckedChange={(checked) => setNotifications(n => ({ ...n, [item.key]: checked }))}
                                />
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Appearance */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" /> Appearance</CardTitle>
                        <CardDescription>Customize the look and feel.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-3">
                            <div>
                                <div className="font-medium text-sm">Theme</div>
                                <div className="text-xs text-muted-foreground">Switch between light and dark mode.</div>
                            </div>
                            <ThemeToggle />
                        </div>
                    </CardContent>
                </Card>

                {/* Security */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Security</CardTitle>
                        <CardDescription>Manage your account security.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                            <div>
                                <div className="font-medium text-sm">Change Password</div>
                                <div className="text-xs text-muted-foreground">Update your account password.</div>
                            </div>
                            <Button variant="outline" size="sm" onClick={async () => {
                                if (user?.email) {
                                    await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: window.location.origin + "/auth" })
                                    alert("Password reset email sent!")
                                }
                            }}>
                                Reset Password
                            </Button>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                            <div>
                                <div className="font-medium text-sm text-destructive">Delete Account</div>
                                <div className="text-xs text-muted-foreground">Permanently delete your account and all data.</div>
                            </div>
                            <Button variant="destructive" size="sm" disabled>Contact Support</Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </AppShell>
    )
}
