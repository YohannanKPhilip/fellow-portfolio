import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ScrollToTop } from './components/ScrollToTop';
import { NotFoundView } from './components/StatusView';
import { DataProvider } from './data/DataProvider';
import { FellowPage } from './pages/FellowPage';
import { ResourcePage } from './pages/ResourcePage';

// BASE_URL is "/fellow-portfolio/" on GitHub Pages; the router needs it without the trailing slash.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '');

export function App() {
  return (
    <BrowserRouter basename={basename}>
      <ScrollToTop />
      <DataProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<FellowPage />} />
            <Route path="/:fellowId" element={<FellowPage />} />
            <Route path="/:fellowId/r/:resourceId" element={<ResourcePage />} />
            <Route path="*" element={<NotFoundView />} />
          </Routes>
        </Layout>
      </DataProvider>
    </BrowserRouter>
  );
}
