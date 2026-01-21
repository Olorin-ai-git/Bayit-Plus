"""CSS styles for incremental reports."""


def get_incremental_report_styles() -> str:
    """Get CSS styles for the incremental report."""
    return """
        :root {
            --bg: #0f172a;
            --card: #1e293b;
            --border: #334155;
            --text: #e2e8f0;
            --muted: #94a3b8;
            --ok: #22c55e;
            --warn: #f59e0b;
            --danger: #ef4444;
            --accent: #3b82f6;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: 'Segoe UI', system-ui, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.6;
            padding: 20px;
        }
        .header {
            text-align: center;
            padding: 30px;
            border-bottom: 2px solid var(--accent);
            margin-bottom: 30px;
        }
        h1 { color: var(--accent); font-size: 2rem; }
        .subtitle { color: var(--muted); margin-top: 10px; }
        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-weight: bold;
            margin-top: 15px;
        }
        .status-badge.in-progress { background: var(--warn); color: #000; }
        .status-badge.complete { background: var(--ok); color: #000; }
        .global-metrics {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .metric-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
        }
        .metric-value { font-size: 2rem; font-weight: bold; }
        .metric-value.positive { color: var(--ok); }
        .metric-value.negative { color: var(--danger); }
        .metric-label { color: var(--muted); margin-top: 5px; }
        .confusion-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            max-width: 400px;
            margin: 20px auto;
        }
        .cm-cell {
            padding: 15px;
            text-align: center;
            border-radius: 8px;
            font-weight: bold;
        }
        .cm-tp { background: rgba(34, 197, 94, 0.2); color: var(--ok); }
        .cm-fp { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
        .cm-tn { background: rgba(59, 130, 246, 0.2); color: var(--accent); }
        .cm-fn { background: rgba(245, 158, 11, 0.2); color: var(--warn); }
        .merchant-section {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 12px;
            margin-bottom: 20px;
            overflow: hidden;
        }
        .merchant-header {
            background: linear-gradient(135deg, var(--accent), #6366f1);
            padding: 15px 20px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .merchant-header h3 { color: white; }
        .merchant-content { padding: 20px; display: none; }
        .merchant-content.open { display: block; }
        .entity-card {
            background: rgba(0,0,0,0.2);
            border: 1px solid var(--border);
            border-radius: 8px;
            margin-bottom: 15px;
            overflow: hidden;
        }
        .entity-header {
            padding: 12px 15px;
            cursor: pointer;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(59, 130, 246, 0.1);
        }
        .entity-details { padding: 15px; display: none; }
        .entity-details.open { display: block; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid var(--border); }
        th { color: var(--muted); font-weight: normal; }
        .toggle { font-size: 1.2rem; }
        .breadcrumb-nav {
            background: var(--card);
            padding: 12px 20px;
            border-radius: 8px;
            margin-bottom: 25px;
            border: 1px solid var(--border);
        }
        .breadcrumb-link { color: var(--accent); font-weight: 500; text-decoration: none; }
        .breadcrumb-link:hover { text-decoration: underline; }
        .breadcrumb-separator { color: var(--muted); margin: 0 10px; font-size: 1.1rem; }
        .breadcrumb-current { color: var(--text); font-weight: 600; }
    """


def get_incremental_report_scripts() -> str:
    """Get JavaScript for the incremental report."""
    return """
        function toggleSelector() {
            const content = document.getElementById('selector-content');
            const icon = document.getElementById('selector-toggle');
            if (content.style.display === 'none') {
                content.style.display = 'block';
                icon.textContent = '-';
            } else {
                content.style.display = 'none';
                icon.textContent = '+';
            }
        }

        function toggleMerchant(id) {
            const content = document.getElementById('merchant-' + id);
            content.classList.toggle('open');
        }

        function toggleEntity(id) {
            const content = document.getElementById('entity-' + id);
            content.classList.toggle('open');
        }

        // Auto-expand first merchant
        document.querySelector('.merchant-content')?.classList.add('open');
    """
