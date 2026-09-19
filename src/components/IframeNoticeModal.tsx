import React from 'react';
import { Cable, ExternalLink, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { audioSynth } from '../services/audioSynth';

interface IframeNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  directUrl: string;
}

export const IframeNoticeModal: React.FC<IframeNoticeModalProps> = ({
  isOpen,
  onClose,
  directUrl,
}) => {
  if (!isOpen) return null;

  const handleOpenDirect = () => {
    audioSynth.playKeyBeep(1600, 0.03);
    const target = directUrl.includes('?') 
      ? `${directUrl}&action=connect`
      : `${directUrl}?action=connect`;
    window.open(target, '_blank');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-emerald-600/70 rounded-2xl shadow-2xl p-5 sm:p-6 text-zinc-100">
        <button
          type="button"
          onClick={() => {
            audioSynth.playKeyBeep(800, 0.02);
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 border-b border-zinc-800 pb-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
            <Cable className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-zinc-100">Connect Physical Yaesu FRG-8800</h3>
            <p className="text-xs text-emerald-400 font-mono">Web Serial Hardware Interface (4800 8N2)</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-zinc-300">
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-700/60 flex items-start gap-2.5 text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-300 mb-1">Embedded Preview Frame Detected</div>
              <p className="leading-relaxed">
                Modern browsers (Opera, Chrome, Edge) block USB hardware access inside embedded preview frames for security. To talk to your physical COM port, the controller must open in a direct browser tab.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="font-semibold text-zinc-200">What happens next:</div>
            <ul className="space-y-1.5 text-[11px] text-zinc-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>The app opens in your browser as a full direct page.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Your browser displays the native <strong>&quot;Select Serial Port&quot;</strong> window.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Pick your USB-to-TTL adapter (e.g. COM3 / CH340 / FTDI) and click <strong>Connect</strong>.</span>
              </li>
            </ul>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <button
              type="button"
              onClick={handleOpenDirect}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black font-extrabold text-sm shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-98"
            >
              <ExternalLink className="w-4 h-4 stroke-[2.5]" />
              <span>OPEN IN FULL TAB &amp; SELECT COM PORT</span>
            </button>
            <p className="text-center text-[10px] text-zinc-500">
              No software installation or Node.js required. Runs 100% directly through Opera One.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
