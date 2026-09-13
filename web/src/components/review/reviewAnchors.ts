import { overlaySelector, reviewConfig, sensitiveSelector, stableAttributes } from './reviewConfig';
import type { Anchor } from './reviewModel';
import type { ReviewRuntime } from './reviewRuntime';

export function isReviewTarget(element: Element | null): element is HTMLElement {
  return element instanceof HTMLElement && element !== element.ownerDocument.body &&
    element !== element.ownerDocument.documentElement && !element.closest(overlaySelector) &&
    !['SCRIPT', 'STYLE', 'NOSCRIPT', 'LINK', 'META'].includes(element.tagName);
}

export async function captureAnchor(element: Element, runtime: ReviewRuntime): Promise<Anchor> {
  const path: Anchor['path'] = [];
  let current: Element | null = element;
  while (current && current !== element.ownerDocument.body) {
    const siblings = Array.from(current.parentElement?.children || []).filter(sibling => sibling.localName === current!.localName);
    path.unshift({ tag: current.localName, index: siblings.indexOf(current) });
    current = current.parentElement;
  }
  const anchor: Anchor = { tag: element.localName, path, private: !!element.closest(sensitiveSelector) };
  if (!anchor.private) {
    for (const attribute of stableAttributes) {
      const value = element.getAttribute(attribute);
      if (value) {
        const candidates = Array.from(element.ownerDocument.querySelectorAll(`[${attribute}]`));
        if (candidates.filter(candidate => candidate.getAttribute(attribute) === value).length === 1) {
          anchor.stable = { attribute, digest: await runtime.digest(value) };
          break;
        }
      }
    }
  }
  return anchor;
}

export async function resolveAnchor(anchor: Anchor, document: Document, runtime: ReviewRuntime): Promise<Element | null> {
  const stable = anchor.stable;
  if (!stable || anchor.private) return null;
  const candidates = Array.from(document.querySelectorAll(`[${stable.attribute}]`));
  if (candidates.length > reviewConfig.maxAnchorCandidates) return null;
  const matches = await Promise.all(candidates.map(async element => {
    if (element.localName !== anchor.tag || element.closest(sensitiveSelector) || element.closest(overlaySelector)) return null;
    return await runtime.digest(element.getAttribute(stable.attribute)!) === stable.digest ? element : null;
  }));
  const found = matches.filter((element): element is Element => element !== null);
  return found.length === 1 ? found[0] : null;
}

export async function retainsAnchorIdentity(element: Element, anchor: Anchor, runtime: ReviewRuntime): Promise<boolean> {
  if (!element.isConnected || element.localName !== anchor.tag) return false;
  if (!anchor.stable) return true;
  if (element.closest(sensitiveSelector)) return false;
  const value = element.getAttribute(anchor.stable.attribute);
  return value !== null && await runtime.digest(value) === anchor.stable.digest;
}

export function targetRect(element: Element | null): { left: number; top: number; width: number; height: number } | null {
  if (!element?.isConnected) return null;
  const rect = element.getBoundingClientRect();
  const browser = element.ownerDocument.defaultView!;
  const style = browser.getComputedStyle(element);
  if (style.visibility === 'hidden' || style.display === 'none' || !rect.width || !rect.height) return null;
  if (rect.bottom <= 0 || rect.right <= 0 || rect.top >= browser.innerHeight || rect.left >= browser.innerWidth) return null;
  return { left: Math.max(0, rect.left), top: Math.max(0, rect.top), width: Math.min(rect.right, browser.innerWidth) - Math.max(0, rect.left), height: Math.min(rect.bottom, browser.innerHeight) - Math.max(0, rect.top) };
}
