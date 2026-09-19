/**
 * Modal dialog explaining how to download, install, and run the Yaesu FRG-8800 CAT Controller
 * Covers 1-click PWA desktop installation, downloading ZIP source code, and running locally.
 */

import React, { useState } from 'react';
import { Download, Monitor, Laptop, Terminal, X, CheckCircle2, ExternalLink, HardDrive, Usb, Loader2, FileArchive, Smartphone, Tablet, AlertTriangle, Copy, Check, Package } from 'lucide-react';
import { downloadProjectZip } from '../services/zipExporter';
import { audioSynth } from '../services/audioSynth';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  isStandalone: boolean;
  onTriggerInstall: () => void;
  isIOS: boolean;
  isAndroid?: boolean;
  isOpera?: boolean;
  isInIframe?: boolean;
}

export const InstallModal: React.FC<InstallModalProps> = ({
  isOpen,
  onClose,
  isInstallable,
  isStandalone,
  onTriggerInstall,
  isIOS,
  isAndroid = false,
  isOpera = false,
  isInIframe = false,
}) => {
  const [isZipping, setIsZipping] = useState(false);
  const [zipProgress, setZipProgress] = useState(0);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Tab for browser specific instructions: 'opera' | 'android' | 'chrome' | 'ios' | 'apk'
  const [activeBrowserTab, setActiveBrowserTab] = useState<'opera' | 'android' | 'chrome' | 'ios' | 'apk'>(() => {
    if (isOpera) return 'opera';
    if (isAndroid) return 'android';
    if (isIOS) return 'ios';
    return 'opera'; // default to Opera since user requested it
  });

  if (!isOpen) return null;

  const handleCopyDirectUrl = async () => {
    try {
      audioSynth.playKeyBeep(2000, 0.02);
      await navigator.clipboard.writeText(window.location.href);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 3000);
    } catch {
      // fallback
    }
  };

  const handleOpenDirectTab = () => {
    audioSynth.playKeyBeep(1800, 0.02);
    window.open(window.location.href, '_blank');
  };

  const handleDownloadOperaLauncher = () => {
    try {
      audioSynth.playKeyBeep(1800, 0.02);
      const directUrl = window.location.href.split('#')[0];
      const batScript = `@echo off
title Yaesu FRG-8800 CAT Controller (Opera App Mode)
echo ==========================================================
echo Starting Yaesu FRG-8800 CAT Controller in Opera App Mode...
echo ==========================================================
echo.

:: 1. Check Opera in user LocalAppData (standard modern Opera One installation)
if exist "%LOCALAPPDATA%\\Programs\\Opera\\launcher.exe" (
    start "" "%LOCALAPPDATA%\\Programs\\Opera\\launcher.exe" --app="${directUrl}"
    exit
)

:: 2. Check Opera in standard 64-bit Program Files
if exist "%ProgramFiles%\\Opera\\launcher.exe" (
    start "" "%ProgramFiles%\\Opera\\launcher.exe" --app="${directUrl}"
    exit
)

:: 3. Check Opera in 32-bit Program Files
if exist "%ProgramFiles(x86)%\\Opera\\launcher.exe" (
    start "" "%ProgramFiles(x86)%\\Opera\\launcher.exe" --app="${directUrl}"
    exit
)

:: 4. Fallback to opera command in system PATH
start "" opera.exe --app="${directUrl}"
exit
`;
      const blob = new Blob([batScript], { type: 'application/x-bat' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Launch-Yaesu-FRG8800-Opera.bat';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate bat launcher:', err);
    }
  };

  const handleDownloadZip = async () => {
    try {
      audioSynth.playKeyBeep(1800, 0.03);
      setIsZipping(true);
      setZipProgress(10);
      setDownloadSuccess(false);

      await downloadProjectZip((percent) => {
        setZipProgress(percent);
      });

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err) {
      console.error('Failed to download zip:', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-4 sm:p-6 text-zinc-100 my-2 sm:my-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-100">
                Install & Download Yaesu FRG-8800 CAT Controller
              </h3>
              <p className="text-xs text-zinc-400">
                Run natively as a desktop app or download complete source code
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 text-xs sm:text-sm">
          {/* Important Hardware Connection Notice */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-950/40 border border-emerald-600/70 text-emerald-200 space-y-2 shadow-lg">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm text-emerald-300">
                  You Do NOT Need to Download or Build Any Files to Use Your Radio!
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed mt-1">
                  Opera One connects <strong>directly to your real hardware COM port</strong> through Web Serial right in your browser. You do not need to install Node.js, run build commands, or open JSON files. Simply open the app in a direct Opera tab and click <strong>&quot;CONNECT COM PORT&quot;</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Troubleshooting Alert / Direct Tab Opener */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-red-950/40 via-zinc-900 to-red-950/20 border border-red-800/60 text-zinc-200 space-y-3 shadow-lg">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                  <span>Having trouble installing in Opera?</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-900/60 text-red-200 border border-red-700">
                    Quick Fix
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Opera <strong>blocks app installation</strong> when viewing inside a preview window (iframe). You must open the app in a <strong>dedicated Opera browser tab</strong> for Opera to enable the install button and WebAPK builder.
                </p>
              </div>
            </div>

            {/* Direct Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                id="btn-modal-open-direct-tab"
                onClick={handleOpenDirectTab}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-md shadow-red-950 transition-all cursor-pointer hover:scale-[1.02] active:scale-95"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Open App in Direct Opera Tab</span>
              </button>

              <button
                type="button"
                id="btn-modal-copy-url"
                onClick={handleCopyDirectUrl}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold transition-all cursor-pointer"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">URL Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Copy Direct URL</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Browser Selection Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-950 border border-zinc-800 rounded-xl overflow-x-auto text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveBrowserTab('opera')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeBrowserTab === 'opera'
                  ? 'bg-red-950/80 text-red-200 border border-red-700/80 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <span className="w-3.5 h-3.5 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center font-sans">
                O
              </span>
              <span>Opera Browser</span>
              {isOpera && (
                <span className="text-[9px] bg-red-800/80 text-white px-1.5 py-0.2 rounded font-mono font-bold">
                  Detected
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveBrowserTab('android')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeBrowserTab === 'android'
                  ? 'bg-emerald-950/80 text-emerald-200 border border-emerald-700/80 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Android</span>
              {isAndroid && (
                <span className="text-[9px] bg-emerald-800/80 text-white px-1.5 py-0.2 rounded font-mono font-bold">
                  Detected
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveBrowserTab('chrome')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeBrowserTab === 'chrome'
                  ? 'bg-blue-950/80 text-blue-200 border border-blue-700/80 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Laptop className="w-3.5 h-3.5 text-blue-400" />
              <span>Chrome / Edge / Brave</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveBrowserTab('ios')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeBrowserTab === 'ios'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-600 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              <Tablet className="w-3.5 h-3.5 text-zinc-300" />
              <span>iOS / Safari</span>
              {isIOS && (
                <span className="text-[9px] bg-zinc-700 text-white px-1.5 py-0.2 rounded font-mono font-bold">
                  Detected
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveBrowserTab('apk')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                activeBrowserTab === 'apk'
                  ? 'bg-amber-950/80 text-amber-200 border border-amber-600 shadow-sm'
                  : 'text-amber-400 hover:text-amber-200 hover:bg-amber-950/30 border border-amber-800/40'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-amber-400" />
              <span>Android .APK</span>
              <span className="text-[9px] bg-amber-600 text-black px-1.5 py-0.2 rounded font-mono font-black">
                NEW
              </span>
            </button>
          </div>

          {/* Method 1: Instant App Installation */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 shadow-inner space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {activeBrowserTab === 'opera' ? (
                  <span className="w-5 h-5 rounded-full bg-red-600 text-white text-xs font-black flex items-center justify-center font-sans shadow-sm">
                    O
                  </span>
                ) : activeBrowserTab === 'android' ? (
                  <Smartphone className="w-5 h-5 text-emerald-400" />
                ) : activeBrowserTab === 'apk' ? (
                  <Package className="w-5 h-5 text-amber-400" />
                ) : (
                  <Monitor className="w-5 h-5 text-blue-400" />
                )}
                <span className="font-bold text-sm text-zinc-100">
                  {activeBrowserTab === 'opera'
                    ? 'How to Install in Opera Browser'
                    : activeBrowserTab === 'android'
                    ? 'Install on Android (WebAPK)'
                    : activeBrowserTab === 'apk'
                    ? 'Generate & Download .APK (Android Package)'
                    : activeBrowserTab === 'chrome'
                    ? 'Install in Chrome / Edge / Brave'
                    : 'Install on Apple iOS / Safari'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-zinc-900 text-zinc-300 border border-zinc-700">
                {activeBrowserTab === 'apk' ? 'Android APK' : 'PWA Standalone'}
              </span>
            </div>

            {/* Standalone status */}
            {isStandalone ? (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-700 text-emerald-300 flex items-center gap-2 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>You are already running the installed standalone app!</span>
              </div>
            ) : isInstallable ? (
              <button
                type="button"
                id="modal-install-btn"
                onClick={() => {
                  onTriggerInstall();
                  onClose();
                }}
                className={`w-full py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg hover:scale-[1.01] ${
                  activeBrowserTab === 'opera'
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-950'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950'
                }`}
              >
                {activeBrowserTab === 'opera' ? (
                  <>
                    <span className="w-4 h-4 rounded-full bg-white text-red-600 text-[10px] font-black flex items-center justify-center font-sans">
                      O
                    </span>
                    <span>Install in Opera Browser Now</span>
                  </>
                ) : activeBrowserTab === 'android' ? (
                  <>
                    <Smartphone className="w-4 h-4" />
                    <span>Install on Android Device Now</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Install App Now</span>
                  </>
                )}
              </button>
            ) : null}

            {/* OPERA BROWSER INSTRUCTIONS */}
            {activeBrowserTab === 'opera' && (
              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-lg bg-red-950/40 border border-red-800/80 text-red-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-red-300 text-sm">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Why There Is No &quot;Install&quot; Button in Desktop Opera</span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed text-xs">
                    Unlike Google Chrome and Microsoft Edge, <strong>desktop Opera (including Opera One and Opera GX) deliberately does NOT support installing Progressive Web Apps as standalone desktop applications</strong>. Opera removed the Chromium PWA install button and desktop app manager from their desktop browser.
                  </p>
                  <p className="text-amber-300/90 text-[11px]">
                    This is an Opera browser design choice, not an error with this website.
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/80 text-emerald-200 space-y-1.5">
                  <div className="font-bold text-sm text-emerald-300 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Good News: Opera One is Your Perfect Browser for This Radio!</span>
                  </div>
                  <p className="text-zinc-300 leading-relaxed text-xs">
                    Between <strong>Firefox, TOR, and Opera One</strong>:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-zinc-300 text-[11px] pl-1">
                    <li><strong className="text-rose-400">Firefox:</strong> Does not support Web Serial API (Mozilla blocks serial communications).</li>
                    <li><strong className="text-rose-400">TOR:</strong> Extreme sandboxing prevents hardware access to COM ports.</li>
                    <li><strong className="text-emerald-400">Opera One:</strong> Fully supports the Chromium <strong>Web Serial API</strong> to talk directly to your Yaesu FRG-8800!</li>
                  </ul>
                </div>

                <div className="font-semibold text-zinc-200 text-sm">
                  Choose How You Want to Run It in Opera One:
                </div>

                <div className="grid gap-2.5">
                  {/* Option 1: Standalone App Window without Browser Bars */}
                  <div className="p-3.5 rounded-lg bg-zinc-900 border border-emerald-600/70 space-y-2.5">
                    <div className="font-bold text-emerald-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-600 text-[10px] font-mono font-bold text-black shadow-sm">
                          Recommended
                        </span>
                        <span>Run Opera in Standalone App Window</span>
                      </div>
                      <span className="text-[11px] text-zinc-400 font-mono">No Address Bar</span>
                    </div>
                    <p className="text-zinc-300 leading-relaxed text-xs">
                      Even though Opera doesn&apos;t have an &ldquo;Install&rdquo; button, you can launch Opera in <strong>dedicated App Mode</strong>. It opens in its own window with no address bar, no tabs, and a clean title bar—identical to an installed desktop app!
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <a
                        href="/Launch-Yaesu-FRG8800-Opera.bat"
                        download="Launch-Yaesu-FRG8800-Opera.bat"
                        onClick={(e) => {
                          audioSynth.playKeyBeep(1800, 0.02);
                          // Also try dynamic blob in case direct URL needs exact current domain
                          handleDownloadOperaLauncher();
                        }}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                      >
                        <Download className="w-4 h-4 stroke-[2.5]" />
                        <span>Download 1-Click Opera Launcher (.bat)</span>
                      </a>

                      <button
                        type="button"
                        onClick={handleCopyDirectUrl}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold cursor-pointer"
                      >
                        {copiedUrl ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300">URL Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Copy URL</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="p-2.5 rounded bg-black/50 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
                      <div className="font-semibold text-zinc-300">Manual Windows Desktop Shortcut instructions:</div>
                      <p>Right-click desktop &rarr; <em>New &rarr; Shortcut</em> &rarr; paste:</p>
                      <code className="block bg-zinc-950 p-1.5 rounded text-emerald-300 font-mono text-[10px] break-all select-all">
                        opera.exe --app=&quot;{window.location.href.split('#')[0]}&quot;
                      </code>
                    </div>
                  </div>

                  {/* Option 2: Use Directly in an Opera Browser Tab */}
                  <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 space-y-2">
                    <div className="font-bold text-zinc-200 flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono font-bold text-zinc-300">
                        Option 2
                      </span>
                      <span>Use Directly Inside a Regular Opera Tab</span>
                    </div>
                    <p className="text-zinc-300 leading-relaxed text-xs">
                      You do <strong>not</strong> need to install anything. The CAT controller and serial hardware connection work 100% inside your standard Opera browser:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-zinc-300 text-[11px] pl-1">
                      <li>Bookmark this page (press <kbd className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-200 font-mono">Ctrl + D</kbd>).</li>
                      <li>Plug in your USB serial CAT cable.</li>
                      <li>Click <strong>&quot;CONNECT RADIO&quot;</strong> on the controller to select your COM port.</li>
                    </ol>
                  </div>

                  {/* Option 3: Pin to Opera Sidebar */}
                  <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 space-y-1.5">
                    <div className="font-bold text-zinc-200 flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono font-bold text-zinc-300">
                        Option 3
                      </span>
                      <span>Pin to Opera&apos;s Left Sidebar Panel</span>
                    </div>
                    <p className="text-zinc-300 leading-relaxed text-xs">
                      Keep the receiver open in Opera&apos;s side panel while browsing other web pages! Click the <strong>&ldquo;+&rdquo;</strong> icon at the bottom of Opera&apos;s left sidebar &rarr; under <em>Custom web panels</em>, add this page.
                    </p>
                  </div>

                  {/* Method C: Opera on Android (Standard & Opera GX) */}
                  <div className="p-3.5 rounded-lg bg-zinc-900 border border-red-800/80 space-y-2.5">
                    <div className="font-bold text-red-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-red-400" />
                        <span>Opera on Android (Phone & Tablet)</span>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-red-950 text-[10px] font-mono font-bold text-red-300 border border-red-700">
                        Step-by-Step
                      </span>
                    </div>

                    <p className="text-zinc-300 leading-relaxed text-xs">
                      To install this as a standalone WebAPK app using <strong>Opera for Android</strong> or <strong>Opera GX Mobile</strong>:
                    </p>

                    <ol className="list-decimal list-inside space-y-2 text-xs text-zinc-300 leading-relaxed bg-black/40 p-3 rounded-lg border border-zinc-800">
                      <li>
                        Tap the <strong>red Opera &quot;O&quot; logo</strong> (or <strong>three dots ⋮</strong>) in the bottom-right corner (or top-right on tablets) of the screen.
                      </li>
                      <li>
                        Look for and tap <strong>&quot;Add to Home screen&quot;</strong> (or <strong>&quot;Install app&quot;</strong>).
                      </li>
                      <li>
                        A prompt will ask to confirm <strong>&quot;Install Yaesu FRG-8800 CAT Controller&quot;</strong> &mdash; tap <strong>&quot;Install&quot;</strong> or <strong>&quot;Add&quot;</strong>.
                      </li>
                      <li>
                        Android and Opera will generate the native WebAPK app package. You will now see the <strong>FRG-8800</strong> icon on your home screen and in your Android app drawer.
                      </li>
                    </ol>

                    <div className="p-3 rounded-lg bg-zinc-950 border border-amber-800/60 text-xs space-y-2">
                      <div className="font-bold text-amber-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>Why Opera won&apos;t let you install &amp; How to fix:</span>
                      </div>
                      <div className="space-y-2 text-zinc-300 leading-relaxed text-[11px]">
                        <div>
                          <strong className="text-red-300">1. You are inside the AI Studio Preview window:</strong>
                          <p className="text-zinc-400">
                            Opera blocks PWA installation when a web page is inside an iframe. Click <strong>&quot;Open App in Direct Opera Tab&quot;</strong> at the top of this dialog, then open the Opera menu to install.
                          </p>
                        </div>
                        <div>
                          <strong className="text-red-300">2. &quot;Data Savings&quot; is turned ON in Opera for Android:</strong>
                          <p className="text-zinc-400">
                            In Opera Mobile, tap the red <strong>O</strong> &rarr; <strong>Settings</strong> &rarr; toggle <strong>Data Savings</strong> to <strong>OFF</strong>. (Data savings routes traffic through compression proxies, which disables service workers and web app manifests).
                          </p>
                        </div>
                        <div>
                          <strong className="text-red-300">3. Using &quot;Opera Mini&quot; instead of &quot;Opera for Android&quot;:</strong>
                          <p className="text-zinc-400">
                            Opera Mini uses cloud-rendered images and cannot install WebAPKs. Please use standard <strong>Opera for Android</strong> or <strong>Opera GX Mobile</strong> from Google Play.
                          </p>
                        </div>
                        <div>
                          <strong className="text-red-300">4. Fallback: Direct Download ZIP:</strong>
                          <p className="text-zinc-400">
                            If you cannot install via browser, click <strong>Download ZIP</strong> below to run the controller locally with full offline access.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Crucial Opera Serial Hardware Flag */}
                  <div className="p-3.5 rounded-lg bg-red-950/30 border border-red-900/60 text-zinc-300 space-y-2">
                    <div className="font-bold text-red-400 flex items-center gap-2">
                      <Usb className="w-4 h-4 text-red-400" />
                      <span>Opera Hardware Tip: Enabling Web Serial (USB CAT Cable)</span>
                    </div>
                    <p className="text-zinc-300 text-xs leading-relaxed">
                      If you plan to connect a physical USB-to-TTL serial cable to control the real FRG-8800 radio, Opera requires Web Serial to be enabled:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-zinc-300 text-xs font-mono bg-black/50 p-2.5 rounded border border-zinc-800">
                      <li>In Opera, open a new tab and paste: <strong className="text-red-300 font-bold select-all">opera://flags/#enable-web-serial-api</strong></li>
                      <li>Change &quot;Web Serial API&quot; from Default to <strong className="text-emerald-400">Enabled</strong>.</li>
                      <li>Click the blue <strong className="text-blue-400">Relaunch</strong> button at the bottom of Opera.</li>
                      <li>Return to this controller and click <strong className="text-emerald-400">&quot;CONNECT USB / CAT&quot;</strong>!</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* ANDROID INSTRUCTIONS */}
            {activeBrowserTab === 'android' && (
              <div className="p-3.5 rounded-lg bg-zinc-900 border border-emerald-900/60 text-zinc-300 text-xs space-y-2">
                <div className="font-bold text-emerald-400 flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  <span>How to Install on Android (Chrome, Opera Mobile, Edge):</span>
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-zinc-300 text-xs leading-relaxed">
                  <li>
                    Tap the <strong>browser menu (three dots ⋮ or Opera O)</strong>.
                  </li>
                  <li>
                    Select <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
                  </li>
                  <li>
                    Tap <strong>&quot;Install&quot;</strong>. Android will build and add the official standalone app icon to your home screen.
                  </li>
                  <li>
                    Launch <strong>Yaesu FRG-8800</strong> from your app drawer!
                  </li>
                </ol>
              </div>
            )}

            {/* CHROME / EDGE / BRAVE INSTRUCTIONS */}
            {activeBrowserTab === 'chrome' && (
              <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs space-y-2">
                <div className="font-bold text-blue-400 flex items-center gap-2">
                  <Laptop className="w-4 h-4 text-blue-400" />
                  <span>How to Install in Chrome / Edge / Brave:</span>
                </div>
                <p className="text-zinc-300 leading-relaxed">
                  Click the <strong>Install icon</strong> (computer screen with a down arrow) located in your browser address bar on the far right, or open the browser menu (<strong>⋮</strong>) &rarr; <strong>Install Yaesu FRG-8800 CAT Controller</strong>.
                </p>
              </div>
            )}

            {/* IOS SAFARI INSTRUCTIONS */}
            {activeBrowserTab === 'ios' && (
              <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs space-y-2">
                <div className="font-bold text-zinc-200">iOS Safari Installation:</div>
                <p className="text-zinc-300 leading-relaxed">
                  Tap the <strong>Share</strong> button (box with an arrow pointing up) in the Safari toolbar, scroll down, and select <strong>Add to Home Screen</strong>.
                </p>
              </div>
            )}

            {/* ANDROID .APK GENERATION & DOWNLOAD INSTRUCTIONS */}
            {activeBrowserTab === 'apk' && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-zinc-900 to-amber-950/20 border border-amber-600/70 text-zinc-200 space-y-3 shadow-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                        <span>How to get an .APK file for Android</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-900/80 text-amber-200 border border-amber-600">
                          Option 1: 1-Click Online
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        Because this app has a full <strong>PWA Web App Manifest</strong> and <strong>Service Worker</strong>, you can turn it into a native, sideloadable <strong>.apk</strong> file instantly using Microsoft&apos;s free <strong>PWABuilder</strong> tool:
                      </p>
                    </div>
                  </div>

                  <div className="bg-black/50 p-3.5 rounded-lg border border-zinc-800 space-y-2.5 text-xs">
                    <div className="font-bold text-amber-300">Quick 3-Step .APK Generation:</div>
                    <ol className="list-decimal list-inside space-y-1.5 text-zinc-300 leading-relaxed">
                      <li>
                        Click the button below to open <strong>PWABuilder</strong> with this app&apos;s manifest URL.
                      </li>
                      <li>
                        Under <strong>&quot;Package for Stores&quot;</strong>, select <strong>Android</strong>.
                      </li>
                      <li>
                        Click <strong>&quot;Generate APK&quot;</strong> (or Debug APK). Download the <strong>.apk</strong> directly to your phone and tap it to install!
                      </li>
                    </ol>

                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      <a
                        href={`https://www.pwabuilder.com/?url=${encodeURIComponent(window.location.href)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-black text-xs shadow-md shadow-amber-950 transition-all cursor-pointer hover:scale-105 active:scale-95"
                      >
                        <ExternalLink className="w-4 h-4 text-black" />
                        <span>Open PWABuilder (.APK Generator)</span>
                      </a>

                      <button
                        type="button"
                        onClick={handleCopyDirectUrl}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold cursor-pointer"
                      >
                        {copiedUrl ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-300">URL Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-zinc-400" />
                            <span>Copy App URL for PWABuilder</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Native WebAPK vs Standalone APK note */}
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs space-y-2">
                    <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4 text-emerald-400" />
                      <span>Option 2: Android&apos;s Built-in &quot;WebAPK&quot; (No Tools Required)</span>
                    </div>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">
                      Did you know? When you tap <strong>&quot;Install app&quot;</strong> in Chrome or standard Opera for Android, Android automatically compiles a genuine <strong>.apk package (called a WebAPK)</strong> and installs it directly into your phone&apos;s app drawer (visible under Android Settings &rarr; Apps).
                    </p>
                  </div>

                  {/* Option 3: Android Studio & Capacitor */}
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs space-y-2">
                    <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
                      <HardDrive className="w-4 h-4 text-blue-400" />
                      <span>Option 3: Compile via Android Studio / Capacitor</span>
                    </div>
                    <p className="text-zinc-400 text-[11px] leading-relaxed">
                      You can click <strong>&quot;Download ZIP&quot;</strong> below to get the complete source code, then run:
                    </p>
                    <div className="bg-black/60 p-2 rounded font-mono text-[11px] text-emerald-400 border border-zinc-800 select-all">
                      npm install @capacitor/android && npx cap add android && npx cap open android
                    </div>
                    <p className="text-zinc-400 text-[11px]">
                      In Android Studio, click <strong>Build &rarr; Build Bundle(s) / APK(s) &rarr; Build APK(s)</strong> to generate a signed release <code className="text-amber-400 font-mono">.apk</code>.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Android USB OTG Hardware Connectivity Guide */}
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <Usb className="w-4 h-4" />
              <span>Hardware CAT Interface Cables & Wiring:</span>
            </div>
            <p className="text-zinc-300 text-xs leading-relaxed">
              Connect your PC, Mac, Android, or laptop to the FRG-8800:
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs text-zinc-400 leading-relaxed">
              <li>
                Use a standard <strong>USB-to-TTL serial adapter</strong> (FTDI FT232RL, Silicon Labs CP2102, or CH340).
              </li>
              <li>
                Connect adapter <strong>TX</strong> to FRG-8800 rear DIN CAT <strong>SI (Serial In)</strong> pin, and <strong>GND</strong> to <strong>GND</strong> pin.
              </li>
              <li>
                Operating parameters: <strong>4800 baud, 8 data bits, no parity, 2 stop bits (8N2)</strong>, inverted TTL mark level.
              </li>
            </ul>
          </div>

          {/* Method 2: Download Full Source Code (ZIP / GitHub) */}
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-blue-400" />
                <span className="font-bold text-sm text-blue-300">
                  Method 2: Download Source Code (ZIP / GitHub)
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold bg-blue-950 text-blue-400 border border-blue-800">
                Self-Host
              </span>
            </div>

            <p className="text-zinc-300 leading-relaxed text-xs">
              Download the entire project source code, including start scripts for Windows and macOS/Linux, to run offline on your machine:
            </p>

            {/* Direct Instant 1-Click ZIP Download Button */}
            <button
              type="button"
              id="modal-direct-download-zip-btn"
              onClick={handleDownloadZip}
              disabled={isZipping}
              className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg ${
                downloadSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-950'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-950/60 hover:scale-[1.01]'
              }`}
            >
              {isZipping ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Packaging Source Files ({zipProgress}%)...</span>
                </>
              ) : downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                  <span>Downloaded yaesu-frg8800-cat-controller.zip!</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Download Complete ZIP Package Directly (.zip)</span>
                </>
              )}
            </button>

            <div className="pt-1 space-y-2">
              <span className="font-semibold text-zinc-300 block">Quick Run Instructions:</span>
              <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs space-y-1">
                <span className="text-amber-400 font-bold">Requirement:</span>
                <span className="text-zinc-300 ml-1">
                  Node.js (version 18+) must be installed on your computer. If you don&apos;t have it yet, download it free at{' '}
                  <a
                    href="https://nodejs.org"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 underline font-semibold"
                  >
                    nodejs.org
                  </a>.
                </span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-xs text-zinc-400 leading-relaxed">
                <li>Extract the downloaded ZIP archive into a folder on your computer.</li>
                <li>
                  On Windows double-click <code className="text-emerald-300 bg-zinc-900 px-1 rounded">start-windows.bat</code>, or in your terminal run:
                  <div className="my-2 p-2 rounded bg-black font-mono text-[11px] text-emerald-300 border border-zinc-800 select-all">
                    npm install<br />
                    npm run dev
                  </div>
                </li>
                <li>
                  Your browser will automatically open to <code className="text-emerald-300 bg-zinc-900 px-1 rounded">http://localhost:3000</code>.
                </li>
              </ol>
            </div>
          </div>

          {/* Advantage for Radio Amateurs / Hardware Enthusiasts */}
          <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-800/50 flex items-start gap-3 text-xs text-amber-200">
            <Usb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300 block mb-0.5">
                Why Running as an App is Best for Web Serial:
              </span>
              <p className="text-amber-200/90 leading-relaxed text-[11px]">
                Web Serial requires a secure context (HTTPS or localhost) and direct user gesture approval. Running in an installed PWA or local server guarantees seamless serial port enumeration for FTDI, CP2102, and CH340 adapters with zero browser sandboxing limits.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-zinc-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
