import type { ReactNode } from 'react';
import { config } from '../config';
import { useData } from '../data/dataContext';

function OfflineNotice() {
  const state = useData();
  if (state.status !== 'ready' || state.data.origin !== 'cache') return null;
  const when = state.data.fetchedAt ? new Date(state.data.fetchedAt).toLocaleString() : 'earlier';
  return (
    <p className="notice" role="status">
      Couldn't reach the live data, so this is the copy saved on {when}.
    </p>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="wrap">
      <OfflineNotice />
      <main id="main">{children}</main>
      <footer className="footer">
        <span>{config.siteName}</span>
        <span>Part of {config.networkName}, a sharing space for TFI fellows</span>
      </footer>
    </div>
  );
}
