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

export function AuthPage() {
    const [isLogin, setIsLogin] = useState(true)
    const [loading, setLoading] = useState(false)
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

                                <Button type="submit" disabled={loading} className="w-full">
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
