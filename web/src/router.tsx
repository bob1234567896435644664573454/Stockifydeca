import { createRouter, createRoute, redirect } from "@tanstack/react-router"
import { Route as rootRoute } from "./routes/__root"
import { AuthPage } from "./features/auth/AuthPage"
import { StudentDashboard } from "./features/student/StudentDashboard"
import { TeacherDashboard } from "./features/teacher/TeacherDashboard"
import { AppShell } from "./components/layout/AppShell"
import { supabase } from "./lib/api"
import React, { Suspense } from "react"
import { Loading } from "./components/ui/loading"
import { StudentLeaderboardContainer } from "./features/leaderboard/StudentLeaderboardContainer"
import { HomePage } from "./features/home/HomePage"

// Public pages
import { AboutPage } from "./features/public/AboutPage"
import { FeaturesPage } from "./features/public/FeaturesPage"
import { PricingPage } from "./features/public/PricingPage"
import { ResourcesPage } from "./features/public/ResourcesPage"
import { PrivacyPage } from "./features/public/PrivacyPage"
import { TermsPage } from "./features/public/TermsPage"

// Lazy Load Heavy Components
const TradePage = React.lazy(() => import("./features/trade/TradePage").then(m => ({ default: m.TradePage })))
const ClassControl = React.lazy(() => import("./features/teacher/ClassControl").then(m => ({ default: m.ClassControl })))
const PortfolioPage = React.lazy(() => import("./features/portfolio/PortfolioPage").then(m => ({ default: m.PortfolioPage })))
const LearnHub = React.lazy(() => import("./features/learn/LearnHub").then(m => ({ default: m.LearnHub })))
const JournalPage = React.lazy(() => import("./features/journal/JournalPage").then(m => ({ default: m.JournalPage })))
const ChallengesPage = React.lazy(() => import("./features/challenges/ChallengesPage").then(m => ({ default: m.ChallengesPage })))
const ResearchPage = React.lazy(() => import("./features/research/ResearchPage").then(m => ({ default: m.ResearchPage })))
const MarketHeatmapPage = React.lazy(() => import("./features/markets/MarketHeatmapPage").then(m => ({ default: m.MarketHeatmapPage })))
const LessonBuilder = React.lazy(() => import("./features/teacher/LessonBuilder").then(m => ({ default: m.LessonBuilder })))
const CasinoMathRoom = React.lazy(() => import("./features/casino/CasinoMathRoom").then(m => ({ default: m.CasinoMathRoom })))
const SettingsPage = React.lazy(() => import("./features/settings/SettingsPage").then(m => ({ default: m.SettingsPage })))
const StockResearchPage = React.lazy(() => import("./features/stock-research/StockResearchPage").then(m => ({ default: m.StockResearchPage })))

const authenticatedRoute = createRoute({
    getParentRoute: () => rootRoute,
    id: "_authenticated",
    beforeLoad: async () => {
        const { data } = await supabase.auth.getSession()
        if (!data.session) {
            throw redirect({ to: "/auth" })
        }
        return { session: data.session }
    },
})

const appLayoutRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    id: "_app",
    beforeLoad: ({ context }) => {
        const role = context.session.user.app_metadata.role
        if (role === 'teacher' || role === 'org_admin' || role === 'platform_admin') {
            throw redirect({ to: "/teacher" })
        }
    },
})

const teacherLayoutRoute = createRoute({
    getParentRoute: () => authenticatedRoute,
    id: "_teacher",
    beforeLoad: ({ context }) => {
        const role = context.session.user.app_metadata.role
        if (role !== 'teacher' && role !== 'org_admin' && role !== 'platform_admin') {
            throw redirect({ to: "/app" })
        }
    },
})

// ─── Public Routes ───
const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/",
    beforeLoad: async () => {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
            const role = data.session.user.app_metadata.role
            if (role === 'teacher' || role === 'org_admin' || role === 'platform_admin') {
                throw redirect({ to: "/teacher" })
            }
            throw redirect({ to: "/app" })
        }
    },
    component: HomePage,
})

const authRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/auth",
    component: AuthPage,
    beforeLoad: async () => {
        const { data } = await supabase.auth.getSession()
        if (data.session) {
            throw redirect({ to: "/" })
        }
    }
})

const aboutRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/about",
    component: AboutPage,
})

const featuresRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/features",
    component: FeaturesPage,
})

const pricingRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/pricing",
    component: PricingPage,
})

const resourcesRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/resources",
    component: ResourcesPage,
})

const privacyRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/privacy",
    component: PrivacyPage,
})

const termsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: "/terms",
    component: TermsPage,
})

// ─── App Routes ───
const appDashboardRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: "/app",
    component: StudentDashboard,
})

const appTradeRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: "/app/trade/$symbol",
    component: () => (
        <Suspense fallback={<Loading />}>
            <TradePage />
        </Suspense>
    ),
})

const appTradeIndexRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: "/app/trade",
    beforeLoad: () => {
        throw redirect({
            to: "/app/trade/$symbol",
            params: { symbol: "AAPL" }
        })
    }
})

const appLeaderboardRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: "/app/leaderboard",
    component: () => (
        <AppShell role="student">
            <Suspense fallback={<Loading />}>
                <StudentLeaderboardContainer />
            </Suspense>
        </AppShell>
    ),
})

const appPortfolioRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: "/app/portfolio",
    component: () => (
        <Suspense fallback={<Loading />}>
            <PortfolioPage />
        </Suspense>
    ),
})

const appLearnRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: "/app/learn",
    component: () => (
        <Suspense fallback={<Loading />}>
            <LearnHub />
        </Suspense>
    ),
})

const appJournalRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: "/app/journal",
    component: () => (
        <Suspense fallback={<Loading />}>
            <JournalPage />
        </Suspense>
    ),
})

const appChallengesRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: "/app/challenges",
    component: () => (
        <Suspense fallback={<Loading />}>
            <ChallengesPage />
        </Suspense>
    ),
})

const appResearchRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: "/app/research/$symbol",
    component: () => (
        <Suspense fallback={<Loading />}>
            <ResearchPage />
        </Suspense>
    ),
})

const appHeatmapRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: "/app/markets/heatmap",
    component: () => (
        <Suspense fallback={<Loading />}>
            <MarketHeatmapPage />
        </Suspense>
    ),
})

const appCasinoRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: "/app/casino",
    component: () => (
        <Suspense fallback={<Loading />}>
            <CasinoMathRoom />
        </Suspense>
    ),
})

const appSettingsRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: "/app/settings",
    component: () => (
        <Suspense fallback={<Loading />}>
            <SettingsPage />
        </Suspense>
    ),
})

const appStockResearchRoute = createRoute({
    getParentRoute: () => appLayoutRoute,
    path: "/app/stock-research",
    component: () => (
        <Suspense fallback={<Loading />}>
            <StockResearchPage />
        </Suspense>
    ),
})

// ─── Teacher Routes ───
const teacherDashboardRoute = createRoute({
    getParentRoute: () => teacherLayoutRoute,
    path: "/teacher",
    component: TeacherDashboard,
})

const classControlRoute = createRoute({
    getParentRoute: () => teacherLayoutRoute,
    path: "/teacher/class/$classId",
    component: () => (
        <Suspense fallback={<Loading />}>
            <ClassControl />
        </Suspense>
    ),
})

const lessonBuilderRoute = createRoute({
    getParentRoute: () => teacherLayoutRoute,
    path: "/teacher/lessons",
    component: () => (
        <Suspense fallback={<Loading />}>
            <LessonBuilder />
        </Suspense>
    ),
})

// ─── Route Tree ───
const routeTree = rootRoute.addChildren([
    indexRoute,
    authRoute,
    aboutRoute,
    featuresRoute,
    pricingRoute,
    resourcesRoute,
    privacyRoute,
    termsRoute,
    authenticatedRoute.addChildren([
        appLayoutRoute.addChildren([
            appDashboardRoute,
            appTradeIndexRoute,
            appTradeRoute,
            appLeaderboardRoute,
            appPortfolioRoute,
            appLearnRoute,
            appJournalRoute,
            appChallengesRoute,
            appResearchRoute,
            appHeatmapRoute,
            appCasinoRoute,
            appSettingsRoute,
            appStockResearchRoute,
        ]),
        teacherLayoutRoute.addChildren([
            teacherDashboardRoute,
            classControlRoute,
            lessonBuilderRoute,
        ]),
    ]),
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
    interface Register {
        router: typeof router
    }
}
