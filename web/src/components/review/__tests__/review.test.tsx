import React from 'react';
import { createHash, randomUUID } from 'node:crypto';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ReviewOverlay from '../ReviewOverlay';
import ReviewGate, { isReviewEnabled } from '../ReviewGate';
import { captureAnchor, resolveAnchor, retainsAnchorIdentity } from '../reviewAnchors';
import { draftSchema, evidenceSchema, privateRoute } from '../reviewModel';
import { captureContext, readEvidence, type ReviewRuntime } from '../reviewRuntime';
import { reviewConfig } from '../reviewConfig';

const buildSha = 'a'.repeat(40);
const timestamp = '2026-09-05T12:00:00.000Z';
let downloads: Array<{ value: string; filename: string }>;
let events: string[];
let runtime: ReviewRuntime;

beforeEach(() => {
  window.localStorage.clear();
  downloads = []; events = [];
  runtime = {
    now: () => timestamp, uuid: randomUUID,
    digest: async value => createHash('sha256').update(value).digest('hex'),
    read: () => window.localStorage.getItem(reviewConfig.storageKey),
    write: value => window.localStorage.setItem(reviewConfig.storageKey, value),
    download: (value, filename) => { downloads.push({ value, filename }); },
    log: event => { events.push(event); },
  };
});
afterEach(() => { cleanup(); document.body.replaceChildren(); });

function target(tag = 'button') {
  const element = document.createElement(tag);
  element.id = 'review-contract-target';
  element.textContent = 'Account preferences';
  document.body.append(element);
  return element;
}

async function selectTarget(element: HTMLElement, keyboard = false) {
  await userEvent.click(screen.getByRole('button', { name: 'Select element' }));
  if (keyboard) { element.focus(); fireEvent.keyDown(element, { key: 'Enter' }); }
  else fireEvent.click(element);
  await screen.findByLabelText('Severity');
}

async function fillFinding() {
  await userEvent.type(screen.getByLabelText('Observed behavior'), 'Supporting text loses contrast.');
  await userEvent.type(screen.getByLabelText('Expected behavior'), 'Supporting text remains readable.');
  await userEvent.type(screen.getByLabelText('Remediation or no-code verification'), 'Adjust the existing text token and verify both viewports.');
}

test.each(['', '?review=0', '?review=true', '?review=01', '?review=1&review=0', '?review=1&review=1'])('ordinary URL %s keeps review mode inactive', search => {
  expect(isReviewEnabled(search)).toBe(false);
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }} initialEntries={[`/settings${search}`]}><ReviewGate /></MemoryRouter>);
  expect(document.querySelector('[data-bayit-review-overlay]')).toBeNull();
  expect(window.localStorage.length).toBe(0);
});

test('only an unambiguous review=1 query activates review mode', () => {
  expect(isReviewEnabled('?locale=en&review=1')).toBe(true);
});

test('anchor and route metadata omit all DOM text, form values, and raw identifiers', async () => {
  const input = target('input') as HTMLInputElement;
  input.type = 'password'; input.value = 'credential-secret'; input.id = 'account-private-secret';
  const privateAnchor = await captureAnchor(input, runtime);
  expect(privateAnchor.private).toBe(true);
  expect(privateAnchor.stable).toBeUndefined();
  const button = target(); button.id = 'private-customer-identifier'; button.textContent = 'Customer personal details';
  const anchor = await captureAnchor(button, runtime);
  const encoded = JSON.stringify([privateAnchor, anchor]);
  for (const secret of ['credential-secret', 'account-private-secret', 'private-customer-identifier', 'Customer personal details']) expect(encoded).not.toContain(secret);
  expect(anchor.stable?.digest).toHaveLength(64);
  const route = privateRoute('/account/user@example.org/0123456789abcdef0123456789abcdef');
  expect(route).toBe('/:unrecognized');
  expect(privateRoute('/messages/secret')).toBe('/messages/:friendId');
  expect(privateRoute('/admin/content/new')).toBe('/admin/content/new');
  const context = await captureContext(runtime, window, buildSha, '/settings');
  expect(context).toMatchObject({ buildSha, route: '/settings', timestamp, viewport: { width: window.innerWidth, height: window.innerHeight } });
});

test('stable anchors survive reordering and reload, but ambiguity and structural-only identity orphan safely', async () => {
  const button = target();
  const anchor = await captureAnchor(button, runtime);
  document.body.prepend(document.createElement('button'));
  expect(await resolveAnchor(anchor, document, runtime)).toBe(button);
  button.remove();
  const replacement = target();
  expect(await resolveAnchor(anchor, document, runtime)).toBe(replacement);
  target();
  expect(await resolveAnchor(anchor, document, runtime)).toBeNull();
  const plain = document.createElement('div'); document.body.append(plain);
  expect(await resolveAnchor(await captureAnchor(plain, runtime), document, runtime)).toBeNull();
});

test('privacy-marked subtrees never capture stable attribute data', async () => {
  const parent = target('section'); parent.setAttribute('data-review-private', '');
  const child = document.createElement('button'); child.id = 'sensitive'; parent.append(child);
  const anchor = await captureAnchor(child, runtime);
  expect(anchor.private).toBe(true); expect(anchor.stable).toBeUndefined();
});

test('a recycled live DOM node loses its pin when its stable identity changes', async () => {
  const button = target();
  const anchor = await captureAnchor(button, runtime);
  expect(await retainsAnchorIdentity(button, anchor, runtime)).toBe(true);
  button.id = 'another-content-item';
  expect(await retainsAnchorIdentity(button, anchor, runtime)).toBe(false);
});

test('invalid or oversized local evidence is preserved without enabling destructive overwrite', () => {
  runtime.write('{corrupt');
  expect(readEvidence(runtime)).toMatchObject({ pins: [], writable: false });
  expect(runtime.read()).toBe('{corrupt');
  runtime.write('x'.repeat(reviewConfig.maxStoredBytes + 1));
  expect(readEvidence(runtime).writable).toBe(false);
  expect(events).toEqual(['review_storage_read_failed', 'review_storage_read_failed']);
});

test('finding schema requires verification or remediation and rejects unknown captured metadata', () => {
  const finding = { severity: 'info', observed: 'Layout reviewed', expected: 'Readable layout', disposition: 'no-code', action: 'Verified keyboard and both viewport sizes', state: 'verified' };
  expect(draftSchema.safeParse(finding).success).toBe(true);
  expect(draftSchema.safeParse({ ...finding, action: ' ' }).success).toBe(false);
  expect(draftSchema.safeParse({ ...finding, disposition: 'fix' }).success).toBe(false);
  expect(evidenceSchema.safeParse({ schemaVersion: 1, pins: [], pageText: 'private' }).success).toBe(false);
});

test('keyboard selection saves, edits, exports and deletes real local evidence', async () => {
  const button = target();
  let activations = 0;
  button.addEventListener('click', () => { activations++; });
  render(<ReviewOverlay pathname="/settings" buildSha={buildSha} runtime={runtime} />);
  await selectTarget(button, true);
  expect(screen.getByLabelText('Severity')).toHaveFocus();
  await fillFinding();
  await userEvent.click(screen.getByRole('button', { name: 'Save pin' }));
  expect(activations).toBe(0);
  const stored = evidenceSchema.parse(JSON.parse(runtime.read()!));
  expect(stored.pins).toHaveLength(1);
  expect(stored.pins[0].context.buildSha).toBe(buildSha);
  expect(screen.getByRole('button', { name: 'Select element' })).toHaveFocus();
  await userEvent.click(screen.getByRole('button', { name: 'Edit pin 1' }));
  await userEvent.clear(screen.getByLabelText('Expected behavior'));
  await userEvent.type(screen.getByLabelText('Expected behavior'), 'Readable at every supported viewport.');
  await userEvent.click(screen.getByRole('button', { name: 'Save pin' }));
  await userEvent.click(screen.getByRole('button', { name: 'Export evidence' }));
  expect(downloads).toHaveLength(1);
  const exported = JSON.parse(downloads[0].value);
  expect(exported).toMatchObject({ buildSha, exportedAt: timestamp });
  expect(exported.pins[0].finding.expected).toBe('Readable at every supported viewport.');
  expect(exported.pins[0].anchor.stable.digest).not.toContain(button.id);
  await userEvent.click(screen.getByRole('button', { name: 'Delete pin 1' }));
  expect(JSON.parse(runtime.read()!).pins).toHaveLength(0);
});

test('click selection blocks product activation and Escape returns focus', async () => {
  const button = target(); let clicks = 0;
  button.addEventListener('click', () => { clicks++; });
  render(<ReviewOverlay pathname="/settings" buildSha={buildSha} runtime={runtime} />);
  await selectTarget(button);
  expect(clicks).toBe(0);
  fireEvent.keyDown(screen.getByLabelText('Severity'), { key: 'Escape' });
  expect(screen.getByRole('button', { name: 'Select element' })).toHaveFocus();
  fireEvent.click(button);
  expect(clicks).toBe(1);
});

test('removed targets orphan and can be reattached without losing findings', async () => {
  const button = target();
  render(<ReviewOverlay pathname="/settings" buildSha={buildSha} runtime={runtime} />);
  await selectTarget(button); await fillFinding();
  await userEvent.click(screen.getByRole('button', { name: 'Save pin' }));
  act(() => button.remove());
  await waitFor(() => expect(screen.getByText(/Orphaned:/)).toBeInTheDocument());
  const replacement = target();
  await userEvent.click(screen.getByRole('button', { name: 'Reattach pin 1' }));
  fireEvent.click(replacement);
  await screen.findByText('Pin reattached to the selected element.');
  expect(JSON.parse(runtime.read()!).pins[0].finding.observed).toBe('Supporting text loses contrast.');
  await waitFor(() => expect(screen.queryByText(/Orphaned:/)).not.toBeInTheDocument());
});

test('storage failure keeps evidence exportable in memory', async () => {
  runtime.write = () => { throw new DOMException('quota', 'QuotaExceededError'); };
  const button = target();
  render(<ReviewOverlay pathname="/settings" buildSha={buildSha} runtime={runtime} />);
  await selectTarget(button); await fillFinding();
  await userEvent.click(screen.getByRole('button', { name: 'Save pin' }));
  expect(screen.getByRole('status')).toHaveTextContent('Changes remain in memory');
  await userEvent.click(screen.getByRole('button', { name: 'Export evidence' }));
  expect(JSON.parse(downloads[0].value).pins).toHaveLength(1);
});

test('missing exact build SHA disables evidence creation and export', () => {
  render(<ReviewOverlay pathname="/settings" buildSha={null} runtime={runtime} />);
  expect(screen.getByRole('button', { name: 'Select element' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Export evidence' })).toBeDisabled();
});
