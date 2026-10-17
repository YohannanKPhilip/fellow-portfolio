import { lazy, Suspense, type ReactNode } from 'react';
import {
  createBrowserRouter,
  Outlet,
  RouterProvider,
  ScrollRestoration,
  type RouteObject,
} from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { Layout } from './components/Layout';
import { Loading, NotFoundView } from './components/StatusView';
import { config } from './config';
import { DataProvider } from './data/DataProvider';
import { FellowPage } from './pages/FellowPage';
import { HomePage } from './pages/HomePage';
import { ResourcePage } from './pages/ResourcePage';

// The pages for signed-in fellows (sign-in, setup, dashboard and the editors) are loaded only when
// opened, so visitors reading a fellow's page don't download the editor.
const LoginPage = lazy(() =>
  import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const CallbackPage = lazy(() =>
  import('./pages/auth/CallbackPage').then((m) => ({ default: m.CallbackPage })),
);
const SetupPage = lazy(() =>
  import('./pages/setup/SetupPage').then((m) => ({ default: m.SetupPage })),
);
const MePage = lazy(() => import('./pages/me/MePage').then((m) => ({ default: m.MePage })));
const MeRedirect = lazy(() => import('./pages/me/MePage').then((m) => ({ default: m.MeRedirect })));
const PageBuilder = lazy(() =>
  import('./pages/edit/PageBuilder').then((m) => ({ default: m.PageBuilder })),
);
const SettingsPage = lazy(() =>
  import('./pages/me/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const ResourceBuilder = lazy(() =>
  import('./pages/edit/ResourceBuilder').then((m) => ({ default: m.ResourceBuilder })),
);

// BASE_URL is "/" at the site root (or a prefix such as "/fellow-portfolio/"); the router needs it without the trailing slash.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

const signedInRoutes: RouteObject[] = [
  { path: '/login', element: <LoginPage /> },
  { path: '/auth/callback', element: <CallbackPage /> },
  { path: '/setup', element: <SetupPage /> },
  { path: '/me', element: <MeRedirect /> },
  { path: '/:fellowId/me', element: <MePage /> },
  { path: '/:fellowId/edit', element: <PageBuilder /> },
  { path: '/:fellowId/settings', element: <SettingsPage /> },
  { path: '/:fellowId/r/:resourceId/edit', element: <ResourceBuilder /> },
];

/** The sign-in pages need Supabase. With the Sheet as the data source they don't exist. */
function WithAuth({ children }: { children: ReactNode }) {
  return config.dataSource === 'supabase' ? (
    <AuthProvider>{children}</AuthProvider>
  ) : (
    <>{children}</>
  );
}

/** Everything every page shares: sign-in, data, the page frame, and scroll position. */
function RootLayout() {
  return (
    <WithAuth>
      <DataProvider>
        <Layout>
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </Layout>
      </DataProvider>
      <ScrollRestoration />
    </WithAuth>
  );
}

const router = createBrowserRouter(
  [
    {
      element: <RootLayout />,
      children: [
        ...(config.dataSource === 'supabase' ? signedInRoutes : []),
        { path: '/', element: <HomePage /> },
        { path: '/:fellowId', element: <FellowPage /> },
        { path: '/:fellowId/r/:resourceId', element: <ResourcePage /> },
        { path: '*', element: <NotFoundView /> },
      ],
    },
  ],
  { basename, future: { v7_relativeSplatPath: true } },
);

export function App() {
  return <RouterProvider router={router} future={{ v7_startTransition: true }} />;
}
