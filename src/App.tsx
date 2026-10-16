import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { Layout } from './components/Layout';
import { ScrollToTop } from './components/ScrollToTop';
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

const signedInRoutes = (
  <>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/auth/callback" element={<CallbackPage />} />
    <Route path="/setup" element={<SetupPage />} />
    <Route path="/me" element={<MeRedirect />} />
    <Route path="/:fellowId/me" element={<MePage />} />
    <Route path="/:fellowId/edit" element={<PageBuilder />} />
    <Route path="/:fellowId/settings" element={<SettingsPage />} />
    <Route path="/:fellowId/r/:resourceId/edit" element={<ResourceBuilder />} />
  </>
);

/** The sign-in pages need Supabase. With the Sheet as the data source they don't exist. */
function WithAuth({ children }: { children: ReactNode }) {
  return config.dataSource === 'supabase' ? (
    <AuthProvider>{children}</AuthProvider>
  ) : (
    <>{children}</>
  );
}

export function App() {
  return (
    <BrowserRouter
      basename={basename}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <ScrollToTop />
      <WithAuth>
        <DataProvider>
          <Layout>
            <Suspense fallback={<Loading />}>
              <Routes>
                {config.dataSource === 'supabase' && signedInRoutes}
                <Route path="/" element={<HomePage />} />
                <Route path="/:fellowId" element={<FellowPage />} />
                <Route path="/:fellowId/r/:resourceId" element={<ResourcePage />} />
                <Route path="*" element={<NotFoundView />} />
              </Routes>
            </Suspense>
          </Layout>
        </DataProvider>
      </WithAuth>
    </BrowserRouter>
  );
}
