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

// Schemas
const authSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6, "Password must be at least 6 characters"),
})

type AuthForm = z.infer<typeof authSchema>

// Google SVG icon
function GoogleIcon() {
    return (
        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    )
}

// GitHub SVG icon
function GitHubIcon() {
    return (
        <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
        </svg>
    )
}

export function AuthPage() {
    const [isLogin, setIsLogin] = useState(true)
    const [loading, setLoading] = useState(false)
    const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null)
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
                        data: { role: "student" }, // Default to student
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

    const handleOAuthSignIn = async (provider: "google" | "github") => {
        setOauthLoading(provider)
        setError(null)
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: window.location.origin,
                },
            })
            if (error) {
                // Provider not configured in Supabase dashboard
                if (error.message?.toLowerCase().includes("provider") || error.message?.toLowerCase().includes("not enabled")) {
                    setError(
                        `${provider === "google" ? "Google" : "GitHub"} sign-in is not yet configured. ` +
                        `Please ask your administrator to enable it in the Supabase dashboard under Authentication > Providers.`
                    )
                } else {
                    throw error
                }
            }
        } catch (err: unknown) {
            setError((err as { message?: string }).message || `${provider} sign-in failed`)
        } finally {
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
        <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold tracking-tight">Stockify</CardTitle>
                    <CardDescription>
                        {isLogin ? "Sign in to your account" : "Create a student account"}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {error && (
                        <div className="p-3 text-sm text-red-500 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-md">
                            {error}
                        </div>
                    )}

                    {/* Password Reset Form */}
                    {showReset ? (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Enter your email to receive a password reset link.
                            </p>
                            <div className="space-y-2">
                                <Label htmlFor="reset-email">Email</Label>
                                <Input
                                    id="reset-email"
                                    type="email"
                                    placeholder="student@school.edu"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    disabled={resetSent}
                                />
                            </div>
                            {resetSent ? (
                                <p className="text-sm text-green-600 dark:text-green-400">
                                    ✓ Reset link sent! Check your inbox (and spam folder).
                                </p>
                            ) : (
                                <Button onClick={handlePasswordReset} className="w-full" disabled={!resetEmail}>
                                    Send Reset Link
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                className="w-full"
                                onClick={() => { setShowReset(false); setResetSent(false); setResetEmail("") }}
                            >
                                ← Back to sign in
                            </Button>
                        </div>
                    ) : showResend ? (
                        /* Resend Confirmation Form */
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Enter your email to resend the confirmation link.
                            </p>
                            <div className="space-y-2">
                                <Label htmlFor="resend-email">Email</Label>
                                <Input
                                    id="resend-email"
                                    type="email"
                                    placeholder="student@school.edu"
                                    value={resendEmail}
                                    onChange={(e) => setResendEmail(e.target.value)}
                                    disabled={resendSent}
                                />
                            </div>
                            {resendSent ? (
                                <p className="text-sm text-green-600 dark:text-green-400">
                                    ✓ Confirmation email resent! Check your inbox (and spam folder).
                                </p>
                            ) : (
                                <Button onClick={handleResendConfirmation} className="w-full" disabled={!resendEmail}>
                                    Resend Confirmation
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                className="w-full"
                                onClick={() => { setShowResend(false); setResendSent(false); setResendEmail("") }}
                            >
                                ← Back to sign in
                            </Button>
                        </div>
                    ) : (
                        /* Main Login/SignUp Form */
                        <>
                            {/* OAuth Buttons */}
                            <div className="space-y-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full flex items-center justify-center"
                                    onClick={() => handleOAuthSignIn("google")}
                                    disabled={oauthLoading !== null || loading}
                                >
                                    <GoogleIcon />
                                    {oauthLoading === "google" ? "Redirecting..." : "Continue with Google"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full flex items-center justify-center"
                                    onClick={() => handleOAuthSignIn("github")}
                                    disabled={oauthLoading !== null || loading}
                                >
                                    <GitHubIcon />
                                    {oauthLoading === "github" ? "Redirecting..." : "Continue with GitHub"}
                                </Button>
                            </div>

                            {/* Divider */}
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" placeholder="student@school.edu" {...register("email")} />
                                    {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password">Password</Label>
                                        {isLogin && (
                                            <button
                                                type="button"
                                                onClick={() => setShowReset(true)}
                                                className="text-xs text-primary hover:underline"
                                            >
                                                Forgot password?
                                            </button>
                                        )}
                                    </div>
                                    <Input id="password" type="password" {...register("password")} />
                                    {errors.password && <span className="text-xs text-red-500">{errors.password.message}</span>}
                                </div>

                                <Button type="submit" disabled={loading || oauthLoading !== null} className="w-full">
                                    {loading ? "Loading..." : isLogin ? "Sign In" : "Sign Up"}
                                </Button>
                            </form>

                            <div className="space-y-2 text-center text-sm">
                                <button
                                    type="button"
                                    onClick={() => setIsLogin(!isLogin)}
                                    className="text-primary hover:underline block w-full"
                                >
                                    {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
                                </button>

                                {isLogin && (
                                    <button
                                        type="button"
                                        onClick={() => setShowResend(true)}
                                        className="text-xs text-muted-foreground hover:underline"
                                    >
                                        Did not receive confirmation email?
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
