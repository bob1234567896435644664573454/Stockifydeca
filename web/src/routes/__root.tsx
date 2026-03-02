import { createRootRoute, Outlet } from "@tanstack/react-router"
import { TanStackRouterDevtools } from "@tanstack/router-devtools"

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
})
