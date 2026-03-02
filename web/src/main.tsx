import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import { router } from './router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 1, // 1 min outdated
      retry: 1,
    }
  }
})

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Toaster } from 'sonner'
import { RealtimeProvider } from '@/providers/RealtimeProvider'
import { AuthProvider } from '@/features/auth/AuthContext'
import { ThemeProvider } from "@/components/theme-provider"

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <RealtimeProvider>
              <RouterProvider router={router} />
            </RealtimeProvider>
          </AuthProvider>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
