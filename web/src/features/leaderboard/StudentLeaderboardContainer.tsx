import { useActiveCompetition } from "@/features/student/hooks"
import { EmptyState, SkeletonList } from "@/components/ui/states"
import { Trophy } from "lucide-react"
import { LeaderboardPage } from "./LeaderboardPage"

export function StudentLeaderboardContainer() {
    const { data: competition, isLoading } = useActiveCompetition()
    if (isLoading) {
        return (
            <div className="m-4 md:m-8">
                <SkeletonList count={8} />
            </div>
        )
    }
    if (!competition?.id) {
        return (
            <div className="m-4 md:m-8 rounded-lg border bg-card">
                <EmptyState
                    icon={<Trophy className="h-6 w-6" />}
                    title="No Active Competition"
                    description="Your class does not have an active competition yet."
                />
            </div>
        )
    }
    return <LeaderboardPage competitionId={competition.id} />
}
