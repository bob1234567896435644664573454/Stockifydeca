import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { api } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CheckCircle2, School } from "lucide-react"
import { toast } from "sonner"

type Step = "code" | "confirm" | "success"

interface ClassDetails {
    id: string
    name: string
    teacher_name: string
    section?: string
}

export function JoinClassWizard() {
    const [step, setStep] = useState<Step>("code")
    const [code, setCode] = useState("")
    const [classDetails, setClassDetails] = useState<ClassDetails | null>(null)
    const navigate = useNavigate()
    const queryClient = useQueryClient()

    // Mutation to resolve code to class details
    const resolveCodeMutation = useMutation({
        mutationFn: async (code: string) => {
            return api.post<ClassDetails>("/class/resolve-code", { code })
        },
        onSuccess: (data) => {
            setClassDetails(data)
            setStep("confirm")
        },
        onError: (err: Error) => {
            toast.error(err.message || "Invalid class code")
        }
    })

    // Mutation to actually join
    const joinClassMutation = useMutation({
        mutationFn: async (classId: string) => {
            return api.post("/class/join", { class_id: classId })
        },
        onSuccess: () => {
            setStep("success")
            queryClient.invalidateQueries({ queryKey: ["student", "classes"] }) // Invalidate student classes
            toast.success("Successfully joined class!")
        },
        onError: (err: Error) => {
            toast.error(err.message || "Failed to join class")
        }
    })

    const handleCodeSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (code.length < 6) return
        resolveCodeMutation.mutate(code)
    }

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle>Join Your Class</CardTitle>
                <CardDescription>
                    {step === "code" && "Enter the 6-character code provided by your teacher."}
                    {step === "confirm" && "Confirm these details are correct."}
                    {step === "success" && "You're all set!"}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {step === "code" && (
                    <form onSubmit={handleCodeSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="code">Class Code</Label>
                            <Input
                                id="code"
                                placeholder="e.g. A1B2C3"
                                value={code}
                                onChange={(e) => setCode(e.target.value.toUpperCase())}
                                maxLength={6}
                                className="text-center text-2xl tracking-widest uppercase"
                            />
                        </div>
                        <Button
                            type="submit"
                            className="w-full"
                            disabled={code.length < 6 || resolveCodeMutation.isPending}
                        >
                            {resolveCodeMutation.isPending ? <Loader2 className="animate-spin" /> : "Next"}
                        </Button>
                    </form>
                )}

                {step === "confirm" && classDetails && (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/50">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                <School className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="font-semibold">{classDetails.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                    {classDetails.teacher_name} • {classDetails.section || "No Section"}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1" onClick={() => setStep("code")}>
                                Back
                            </Button>
                            <Button
                                className="flex-1"
                                onClick={() => joinClassMutation.mutate(classDetails.id)}
                                disabled={joinClassMutation.isPending}
                            >
                                {joinClassMutation.isPending ? <Loader2 className="animate-spin" /> : "Join Class"}
                            </Button>
                        </div>
                    </div>
                )}

                {step === "success" && (
                    <div className="text-center space-y-6 py-4">
                        <div className="flex justify-center">
                            <CheckCircle2 className="h-16 w-16 text-green-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-medium">Welcome to Stockify!</h3>
                            <p className="text-muted-foreground">Your portfolio has been created.</p>
                        </div>
                        <Button className="w-full" onClick={() => navigate({ to: "/" })}>
                            Go to Dashboard
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
