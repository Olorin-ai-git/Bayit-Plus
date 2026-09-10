import { useEffect } from 'react';
import { isReviewTarget } from './reviewAnchors';
import { overlaySelector } from './reviewConfig';

export function useReviewSelection(active: boolean, onSelect: (element: HTMLElement) => void, onCancel: () => void) {
  useEffect(() => {
    if (!active) return;
    let selected: HTMLElement | null = null;
    let addedTabIndex = false;
    const release = () => {
      selected?.removeAttribute('data-bayit-review-selected');
      if (addedTabIndex) selected?.removeAttribute('tabindex');
      addedTabIndex = false;
    };
    const choose = (element: HTMLElement, moveFocus = false) => {
      if (element === selected) return;
      release();
      selected = element;
      selected.setAttribute('data-bayit-review-selected', '');
      if (moveFocus) {
        if (element.tabIndex < 0 && !element.hasAttribute('tabindex')) {
          element.setAttribute('tabindex', '-1'); addedTabIndex = true;
        }
        element.focus({ preventScroll: true });
      }
    };
    const pointer = (event: PointerEvent) => { if (isReviewTarget(event.target as Element)) choose(event.target as HTMLElement); };
    const focus = (event: FocusEvent) => { if (isReviewTarget(event.target as Element)) choose(event.target as HTMLElement); };
    const click = (event: MouseEvent) => {
      const element = event.target as Element;
      if (!isReviewTarget(element)) return;
      event.preventDefault(); event.stopImmediatePropagation(); onSelect(element);
    };
    const press = (event: Event) => {
      if (isReviewTarget(event.target as Element)) { event.preventDefault(); event.stopImmediatePropagation(); }
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); onCancel(); return; }
      if (event.target instanceof Element && event.target.closest(overlaySelector)) return;
      if (event.key === 'Enter' || event.key === ' ') {
        if (selected) { event.preventDefault(); event.stopImmediatePropagation(); onSelect(selected); }
      } else if (['ArrowDown', 'ArrowRight', 'ArrowUp', 'ArrowLeft'].includes(event.key)) {
        event.preventDefault(); event.stopImmediatePropagation();
        const elements = Array.from(document.body.querySelectorAll('*')).filter(isReviewTarget).filter(element => element.getClientRects().length > 0);
        const direction = ['ArrowDown', 'ArrowRight'].includes(event.key) ? 1 : -1;
        const index = selected ? elements.indexOf(selected) : -1;
        const next = elements[(index + direction + elements.length) % elements.length];
        if (next) { choose(next, true); next.scrollIntoView({ block: 'nearest' }); }
      }
    };
    const first = Array.from(document.body.querySelectorAll('button,a[href],input,select,textarea,[tabindex]')).find(isReviewTarget);
    first?.focus();
    if (first) choose(first);
    document.addEventListener('pointerover', pointer, true);
    document.addEventListener('focusin', focus, true);
    document.addEventListener('click', click, true);
    document.addEventListener('pointerdown', press, true);
    document.addEventListener('mousedown', press, true);
    document.addEventListener('keydown', keyboard, true);
    return () => {
      release();
      document.removeEventListener('pointerover', pointer, true); document.removeEventListener('focusin', focus, true);
      document.removeEventListener('click', click, true); document.removeEventListener('keydown', keyboard, true);
      document.removeEventListener('pointerdown', press, true); document.removeEventListener('mousedown', press, true);
    };
  }, [active, onSelect, onCancel]);
}
