/**
 * Offline notification indicator when connection is lost
 */

import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      id="pwa-offline-badge"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600/95 border border-amber-400/40 px-3 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur"
    >
      <WifiOff className="w-4 h-4 text-amber-100 animate-pulse" />
      <span>Offline Mode — Running standalone from local PWA cache</span>
    </div>
  );
};
