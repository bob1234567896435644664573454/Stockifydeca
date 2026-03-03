import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { usePositions } from "@/features/student/hooks"
import { useActiveAccount } from "@/hooks/useActiveAccount"
import { computePortfolioMetrics, type PositionData } from "@/lib/portfolio-calc"
import { formatCurrency } from "@/lib/utils"
import {
    Sparkles, Send, Bot, User, ChevronDown,
    GraduationCap, BarChart3, Brain, Zap, AlertTriangle,
    Loader2, Wifi, WifiOff
} from "lucide-react"
import {
    rateLimiter,
    safeParseDailyBriefData,
    safeParseTradeMentorResponse,
    type DailyBriefData,
    type TradeMentorResponse,
} from "@/lib/ai-contracts"
import { toast } from "sonner"

interface Message {
    id: string
    role: "assistant" | "user"
    content: string
    timestamp: Date
    source?: "ai" | "rules" | "fallback"
}

const MODES = [
    { id: "coach", label: "Coach", icon: GraduationCap, description: "Guides your learning journey", systemPrompt: "You are a friendly investing coach for a high school student. Guide their learning, celebrate good process, and gently correct misconceptions. Keep responses under 150 words. Always be encouraging but honest." },
    { id: "analyst", label: "Analyst", icon: BarChart3, description: "Interprets portfolio data", systemPrompt: "You are a portfolio analyst for a student investor. Analyze their portfolio metrics, explain risk/return tradeoffs, and provide data-driven insights. Keep responses under 150 words. Use specific numbers from their portfolio context." },
    { id: "socratic", label: "Socratic", icon: Brain, description: "Asks probing questions", systemPrompt: "You are a Socratic investing mentor. Never give direct answers. Instead, ask thoughtful questions that help the student discover insights themselves. Keep responses under 100 words. Always end with a question." },
    { id: "challenge", label: "Challenge", icon: Zap, description: "Tests your thinking", systemPrompt: "You are a challenging investing mentor who pushes students to think critically. Question their assumptions, present counterarguments, and demand evidence for their claims. Keep responses under 120 words. Be tough but fair." },
]

const INITIAL_MESSAGES: Record<string, string> = {
    coach: "Hey! I'm your investing coach. I can see your portfolio and trading history. Ask me anything about investing concepts, or I can walk you through what happened with your positions today.",
    analyst: "I'm in analyst mode. I can break down your portfolio performance, explain risk metrics, and help you understand market movements. What would you like to analyze?",
    socratic: "Let's think together. Rather than giving you answers, I'll help you discover them by asking the right questions. What trade are you considering next?",
    challenge: "Ready for a challenge? I'll test your investing knowledge and push your thinking. Let's start — can you explain why diversification reduces risk?",
}

/* ─── Rules-Based Fallback Responses ─── */
const RULES_RESPONSES: Record<string, Omit<TradeMentorResponse, "dataSource">[]> = {
    coach: [
        { intentSummary: "Great question. You're building a habit of thinking before acting.", riskFlag: { level: "low", message: "Risk check: stay within position sizes you can explain." }, followUp: { type: "alternative", content: "Try writing a one-sentence thesis before placing the trade." } },
        { intentSummary: "You're focused on process, which is exactly what improves long-term results.", riskFlag: null, followUp: { type: "question", content: "What outcome would make this trade a success for you?" } },
        { intentSummary: "Smart to ask before acting. Let's think through this together.", riskFlag: null, followUp: { type: "question", content: "How does this trade fit your overall portfolio strategy?" } },
    ],
    analyst: [
        { intentSummary: "Your current setup suggests concentration risk is the key variable to monitor.", riskFlag: { level: "medium", message: "Risk check: avoid letting one position dominate outcomes." }, followUp: { type: "alternative", content: "Compare this idea against your second-best option before executing." } },
        { intentSummary: "The data points to position sizing as the biggest lever for better consistency.", riskFlag: null, followUp: { type: "question", content: "How would your expected return change at half this size?" } },
    ],
    socratic: [
        { intentSummary: "Let's reason it out together instead of jumping to execution.", riskFlag: null, followUp: { type: "question", content: "What evidence would prove your thesis wrong?" } },
        { intentSummary: "You have a hypothesis. Now test the assumptions behind it.", riskFlag: null, followUp: { type: "question", content: "What alternative explanation could also fit the same data?" } },
    ],
    challenge: [
        { intentSummary: "Challenge mode: defend this trade in three bullet points.", riskFlag: { level: "high", message: "Risk check: if you cannot defend the downside, size down." }, followUp: { type: "question", content: "What is your exit plan if price moves against you by 5%?" } },
        { intentSummary: "Good attempt. Raise your bar before committing capital.", riskFlag: { level: "medium", message: "Risk check: confirm your thesis is not purely momentum-chasing." }, followUp: { type: "question", content: "What would make you hold through volatility instead of panic-selling?" } },
    ],
}

const DAILY_BRIEF_FALLBACK: DailyBriefData = {
    summary: "Daily brief is temporarily unavailable. Review your holdings and risk metrics to plan your next move.",
    drivers: [],
    action: { label: "Open Portfolio", route: "/app/portfolio" },
    dataSource: "generic",
    generatedAt: new Date().toISOString(),
}

function formatMentorResponse(response: TradeMentorResponse): string {
    const lines = [response.intentSummary]
    if (response.riskFlag?.message) lines.push(response.riskFlag.message)
    lines.push(response.followUp.content)
    return lines.join(" ")
}

function MessageBubble({ message }: { message: Message }) {
    const isBot = message.role === "assistant"
    return (
        <div className={`flex gap-2.5 ${isBot ? "" : "flex-row-reverse"} animate-slide-up`}>
            <div className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${isBot ? "gradient-brand" : "bg-muted"}`}>
                {isBot ? <Bot className="h-3.5 w-3.5 text-white" /> : <User className="h-3.5 w-3.5" />}
            </div>
            <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${isBot ? "bg-muted" : "bg-primary text-primary-foreground"}`}>
                {message.content}
                {isBot && message.source && (
                    <div className="mt-1.5 flex items-center gap-1">
                        {message.source === "ai" ? (
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-0.5"><Wifi className="h-2.5 w-2.5" /> AI</Badge>
                        ) : (
                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 gap-0.5"><WifiOff className="h-2.5 w-2.5" /> Rules</Badge>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

/* ─── OpenAI Integration ─── */
async function callOpenAI(
    systemPrompt: string,
    userMessage: string,
    portfolioContext: string | null
): Promise<{ content: string; source: "ai" | "rules" }> {
    // Check if OpenAI is configured (env var injected at build time or runtime)
    const apiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY
    const apiBase = (import.meta as any).env?.VITE_OPENAI_API_BASE || "https://api.openai.com/v1"

    if (!apiKey) {
        throw new Error("NO_API_KEY")
    }

    const messages = [
        { role: "system", content: systemPrompt + (portfolioContext ? `\n\nStudent's current portfolio context:\n${portfolioContext}` : "") + "\n\nIMPORTANT: You are an educational AI mentor on a school-safe platform. Never provide real financial advice. Always frame responses as learning exercises. Never discuss inappropriate topics." },
        { role: "user", content: userMessage },
    ]

    const response = await fetch(`${apiBase}/chat/completions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages,
            max_tokens: 300,
            temperature: 0.7,
        }),
    })

    if (!response.ok) {
        throw new Error(`API_ERROR_${response.status}`)
    }

    const data = await response.json()
    return {
        content: data.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.",
        source: "ai",
    }
}

export function MentorPanel({ className }: { className?: string }) {
    const [mode, setMode] = useState("coach")
    const [messages, setMessages] = useState<Message[]>([
        { id: "init", role: "assistant", content: INITIAL_MESSAGES.coach, timestamp: new Date(), source: "rules" }
    ])
    const [input, setInput] = useState("")
    const [showModeSelect, setShowModeSelect] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    const { data: positions } = usePositions()
    const { data: account } = useActiveAccount()
    const portfolioContext = useMemo(() => {
        if (!positions || !account) return null
        const posData: PositionData[] = positions.map(p => ({
            symbol: p.symbol, qty: p.qty, avg_cost: p.avg_cost,
            current_price: p.current_price ?? p.avg_cost,
        }))
        if (posData.length === 0) return null
        const m = computePortfolioMetrics(posData, account.cash_balance, account.starting_cash ?? account.cash_balance)
        const startingCash = account.starting_cash ?? account.cash_balance
        const returnPctVal = startingCash > 0 ? ((m.equity - startingCash) / startingCash) * 100 : 0
        return `Equity: ${formatCurrency(m.equity)} | Cash: ${formatCurrency(m.cash)} | ${posData.length} positions | Concentration: ${m.concentrationLabel} (HHI: ${m.hhi.toFixed(0)}) | Return: ${returnPctVal.toFixed(1)}% | Holdings: ${posData.map(p => `${p.symbol} (${p.qty} shares @ ${formatCurrency(p.avg_cost)})`).join(", ")}`
    }, [positions, account])

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
    }, [messages])

    const getRulesResponse = useCallback((userMsg: string): string => {
        const pool = RULES_RESPONSES[mode] || RULES_RESPONSES.coach
        const candidate = pool[Math.floor(Math.random() * pool.length)]
        const parsed = safeParseTradeMentorResponse({
            ...candidate,
            dataSource: portfolioContext ? "portfolio" : "generic",
        })
        let reply = parsed ? formatMentorResponse(parsed) : "I could not validate the response format. Please try again."
        if (portfolioContext && parsed) {
            reply += `\n\n📊 Based on your portfolio context, I can see you have ${positions?.length ?? 0} positions.`
        }
        return reply
    }, [mode, portfolioContext, positions])

    const handleSend = async () => {
        if (!input.trim() || isLoading) return
        if (!rateLimiter.canProceed("mentor_chat")) {
            toast.info(rateLimiter.getCooldownMessage("mentor_chat"))
            return
        }
        rateLimiter.record("mentor_chat")

        const userMsg: Message = {
            id: crypto.randomUUID(), role: "user", content: input.trim(), timestamp: new Date()
        }
        setMessages(prev => [...prev, userMsg])
        setInput("")
        setIsLoading(true)

        const modeConfig = MODES.find(m => m.id === mode)!

        try {
            const result = await callOpenAI(modeConfig.systemPrompt, userMsg.content, portfolioContext)
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(), role: "assistant",
                content: result.content, timestamp: new Date(), source: result.source,
            }])
        } catch {
            // Fallback to rules-based response
            const fallbackReply = getRulesResponse(userMsg.content)
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(), role: "assistant",
                content: fallbackReply, timestamp: new Date(), source: "rules",
            }])
        } finally {
            setIsLoading(false)
        }
    }

    const switchMode = (newMode: string) => {
        setMode(newMode)
        setShowModeSelect(false)
        setMessages([{
            id: crypto.randomUUID(), role: "assistant",
            content: INITIAL_MESSAGES[newMode], timestamp: new Date(), source: "rules",
        }])
    }

    return (
        <Card className={`flex flex-col overflow-hidden ${className}`}>
            <CardHeader className="pb-2 px-4 pt-4 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg gradient-brand flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <CardTitle className="text-sm">AI Mentor</CardTitle>
                            <div className="text-[10px] text-muted-foreground capitalize">{mode} mode</div>
                        </div>
                    </div>
                    <div className="relative">
                        <Button variant="outline" size="sm" className="text-xs h-7 gap-1" onClick={() => setShowModeSelect(!showModeSelect)}>
                            {MODES.find(m => m.id === mode)?.label} <ChevronDown className="h-3 w-3" />
                        </Button>
                        {showModeSelect && (
                            <div className="absolute right-0 top-full mt-1 bg-card border rounded-lg shadow-lg z-50 w-48 animate-scale-in">
                                {MODES.map(m => {
                                    const Icon = m.icon
                                    return (
                                        <button key={m.id} onClick={() => switchMode(m.id)} className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg ${mode === m.id ? 'bg-muted' : ''}`}>
                                            <Icon className="h-3.5 w-3.5 text-primary" />
                                            <div className="text-left">
                                                <div className="text-xs font-medium">{m.label}</div>
                                                <div className="text-[10px] text-muted-foreground">{m.description}</div>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </CardHeader>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-3 min-h-[200px] max-h-[400px]">
                {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
                {isLoading && (
                    <div className="flex gap-2.5 animate-slide-up">
                        <div className="h-7 w-7 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                        </div>
                        <div className="bg-muted rounded-xl px-3.5 py-2.5 text-sm text-muted-foreground">
                            Thinking...
                        </div>
                    </div>
                )}
            </div>

            {/* Input */}
            <div className="p-3 border-t flex-shrink-0">
                <div className="flex gap-2">
                    <Textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        placeholder="Ask your mentor anything..."
                        className="min-h-[40px] max-h-[80px] text-sm resize-none"
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSend()
                            }
                        }}
                    />
                    <Button size="icon" className="h-10 w-10 flex-shrink-0" onClick={handleSend} disabled={!input.trim() || isLoading}>
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 text-center flex items-center justify-center gap-1">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    Educational AI · Not financial advice · School-safe content
                </div>
            </div>
        </Card>
    )
}

export function DailyBrief() {
    const brief = safeParseDailyBriefData({
        summary: "Markets are mixed today. Your portfolio is up 0.3% with AAPL as the main driver.",
        drivers: [
            { symbol: "AAPL", direction: "up", magnitude: "+0.9%", contribution: "largest gainer" },
        ],
        action: { label: "Review Diversification", route: "/app/portfolio" },
        dataSource: "cached",
        generatedAt: new Date().toISOString(),
    }) ?? DAILY_BRIEF_FALLBACK

    return (
        <Card className="overflow-hidden animate-slide-up">
            <CardContent className="p-4">
                <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold">Daily Brief</span>
                            <Badge variant="outline" className="text-[10px] capitalize">
                                AI · {brief.dataSource}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {brief.summary}
                            {brief.drivers[0] ? ` ${brief.drivers[0].symbol} (${brief.drivers[0].magnitude}) is ${brief.drivers[0].contribution}.` : ""}
                        </p>
                        <Button
                            variant="link"
                            size="sm"
                            className="text-xs p-0 h-auto mt-1"
                            onClick={() => {
                                if (!rateLimiter.canProceed("daily_brief")) {
                                    toast.info(rateLimiter.getCooldownMessage("daily_brief"))
                                    return
                                }
                                rateLimiter.record("daily_brief")
                                window.location.assign(brief.action.route)
                            }}
                        >
                            {brief.action.label} →
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
