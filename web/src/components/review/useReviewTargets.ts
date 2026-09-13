import { useEffect, useState } from 'react';
import { overlaySelector } from './reviewConfig';
import { resolveAnchor, retainsAnchorIdentity, targetRect } from './reviewAnchors';
import type { Pin } from './reviewModel';
import type { ReviewRuntime } from './reviewRuntime';

export type PinTarget = { element: Element | null; rect: ReturnType<typeof targetRect>; status: 'attached' | 'orphan' | 'offscreen' | 'otherRoute' | 'staleBuild' };

export function useReviewTargets(pins: Pin[], pathname: string, buildSha: string | null, identities: Map<string, Element>, runtime: ReviewRuntime) {
  const [targets, setTargets] = useState<Record<string, PinTarget>>({});
  useEffect(() => {
    if (!pins.length) { setTargets({}); return; }
    let active = true;
    let generation = 0;
    let frame = 0;
    const refresh = async () => {
      const version = ++generation;
      try {
        const routeKey = await runtime.digest(pathname);
        const values = await Promise.all(pins.map(async pin => {
          if (pin.context.buildSha !== buildSha) return [pin.id, { element: null, rect: null, status: 'staleBuild' }] as const;
          if (pin.context.routeKey !== routeKey) return [pin.id, { element: null, rect: null, status: 'otherRoute' }] as const;
          const known = identities.get(pin.id);
          // A removed live target stays orphaned, even if an identical sibling takes its place.
          const element = known ? (await retainsAnchorIdentity(known, pin.anchor, runtime) ? known : null) : await resolveAnchor(pin.anchor, document, runtime);
          if (element) identities.set(pin.id, element);
          const rect = targetRect(element);
          return [pin.id, { element, rect, status: element ? (rect ? 'attached' : 'offscreen') : 'orphan' }] as const;
        }));
        if (active && version === generation) setTargets(Object.fromEntries(values));
      } catch { runtime.log('review_anchor_resolution_failed'); }
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { void refresh(); });
    };
    const observer = new MutationObserver(records => {
      if (records.some(record => !(record.target instanceof Element && record.target.closest(overlaySelector)))) schedule();
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    resize?.observe(document.body);
    for (const element of identities.values()) if (element.isConnected) resize?.observe(element);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);
    void refresh();
    return () => {
      active = false; ++generation; cancelAnimationFrame(frame); observer.disconnect(); resize?.disconnect();
      window.removeEventListener('resize', schedule); window.removeEventListener('scroll', schedule, true);
      window.visualViewport?.removeEventListener('resize', schedule); window.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, [pins, pathname, buildSha, identities, runtime]);
  return targets;
}
