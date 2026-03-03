import { useRouterState } from "@tanstack/react-router"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"

/**
 * Lightweight error fallback that can be used inside TanStack Router's
 * `errorComponent` prop on individual routes.
 */
export function RouteErrorBoundary({ error }: { error: Error }) {
  const routerState = useRouterState()
  const path = routerState?.location?.pathname ?? "unknown"

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="max-w-lg w-full border-destructive/50 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Page Error
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Something went wrong while loading <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{path}</code>.
          </p>
          {error?.message && (
            <div className="bg-muted p-3 rounded text-xs font-mono overflow-auto max-h-32 border">
              {error.message}
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={() => window.location.reload()} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" /> Reload
            </Button>
            <Button onClick={() => (window.location.href = "/")} variant="ghost" className="gap-2">
              <Home className="h-4 w-4" /> Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
