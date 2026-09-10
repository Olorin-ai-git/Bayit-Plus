"""The fleet index markup, kept apart from the code that fills it.

Markup and the logic that computes what goes in it change for different
reasons and at different rates; splitting them keeps a template edit from
reading as a behaviour change in review.
"""

INDEX = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Harness — fleet</title>
<style>{css}</style>
</head>
<body>
<div class="wrap">
  <header class="masthead">
    <h1>Harness · Fleet</h1>
    <div class="meta mono">generated {generated}<br>{project_count} project(s) across {root_count} root(s)</div>
  </header>

  <div class="summary">
    <div class="stat"><span class="n">{project_count}</span><span class="k">projects</span></div>
    <div class="stat"><span class="n">{all_current}</span><span class="k">verified current</span></div>
    <div class="stat{drift_class}"><span class="n">{drifting}</span><span class="k">needing update</span></div>
    <div class="stat{broken_class}"><span class="n">{broken}</span><span class="k">broken</span></div>
    <div class="stat{unverified_class}"><span class="n">{unverified}</span><span class="k">unverified</span></div>
    <div class="stat"><span class="n">{active}</span><span class="k">mid-goal</span></div>
    <div class="stat"><span class="n">{journals}</span><span class="k">run journals</span></div>
    <div class="stat"><span class="n">{enrolled}</span><span class="k">gate-enrolled</span></div>
    <div class="stat"><span class="n">{minted}</span><span class="k">gate-minted</span></div>
  </div>

  <h2>Installs</h2>
  <div class="overflow"><table>
    <tr><th>Project</th><th>Units</th><th>Gates</th><th>Step</th><th>Journals</th><th>State</th></tr>
    {rows}
  </table></div>

  <h2>What this is, and what to run</h2>
  <p class="dial-caption">Every project carrying the Olorin harness reports the same
  five things: whether its managed units still match canonical, whether its agent
  sessions are enrolled behind the TwoGates gates and how long ago that was last
  verified (criterion 9's other half), which step of the PROCESS loop its active goal
  sits on, how many goals it has journalled, and what its state line says. A project
  name links to its own full dashboard — the same page
  <span class="mono">harness dashboard</span> writes inside the project.</p>
  <table class="legend">
    <tr><th>Chip</th><th>What it means</th><th>What to run</th></tr>
    <tr><td colspan="3"><b>Units</b> — is the installed harness still canonical?</td></tr>
    <tr><td><span class="chip current">current</span></td>
      <td>Every managed unit matches canonical, and that was actually checked.</td>
      <td class="mono">nothing</td></tr>
    <tr><td><span class="chip warn">stale</span></td>
      <td>A unit is behind canonical. Normal right after canonical moves — one
        change there makes every install stale at once.</td>
      <td class="mono">harness update --target &lt;repo&gt;</td></tr>
    <tr><td><span class="chip broken">broken</span></td>
      <td>The install, or one of its units, could not be read. An update cannot
        fix this — a file is missing or unreadable.</td>
      <td class="mono">harness doctor --target &lt;repo&gt;</td></tr>
    <tr><td><span class="chip warn">unverified</span></td>
      <td>The canonical home was unreachable, so no staleness comparison ran.
        These units are not known to be current; they are unchecked.</td>
      <td class="mono">harness status --target &lt;repo&gt;</td></tr>
    <tr><td colspan="3"><b>Gates</b> — are this repo's agent sessions enrolled
      behind TwoGates? Read from the committed
      <span class="mono">.harness/twogates.json</span>; the CLI never verifies
      anything itself, so every age below is the age of the LAST live check.
      An amber chip here is not the amber chip above, and no
      <span class="mono">harness</span> command fixes one.</td></tr>
    <tr><td><span class="chip current">gate 1 verified &lt;n&gt;d ago</span></td>
      <td>Enrolled: the marker is complete and its last live verification passed
        every check. The age says when — not that the gates are healthy now.</td>
      <td class="mono">nothing</td></tr>
    <tr><td><span class="chip warn">gate 1 minted, egress not routed</span></td>
      <td>The TwoGates agent and fleet exist and gate 1 is proven, but session
        egress is deliberately not wired — TwoGates has no connections yet for
        api.anthropic.com or github.com. This is the fleet-normal state today,
        not a per-repo failure; the age is how long it has sat there.</td>
      <td>create the TwoGates connections for api.anthropic.com and github.com
        (not a harness command)</td></tr>
    <tr><td><span class="chip warn">verification stale (&lt;n&gt;d ago)</span></td>
      <td>The last live verification is older than this install's horizon ({stale_default}
        days, or its <span class="mono">twogates_verify_stale_days</span>).
        Nothing is known to be wrong — and nothing has been checked lately.</td>
      <td class="mono">harness-onboard-repo skill (verify)</td></tr>
    <tr><td><span class="chip broken">verification failed</span></td>
      <td>A gate check — credential swap, policy deny or tunnel — FAILED at the
        last verification. The sessions are not behind a working gate.</td>
      <td class="mono">harness-onboard-repo skill (re-enroll)</td></tr>
    <tr><td><span class="chip broken">enrollment record broken</span></td>
      <td>The marker is unreadable, malformed, internally inconsistent, or names
        no agent, proxy, pinned CA or fleet. It cannot support any claim about
        this repo, so it is never read as enrolled.</td>
      <td class="mono">harness doctor --target &lt;repo&gt;, then the skill</td></tr>
    <tr><td><span class="chip warn">not enrolled</span></td>
      <td>The harness half is installed but no TwoGates enrollment marker exists —
        the repo is partial under criterion 9 until its sessions run behind the gates.</td>
      <td class="mono">harness-onboard-repo skill</td></tr>
  </table>

  <div class="foot mono">Rendered from {root_list} · canonical {canonical_commit}</div>
</div>
</body>
</html>
"""

PROJECT_CRUMB = '<div class="crumb"><a href="{href}">&larr; all projects</a></div>'
