import { useMemo, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useClassCompetitions, type CompetitionItem } from "../hooks"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { Loader2, Save } from "lucide-react"

interface RulesForm {
    name: string
    status: "draft" | "active" | "paused" | "completed" | "archived"
    starting_cash: number
    max_order_size: number
    short_selling_enabled: boolean
    market_hours_mode: "relaxed" | "strict"
}

function toForm(competition?: CompetitionItem): RulesForm {
    const rules = (competition?.rules_json || {}) as Record<string, unknown>
    return {
        name: competition?.name || "Class Competition",
        status: competition?.status || "active",
        starting_cash: Number(rules.starting_cash ?? 100000),
        max_order_size: Number(rules.max_order_size ?? 500),
        short_selling_enabled: Boolean(rules.short_selling_enabled ?? false),
        market_hours_mode: String(rules.market_hours_mode ?? "relaxed") === "strict" ? "strict" : "relaxed"
    }
}

export function RulesEditor({ classId }: { classId: string }) {
    const { data: competitions } = useClassCompetitions(classId)
    const currentCompetition = useMemo(
        () => competitions?.find((c) => c.status === "active") || competitions?.[0],
        [competitions]
    )
    return (
        <RulesEditorInner
            key={currentCompetition?.id || "new-competition"}
            classId={classId}
            currentCompetition={currentCompetition}
        />
    )
}

function RulesEditorInner({ classId, currentCompetition }: { classId: string, currentCompetition?: CompetitionItem }) {
    const queryClient = useQueryClient()
    const [form, setForm] = useState<RulesForm>(toForm(currentCompetition))

    const { mutate: saveSettings, isPending } = useMutation({
        mutationFn: async (next: RulesForm) => {
            return api.post("/teacher-console/competition/upsert_rules", {
                class_id: classId,
                competition_id: currentCompetition?.id,
                name: next.name,
                status: next.status,
                rules_json: {
                    starting_cash: next.starting_cash,
                    max_order_size: next.max_order_size,
                    short_selling_enabled: next.short_selling_enabled,
                    market_hours_mode: next.market_hours_mode
                }
            })
        },
        onSuccess: () => {
            toast.success("Competition rules updated")
            queryClient.invalidateQueries({ queryKey: ["teacher", "competitions", classId] })
        },
        onError: (err: Error) => toast.error(err.message)
    })

    const handleChange = <K extends keyof RulesForm>(key: K, value: RulesForm[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Competition</CardTitle>
                        <CardDescription>Configure active competition metadata and cash baseline.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                value={form.name}
                                onChange={(e) => handleChange("name", e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Starting Cash</Label>
                            <Input
                                type="number"
                                value={form.starting_cash}
                                onChange={(e) => handleChange("starting_cash", Number(e.target.value || 0))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Max Order Size</Label>
                            <Input
                                type="number"
                                value={form.max_order_size}
                                onChange={(e) => handleChange("max_order_size", Number(e.target.value || 0))}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Risk Rules</CardTitle>
                        <CardDescription>Toggle key rule controls for class safety.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Allow Short Selling</Label>
                            <Switch
                                checked={form.short_selling_enabled}
                                onCheckedChange={(v) => handleChange("short_selling_enabled", v)}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>Relaxed Market Hours</Label>
                            <Switch
                                checked={form.market_hours_mode === "relaxed"}
                                onCheckedChange={(v) => handleChange("market_hours_mode", v ? "relaxed" : "strict")}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end">
                <Button onClick={() => saveSettings(form)} disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" /> Save Rules
                </Button>
            </div>
        </div>
    )
}
