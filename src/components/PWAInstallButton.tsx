/**
 * In-app install button and guide trigger for Yaesu FRG-8800 CAT Controller
 * Integrates native PWA install prompt and modal guide.
 */

import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { InstallModal } from './InstallModal';
import { Download, Monitor, CheckCircle2, FileArchive, Loader2, Smartphone } from 'lucide-react';
import { audioSynth } from '../services/audioSynth';
import { downloadProjectZip } from '../services/zipExporter';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isStandalone, isIOS, isAndroid, isOpera, isInIframe, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleInstallClick = async () => {
    audioSynth.playKeyBeep(1800, 0.02);
    if (isInstallable) {
      const accepted = await install();
      if (!accepted) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  const handleDirectZipDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      audioSynth.playKeyBeep(1800, 0.02);
      setIsZipping(true);
      setDownloadSuccess(false);
      await downloadProjectZip();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to download zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Direct Download ZIP Button */}
        <button
          type="button"
          id="btn-header-download-zip"
          onClick={handleDirectZipDownload}
          disabled={isZipping}
          title="Directly download complete app source code as a ZIP file"
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md ${
            downloadSuccess
              ? 'bg-emerald-600 text-white shadow-emerald-950'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/60 shadow-emerald-950/50 hover:scale-[1.02]'
          }`}
        >
          {isZipping ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">Zipping...</span>
            </>
          ) : downloadSuccess ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
              <span>Downloaded .ZIP!</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Download ZIP</span>
            </>
          )}
        </button>

        {/* Install / Standalone App Trigger Button */}
        <button
          type="button"
          id="btn-install-pwa"
          onClick={handleInstallClick}
          title="Install in Opera Browser as standalone app"
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-md ${
            isStandalone
              ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700'
              : 'bg-red-600 hover:bg-red-500 text-white border border-red-400 shadow-red-950/50 hover:scale-[1.02] active:scale-95'
          }`}
        >
          {isStandalone ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Installed in Opera</span>
            </>
          ) : (
            <>
              <span className="w-3.5 h-3.5 rounded-full bg-white text-red-600 text-[10px] font-black flex items-center justify-center font-sans leading-none shadow-sm">
                O
              </span>
              <span>Install to Opera</span>
            </>
          )}
        </button>
      </div>

      <InstallModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        isInstallable={isInstallable}
        isStandalone={isStandalone}
        onTriggerInstall={install}
        isIOS={isIOS}
        isAndroid={isAndroid}
        isOpera={isOpera}
        isInIframe={isInIframe}
      />
    </>
  );
};
