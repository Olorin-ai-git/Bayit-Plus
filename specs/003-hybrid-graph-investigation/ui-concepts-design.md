# Hybrid Graph Investigation – UI Concepts A–D

This document presents 4 contrasting UI concepts for the Hybrid Graph Investigation system, each optimized for different user personas and workflows.

## Sample Data Structure

For all concepts, we assume the following JSON data format:

```json
{
  "investigation": {
    "id":"INV-123",
    "entity":{"type":"ip","value":"95.211.35.146"},
    "window":"2025-09-13T16:20:04Z→2025-09-15T00:40:24Z",
    "status":"complete",
    "current_phase":"summary",
    "confidence":0.50,
    "quality_score":0.56
  },
  "domains":[
    {"name":"network","risk_score":0.90,"indicators":["geo-dispersion","vpn-proxy"],"evidence_count":7},
    {"name":"location","risk_score":0.90,"indicators":["impossible travel"],"evidence_count":6},
    {"name":"device","risk_score":0.40,"indicators":["missing device id"],"evidence_count":3},
    {"name":"authentication","risk_score":0.70,"indicators":["step-up needed"],"evidence_count":5},
    {"name":"logs","risk_score":0.40,"indicators":["anomalous patterns"],"evidence_count":4}
  ],
  "events":[
    {"ts":"2025-09-14T08:07:53Z","actor":"orchestrator","action":"tool_call","duration":1163,"success":true},
    {"ts":"2025-09-14T11:54:01Z","actor":"network_agent","action":"risk_update","duration":321,"success":true}
  ],
  "tools":[
    {"name":"snowflake_query","type":"data","calls":1,"duration_ms":1163,"errors":[]},
    {"name":"abuseipdb","type":"intel","calls":1,"duration_ms":120,"errors":["Invalid API key"]}
  ],
  "risk_summary":{
    "final_score":0.85,"confidence":0.78,
    "highlights":["40% tx >0.7 risk","61.2% volume blocked/review"],
    "recommendations":[
      "Step-up >$300 and block >$1k from this IP",
      "Add geo+device rules; fail-soft on external intel"
    ]
  }
}
```

---

## Concept A: Analyst-Dense Grid (Power User Workbench)

### A. NAME & INTENT
**Name**: "Power Grid"
**When to use**: Expert fraud investigators who need maximum information density and rapid context switching between multiple investigations.

### B. LAYOUT BLUEPRINT
```
┌─────────────────────────────────────────────────────────────────────┐
│ [🔍] Search | [INV-123] [INV-124] [INV-125] [+]    [⚙️] [👤] [📊]   │
├─────────────────────────────────────────────────────────────────────┤
│ Risk: 0.85 │ Conf: 0.78 │ Phase: Summary │ ⏱️ 2d │ 🟥5 🟨3 🟩2     │
├──────────────┬──────────────────────────────────────────────────────┤
│ DOMAINS      │                    GRAPH VIEW                        │
│ ┌──────────┐ │  ○ Network(0.9)     ◆ SnowflakeQuery               │
│ │Net  0.90 │ │     ╲               ╱                               │
│ │Loc  0.90 │ │      ○ Evidence ───◆ AbuseIPDB [!]                 │
│ │Auth 0.70 │ │     ╱               ╲                               │
│ │Dev  0.40 │ │  ○ Location(0.9)    ◆ Decision                     │
│ │Logs 0.40 │ │                                                     │
│ └──────────┘ │ [Force] [Radial] [Causal] [Temporal] [Focus] [🔍]   │
├──────────────┼──────────────────────────────────────────────────────┤
│ TIMELINE     │                 EVIDENCE PANEL                      │
│ 08:07 🔧 ✓   │ Selected: Network Analysis                          │
│ 08:08 📊 ✓   │ Indicators: geo-dispersion, vpn-proxy               │
│ 11:54 ⚠️ ✓   │ Evidence: 7 items                                   │
│ [Collapse]   │ - IP geo changes: 3 countries in 2h                │
│ [Errors]     │ - VPN exit nodes detected: 2 providers             │
│ [Decisions]  │ - Traffic patterns: anomalous                      │
└──────────────┴──────────────────────────────────────────────────────┘
```

**Density**: Compact ops - maximum information in minimal space
**Navigation**: Top tabs for investigations, left rail for domains, command palette (Ctrl+K)

### C. KEY INTERACTIONS

**Filters**:
- Time range picker in header with presets (1h, 6h, 24h, 7d)
- Entity type dropdown (IP, User, Transaction, Device)
- Domain checkboxes in left rail with risk score sorting

**Investigation Switcher**:
- Tab-based interface with [+] for new investigations
- Right-click on tabs for context menu (close, rename, duplicate)
- Cmd+1-9 for quick tab switching

**Graph Interactions**:
- Hover: Tooltip with risk score and evidence count
- Click: Focus node, populate evidence panel, highlight connected edges
- Shift+Drag: Lasso select, "Add to Report" button appears
- Double-click: Expand clustered nodes
- Breadcrumb trail: "Home > Network > Evidence > Decision"

**Timeline Controls**:
- Collapse checkbox: Hide tool execution details
- Filter buttons: [All] [Errors] [Decisions] [Tools]
- Jump controls: ⏮️ ⏭️ for decision points
- Zoom: Ctrl+scroll for time resolution

**Export & Share**:
- Header export button with dropdown: [PDF] [JSON] [CSV] [Share Link]
- Graph selection: "Export Selected Nodes"
- Timeline: "Export Time Range"

### D. STATE & ERROR DESIGN

**Empty States**:
- New investigation: "Select entity type and value to begin"
- No evidence: "Analysis in progress..." with animated spinner
- No graph data: "Waiting for domain analysis results"

**Loading Skeletons**:
- Domain cards: Shimmer rectangles with placeholder scores
- Graph: Animated dots expanding from center
- Timeline: Scrolling placeholder lines

**Error Handling**:
- AbuseIPDB API failure: Yellow banner "External intel unavailable - using internal data only" with [Retry] button
- Tool timeout: Red indicator in timeline with tooltip explanation
- Incomplete analysis: "Score withheld - waiting for location evidence" with progress bar

### E. ACCESSIBILITY NOTES

**ARIA Roles**:
- Graph nodes: `role="button" aria-label="Network domain, risk 0.9, 7 evidence items"`
- Timeline events: `role="listitem" aria-label="Tool call at 08:07, duration 1.2 seconds, success"`
- Domain cards: `role="region" aria-label="Domain analysis results"`

**Keyboard Shortcuts**:
- Tab/Shift+Tab: Navigate between panels
- Arrow keys: Navigate graph nodes when focused
- Enter: Select focused item
- Escape: Clear selections
- Ctrl+K: Command palette
- Ctrl+1-9: Switch investigation tabs

**Color Usage**:
- Risk scores use both color and intensity patterns
- Error states use icons + text, not just red color
- High contrast mode doubles border thickness

### F. TELEMETRY

Fire-and-forget events:
- `filter_domain_toggle`: {domain, enabled, timestamp}
- `graph_node_focus`: {node_id, node_type, timestamp}
- `timeline_collapse_toggle`: {collapsed, timestamp}
- `export_triggered`: {format, selection, timestamp}
- `investigation_switch`: {from_id, to_id, timestamp}
- `error_banner_seen`: {error_type, action_taken, timestamp}

### G. PROS/CONS & TRADEOFFS

**Pros**:
- Maximum information density for power users
- Fastest navigation between investigations
- Comprehensive view of all data simultaneously
- Minimal clicks to access any information

**Cons**:
- Overwhelming for new users or managers
- Requires large screens (minimum 1200px width)
- Complex interface may slow onboarding
- Not suitable for executives or compliance reviews

**Intentionally Sacrifices**:
- Visual polish for information density
- Guided workflows for expert efficiency
- Mobile compatibility for desktop optimization

### H. CODE SHELL (React+TS)

```typescript
// File structure:
// src/
//   components/
//     PowerGrid/
//       App.tsx
//       Header.tsx
//       DomainCards.tsx
//       GraphPanel.tsx
//       TimelinePanel.tsx
//       EvidencePanel.tsx

// App.tsx
import React, { useState } from 'react';
import { Button, Card } from '@/components/ui';
import { Search, Settings, User, BarChart3 } from 'lucide-react';

interface Investigation {
  id: string;
  entity: { type: string; value: string };
  status: string;
  confidence: number;
  risk_score: number;
}

interface Domain {
  name: string;
  risk_score: number;
  indicators: string[];
  evidence_count: number;
}

const mockData = {
  investigation: {
    id: "INV-123",
    entity: { type: "ip", value: "95.211.35.146" },
    status: "complete",
    confidence: 0.78,
    risk_score: 0.85
  },
  domains: [
    { name: "network", risk_score: 0.90, indicators: ["geo-dispersion", "vpn-proxy"], evidence_count: 7 },
    { name: "location", risk_score: 0.90, indicators: ["impossible travel"], evidence_count: 6 },
    { name: "authentication", risk_score: 0.70, indicators: ["step-up needed"], evidence_count: 5 },
    { name: "device", risk_score: 0.40, indicators: ["missing device id"], evidence_count: 3 },
    { name: "logs", risk_score: 0.40, indicators: ["anomalous patterns"], evidence_count: 4 }
  ]
};

export default function PowerGridApp() {
  const [activeTab, setActiveTab] = useState('INV-123');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />
      <KpiBar investigation={mockData.investigation} />

      <div className="flex-1 flex">
        <DomainCards domains={mockData.domains} />
        <div className="flex-1 flex">
          <GraphPanel onNodeSelect={setSelectedNode} />
          <EvidencePanel selectedNode={selectedNode} />
        </div>
      </div>

      <TimelinePanel />
    </div>
  );
}

const Header = ({ activeTab, onTabChange }: { activeTab: string; onTabChange: (tab: string) => void }) => (
  <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
    <div className="flex items-center space-x-4">
      <Search className="w-5 h-5 text-gray-500" />
      <div className="flex space-x-1">
        {['INV-123', 'INV-124', 'INV-125'].map(tab => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "ghost"}
            size="sm"
            onClick={() => onTabChange(tab)}
            className="text-xs"
          >
            {tab}
          </Button>
        ))}
        <Button variant="ghost" size="sm" className="text-xs">+</Button>
      </div>
    </div>

    <div className="flex items-center space-x-2">
      <Settings className="w-5 h-5 text-gray-500" />
      <User className="w-5 h-5 text-gray-500" />
      <BarChart3 className="w-5 h-5 text-gray-500" />
    </div>
  </div>
);

const KpiBar = ({ investigation }: { investigation: any }) => (
  <div className="bg-white border-b px-4 py-2 flex items-center space-x-6 text-sm">
    <span>Risk: <strong className="text-red-600">{investigation.risk_score}</strong></span>
    <span>Conf: <strong>{investigation.confidence}</strong></span>
    <span>Phase: <strong>Summary</strong></span>
    <span>⏱️ 2d</span>
    <div className="flex space-x-1">
      <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">🟥5</span>
      <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">🟨3</span>
      <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">🟩2</span>
    </div>
  </div>
);

const DomainCards = ({ domains }: { domains: Domain[] }) => (
  <div className="w-48 bg-white border-r p-4">
    <h3 className="font-semibold mb-3 text-sm">DOMAINS</h3>
    <div className="space-y-2">
      {domains.map(domain => (
        <Card key={domain.name} className="p-3 cursor-pointer hover:bg-gray-50">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium capitalize">{domain.name}</span>
            <span className={`text-sm font-bold ${
              domain.risk_score > 0.7 ? 'text-red-600' :
              domain.risk_score > 0.4 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {domain.risk_score.toFixed(2)}
            </span>
          </div>
        </Card>
      ))}
    </div>
  </div>
);

const GraphPanel = ({ onNodeSelect }: { onNodeSelect: (node: string | null) => void }) => (
  <div className="flex-1 bg-white border-r">
    <div className="p-4 border-b">
      <div className="flex space-x-2">
        <Button size="sm" variant="outline">Force</Button>
        <Button size="sm" variant="ghost">Radial</Button>
        <Button size="sm" variant="ghost">Causal</Button>
        <Button size="sm" variant="outline">Temporal</Button>
        <Button size="sm" variant="ghost">Focus</Button>
        <Search className="w-4 h-4 ml-auto text-gray-500" />
      </div>
    </div>

    <div className="p-8 h-full flex items-center justify-center">
      {/* TODO: Implement actual graph visualization with D3 or similar */}
      <div className="text-center text-gray-500">
        <div className="w-64 h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
          Graph Visualization
          <br />
          (Interactive nodes and edges)
        </div>
        <p className="mt-4 text-sm">Click nodes to select evidence</p>
      </div>
    </div>
  </div>
);

const EvidencePanel = ({ selectedNode }: { selectedNode: string | null }) => (
  <div className="w-80 bg-white p-4">
    <h3 className="font-semibold mb-3">EVIDENCE PANEL</h3>
    {selectedNode ? (
      <div>
        <p className="text-sm mb-2">Selected: <strong>Network Analysis</strong></p>
        <p className="text-sm mb-2">Indicators: geo-dispersion, vpn-proxy</p>
        <p className="text-sm mb-4">Evidence: 7 items</p>

        <div className="space-y-2 text-xs">
          <div className="p-2 bg-gray-50 rounded">
            - IP geo changes: 3 countries in 2h
          </div>
          <div className="p-2 bg-gray-50 rounded">
            - VPN exit nodes detected: 2 providers
          </div>
          <div className="p-2 bg-gray-50 rounded">
            - Traffic patterns: anomalous
          </div>
        </div>
      </div>
    ) : (
      <p className="text-gray-500 text-sm">Select a node to view evidence details</p>
    )}
  </div>
);

const TimelinePanel = () => (
  <div className="h-32 bg-white border-t p-4">
    <div className="flex justify-between items-center mb-2">
      <h3 className="font-semibold text-sm">TIMELINE</h3>
      <div className="flex space-x-2">
        <Button size="sm" variant="ghost">Collapse</Button>
        <Button size="sm" variant="ghost">Errors</Button>
        <Button size="sm" variant="ghost">Decisions</Button>
      </div>
    </div>

    <div className="flex space-x-4 text-xs">
      <div className="flex items-center space-x-2">
        <span>08:07</span>
        <span>🔧</span>
        <span className="text-green-600">✓</span>
      </div>
      <div className="flex items-center space-x-2">
        <span>08:08</span>
        <span>📊</span>
        <span className="text-green-600">✓</span>
      </div>
      <div className="flex items-center space-x-2">
        <span>11:54</span>
        <span>⚠️</span>
        <span className="text-green-600">✓</span>
      </div>
    </div>
  </div>
);
```

---

## Concept B: Kanban/Swimlane (Manager Overview)

### A. NAME & INTENT
**Name**: "Command Center"
**When to use**: Investigation team leads and managers who need clear status visibility, workflow management, and team coordination.

### B. LAYOUT BLUEPRINT
```
┌─────────────────────────────────────────────────────────────────────┐
│ Olorin Investigation Center    [Filter ▼] [Team ▼] [Export ▼]      │
├─────────────────────────────────────────────────────────────────────┤
│ 📊 Active: 12 │ ⏱️ SLA Risk: 3 │ 🎯 Completed: 8 │ ⚠️ Blocked: 2     │
├─────────────────────────────────────────────────────────────────────┤
│ INITIATION     │ ANALYSIS      │ REVIEW        │ COMPLETE          │
│ ┌────────────┐ │ ┌────────────┐ │ ┌────────────┐ │ ┌────────────┐     │
│ │ INV-125    │ │ │ INV-123    │ │ │ INV-121    │ │ │ INV-119    │     │
│ │ 95.2.1.1   │ │ │ 95.2.1.146 │ │ │ 10.0.0.1   │ │ │ user@evil  │     │
│ │ 🔴 High    │ │ │ 🟠 0.85    │ │ │ 🟡 0.65    │ │ │ ✅ 0.95    │     │
│ │ @alice     │ │ │ @bob       │ │ │ @carol     │ │ │ @alice     │     │
│ │ 5m ago     │ │ │ 2h running │ │ │ Review due │ │ │ Exported   │     │
│ └────────────┘ │ └────────────┘ │ └────────────┘ │ └────────────┘     │
│ ┌────────────┐ │ ┌────────────┐ │ ┌────────────┐ │ ┌────────────┐     │
│ │ INV-126    │ │ │ INV-124    │ │ │ INV-122    │ │ │ INV-120    │     │
│ │ tx_1234    │ │ │ device_99  │ │ │ 192.1.1.1  │ │ │ card_5678  │     │
│ │ 🟡 Medium  │ │ │ 🔴 0.92    │ │ │ 🟢 0.35    │ │ │ ✅ 0.12    │     │
│ │ @dave      │ │ │ @eve       │ │ │ @frank     │ │ │ @bob       │     │
│ │ Queued     │ │ │ ⚠️ Intel fail│ │ │ Sign-off   │ │ │ Archived   │     │
│ └────────────┘ │ └────────────┘ │ └────────────┘ │ └────────────┘     │
└────────────────┴───────────────┴───────────────┴────────────────────┘
```

**Density**: Airy review - clear visual hierarchy with breathing room
**Navigation**: Kanban columns for workflow stages, card-based interactions

### C. KEY INTERACTIONS

**Filters**:
- Header dropdown filters: [All Teams] [High Risk Only] [SLA At Risk] [This Week]
- Quick filter chips: "My Investigations" "Blocked" "Needs Review"
- Date range picker with business context (today, this week, this month)

**Investigation Management**:
- Drag & drop cards between columns for status changes
- Card expansion on click shows mini-dashboard
- Bulk operations: Select multiple cards for batch assignment
- New investigation wizard: [+ New] button launches guided workflow

**Team Coordination**:
- Assignment dropdown on cards with team member avatars
- Team filter shows color-coded investigations by owner
- SLA indicators with countdown timers
- Notification center for status changes and escalations

**Status Tracking**:
- Column headers show counts and SLA warnings
- Progress indicators on cards (analysis 60% complete)
- Risk score visualization with trend arrows
- Quality gates with approval workflow

**Export & Reporting**:
- Export dropdown: [Team Summary] [SLA Report] [Weekly Digest]
- One-click executive summary for selected investigations
- Automated report scheduling and distribution

### D. STATE & ERROR DESIGN

**Empty States**:
- Empty column: "No investigations in this stage" with [+ Start Investigation] button
- No team investigations: "Your team has no active cases" with getting started guide
- Filtered view empty: "No investigations match filters" with clear filters option

**Loading States**:
- Cards: Skeleton layouts with shimmer effect
- Status updates: Subtle spinner on card during state changes
- Bulk operations: Progress bar with operation count

**Error Handling**:
- Intel service down: Orange warning stripe "External intel unavailable - investigations continue with internal data"
- Investigation stuck: Red border on cards with explanatory tooltip
- SLA breaches: Prominent notification with escalation options

### E. ACCESSIBILITY NOTES

**ARIA Roles**:
- Kanban columns: `role="region" aria-label="Initiation stage, 2 investigations"`
- Investigation cards: `role="button" aria-label="Investigation INV-123, IP 95.211.35.146, risk 0.85, assigned to Bob"`
- Status indicators: `aria-label="High risk investigation, SLA at risk"`

**Keyboard Navigation**:
- Tab through columns left to right
- Arrow keys to navigate cards within columns
- Enter to expand card details
- Ctrl+M for new investigation modal
- Ctrl+F for search/filter

**Visual Indicators**:
- Risk levels use icons + colors + patterns
- SLA status uses countdown + color + urgency icons
- Team assignments use avatars + initials + hover names

### F. TELEMETRY

- `investigation_status_change`: {investigation_id, from_status, to_status, user_id, timestamp}
- `filter_applied`: {filter_type, filter_value, result_count, timestamp}
- `bulk_operation`: {operation_type, investigation_count, timestamp}
- `sla_breach_alert`: {investigation_id, breach_type, escalation_taken, timestamp}
- `team_assignment_change`: {investigation_id, from_user, to_user, timestamp}
- `export_generated`: {report_type, investigation_count, recipient, timestamp}

### G. PROS/CONS & TRADEOFFS

**Pros**:
- Clear workflow visualization for team management
- Excellent for status tracking and SLA monitoring
- Intuitive drag-and-drop workflow changes
- Perfect for daily standups and team coordination
- Executive-friendly high-level view

**Cons**:
- Limited detailed analysis capabilities
- Not suitable for deep evidence review
- Requires discipline in status updates
- May oversimplify complex investigation states

**Intentionally Sacrifices**:
- Deep technical details for workflow clarity
- Individual investigation focus for team overview
- Real-time graph visualization for status management

### H. CODE SHELL (React+TS)

```typescript
// App.tsx for Command Center
import React, { useState } from 'react';
import { Card, Button, Badge } from '@/components/ui';
import { Filter, Users, Download, Plus, AlertTriangle } from 'lucide-react';

interface Investigation {
  id: string;
  entity: string;
  risk_level: 'low' | 'medium' | 'high';
  risk_score?: number;
  assignee: string;
  status: 'initiation' | 'analysis' | 'review' | 'complete';
  updated: string;
  sla_risk?: boolean;
}

const mockInvestigations: Investigation[] = [
  { id: 'INV-125', entity: '95.2.1.1', risk_level: 'high', assignee: 'alice', status: 'initiation', updated: '5m ago' },
  { id: 'INV-123', entity: '95.2.1.146', risk_level: 'high', risk_score: 0.85, assignee: 'bob', status: 'analysis', updated: '2h running' },
  { id: 'INV-121', entity: '10.0.0.1', risk_level: 'medium', risk_score: 0.65, assignee: 'carol', status: 'review', updated: 'Review due', sla_risk: true },
  { id: 'INV-119', entity: 'user@evil', risk_level: 'low', risk_score: 0.95, assignee: 'alice', status: 'complete', updated: 'Exported' }
];

export default function CommandCenterApp() {
  const [investigations, setInvestigations] = useState(mockInvestigations);
  const [selectedFilter, setSelectedFilter] = useState('all');

  const columns = [
    { key: 'initiation', title: 'INITIATION', color: 'blue' },
    { key: 'analysis', title: 'ANALYSIS', color: 'yellow' },
    { key: 'review', title: 'REVIEW', color: 'orange' },
    { key: 'complete', title: 'COMPLETE', color: 'green' }
  ];

  const getColumnInvestigations = (status: string) =>
    investigations.filter(inv => inv.status === status);

  const getStatusCounts = () => ({
    active: investigations.filter(inv => inv.status !== 'complete').length,
    sla_risk: investigations.filter(inv => inv.sla_risk).length,
    completed: investigations.filter(inv => inv.status === 'complete').length,
    blocked: investigations.filter(inv => inv.updated.includes('fail')).length
  });

  const counts = getStatusCounts();

  return (
    <div className="h-screen bg-gray-50">
      <Header />
      <KpiRow counts={counts} />
      <KanbanBoard columns={columns} getColumnInvestigations={getColumnInvestigations} />
    </div>
  );
}

const Header = () => (
  <div className="bg-white border-b px-6 py-4 flex justify-between items-center">
    <h1 className="text-xl font-semibold">Olorin Investigation Center</h1>
    <div className="flex space-x-3">
      <Button variant="outline" size="sm">
        <Filter className="w-4 h-4 mr-2" />
        Filter
      </Button>
      <Button variant="outline" size="sm">
        <Users className="w-4 h-4 mr-2" />
        Team
      </Button>
      <Button variant="outline" size="sm">
        <Download className="w-4 h-4 mr-2" />
        Export
      </Button>
    </div>
  </div>
);

const KpiRow = ({ counts }: { counts: any }) => (
  <div className="bg-white border-b px-6 py-4 flex space-x-8">
    <div className="flex items-center space-x-2">
      <span className="text-2xl">📊</span>
      <span className="text-sm text-gray-600">Active:</span>
      <span className="font-semibold">{counts.active}</span>
    </div>
    <div className="flex items-center space-x-2">
      <span className="text-2xl">⏱️</span>
      <span className="text-sm text-gray-600">SLA Risk:</span>
      <span className="font-semibold text-orange-600">{counts.sla_risk}</span>
    </div>
    <div className="flex items-center space-x-2">
      <span className="text-2xl">🎯</span>
      <span className="text-sm text-gray-600">Completed:</span>
      <span className="font-semibold text-green-600">{counts.completed}</span>
    </div>
    <div className="flex items-center space-x-2">
      <span className="text-2xl">⚠️</span>
      <span className="text-sm text-gray-600">Blocked:</span>
      <span className="font-semibold text-red-600">{counts.blocked}</span>
    </div>
  </div>
);

const KanbanBoard = ({ columns, getColumnInvestigations }: any) => (
  <div className="flex-1 flex p-6 space-x-6 overflow-x-auto">
    {columns.map((column: any) => (
      <KanbanColumn
        key={column.key}
        title={column.title}
        investigations={getColumnInvestigations(column.key)}
        color={column.color}
      />
    ))}
  </div>
);

const KanbanColumn = ({ title, investigations, color }: any) => (
  <div className="w-80 bg-white rounded-lg shadow-sm">
    <div className="p-4 border-b">
      <h3 className="font-semibold text-gray-700">{title}</h3>
      <span className="text-sm text-gray-500">{investigations.length} investigations</span>
    </div>

    <div className="p-4 space-y-3 min-h-96">
      {investigations.map((inv: Investigation) => (
        <InvestigationCard key={inv.id} investigation={inv} />
      ))}

      {investigations.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <p className="text-sm">No investigations</p>
          <Button variant="ghost" size="sm" className="mt-2">
            <Plus className="w-4 h-4 mr-1" />
            Add Investigation
          </Button>
        </div>
      )}
    </div>
  </div>
);

const InvestigationCard = ({ investigation }: { investigation: Investigation }) => {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRiskIcon = (level: string) => {
    switch (level) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <Card className="p-3 cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-400">
      <div className="space-y-2">
        <div className="flex justify-between items-start">
          <span className="font-medium text-sm">{investigation.id}</span>
          {investigation.sla_risk && (
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          )}
        </div>

        <p className="text-sm text-gray-600 truncate">{investigation.entity}</p>

        <div className="flex items-center space-x-2">
          <span className="text-sm">{getRiskIcon(investigation.risk_level)}</span>
          {investigation.risk_score ? (
            <span className="text-sm font-medium">{investigation.risk_score}</span>
          ) : (
            <Badge variant="outline" className={getRiskColor(investigation.risk_level)}>
              {investigation.risk_level}
            </Badge>
          )}
        </div>

        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-xs text-gray-500">@{investigation.assignee}</span>
          <span className="text-xs text-gray-400">{investigation.updated}</span>
        </div>
      </div>
    </Card>
  );
};
```

---

## Concept C: Narrative Timeline-First (Compliance & Audit)

### A. NAME & INTENT
**Name**: "Evidence Trail"
**When to use**: Compliance officers, auditors, and investigators who need complete decision trails, immutable records, and chronological evidence review.

### B. LAYOUT BLUEPRINT
```
┌─────────────────────────────────────────────────────────────────────┐
│ 📋 Investigation INV-123 | 95.211.35.146 | Final Risk: 0.85       │
│ [📄 Export Report] [🔒 Lock Trail] [📊 Evidence Summary] [⚖️ Audit] │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─ TIMELINE NARRATIVE ─────────────────┐ ┌─ EVIDENCE DETAILS ────┐ │
│ │ 2025-09-13 16:20:04 - INITIATED       │ │ Selected Event:        │ │
│ │ 👤 analyst@olorin.com                 │ │ Tool: snowflake_query  │ │
│ │ Entity: IP 95.211.35.146              │ │ Duration: 1,163ms      │ │
│ │ Window: 48h lookback                  │ │ Status: ✅ Success     │ │
│ │ ────────────────────────────────────── │ │                        │ │
│ │ 2025-09-14 08:07:53 - TOOL EXECUTED   │ │ Input:                 │ │
│ │ 🔧 snowflake_query (1,163ms) ✅       │ │ SELECT txn_data FROM   │ │
│ │ → Found 247 transactions              │ │ user_activity WHERE    │ │
│ │ → 61 flagged for manual review        │ │ ip = '95.211.35.146'   │ │
│ │ ────────────────────────────────────── │ │ AND ts BETWEEN...      │ │
│ │ 2025-09-14 08:08:14 - ANALYSIS BEGAN  │ │                        │ │
│ │ 🤖 network_agent v2.1                 │ │ Output:                │ │
│ │ → Processing location data             │ │ {                      │ │
│ │ → VPN indicators detected             │ │   "total_txns": 247,   │ │
│ │ ────────────────────────────────────── │ │   "flagged": 61,       │ │
│ │ 2025-09-14 11:54:01 - RISK UPDATED    │ │   "risk_pattern": ..   │ │
│ │ ⚠️ network_agent → Risk: 0.90         │ │ }                      │ │
│ │ Confidence: 0.82                      │ │                        │ │
│ │ Evidence: geo-dispersion, vpn-proxy   │ │ Decision Rationale:    │ │
│ │ ────────────────────────────────────── │ │ IP showed 3 geo       │ │
│ │ 2025-09-14 12:15:33 - INTEL FAILED    │ │ changes within 2h,     │ │
│ │ ❌ abuseipdb (120ms) Failed           │ │ consistent with VPN    │ │
│ │ Error: Invalid API key                │ │ usage. Risk elevated   │ │
│ │ → Continuing with internal data        │ │ to 0.90 per policy    │ │
│ │ ────────────────────────────────────── │ │ FR-001-GEO-ANOMALY    │ │
│ │ 2025-09-15 00:40:24 - FINALIZED      │ │                        │ │
│ │ ✅ Final Risk: 0.85 (Confidence: 0.78)│ │ Audit Hash:            │ │
│ │ Recommendation: Block >$1k txns       │ │ sha256:a1b2c3...       │ │
│ └───────────────────────────────────────┘ └────────────────────────┘ │
│ ┌─ DECISION SUMMARY ──────────────────────────────────────────────┐ │
│ │ Risk Score Progression: 0.00 → 0.70 → 0.90 → 0.85             │ │
│ │ Key Evidence: 5 domains analyzed, 247 transactions reviewed     │ │
│ │ Policy Violations: FR-001 (geo-anomaly), FR-045 (vpn-usage)   │ │
│ │ Recommendation: Step-up auth >$300, block transactions >$1k    │ │
│ │ Review Required: ✅ Completed by senior_analyst@olorin.com     │ │
│ │ Compliance Sign-off: ⏳ Pending (auto-expires in 24h)         │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

**Density**: Narrative flow - detailed chronological story with context
**Navigation**: Timeline-driven with evidence drill-down, sequential story flow

### C. KEY INTERACTIONS

**Timeline Navigation**:
- Scroll timeline with timestamp anchors every hour/day
- Click timeline events to populate evidence details panel
- Filter timeline: [All Events] [Decisions Only] [Tool Calls] [Errors] [User Actions]
- Time range zoom: [Expand 1h] [Focus 15min] [Full Window]

**Evidence Examination**:
- Click any event to see full input/output in right panel
- "Show Raw Data" toggle for JSON/technical details
- Evidence linking: Click references to jump to related events
- Chain of custody: Track evidence from source to decision

**Audit Features**:
- Lock investigation trail: Prevents further modifications
- Digital signatures: Cryptographic verification of decision points
- Export audit trail: Complete chronological record with hashes
- Compliance checklist: Verify all required evidence is present

**Review Workflow**:
- Sign-off requirements: Senior analyst approval for high-risk cases
- Comments system: Add audit notes to timeline events
- Amendment tracking: Record any post-completion changes
- Policy compliance: Highlight policy violations and justifications

### D. STATE & ERROR DESIGN

**Chronological Loading**:
- Timeline loads events progressively from start to present
- "Loading more events..." indicator during scroll
- Event placeholders: Gray boxes while details load

**Investigation Integrity**:
- Locked investigations: Read-only banner with lock icon
- Missing evidence: Yellow warning for gaps in timeline
- Corrupted data: Red error with data recovery options
- Audit failures: Clear indicators when hash verification fails

**Compliance States**:
- Pending review: Orange banner with reviewer assignment
- Approved: Green checkmark with approver details and timestamp
- Rejected: Red X with rejection reason and required changes
- Expired: Gray warning for cases exceeding review timeframes

### E. ACCESSIBILITY NOTES

**Timeline Navigation**:
- Each event: `role="article" aria-label="Event at 08:07:53, tool execution, successful"`
- Timeline scrubber: `role="slider" aria-label="Navigate investigation timeline"`
- Evidence panel: `role="complementary" aria-label="Selected event details"`

**Document Structure**:
- Investigation header: `role="banner"`
- Timeline main area: `role="main"`
- Evidence panel: `role="aside"`
- Decision summary: `role="contentinfo"`

**Audit Trail Accessibility**:
- Hash verification: `aria-live="polite"` for status updates
- Sign-off status: Clear text alternatives for icons
- Compliance flags: Text descriptions in addition to color coding

### F. TELEMETRY

- `timeline_event_selected`: {event_id, event_type, selection_time, timestamp}
- `evidence_drill_down`: {event_id, detail_type, depth, timestamp}
- `audit_action`: {action_type, investigation_id, user_role, timestamp}
- `compliance_check`: {policy_id, result, investigation_id, timestamp}
- `report_exported`: {format, scope, recipient, timestamp}
- `trail_locked`: {investigation_id, locking_user, reason, timestamp}

### G. PROS/CONS & TRADEOFFS

**Pros**:
- Complete audit trail with immutable records
- Perfect for compliance and regulatory requirements
- Detailed evidence examination and verification
- Clear chronological decision narrative
- Excellent for post-incident analysis

**Cons**:
- Overwhelming detail for routine investigations
- Not suitable for real-time operation monitoring
- Limited overview of multiple investigations
- May slow down rapid triage workflows

**Intentionally Sacrifices**:
- Real-time operational dashboard for compliance focus
- Multi-investigation overview for single-case depth
- Rapid filtering for complete chronological context

### H. CODE SHELL (React+TS)

```typescript
// App.tsx for Evidence Trail
import React, { useState } from 'react';
import { Card, Button, Badge, Separator } from '@/components/ui';
import { FileText, Lock, BarChart3, Scale, Clock, Check, X, AlertTriangle } from 'lucide-react';

interface TimelineEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  status: 'success' | 'error' | 'warning';
  description: string;
  details?: {
    input?: string;
    output?: string;
    duration?: number;
    rationale?: string;
  };
}

const mockTimeline: TimelineEvent[] = [
  {
    id: '1',
    timestamp: '2025-09-13T16:20:04Z',
    actor: 'analyst@olorin.com',
    action: 'INITIATED',
    status: 'success',
    description: 'Investigation started for IP 95.211.35.146',
    details: {
      input: 'Entity: IP 95.211.35.146\nWindow: 48h lookback',
      rationale: 'Suspicious transaction patterns detected by automated monitoring'
    }
  },
  {
    id: '2',
    timestamp: '2025-09-14T08:07:53Z',
    actor: 'snowflake_query',
    action: 'TOOL EXECUTED',
    status: 'success',
    description: 'Database query completed → Found 247 transactions',
    details: {
      duration: 1163,
      input: 'SELECT txn_data FROM user_activity WHERE ip = \'95.211.35.146\' AND ts BETWEEN...',
      output: '{"total_txns": 247, "flagged": 61, "risk_pattern": "geo-dispersion"}',
      rationale: 'Query executed successfully, sufficient data for analysis'
    }
  },
  {
    id: '3',
    timestamp: '2025-09-14T08:08:14Z',
    actor: 'network_agent',
    action: 'ANALYSIS BEGAN',
    status: 'success',
    description: 'Processing location and network data',
    details: {
      rationale: 'Analyzing transaction patterns for geographical anomalies'
    }
  },
  {
    id: '4',
    timestamp: '2025-09-14T11:54:01Z',
    actor: 'network_agent',
    action: 'RISK UPDATED',
    status: 'warning',
    description: 'Risk elevated to 0.90 - geo-dispersion and VPN indicators',
    details: {
      output: 'Risk: 0.90, Confidence: 0.82, Evidence: geo-dispersion, vpn-proxy',
      rationale: 'IP showed 3 geo changes within 2h, consistent with VPN usage per policy FR-001-GEO-ANOMALY'
    }
  },
  {
    id: '5',
    timestamp: '2025-09-14T12:15:33Z',
    actor: 'abuseipdb',
    action: 'INTEL FAILED',
    status: 'error',
    description: 'External intelligence lookup failed',
    details: {
      duration: 120,
      input: 'IP: 95.211.35.146',
      output: 'Error: Invalid API key',
      rationale: 'Continuing with internal data, external intel not critical for decision'
    }
  }
];

export default function EvidenceTrailApp() {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(mockTimeline[1]);
  const [isLocked, setIsLocked] = useState(false);

  return (
    <div className="h-screen bg-gray-50">
      <InvestigationHeader isLocked={isLocked} onLock={() => setIsLocked(!isLocked)} />

      <div className="flex-1 flex p-6 space-x-6">
        <TimelineNarrative
          events={mockTimeline}
          selectedEvent={selectedEvent}
          onEventSelect={setSelectedEvent}
          isLocked={isLocked}
        />
        <EvidenceDetails selectedEvent={selectedEvent} />
      </div>

      <DecisionSummary />
    </div>
  );
}

const InvestigationHeader = ({ isLocked, onLock }: { isLocked: boolean; onLock: () => void }) => (
  <div className="bg-white border-b px-6 py-4">
    <div className="flex justify-between items-center">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-semibold">📋 Investigation INV-123</h1>
        <span className="text-gray-600">95.211.35.146</span>
        <Badge variant="secondary">Final Risk: 0.85</Badge>
        {isLocked && <Lock className="w-5 h-5 text-red-500" />}
      </div>

      <div className="flex space-x-3">
        <Button variant="outline" size="sm">
          <FileText className="w-4 h-4 mr-2" />
          Export Report
        </Button>
        <Button
          variant={isLocked ? "destructive" : "outline"}
          size="sm"
          onClick={onLock}
        >
          <Lock className="w-4 h-4 mr-2" />
          {isLocked ? 'Unlock' : 'Lock'} Trail
        </Button>
        <Button variant="outline" size="sm">
          <BarChart3 className="w-4 h-4 mr-2" />
          Evidence Summary
        </Button>
        <Button variant="outline" size="sm">
          <Scale className="w-4 h-4 mr-2" />
          Audit
        </Button>
      </div>
    </div>

    {isLocked && (
      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
        <p className="text-red-800 text-sm font-medium">
          Investigation trail is locked. No modifications permitted.
        </p>
      </div>
    )}
  </div>
);

const TimelineNarrative = ({
  events,
  selectedEvent,
  onEventSelect,
  isLocked
}: {
  events: TimelineEvent[];
  selectedEvent: TimelineEvent | null;
  onEventSelect: (event: TimelineEvent) => void;
  isLocked: boolean;
}) => (
  <div className="flex-1">
    <Card className="h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold">TIMELINE NARRATIVE</h3>
        <div className="flex space-x-2 mt-2">
          <Button size="sm" variant="outline">All Events</Button>
          <Button size="sm" variant="ghost">Decisions Only</Button>
          <Button size="sm" variant="ghost">Tool Calls</Button>
          <Button size="sm" variant="ghost">Errors</Button>
        </div>
      </div>

      <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
        {events.map((event, index) => (
          <TimelineEvent
            key={event.id}
            event={event}
            isSelected={selectedEvent?.id === event.id}
            onSelect={() => onEventSelect(event)}
            isLast={index === events.length - 1}
          />
        ))}
      </div>
    </Card>
  </div>
);

const TimelineEvent = ({
  event,
  isSelected,
  onSelect,
  isLast
}: {
  event: TimelineEvent;
  isSelected: boolean;
  onSelect: () => void;
  isLast: boolean;
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <Check className="w-4 h-4 text-green-600" />;
      case 'error': return <X className="w-4 h-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default: return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getActorIcon = (actor: string) => {
    if (actor.includes('@')) return '👤';
    if (actor.includes('agent')) return '🤖';
    if (actor.includes('query')) return '🔧';
    return '⚙️';
  };

  return (
    <div className="relative">
      <div
        className={`p-3 rounded cursor-pointer transition-colors ${
          isSelected ? 'bg-blue-50 border-blue-200 border' : 'hover:bg-gray-50'
        }`}
        onClick={onSelect}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {getStatusIcon(event.status)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-sm font-medium text-gray-900">
                {new Date(event.timestamp).toLocaleString()}
              </span>
              <span className="text-sm text-gray-600">-</span>
              <span className="text-sm font-medium text-blue-600">{event.action}</span>
            </div>

            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm">{getActorIcon(event.actor)}</span>
              <span className="text-sm text-gray-600">{event.actor}</span>
              {event.details?.duration && (
                <span className="text-xs text-gray-500">({event.details.duration}ms)</span>
              )}
            </div>

            <p className="text-sm text-gray-700">{event.description}</p>

            {event.details?.rationale && (
              <p className="text-xs text-gray-500 mt-1 italic">
                → {event.details.rationale}
              </p>
            )}
          </div>
        </div>
      </div>

      {!isLast && (
        <div className="absolute left-5 top-full w-px h-4 bg-gray-300" />
      )}
    </div>
  );
};

const EvidenceDetails = ({ selectedEvent }: { selectedEvent: TimelineEvent | null }) => (
  <div className="w-80">
    <Card className="h-full">
      <div className="p-4 border-b">
        <h3 className="font-semibold">EVIDENCE DETAILS</h3>
      </div>

      <div className="p-4">
        {selectedEvent ? (
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Selected Event:</h4>
              <p className="text-sm text-gray-600">Tool: {selectedEvent.actor}</p>
              {selectedEvent.details?.duration && (
                <p className="text-sm text-gray-600">Duration: {selectedEvent.details.duration}ms</p>
              )}
              <p className="text-sm text-gray-600">
                Status: {selectedEvent.status === 'success' ? '✅ Success' :
                        selectedEvent.status === 'error' ? '❌ Error' : '⚠️ Warning'}
              </p>
            </div>

            {selectedEvent.details?.input && (
              <div>
                <h4 className="font-medium text-sm mb-2">Input:</h4>
                <pre className="text-xs bg-gray-100 p-2 rounded whitespace-pre-wrap">
                  {selectedEvent.details.input}
                </pre>
              </div>
            )}

            {selectedEvent.details?.output && (
              <div>
                <h4 className="font-medium text-sm mb-2">Output:</h4>
                <pre className="text-xs bg-gray-100 p-2 rounded whitespace-pre-wrap">
                  {selectedEvent.details.output}
                </pre>
              </div>
            )}

            {selectedEvent.details?.rationale && (
              <div>
                <h4 className="font-medium text-sm mb-2">Decision Rationale:</h4>
                <p className="text-sm text-gray-700">{selectedEvent.details.rationale}</p>
              </div>
            )}

            <div>
              <h4 className="font-medium text-sm mb-2">Audit Hash:</h4>
              <p className="text-xs font-mono text-gray-500">sha256:a1b2c3d4e5f6...</p>
            </div>
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Select a timeline event to view details</p>
        )}
      </div>
    </Card>
  </div>
);

const DecisionSummary = () => (
  <div className="bg-white border-t p-6">
    <Card className="p-4">
      <h3 className="font-semibold mb-3">DECISION SUMMARY</h3>

      <div className="grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="mb-2">
            <strong>Risk Score Progression:</strong> 0.00 → 0.70 → 0.90 → 0.85
          </p>
          <p className="mb-2">
            <strong>Key Evidence:</strong> 5 domains analyzed, 247 transactions reviewed
          </p>
          <p className="mb-2">
            <strong>Policy Violations:</strong> FR-001 (geo-anomaly), FR-045 (vpn-usage)
          </p>
        </div>

        <div>
          <p className="mb-2">
            <strong>Recommendation:</strong> Step-up auth >$300, block transactions >$1k
          </p>
          <p className="mb-2">
            <strong>Review Required:</strong> ✅ Completed by senior_analyst@olorin.com
          </p>
          <p className="mb-2">
            <strong>Compliance Sign-off:</strong> ⏳ Pending (auto-expires in 24h)
          </p>
        </div>
      </div>
    </Card>
  </div>
);
```

---

## Concept D: Graph-First Workbench (Technical Analysis)

### A. NAME & INTENT
**Name**: "Network Explorer"
**When to use**: Technical investigators and data scientists who need deep graph analysis, relationship mapping, and advanced visualization of evidence networks.

### B. LAYOUT BLUEPRINT
```
┌─────────────────────────────────────────────────────────────────────┐
│ [≡] Olorin Graph Workbench    🔍[Search] [⚙️ Layout] [📊] [💾] [?]  │
├─────────────────────────────────────────────────────────────────────┤
│ ┌─ GRAPH CONTROLS ────────────────────────────────────────────────┐ │
│ │ Layout: ◉ Force  ○ Radial  ○ Hierarchical                      │ │
│ │ Edges:  ☑ Temporal  ☑ Causal  ☐ Similarity                     │ │
│ │ Filter: [Domains▼] [Tools▼] [Risk>0.7] [Errors Only]           │ │
│ │ View:   [🔍 Zoom] [🎯 Center] [📐 Measure] [🎨 Style]          │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─ MAIN GRAPH CANVAS ─────────────────────────────────────────────┐ │
│ │                           Network (0.90)                        │ │
│ │                          ●━━━━━━━━━━━━━●                         │ │
│ │                         ╱               ╲                        │ │
│ │                       ╱                   ╲                      │ │
│ │               Evidence₁                   Evidence₂               │ │
│ │                 ●                           ●                     │ │
│ │                ╱│╲                         ╱│╲                   │ │
│ │              ╱  │  ╲                     ╱  │  ╲                 │ │
│ │         Tool₁   │   Tool₂            Tool₃  │   Decision          │ │
│ │           ◆     │     ◆                ◆    │      ◆             │ │
│ │                 │                          │                     │ │
│ │              Location (0.90)              │                     │ │
│ │                 ●━━━━━━━━━━━━━━━━━━━━━━━━━━╱                      │ │
│ │                                                                 │ │
│ │ [Breadcrumb: Home > Network > Evidence₂ > Tool₃]              │ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
│ ┌─ ANALYSIS PANEL ─┬─ MINI TIMELINE ─┬─ PROPERTIES ─────────────┐ │
│ │ Selected: Tool₃   │ 08:07 ●──●──●   │ Node ID: t3_snowflake   │ │
│ │ Type: Data Query  │ 08:08    ●      │ Type: Database Tool     │ │
│ │ Status: Success   │ 11:54       ●   │ Calls: 1                │ │
│ │ Duration: 1,163ms │ [◀ Expand]      │ Duration: 1,163ms       │ │
│ │                   │                 │ Success Rate: 100%      │ │
│ │ Connected To:     │ Risk Delta:     │ Last Run: 2h ago        │ │
│ │ • Evidence₂ (in)  │ 0.0 → 0.7 ↗     │                         │ │
│ │ • Decision (out)  │ Confidence: 0.8 │ Dependencies:           │ │
│ │                   │                 │ • Network Domain        │ │
│ │ [🔗 Trace Path]   │ [📈 Show Chart] │ • User Auth Token       │ │
│ │ [📋 Add to Report]│ [⏰ Jump to]    │ [🔧 Debug Tool]         │ │
│ └───────────────────┴─────────────────┴─────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

**Density**: Technical depth - detailed node/edge analysis with advanced controls
**Navigation**: Graph-centric with contextual panels, command-driven interactions

### C. KEY INTERACTIONS

**Graph Navigation**:
- Pan: Click-drag background
- Zoom: Mouse wheel or pinch gesture
- Node selection: Click to select, Ctrl+click for multi-select
- Edge tracing: Click edge to highlight path, show flow direction
- Lasso selection: Shift+drag to select multiple nodes

**Layout Controls**:
- Force-directed: Physics simulation with gravity/repulsion controls
- Radial: Center node selection with distance rings
- Hierarchical: Top-down flow from triggers to decisions
- Custom positioning: Drag nodes to create manual layouts

**Filtering & Search**:
- Node type filters: Show/hide domains, tools, evidence, decisions
- Risk threshold slider: Hide nodes below specified risk level
- Search box: Find nodes by name, type, or properties
- Path analysis: "Show path between X and Y" functionality

**Analysis Tools**:
- Shortest path: Calculate critical path through evidence chain
- Centrality analysis: Identify most connected/important nodes
- Cluster detection: Group related evidence and tools
- Impact analysis: Show downstream effects of node changes

### D. STATE & ERROR DESIGN

**Graph Loading**:
- Progressive rendering: Core nodes first, then details
- Skeleton graph: Placeholder nodes while data loads
- Streaming updates: New evidence appears with animation

**Analysis States**:
- Computing paths: Progress indicator for complex calculations
- No data: Empty graph with "No evidence available" message
- Too complex: "Showing top 300 nodes, expand clusters for more"
- Layout stabilizing: "Graph stabilizing..." with physics animation

**Error Visualization**:
- Failed tools: Red border on tool nodes with error tooltip
- Missing evidence: Dashed node borders for incomplete data
- Broken connections: Red dashed edges for failed dependencies
- Data conflicts: Orange warning icons on conflicting evidence

### E. ACCESSIBILITY NOTES

**Graph Navigation**:
- Nodes: `role="button" tabindex="0" aria-label="Network domain node, risk 0.9, 3 connections"`
- Edges: `role="link" aria-label="Causal relationship from Tool1 to Evidence2"`
- Canvas: `role="application" aria-label="Investigation graph with 15 nodes"`

**Keyboard Controls**:
- Tab: Cycle through visible nodes
- Arrow keys: Navigate between connected nodes
- Enter: Select focused node
- Space: Toggle node expansion
- Ctrl+F: Search nodes
- Ctrl+A: Select all nodes

**Visual Accessibility**:
- High contrast mode: Thicker borders, stronger colors
- Pattern overlays: Hatching patterns for colorblind users
- Size encoding: Node importance shown by size not just color
- Text labels: Always visible, scalable fonts

### F. TELEMETRY

- `graph_layout_change`: {from_layout, to_layout, node_count, timestamp}
- `node_selection`: {node_id, node_type, multi_select, timestamp}
- `path_analysis`: {start_node, end_node, path_length, timestamp}
- `filter_applied`: {filter_type, filter_value, visible_nodes, timestamp}
- `graph_export`: {format, node_count, edge_count, timestamp}
- `zoom_interaction`: {zoom_level, center_node, timestamp}

### G. PROS/CONS & TRADEOFFS

**Pros**:
- Excellent for understanding complex evidence relationships
- Advanced analytical capabilities for technical users
- Flexible visualization options for different analysis needs
- Deep dive capabilities with detailed node inspection
- Perfect for forensic analysis and pattern detection

**Cons**:
- Steep learning curve for non-technical users
- Not suitable for high-level status tracking
- Can become overwhelming with large investigations
- Requires significant screen real estate

**Intentionally Sacrifices**:
- Simplified workflow views for deep technical analysis
- Status management features for investigation depth
- Multi-investigation overview for single-case focus
- Guided user experience for expert flexibility

### H. CODE SHELL (React+TS)

```typescript
// App.tsx for Network Explorer
import React, { useState } from 'react';
import { Card, Button, Badge, Slider } from '@/components/ui';
import { Search, Settings, BarChart3, Save, HelpCircle, Menu, Zap, Target, Ruler, Palette } from 'lucide-react';

interface GraphNode {
  id: string;
  type: 'domain' | 'tool' | 'evidence' | 'decision';
  label: string;
  risk_score?: number;
  x?: number;
  y?: number;
  selected?: boolean;
  properties: Record<string, any>;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'causal' | 'temporal' | 'similarity';
  weight?: number;
}

const mockNodes: GraphNode[] = [
  {
    id: 'network',
    type: 'domain',
    label: 'Network',
    risk_score: 0.90,
    properties: { evidence_count: 7, indicators: ['geo-dispersion', 'vpn-proxy'] }
  },
  {
    id: 'location',
    type: 'domain',
    label: 'Location',
    risk_score: 0.90,
    properties: { evidence_count: 6, indicators: ['impossible travel'] }
  },
  {
    id: 'evidence1',
    type: 'evidence',
    label: 'Evidence₁',
    properties: { source: 'network', strength: 0.85 }
  },
  {
    id: 'evidence2',
    type: 'evidence',
    label: 'Evidence₂',
    properties: { source: 'location', strength: 0.90 }
  },
  {
    id: 'tool1',
    type: 'tool',
    label: 'Tool₁',
    properties: { name: 'snowflake_query', duration: 1163, status: 'success' }
  },
  {
    id: 'tool3',
    type: 'tool',
    label: 'Tool₃',
    properties: { name: 'snowflake_query', duration: 1163, status: 'success' },
    selected: true
  },
  {
    id: 'decision',
    type: 'decision',
    label: 'Decision',
    properties: { risk_final: 0.85, confidence: 0.78 }
  }
];

const mockEdges: GraphEdge[] = [
  { id: 'e1', source: 'network', target: 'evidence1', type: 'causal' },
  { id: 'e2', source: 'location', target: 'evidence2', type: 'causal' },
  { id: 'e3', source: 'evidence1', target: 'tool1', type: 'temporal' },
  { id: 'e4', source: 'evidence2', target: 'tool3', type: 'temporal' },
  { id: 'e5', source: 'tool3', target: 'decision', type: 'causal' },
  { id: 'e6', source: 'network', target: 'evidence2', type: 'causal' }
];

export default function NetworkExplorerApp() {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(
    mockNodes.find(n => n.selected) || null
  );
  const [layout, setLayout] = useState<'force' | 'radial' | 'hierarchical'>('force');
  const [showTemporal, setShowTemporal] = useState(true);
  const [showCausal, setShowCausal] = useState(true);
  const [riskThreshold, setRiskThreshold] = useState(0.0);

  return (
    <div className="h-screen bg-gray-900 text-white">
      <Header />
      <GraphControls
        layout={layout}
        onLayoutChange={setLayout}
        showTemporal={showTemporal}
        onTemporalToggle={setShowTemporal}
        showCausal={showCausal}
        onCausalToggle={setShowCausal}
        riskThreshold={riskThreshold}
        onRiskThresholdChange={setRiskThreshold}
      />

      <div className="flex-1 flex">
        <GraphCanvas
          nodes={mockNodes}
          edges={mockEdges}
          layout={layout}
          onNodeSelect={setSelectedNode}
        />
      </div>

      <AnalysisPanel selectedNode={selectedNode} />
    </div>
  );
}

const Header = () => (
  <div className="bg-gray-800 border-b border-gray-700 px-6 py-3 flex justify-between items-center">
    <div className="flex items-center space-x-4">
      <Menu className="w-5 h-5" />
      <h1 className="text-lg font-semibold">Olorin Graph Workbench</h1>
    </div>

    <div className="flex items-center space-x-3">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
        <input
          type="text"
          placeholder="Search nodes..."
          className="pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>
      <Button variant="ghost" size="sm">
        <Settings className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm">
        <BarChart3 className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm">
        <Save className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm">
        <HelpCircle className="w-4 h-4" />
      </Button>
    </div>
  </div>
);

const GraphControls = ({
  layout,
  onLayoutChange,
  showTemporal,
  onTemporalToggle,
  showCausal,
  onCausalToggle,
  riskThreshold,
  onRiskThresholdChange
}: any) => (
  <div className="bg-gray-800 border-b border-gray-700 p-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium">Layout:</span>
          <div className="flex space-x-2">
            {['force', 'radial', 'hierarchical'].map(l => (
              <Button
                key={l}
                size="sm"
                variant={layout === l ? "default" : "ghost"}
                onClick={() => onLayoutChange(l)}
                className="text-xs"
              >
                {l.charAt(0).toUpperCase() + l.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium">Edges:</span>
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={showTemporal}
              onChange={(e) => onTemporalToggle(e.target.checked)}
              className="rounded"
            />
            <span>Temporal</span>
          </label>
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={showCausal}
              onChange={(e) => onCausalToggle(e.target.checked)}
              className="rounded"
            />
            <span>Causal</span>
          </label>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <span className="text-sm">Risk ></span>
          <Slider
            value={[riskThreshold]}
            onValueChange={(value) => onRiskThresholdChange(value[0])}
            max={1}
            min={0}
            step={0.1}
            className="w-20"
          />
          <span className="text-sm w-8">{riskThreshold.toFixed(1)}</span>
        </div>

        <div className="flex space-x-2">
          <Button size="sm" variant="ghost">
            <Zap className="w-4 h-4 mr-1" />
            Zoom
          </Button>
          <Button size="sm" variant="ghost">
            <Target className="w-4 h-4 mr-1" />
            Center
          </Button>
          <Button size="sm" variant="ghost">
            <Ruler className="w-4 h-4 mr-1" />
            Measure
          </Button>
          <Button size="sm" variant="ghost">
            <Palette className="w-4 h-4 mr-1" />
            Style
          </Button>
        </div>
      </div>
    </div>
  </div>
);

const GraphCanvas = ({ nodes, edges, layout, onNodeSelect }: any) => {
  const getNodeColor = (node: GraphNode) => {
    if (node.selected) return 'border-blue-400 bg-blue-900';
    switch (node.type) {
      case 'domain': return 'border-purple-400 bg-purple-900';
      case 'tool': return 'border-green-400 bg-green-900';
      case 'evidence': return 'border-yellow-400 bg-yellow-900';
      case 'decision': return 'border-red-400 bg-red-900';
      default: return 'border-gray-400 bg-gray-900';
    }
  };

  const getNodeShape = (type: string) => {
    switch (type) {
      case 'tool': return 'rotate-45';
      case 'evidence': return 'rounded-full';
      default: return 'rounded';
    }
  };

  return (
    <div className="flex-1 bg-gray-900 relative overflow-hidden">
      {/* TODO: Implement actual graph visualization with D3.js or similar */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full h-full max-w-4xl max-h-96">
          {/* Mock graph visualization */}
          <svg className="w-full h-full">
            {/* Edges */}
            {edges.map((edge: GraphEdge) => (
              <line
                key={edge.id}
                x1={Math.random() * 400 + 100}
                y1={Math.random() * 200 + 100}
                x2={Math.random() * 400 + 100}
                y2={Math.random() * 200 + 100}
                stroke={edge.type === 'causal' ? '#60A5FA' : '#FBBF24'}
                strokeWidth="2"
                strokeDasharray={edge.type === 'temporal' ? '5,5' : '0'}
              />
            ))}
          </svg>

          {/* Nodes */}
          {nodes.map((node: GraphNode, index: number) => (
            <div
              key={node.id}
              className={`absolute cursor-pointer border-2 p-2 text-xs font-medium transition-all hover:scale-110 ${getNodeColor(node)} ${getNodeShape(node.type)}`}
              style={{
                left: `${(index % 4) * 120 + 100}px`,
                top: `${Math.floor(index / 4) * 80 + 100}px`,
                width: '80px',
                height: '40px'
              }}
              onClick={() => onNodeSelect(node)}
            >
              <div className="text-center">
                <div>{node.label}</div>
                {node.risk_score && (
                  <div className="text-xs opacity-75">({node.risk_score.toFixed(2)})</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="absolute bottom-4 left-4 bg-gray-800 px-3 py-1 rounded text-sm">
        Home &gt; Network &gt; Evidence₂ &gt; Tool₃
      </div>
    </div>
  );
};

const AnalysisPanel = ({ selectedNode }: { selectedNode: GraphNode | null }) => (
  <div className="h-40 bg-gray-800 border-t border-gray-700 flex">
    <div className="flex-1 p-4">
      <h3 className="font-semibold text-sm mb-3">ANALYSIS PANEL</h3>
      {selectedNode ? (
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p><strong>Selected:</strong> {selectedNode.label}</p>
            <p><strong>Type:</strong> {selectedNode.type}</p>
            {selectedNode.properties.status && (
              <p><strong>Status:</strong> {selectedNode.properties.status}</p>
            )}
            {selectedNode.properties.duration && (
              <p><strong>Duration:</strong> {selectedNode.properties.duration}ms</p>
            )}
          </div>

          <div>
            <h4 className="font-medium mb-2">Connected To:</h4>
            <ul className="text-xs space-y-1">
              <li>• Evidence₂ (in)</li>
              <li>• Decision (out)</li>
            </ul>
            <div className="mt-2 space-x-2">
              <Button size="sm" variant="outline" className="text-xs">🔗 Trace Path</Button>
              <Button size="sm" variant="outline" className="text-xs">📋 Add to Report</Button>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Properties:</h4>
            <div className="text-xs space-y-1">
              <p>Node ID: {selectedNode.id}</p>
              <p>Type: {selectedNode.type}</p>
              {Object.entries(selectedNode.properties).map(([key, value]) => (
                <p key={key}>{key}: {String(value)}</p>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-400 text-sm">Select a node to view analysis details</p>
      )}
    </div>
  </div>
);
```

---

## Comparison Table

| Concept | Strengths | Risks | Ideal Persona | Default Theme | Graph Layout | Primary Nav |
|---------|-----------|-------|---------------|---------------|--------------|-------------|
| **A: Power Grid** | Max info density, rapid switching, expert efficiency | Overwhelming for newcomers, requires large screens | Senior Investigators | Light | Force-directed | Tab-based |
| **B: Command Center** | Clear workflow, team coordination, SLA tracking | Limited detail analysis, requires status discipline | Team Leads/Managers | Light | Minimal (status-focused) | Kanban columns |
| **C: Evidence Trail** | Complete audit trails, compliance ready, chronological clarity | Overwhelming detail, slow for routine work | Compliance/Legal | Light | Timeline-focused | Sequential narrative |
| **D: Network Explorer** | Deep analysis, relationship mapping, technical flexibility | Steep learning curve, complex for status tracking | Technical Analysts | Dark | Force/Radial toggle | Graph-centric |

---

## Next Steps

### Design Review Checklist
- [ ] Validate each concept addresses its target persona's primary needs
- [ ] Confirm accessibility requirements (WCAG AA) are met in all concepts
- [ ] Review performance constraints (200KB bundle, 60fps interactions)
- [ ] Verify graph specification consistency across concepts
- [ ] Test responsive breakpoints for each concept

### Quick User Test Plan
1. **Persona Validation**: 5-minute concept walkthrough with representative users from each persona
2. **Task Completion**: Timed tasks for key workflows (investigation review, evidence examination, status checking)
3. **Accessibility Testing**: Keyboard navigation and screen reader compatibility
4. **Performance Testing**: Bundle size analysis and interaction smoothness on target devices

### Build Spikes (2-week sprints)
1. **Week 1**: Graph visualization foundation (D3.js integration, node/edge rendering)
2. **Week 2**: Timeline component library (chronological events, evidence linking)
3. **Week 3**: Kanban workflow engine (drag-drop, status management)
4. **Week 4**: Integration testing (data flow, real-time updates, export functionality)

### Technical Validation
- [ ] Confirm React+TypeScript+Tailwind stack compatibility
- [ ] Test shadcn/ui component library integration
- [ ] Validate Recharts performance with investigation data volumes
- [ ] Verify WebSocket integration for real-time updates
- [ ] Test export functionality across all concepts