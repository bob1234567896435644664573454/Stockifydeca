import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { supabase } from "@/lib/api"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { TrendingUp, Github, Mail, Loader2 } from "lucide-react"

const authSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters"),
})

type AuthForm = z.infer<typeof authSchema>

export function AuthPage() {
    const [isLogin, setIsLogin] = useState(true)
    const [loading, setLoading] = useState(false)
    const [oauthLoading, setOauthLoading] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [resetEmail, setResetEmail] = useState("")
    const [showReset, setShowReset] = useState(false)
    const [resetSent, setResetSent] = useState(false)
    const [resendEmail, setResendEmail] = useState("")
    const [showResend, setShowResend] = useState(false)
    const [resendSent, setResendSent] = useState(false)
    const navigate = useNavigate()

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<AuthForm>({
        resolver: zodResolver(authSchema),
    })

    const onSubmit = async (data: AuthForm) => {
        setLoading(true)
        setError(null)
        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email: data.email,
                    password: data.password,
                })
                if (error) throw error
            } else {
                const { error } = await supabase.auth.signUp({
                    email: data.email,
                    password: data.password,
                    options: {
                        data: { role: "student" },
                    },
                })
                if (error) throw error
            }
            navigate({ to: "/" })
        } catch (err: unknown) {
            const error = err as { status?: number; message?: string }
            if (error.status === 429) {
                setError("Rate limit exceeded. Please ask your teacher for an invite or try again later.")
            } else {
                setError(error.message || "Authentication failed")
            }
        } finally {
            setLoading(false)
        }
    }

    const handleOAuth = async (provider: "google" | "github") => {
        setOauthLoading(provider)
        setError(null)
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: window.location.origin + "/app",
                },
            })
            if (error) throw error
        } catch (err: unknown) {
            setError((err as { message?: string }).message || `Failed to sign in with ${provider}`)
            setOauthLoading(null)
        }
    }

    const handlePasswordReset = async () => {
        if (!resetEmail) return
        setError(null)
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: window.location.origin + '/auth',
            })
            if (error) throw error
            setResetSent(true)
        } catch (err: unknown) {
            setError((err as { message?: string }).message || "Failed to send reset email")
        }
    }

    const handleResendConfirmation = async () => {
        if (!resendEmail) return
        setError(null)
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: resendEmail,
            })
            if (error) throw error
            setResendSent(true)
        } catch (err: unknown) {
            setError((err as { message?: string }).message || "Failed to resend confirmation")
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
            {/* Background effects */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[hsl(var(--accent-indigo))]/10 rounded-full blur-[100px] -z-10 pointer-events-none" />

            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-8 cursor-pointer" onClick={() => navigate({ to: "/" })}>
                    <div className="h-10 w-10 rounded-xl gradient-brand shadow-md flex items-center justify-center">
                        <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <span className="font-bold text-2xl tracking-tight">Stockify</span>
                </div>

                <Card className="glass border-border/50 shadow-2xl">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="text-2xl font-bold tracking-tight">
                            {isLogin ? "Welcome back" : "Create your account"}
                        </CardTitle>
                        <CardDescription>
                            {isLogin ? "Sign in to continue your learning journey" : "Start your financial literacy journey today"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-4">
                        {error && (
                            <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg">
                                {error}
                            </div>
                        )}

                        {showReset ? (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">Enter your email to receive a password reset link.</p>
                                <div className="space-y-2">
                                    <Label htmlFor="reset-email">Email</Label>
                                    <Input id="reset-email" type="email" placeholder="student@school.edu" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} disabled={resetSent} className="h-11" />
                                </div>
                                {resetSent ? (
                                    <p className="text-sm text-green-600 dark:text-green-400">Reset link sent! Check your inbox.</p>
                                ) : (
                                    <Button onClick={handlePasswordReset} className="w-full h-11 gradient-brand text-white" disabled={!resetEmail}>Send Reset Link</Button>
                                )}
                                <Button variant="ghost" className="w-full" onClick={() => { setShowReset(false); setResetSent(false); setResetEmail("") }}>Back to sign in</Button>
                            </div>
                        ) : showResend ? (
                            <div className="space-y-4">
                                <p className="text-sm text-muted-foreground">Enter your email to resend the confirmation link.</p>
                                <div className="space-y-2">
                                    <Label htmlFor="resend-email">Email</Label>
                                    <Input id="resend-email" type="email" placeholder="student@school.edu" value={resendEmail} onChange={(e) => setResendEmail(e.target.value)} disabled={resendSent} className="h-11" />
                                </div>
                                {resendSent ? (
                                    <p className="text-sm text-green-600 dark:text-green-400">Confirmation email resent!</p>
                                ) : (
                                    <Button onClick={handleResendConfirmation} className="w-full h-11 gradient-brand text-white" disabled={!resendEmail}>Resend Confirmation</Button>
                                )}
                                <Button variant="ghost" className="w-full" onClick={() => { setShowResend(false); setResendSent(false); setResendEmail("") }}>Back to sign in</Button>
                            </div>
                        ) : (
                            <>
                                {/* OAuth Buttons */}
                                <div className="space-y-3">
                                    <Button
                                        variant="outline"
                                        className="w-full h-11 gap-3 font-medium"
                                        onClick={() => handleOAuth("google")}
                                        disabled={!!oauthLoading}
                                    >
                                        {oauthLoading === "google" ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <svg className="h-4 w-4" viewBox="0 0 24 24">
                                                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                            </svg>
                                        )}
                                        Continue with Google
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="w-full h-11 gap-3 font-medium"
                                        onClick={() => handleOAuth("github")}
                                        disabled={!!oauthLoading}
                                    >
                                        {oauthLoading === "github" ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Github className="h-4 w-4" />
                                        )}
                                        Continue with GitHub
                                    </Button>
                                </div>

                                {/* Divider */}
                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
                                    </div>
                                </div>

                                {/* Email/Password Form */}
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input id="email" type="email" placeholder="student@school.edu" {...register("email")} className="h-11" />
                                        {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <Label htmlFor="password">Password</Label>
                                            {isLogin && (
                                                <button type="button" onClick={() => setShowReset(true)} className="text-xs text-primary hover:underline">
                                                    Forgot password?
                                                </button>
                                            )}
                                        </div>
                                        <Input id="password" type="password" {...register("password")} className="h-11" />
                                        {errors.password && <span className="text-xs text-red-500">{errors.password.message}</span>}
                                    </div>
                                    <Button type="submit" disabled={loading} className="w-full h-11 gradient-brand text-white font-medium">
                                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
                                        {loading ? "Loading..." : isLogin ? "Sign In with Email" : "Sign Up with Email"}
                                    </Button>
                                </form>

                                <div className="space-y-2 text-center text-sm">
                                    <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline block w-full font-medium">
                                        {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
                                    </button>
                                    {isLogin && (
                                        <button type="button" onClick={() => setShowResend(true)} className="text-xs text-muted-foreground hover:underline">
                                            Did not receive confirmation email?
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-muted-foreground mt-6">
                    By continuing, you agree to our{" "}
                    <a href="/terms" className="text-primary hover:underline">Terms of Service</a>{" "}
                    and{" "}
                    <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
                </p>
            </div>
        </div>
    )
}
