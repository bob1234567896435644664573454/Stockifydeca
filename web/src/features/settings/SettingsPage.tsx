import { useState, useEffect, useCallback } from "react"
import { AppShell } from "@/components/layout/AppShell"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/features/auth/AuthContextObject"
import { supabase } from "@/lib/api"

// ─── Types ────────────────────────────────────────────────────────────────────
interface GmailStatus {
    connected: boolean
    gmail_address: string | null
    scopes: string[]
    updated_at: string | null
    configured: boolean
}

interface GitHubStatus {
    connected: boolean
    github_username: string | null
    scopes: string[]
    updated_at: string | null
    configured: boolean
}

interface GitHubProfile {
    login: string
    name: string
    avatar_url: string
    bio: string | null
    public_repos: number
    followers: number
    following: number
    html_url: string
}

interface GitHubRepo {
    id: number
    name: string
    full_name: string
    description: string | null
    html_url: string
    stargazers_count: number
    language: string | null
    updated_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function callEdgeFunction(path: string, method = "GET", body?: unknown) {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    const supabaseUrl = import.meta.env.VITE_SB_URL
    const anonKey = import.meta.env.VITE_SB_ANON_KEY

    const resp = await fetch(`${supabaseUrl}/functions/v1/${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${token}`,
            apikey: anonKey,
            "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
    })
    return resp.json()
}

// ─── Gmail Panel ──────────────────────────────────────────────────────────────
function GmailPanel() {
    const [status, setStatus] = useState<GmailStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    const fetchStatus = useCallback(async () => {
        try {
            const data = await callEdgeFunction("gmail/status")
            setStatus(data)
        } catch {
            setStatus(null)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchStatus()
    }, [fetchStatus])

    // Listen for postMessage from OAuth popup
    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.data?.type === "gmail_connected") {
                setMessage({ type: "success", text: `Gmail connected: ${e.data.email}` })
                fetchStatus()
            }
        }
        window.addEventListener("message", handler)
        return () => window.removeEventListener("message", handler)
    }, [fetchStatus])

    const handleConnect = async () => {
        setActionLoading(true)
        setMessage(null)
        try {
            const data = await callEdgeFunction("gmail/oauth/start")
            if (data.error) {
                setMessage({ type: "error", text: data.error })
                return
            }
            window.open(data.url, "gmail_oauth", "width=600,height=700,popup=1")
        } catch {
            setMessage({ type: "error", text: "Failed to start Gmail OAuth flow." })
        } finally {
            setActionLoading(false)
        }
    }

    const handleSendTest = async () => {
        setActionLoading(true)
        setMessage(null)
        try {
            const data = await callEdgeFunction("gmail/send-test", "POST")
            if (data.error) {
                setMessage({ type: "error", text: data.error })
            } else {
                setMessage({ type: "success", text: `Test email sent to ${data.sent_to}` })
            }
        } catch {
            setMessage({ type: "error", text: "Failed to send test email." })
        } finally {
            setActionLoading(false)
        }
    }

    const handleDisconnect = async () => {
        setActionLoading(true)
        setMessage(null)
        try {
            await callEdgeFunction("gmail/disconnect", "POST")
            setMessage({ type: "success", text: "Gmail disconnected." })
            fetchStatus()
        } catch {
            setMessage({ type: "error", text: "Failed to disconnect Gmail." })
        } finally {
            setActionLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {/* Gmail icon */}
                        <div className="h-10 w-10 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                            <svg className="h-6 w-6" viewBox="0 0 24 24" aria-hidden="true">
                                <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335" />
                            </svg>
                        </div>
                        <div>
                            <CardTitle className="text-base">Gmail</CardTitle>
                            <CardDescription className="text-xs">
                                Send class invitations and announcements from your Gmail account
                            </CardDescription>
                        </div>
                    </div>
                    {status?.connected ? (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">Connected</Badge>
                    ) : (
                        <Badge variant="outline">Not connected</Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {message && (
                    <div className={`p-3 text-sm rounded-md ${message.type === "success"
                        ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                        : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
                        }`}>
                        {message.text}
                    </div>
                )}

                {loading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                ) : !status?.configured ? (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                            Gmail integration requires configuration. Please set <code className="font-mono text-xs">GMAIL_CLIENT_ID</code>, <code className="font-mono text-xs">GMAIL_CLIENT_SECRET</code>, and <code className="font-mono text-xs">GMAIL_TOKEN_ENC_KEY</code> in the Supabase dashboard under Edge Functions &gt; Secrets.
                        </p>
                    </div>
                ) : status?.connected ? (
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-muted-foreground">Connected as:</span>
                            <span className="font-medium">{status.gmail_address}</span>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleSendTest}
                                disabled={actionLoading}
                            >
                                {actionLoading ? "Sending..." : "Send Test Email"}
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={handleDisconnect}
                                disabled={actionLoading}
                            >
                                Disconnect
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        onClick={handleConnect}
                        disabled={actionLoading}
                        className="flex items-center gap-2"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" fill="#EA4335" />
                        </svg>
                        {actionLoading ? "Connecting..." : "Connect Gmail"}
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}

// ─── GitHub Panel ─────────────────────────────────────────────────────────────
function GitHubPanel() {
    const [status, setStatus] = useState<GitHubStatus | null>(null)
    const [profile, setProfile] = useState<{ profile: GitHubProfile; repos: GitHubRepo[] } | null>(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    const fetchStatus = useCallback(async () => {
        try {
            const data = await callEdgeFunction("github-connect/status")
            setStatus(data)
            if (data.connected) {
                const profileData = await callEdgeFunction("github-connect/profile")
                if (!profileData.error) setProfile(profileData)
            }
        } catch {
            setStatus(null)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchStatus()
    }, [fetchStatus])

    useEffect(() => {
        const handler = (e: MessageEvent) => {
            if (e.data?.type === "github_connected") {
                setMessage({ type: "success", text: `GitHub connected as @${e.data.username}` })
                fetchStatus()
            }
        }
        window.addEventListener("message", handler)
        return () => window.removeEventListener("message", handler)
    }, [fetchStatus])

    const handleConnect = async () => {
        setActionLoading(true)
        setMessage(null)
        try {
            const data = await callEdgeFunction("github-connect/oauth/start")
            if (data.error) {
                setMessage({ type: "error", text: data.error })
                return
            }
            window.open(data.url, "github_oauth", "width=600,height=700,popup=1")
        } catch {
            setMessage({ type: "error", text: "Failed to start GitHub OAuth flow." })
        } finally {
            setActionLoading(false)
        }
    }

    const handleDisconnect = async () => {
        setActionLoading(true)
        setMessage(null)
        try {
            await callEdgeFunction("github-connect/disconnect", "POST")
            setMessage({ type: "success", text: "GitHub disconnected." })
            setProfile(null)
            fetchStatus()
        } catch {
            setMessage({ type: "error", text: "Failed to disconnect GitHub." })
        } finally {
            setActionLoading(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <svg className="h-6 w-6" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                        </div>
                        <div>
                            <CardTitle className="text-base">GitHub</CardTitle>
                            <CardDescription className="text-xs">
                                Connect your GitHub profile to showcase your projects and coding activity
                            </CardDescription>
                        </div>
                    </div>
                    {status?.connected ? (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">Connected</Badge>
                    ) : (
                        <Badge variant="outline">Not connected</Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {message && (
                    <div className={`p-3 text-sm rounded-md ${message.type === "success"
                        ? "bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                        : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800"
                        }`}>
                        {message.text}
                    </div>
                )}

                {loading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                ) : !status?.configured ? (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                            GitHub integration requires configuration. Please set <code className="font-mono text-xs">GITHUB_CLIENT_ID</code>, <code className="font-mono text-xs">GITHUB_CLIENT_SECRET</code>, and <code className="font-mono text-xs">GITHUB_TOKEN_ENC_KEY</code> in the Supabase dashboard under Edge Functions &gt; Secrets.
                        </p>
                    </div>
                ) : status?.connected && profile ? (
                    <div className="space-y-4">
                        {/* Profile card */}
                        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                            <img
                                src={profile.profile.avatar_url}
                                alt={profile.profile.login}
                                className="h-12 w-12 rounded-full"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm">{profile.profile.name || profile.profile.login}</p>
                                <p className="text-xs text-muted-foreground">@{profile.profile.login}</p>
                                {profile.profile.bio && (
                                    <p className="text-xs text-muted-foreground mt-1 truncate">{profile.profile.bio}</p>
                                )}
                            </div>
                            <div className="text-right text-xs text-muted-foreground shrink-0">
                                <p>{profile.profile.public_repos} repos</p>
                                <p>{profile.profile.followers} followers</p>
                            </div>
                        </div>

                        {/* Recent repos */}
                        {profile.repos.length > 0 && (
                            <div>
                                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Recent Repositories</p>
                                <div className="space-y-2">
                                    {profile.repos.slice(0, 4).map((repo) => (
                                        <a
                                            key={repo.id}
                                            href={repo.html_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors group"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">{repo.name}</p>
                                                {repo.description && (
                                                    <p className="text-xs text-muted-foreground truncate">{repo.description}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 ml-2">
                                                {repo.language && (
                                                    <span className="px-1.5 py-0.5 bg-muted rounded text-xs">{repo.language}</span>
                                                )}
                                                <span>⭐ {repo.stargazers_count}</span>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                asChild
                            >
                                <a href={profile.profile.html_url} target="_blank" rel="noopener noreferrer">
                                    View Profile
                                </a>
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={handleDisconnect}
                                disabled={actionLoading}
                            >
                                Disconnect
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        onClick={handleConnect}
                        disabled={actionLoading}
                        className="flex items-center gap-2"
                    >
                        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                        {actionLoading ? "Connecting..." : "Connect GitHub"}
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}

// ─── Account Panel ────────────────────────────────────────────────────────────
function AccountPanel() {
    const { user, logout } = useAuth()

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Account</CardTitle>
                <CardDescription className="text-xs">Your Stockify account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="font-bold text-sm text-primary">
                            {user?.email?.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{user?.email}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                            {user?.app_metadata?.role ?? "student"}
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive w-full justify-start"
                    onClick={() => logout()}
                >
                    Sign out
                </Button>
            </CardContent>
        </Card>
    )
}

// ─── Main Settings Page ───────────────────────────────────────────────────────
export function SettingsPage() {
    const { user } = useAuth()
    const role = user?.app_metadata?.role ?? "student"
    const isTeacherOrAbove = role === "teacher" || role === "org_admin" || role === "platform_admin"
    const shellRole: "student" | "teacher" = isTeacherOrAbove ? "teacher" : "student"

    return (
        <AppShell role={shellRole}>
            <div className="max-w-2xl mx-auto p-6 space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage your account and integrations
                    </p>
                </div>

                <AccountPanel />

                {/* Integrations section */}
                <div>
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Integrations
                    </h2>
                    <div className="space-y-4">
                        {/* GitHub is available to all users */}
                        <GitHubPanel />

                        {/* Gmail is only for teachers and above */}
                        {isTeacherOrAbove && <GmailPanel />}
                    </div>
                </div>
            </div>
        </AppShell>
    )
}
