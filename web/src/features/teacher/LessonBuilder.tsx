import { useState, useCallback, useId } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { AppShell } from "@/components/layout/AppShell"
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
    GripVertical, Plus, Trash2, Type, Heading1, AlertCircle,
    Brain, Save, ChevronLeft
} from "lucide-react"

// ─── Block Types ───
type BlockType = "text" | "heading" | "callout" | "quiz"

interface LessonBlock {
    id: string
    type: BlockType
    content: string
    meta?: Record<string, string>
}

interface Lesson {
    id: string
    title: string
    blocks: LessonBlock[]
    updatedAt: string
}

const BLOCK_ICONS: Record<BlockType, React.ReactNode> = {
    text: <Type className="h-3.5 w-3.5" />,
    heading: <Heading1 className="h-3.5 w-3.5" />,
    callout: <AlertCircle className="h-3.5 w-3.5" />,
    quiz: <Brain className="h-3.5 w-3.5" />,
}

const BLOCK_LABELS: Record<BlockType, string> = {
    text: "Text",
    heading: "Heading",
    callout: "Callout",
    quiz: "Quiz",
}

// ─── Sortable Block ───
function SortableBlock({ block, onUpdate, onDelete }: {
    block: LessonBlock
    onUpdate: (id: string, content: string) => void
    onDelete: (id: string) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: block.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div ref={setNodeRef} style={style} className="group">
            <Card className={`border transition-all ${isDragging ? "ring-2 ring-primary shadow-lg" : "hover:border-primary/30"}`}>
                <CardContent className="p-0">
                    <div className="flex items-start">
                        {/* Drag handle */}
                        <div
                            className="flex flex-col items-center justify-center px-2 py-3 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground"
                            {...attributes}
                            {...listeners}
                        >
                            <GripVertical className="h-4 w-4" />
                        </div>

                        {/* Block content */}
                        <div className="flex-1 py-3 pr-3">
                            <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="gap-1 text-[10px] uppercase">
                                    {BLOCK_ICONS[block.type]}
                                    {BLOCK_LABELS[block.type]}
                                </Badge>
                            </div>

                            {block.type === "heading" ? (
                                <Input
                                    value={block.content}
                                    onChange={(e) => onUpdate(block.id, e.target.value)}
                                    placeholder="Section heading..."
                                    className="text-lg font-bold border-0 px-0 shadow-none focus-visible:ring-0 h-auto"
                                />
                            ) : block.type === "callout" ? (
                                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                                    <Textarea
                                        value={block.content}
                                        onChange={(e) => onUpdate(block.id, e.target.value)}
                                        placeholder="💡 Tip or important note..."
                                        className="min-h-[60px] border-0 bg-transparent shadow-none focus-visible:ring-0 resize-none"
                                    />
                                </div>
                            ) : block.type === "quiz" ? (
                                <div className="bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                                    <Textarea
                                        value={block.content}
                                        onChange={(e) => onUpdate(block.id, e.target.value)}
                                        placeholder="Write a quiz question...\nA) Option one\nB) Option two\nC) Option three\n\nCorrect: B\nExplanation: ..."
                                        className="min-h-[100px] border-0 bg-transparent shadow-none focus-visible:ring-0 resize-none font-mono text-xs"
                                    />
                                </div>
                            ) : (
                                <Textarea
                                    value={block.content}
                                    onChange={(e) => onUpdate(block.id, e.target.value)}
                                    placeholder="Write your lesson content..."
                                    className="min-h-[80px] border-0 px-0 shadow-none focus-visible:ring-0 resize-none"
                                />
                            )}
                        </div>

                        {/* Delete */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity mt-3 mr-2 text-muted-foreground hover:text-destructive"
                            onClick={() => onDelete(block.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

// ─── Lesson Builder ───
const STORAGE_KEY = "stockify_lesson_drafts"

function loadLessons(): Lesson[] {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")
    } catch {
        return []
    }
}

function saveLessons(lessons: Lesson[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lessons))
}

export function LessonBuilder() {
    const idSeed = useId()
    const [lessons, setLessons] = useState<Lesson[]>(loadLessons)
    const [activeLesson, setActiveLesson] = useState<Lesson | null>(null)
    const [title, setTitle] = useState("")
    const [blocks, setBlocks] = useState<LessonBlock[]>([])
    let blockCounter = 0

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const generateId = () => `block-${idSeed}-${Date.now()}-${blockCounter++}`

    // Create / open lesson
    const startNewLesson = () => {
        const newLesson: Lesson = {
            id: `lesson-${Date.now()}`,
            title: "Untitled Lesson",
            blocks: [],
            updatedAt: new Date().toISOString(),
        }
        setActiveLesson(newLesson)
        setTitle(newLesson.title)
        setBlocks([])
    }

    const openLesson = (lesson: Lesson) => {
        setActiveLesson(lesson)
        setTitle(lesson.title)
        setBlocks(lesson.blocks)
    }

    const saveLesson = () => {
        if (!activeLesson) return
        const updated: Lesson = { ...activeLesson, title, blocks, updatedAt: new Date().toISOString() }
        const existing = lessons.filter(l => l.id !== updated.id)
        const newList = [updated, ...existing]
        setLessons(newList)
        saveLessons(newList)
        setActiveLesson(updated)
    }

    const deleteLesson = (id: string) => {
        const newList = lessons.filter(l => l.id !== id)
        setLessons(newList)
        saveLessons(newList)
        if (activeLesson?.id === id) {
            setActiveLesson(null)
            setBlocks([])
        }
    }

    // Block operations
    const addBlock = useCallback((type: BlockType) => {
        setBlocks(prev => [...prev, { id: generateId(), type, content: "" }])
    }, [])

    const updateBlock = useCallback((id: string, content: string) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b))
    }, [])

    const deleteBlock = useCallback((id: string) => {
        setBlocks(prev => prev.filter(b => b.id !== id))
    }, [])

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event
        if (over && active.id !== over.id) {
            setBlocks(prev => {
                const oldIndex = prev.findIndex(b => b.id === active.id)
                const newIndex = prev.findIndex(b => b.id === over.id)
                return arrayMove(prev, oldIndex, newIndex)
            })
        }
    }

    // ─── Lesson List View ───
    if (!activeLesson) {
        return (
            <AppShell role="teacher">
                <div className="p-4 md:p-8 space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Lesson Builder</h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Create interactive lessons with text, quizzes, and callouts.
                            </p>
                        </div>
                        <Button onClick={startNewLesson} className="gap-1.5">
                            <Plus className="h-4 w-4" /> New Lesson
                        </Button>
                    </div>

                    {lessons.length === 0 ? (
                        <Card className="border-dashed border-2">
                            <CardContent className="py-12 text-center">
                                <Brain className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                                <h3 className="font-semibold text-lg">No lessons yet</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    Click "New Lesson" to start building your first lesson.
                                </p>
                                <Button onClick={startNewLesson} className="mt-4 gap-1.5">
                                    <Plus className="h-4 w-4" /> Create First Lesson
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-3 md:grid-cols-2">
                            {lessons.map(lesson => (
                                <Card
                                    key={lesson.id}
                                    className="cursor-pointer hover:border-primary/40 transition-colors"
                                    onClick={() => openLesson(lesson)}
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h3 className="font-semibold text-sm">{lesson.title}</h3>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    {lesson.blocks.length} blocks · Updated {new Date(lesson.updatedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    deleteLesson(lesson.id)
                                                }}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                        <div className="flex gap-1 mt-2 flex-wrap">
                                            {Array.from(new Set(lesson.blocks.map(b => b.type))).map(type => (
                                                <Badge key={type} variant="secondary" className="text-[10px] gap-1">
                                                    {BLOCK_ICONS[type]} {BLOCK_LABELS[type]}
                                                </Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </AppShell>
        )
    }

    // ─── Editor View ───
    return (
        <AppShell role="teacher">
            <div className="p-4 md:p-8 space-y-4 animate-fade-in max-w-3xl mx-auto">
                {/* Toolbar */}
                <div className="flex items-center justify-between gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setActiveLesson(null)} className="gap-1">
                        <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={saveLesson} className="gap-1.5">
                            <Save className="h-3.5 w-3.5" /> Save
                        </Button>
                    </div>
                </div>

                {/* Title */}
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Lesson title..."
                    className="text-2xl font-bold h-auto py-3 border-0 shadow-none focus-visible:ring-0 px-0"
                />

                {/* Blocks */}
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-3">
                            {blocks.map(block => (
                                <SortableBlock
                                    key={block.id}
                                    block={block}
                                    onUpdate={updateBlock}
                                    onDelete={deleteBlock}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>

                {/* Add Block Toolbar */}
                <div className="border-2 border-dashed rounded-lg p-4">
                    <p className="text-xs text-muted-foreground mb-3 text-center uppercase tracking-wider">Add a block</p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                        {(["text", "heading", "callout", "quiz"] as BlockType[]).map(type => (
                            <Button
                                key={type}
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => addBlock(type)}
                            >
                                {BLOCK_ICONS[type]}
                                {BLOCK_LABELS[type]}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>
        </AppShell>
    )
}
