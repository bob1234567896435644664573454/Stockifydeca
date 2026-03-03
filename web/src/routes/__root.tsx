import { createRootRoute, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/router-devtools"
import { RouteErrorBoundary } from "@/components/RouteErrorBoundary"

function RootLayout() {
    return (
        <>
            <Outlet />
            {import.meta.env.DEV && <TanStackRouterDevtools />}
        </>
    )
}

export const Route = createRootRoute({
    component: RootLayout,
    errorComponent: RouteErrorBoundary,
})
