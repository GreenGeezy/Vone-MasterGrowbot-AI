import React, { useEffect, useRef, useState } from 'react';
import { Copy, Download, Share2, X } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { AnalysisShareSummary, analysisCaption, createAnalysisShareCard, SHARE_CTA, TRIAL_TERMS } from '../services/analysisShareCard';
import { APP_STORE_URL, PLAY_STORE_URL, copyAnalysisCaption, shareAnalysisCard } from '../services/shareService';

export default function AnalysisShareDialog({ summary, onClose }: { summary: AnalysisShareSummary; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [caption, setCaption] = useState(() => analysisCaption(summary));
  const [includeImage, setIncludeImage] = useState(Boolean(summary.imageUrl));
  const [card, setCard] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const operation = useRef(false);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    if (dialog.current?.showModal) dialog.current.showModal();
    else dialog.current?.setAttribute('open', '');
    return () => { previousFocus?.focus(); };
  }, []);

  useEffect(() => {
    let disposed = false;
    let url: string | undefined;
    setPreparing(true); setCard(null); setPreview(null);
    createAnalysisShareCard({ ...summary, imageUrl: includeImage ? summary.imageUrl : undefined }).then(blob => {
      if (disposed) return;
      url = URL.createObjectURL(blob); setCard(blob); setPreview(url);
    }).catch(() => { if (!disposed) setStatus('Card preview is unavailable. You can still share or copy the caption.'); })
      .finally(() => { if (!disposed) setPreparing(false); });
    return () => { disposed = true; if (url) URL.revokeObjectURL(url); };
  }, [summary.kind, summary.headline, summary.score, summary.imageUrl, includeImage]);

  const share = async () => {
    if (operation.current) return;
    operation.current = true; setBusy(true); setStatus('');
    try {
      const outcome = await shareAnalysisCard(caption, card);
      setStatus(outcome === 'shared' ? 'Share completed.' : outcome === 'cancelled' ? '' : 'Sharing is unavailable here. Copy the caption below or save the card, then post in your preferred app.');
    } finally { operation.current = false; setBusy(false); }
  };

  return <dialog ref={dialog} aria-modal="true" aria-labelledby="analysis-share-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }} className="fixed inset-0 z-[200] m-auto w-[calc(100%-2rem)] max-w-md max-h-[90vh] supports-[height:100dvh]:max-h-[90dvh] overflow-y-auto rounded-3xl p-0 bg-white text-slate-900 backdrop:bg-slate-950/70 shadow-2xl">
    <div className="p-5 overflow-y-auto">
      <div className="flex justify-between items-center gap-3"><h2 id="analysis-share-title" className="text-xl font-black">Share your plant check-in</h2><button onClick={onClose} disabled={busy} aria-label="Close sharing" className="p-3 rounded-full bg-slate-100"><X size={18} /></button></div>
      <p className="text-xs text-slate-500 mt-2 mb-4">Share a second look. Review the image and caption before choosing where to share.</p>
      {preview ? <img src={preview} alt={`Share card: ${summary.headline}. AI visual score ${summary.score} out of 100.`} className="w-full max-h-[28vh] object-contain rounded-2xl bg-slate-950" /> : <p className="p-5 bg-slate-50 rounded-xl text-sm">{preparing ? 'Preparing your card…' : 'Caption sharing is ready.'}</p>}
      {summary.imageUrl && <label className="flex items-center gap-2 py-2 text-xs font-semibold"><input type="checkbox" checked={includeImage} disabled={busy} onChange={event => setIncludeImage(event.target.checked)} /> Include my {summary.kind === 'video' ? 'video frame' : 'plant photo'}</label>}
      <label htmlFor="analysis-share-caption" className="block font-bold text-sm mt-4 mb-2">Your caption</label>
      <textarea id="analysis-share-caption" value={caption} maxLength={700} onChange={event => setCaption(event.target.value)} rows={2} className="w-full rounded-xl border border-slate-200 p-3 text-base resize-y" />
      <p className="text-xs text-slate-500 my-2">{SHARE_CTA} {TRIAL_TERMS}</p>
      <div className="sticky -bottom-5 bg-white pt-2 pb-3"><button onClick={share} disabled={busy || preparing || !caption.trim()} className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-600 text-white font-bold disabled:opacity-50"><Share2 size={18} />{busy ? 'Opening sharing…' : 'Share plant check-in'}</button>
      <div className="flex flex-wrap gap-3 mt-3">
        <button disabled={busy} onClick={async () => setStatus(await copyAnalysisCaption(caption) ? 'Caption and both store links copied.' : 'Copy is unavailable. Select the caption, invitation and store links to copy them manually.')} className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-100 text-sm font-bold"><Copy size={16} /> Copy caption</button>
        {!Capacitor.isNativePlatform() && preview && <a href={preview} download="mastergrowbot-plant-check-in.png" className="flex-1 flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-100 text-sm font-bold"><Download size={16} /> Save card</a>}
      </div>
      </div><p className="text-xs text-slate-500 mt-3">Messages, social apps and other destinations appear when supported by your device. Some apps accept only the image; paste your copied caption there.</p>
      <input aria-label="App Store link" readOnly value={APP_STORE_URL} className="mt-2 w-full bg-transparent text-xs text-slate-500 select-all" />
      <input aria-label="Google Play link" readOnly value={PLAY_STORE_URL} className="mt-2 w-full bg-transparent text-xs text-slate-500 select-all" />
      <p role="status" className="text-sm text-emerald-800 mt-3">{status}</p>
    </div>
  </dialog>;
}
