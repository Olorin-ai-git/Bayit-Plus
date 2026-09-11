import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { captureAnchor } from './reviewAnchors';
import { copy, reviewConfig } from './reviewConfig';
import { emptyFinding, type Finding, type Pin } from './reviewModel';
import { captureContext, createReviewRuntime, readEvidence, serializeEvidence, type ReviewRuntime } from './reviewRuntime';
import ReviewEditor from './ReviewEditor';
import { useReviewTargets } from './useReviewTargets';
import { useReviewSelection } from './useReviewSelection';
import './review.css';

type Props = { pathname: string; buildSha: string | null; runtime?: ReviewRuntime };
export default function ReviewOverlay({ pathname, buildSha, runtime: provided }: Props) {
  const [runtime] = useState(() => provided || createReviewRuntime(window));
  const [loaded] = useState(() => readEvidence(runtime));
  const [pins, setPins] = useState(loaded.pins);
  const [notice, setNotice] = useState(loaded.error);
  const [collapsed, setCollapsed] = useState(false);
  const [panelSide, setPanelSide] = useState<'left' | 'right'>('right');
  const [selecting, setSelecting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [returnFocus, setReturnFocus] = useState(false);
  const [draft, setDraft] = useState<Pin | null>(null);
  const [reattach, setReattach] = useState<string | null>(null);
  const identities = useRef(new Map<string, Element>()).current;
  const selectButton = useRef<HTMLButtonElement>(null);
  const latestPath = useRef(pathname);
  latestPath.current = pathname;
  const targets = useReviewTargets(pins, pathname, identities, runtime);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { setSelecting(false); setDraft(null); setReattach(null); }, [pathname]);
  useEffect(() => {
    if (returnFocus && !busy && !draft && !selecting && !collapsed) {
      selectButton.current?.focus(); setReturnFocus(false);
    }
  }, [returnFocus, busy, draft, selecting, collapsed]);

  const store = useCallback((next: Pin[], message: string) => {
    setPins(next);
    if (!loaded.writable) { setNotice(copy.invalidStorage); return; }
    try { runtime.write(serializeEvidence(next)); setNotice(message); }
    catch { runtime.log('review_storage_write_failed'); setNotice(copy.storageFailure); }
  }, [runtime, loaded.writable]);
  const cancel = useCallback(() => {
    setSelecting(false); setReattach(null); setDraft(null); setCollapsed(false); setNotice(copy.cancelled);
    setReturnFocus(true);
  }, []);
  const choose = useCallback(async (element: HTMLElement) => {
    if (!buildSha || busy) return;
    setBusy(true); setSelecting(false); setCollapsed(false);
    const selectedPath = pathname;
    try {
      const [anchor, context] = await Promise.all([captureAnchor(element, runtime), captureContext(runtime, window, buildSha, selectedPath)]);
      if (!mounted.current || latestPath.current !== selectedPath || !element.isConnected) return;
      if (reattach) {
        const existing = pins.find(pin => pin.id === reattach);
        if (existing) {
          identities.set(existing.id, element);
          store(pins.map(pin => pin.id === existing.id ? { ...pin, anchor, context, updatedAt: runtime.now() } : pin), copy.reattached);
        }
        setReattach(null); setReturnFocus(true);
      } else {
        if (pins.length >= reviewConfig.maxPins) { setNotice(copy.limit); return; }
        const id = runtime.uuid();
        identities.set(id, element);
        setDraft({ id, anchor, context, finding: { ...emptyFinding }, updatedAt: runtime.now() });
      }
    } catch { runtime.log('review_selection_failed'); setNotice(copy.selectionFailure); }
    finally { if (mounted.current) setBusy(false); }
  }, [buildSha, busy, pathname, runtime, reattach, pins, identities, store]);
  useReviewSelection(selecting, choose, cancel);

  const save = (finding: Finding) => {
    if (!draft) return;
    const updated = { ...draft, finding, updatedAt: runtime.now() };
    const exists = pins.some(pin => pin.id === draft.id);
    store(exists ? pins.map(pin => pin.id === draft.id ? updated : pin) : [...pins, updated], copy.saved);
    setDraft(null); setReturnFocus(true);
  };
  const exportPins = () => {
    try {
      const evidence = { ...JSON.parse(serializeEvidence(pins)), exportedAt: runtime.now(), buildSha,
        anchors: pins.map(pin => ({ id: pin.id, status: targets[pin.id]?.status || 'orphan' })) };
      runtime.download(JSON.stringify(evidence, null, 2), `${reviewConfig.downloadName}-${buildSha}.json`);
      setNotice(copy.exported);
    } catch { runtime.log('review_export_failed'); setNotice(copy.exportFailure); }
  };
  return createPortal(<div data-bayit-review-overlay="" className="bayit-review" lang={reviewConfig.locale} dir="ltr">
    {!collapsed && !selecting && Object.entries(targets).map(([id, target]) => target.rect && <button key={id}
      className="bayit-review-pin" style={{ left: `min(${target.rect.left}px, calc(100vw - var(--review-touch)))`, top: `min(${target.rect.top}px, calc(100dvh - var(--review-touch)))` }}
      aria-label={`${copy.edit} ${pins.findIndex(pin => pin.id === id) + 1}`}
      onClick={() => setDraft(pins.find(pin => pin.id === id) || null)}>{pins.findIndex(pin => pin.id === id) + 1}</button>)}
    <aside aria-label={copy.title} data-review-panel-side={panelSide} className={`bayit-review-panel${collapsed || selecting ? ' bayit-review-compact' : ''}`}>
      <header><strong>{copy.title}</strong><div className="bayit-review-actions">
        <button type="button" className="bayit-review-position" onClick={() => setPanelSide(panelSide === 'right' ? 'left' : 'right')}>
          {panelSide === 'right' ? copy.moveLeft : copy.moveRight}</button>
        <button type="button" aria-label={collapsed ? copy.expand : copy.collapse}
          aria-expanded={!collapsed} onClick={() => { setCollapsed(!collapsed); setSelecting(false); }}>{collapsed ? '+' : '-'}</button></div></header>
      <p className="bayit-review-status" role="status" aria-live="polite">{selecting ? copy.selecting : notice || copy.local}</p>
      {selecting && <><p>{copy.keyboard}</p><button type="button" onClick={cancel}>{copy.cancel}</button></>}
      {!collapsed && !selecting && <>
        <p className="bayit-review-build">{copy.build}: <code>{buildSha || copy.missingBuild}</code></p>
        <div className="bayit-review-actions"><button ref={selectButton} type="button" disabled={!buildSha || busy || !!draft}
          onClick={() => { setNotice(''); setSelecting(true); }}>{copy.select}</button>
          <button type="button" onClick={exportPins} disabled={!buildSha || !pins.length || busy}>{copy.export}</button></div>
        <p className="bayit-review-help">{copy.privacy}</p>
        <div className="bayit-review-body">
          {draft ? <><p>{copy.target}: <code>{draft.anchor.tag}</code></p><ReviewEditor key={draft.id} initial={draft.finding} onSave={save} onCancel={cancel} /></> :
            <ol aria-label={copy.findings} className="bayit-review-list">
              {!pins.length && <li>{copy.empty}</li>}
              {pins.map((pin, index) => <li key={pin.id}>
                <strong>{copy.pin} {index + 1}: {copy[pin.finding.severity]}</strong>
                <p>{pin.finding.observed}</p><p>{copy[pin.finding.state]}</p>
                <p className="bayit-review-help">{copy[targets[pin.id]?.status || 'orphan']}</p>
                <div className="bayit-review-actions">
                  <button type="button" onClick={() => setDraft(pin)}>{copy.edit} {index + 1}</button>
                  <button type="button" disabled={!buildSha || busy} onClick={() => { setReattach(pin.id); setSelecting(true); }}>{copy.reattach} {index + 1}</button>
                  <button type="button" onClick={() => { identities.delete(pin.id); store(pins.filter(item => item.id !== pin.id), copy.deleted); selectButton.current?.focus(); }}>{copy.remove} {index + 1}</button>
                </div>
              </li>)}
            </ol>}
        </div>
      </>}
    </aside>
  </div>, document.body);
}
