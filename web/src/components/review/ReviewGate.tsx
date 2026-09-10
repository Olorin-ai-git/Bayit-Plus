import React, { Component, Suspense, lazy } from 'react';
import { useLocation } from 'react-router-dom';
import gateCopy from './reviewGate.en.json';

const ReviewOverlay = lazy(() => import('./ReviewOverlay'));
declare const __BAYIT_BUILD_SHA__: string | null;

export function isReviewEnabled(search: string): boolean {
  const values = new URLSearchParams(search).getAll('review');
  return values.length === 1 && values[0] === '1';
}

class ReviewBoundary extends Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    // The application remains usable if an optional review chunk cannot load.
    return this.state.failed ? <div role="alert" lang={gateCopy.locale}>{gateCopy.loadFailure}</div> : this.props.children;
  }
}

export default function ReviewGate() {
  const location = useLocation();
  if (!isReviewEnabled(location.search)) return null;
  return (
    <ReviewBoundary>
      <Suspense fallback={null}>
        <ReviewOverlay pathname={location.pathname} buildSha={typeof __BAYIT_BUILD_SHA__ === 'string' ? __BAYIT_BUILD_SHA__ : null} />
      </Suspense>
    </ReviewBoundary>
  );
}
