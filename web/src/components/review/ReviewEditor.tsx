import React, { useRef, useEffect, useState } from 'react';
import { copy, dispositions, findingStates, reviewConfig, severities } from './reviewConfig';
import { draftSchema, type Finding } from './reviewModel';

export default function ReviewEditor({ initial, onSave, onCancel }: {
  initial: Finding; onSave: (finding: Finding) => void; onCancel: () => void;
}) {
  const [finding, setFinding] = useState(initial);
  const [error, setError] = useState('');
  const first = useRef<HTMLSelectElement>(null);
  useEffect(() => { first.current?.focus(); }, []);
  return <form className="bayit-review-form" onSubmit={event => {
    event.preventDefault();
    const parsed = draftSchema.safeParse(finding);
    if (!parsed.success) { setError(copy.invalidFinding); return; }
    onSave(parsed.data);
  }} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onCancel(); } }}>
    <label>{copy.severity}<select ref={first} value={finding.severity} onChange={event => setFinding({ ...finding, severity: event.target.value as Finding['severity'] })}>
      {severities.map(value => <option key={value} value={value}>{copy[value]}</option>)}
    </select></label>
    {(['observed', 'expected', 'action'] as const).map(field => <label key={field}>{copy[field]}
      <textarea required maxLength={reviewConfig.maxText} value={finding[field]} onChange={event => setFinding({ ...finding, [field]: event.target.value })} />
    </label>)}
    <label>{copy.disposition}<select value={finding.disposition} onChange={event => setFinding({ ...finding, disposition: event.target.value as Finding['disposition'], state: 'open' })}>
      {dispositions.map(value => <option key={value} value={value}>{copy[value]}</option>)}
    </select></label>
    <label>{copy.state}<select value={finding.state} onChange={event => setFinding({ ...finding, state: event.target.value as Finding['state'] })}>
      {findingStates.filter(value => value === 'open' || (value === 'verified' ? finding.disposition === 'no-code' : finding.disposition === 'fix')).map(value => <option key={value} value={value}>{copy[value]}</option>)}
    </select></label>
    {error && <p role="alert">{error}</p>}
    <div className="bayit-review-actions"><button type="button" onClick={onCancel}>{copy.cancel}</button><button className="bayit-review-primary" type="submit">{copy.save}</button></div>
  </form>;
}
