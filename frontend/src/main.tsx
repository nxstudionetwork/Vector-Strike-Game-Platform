import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import '@fontsource-variable/inter'
import '@fontsource-variable/space-grotesk'
import '@/styles/global.css'
import '@/i18n'
import { ApiError } from '@/lib/api/client'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { ConfirmProvider } from '@/components/feedback/ConfirmDialog'
import { ToastProvider } from '@/components/feedback/Toast'
import { PreferencesSync } from '@/features/preferences/PreferencesSync'
import { router } from '@/app/router'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: true,
      retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PreferencesSync>
          <ToastProvider>
            <ConfirmProvider>
              <RouterProvider router={router} />
            </ConfirmProvider>
          </ToastProvider>
        </PreferencesSync>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
