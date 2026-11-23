/**
 * Route map. Pages are lazy-loaded so the initial bundle stays small and
 * future game modules never load until a learner opens them.
 *
 *   /                          launch (splash → decides where to go)
 *   /welcome /login /signup    public only
 *   /forgot-password /reset-password
 *   /terms /privacy            public
 *   /onboarding                signed in, onboarding not yet required
 *   /home /game-zone /challenge /progress /stats /achievements
 *   /favorites /profile /settings /notifications /help /accessibility
 *                              signed in + onboarded, inside the app shell
 */
import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter, Outlet } from 'react-router-dom'
import { PageLoader } from '@/components/ui/Feedback'
import { PublicOnly, RequireAuth } from '@/features/auth/guards'
import { LaunchRoute, SplashScreen } from '@/features/auth/SplashScreen'
import { RouteErrorBoundary } from './RouteErrorBoundary'

const WelcomePage = lazy(() => import('@/features/auth/pages/WelcomePage'))
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const SignupPage = lazy(() => import('@/features/auth/pages/SignupPage'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage'))
const LegalPage = lazy(() => import('@/features/auth/pages/LegalPage'))
const OnboardingPage = lazy(() => import('@/features/onboarding/OnboardingPage'))
const AppShell = lazy(() => import('@/components/layout/AppShell'))
const HomePage = lazy(() => import('@/features/home/HomePage'))
const GameZonePage = lazy(() => import('@/features/game-zone/GameZonePage'))
const CategoryPage = lazy(() => import('@/features/game-zone/CategoryPage'))
const GamePage = lazy(() => import('@/features/game-zone/GamePage'))
const ProgressPage = lazy(() => import('@/features/progress/ProgressPage'))
const AchievementsPage = lazy(() => import('@/features/achievements/AchievementsPage'))
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const NotificationsPage = lazy(() => import('@/features/notifications/NotificationsPage'))
const ChallengePage = lazy(() => import('@/features/challenge/ChallengePage'))
const StatsPage = lazy(() => import('@/features/stats/StatsPage'))
const FavoritesPage = lazy(() => import('@/features/favorites/FavoritesPage'))
const HelpPage = lazy(() => import('@/features/support/HelpPage'))
const AccessibilityPage = lazy(() => import('@/features/support/AccessibilityPage'))
const NotFoundPage = lazy(() => import('./NotFoundPage'))

const page = (node: ReactNode) => <Suspense fallback={<PageLoader />}>{node}</Suspense>
const full = (node: ReactNode) => <Suspense fallback={<SplashScreen />}>{node}</Suspense>

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: '/', element: <LaunchRoute /> },
      { path: '/terms', element: full(<LegalPage kind="terms" />) },
      { path: '/privacy', element: full(<LegalPage kind="privacy" />) },
      {
        element: <PublicOnly />,
        children: [
          { path: '/welcome', element: full(<WelcomePage />) },
          { path: '/login', element: full(<LoginPage />) },
          { path: '/signup', element: full(<SignupPage />) },
          { path: '/forgot-password', element: full(<ForgotPasswordPage />) },
          { path: '/reset-password', element: full(<ResetPasswordPage />) },
        ],
      },
      {
        element: <RequireAuth allowIncompleteOnboarding />,
        children: [{ path: '/onboarding', element: full(<OnboardingPage />) }],
      },
      {
        element: <RequireAuth />,
        children: [
          {
            element: full(<AppShell />),
            children: [
              { path: '/home', element: page(<HomePage />) },
              { path: '/game-zone', element: page(<GameZonePage />) },
              { path: '/game-zone/category/:slug', element: page(<CategoryPage />) },
              { path: '/game/:slug', element: page(<GamePage />) },
              { path: '/challenge', element: page(<ChallengePage />) },
              { path: '/progress', element: page(<ProgressPage />) },
              { path: '/stats', element: page(<StatsPage />) },
              { path: '/favorites', element: page(<FavoritesPage />) },
              { path: '/help', element: page(<HelpPage />) },
              { path: '/accessibility', element: page(<AccessibilityPage />) },
              { path: '/achievements', element: page(<AchievementsPage />) },
              { path: '/profile', element: page(<ProfilePage />) },
              { path: '/settings', element: page(<SettingsPage />) },
              { path: '/notifications', element: page(<NotificationsPage />) },
              { path: '*', element: page(<NotFoundPage />) },
            ],
          },
        ],
      },
    ],
  },
])
