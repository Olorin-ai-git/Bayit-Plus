"""
Results Persister
Feature: 026-llm-training-pipeline

Persists optimization results and generates reports.
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

from app.service.logging import get_bridge_logger
from app.service.training.convergence_detector import ConvergenceState, OptimizationResult

logger = get_bridge_logger(__name__)


class ResultsPersister:
    """Persists optimization results and generates reports."""

    def __init__(self):
        """Initialize persister from environment."""
        self._results_dir = Path(os.getenv("CONTINUOUS_TRAINING_RESULTS_DIR", "data/training"))
        self._reports_dir = Path(os.getenv("CONTINUOUS_TRAINING_REPORTS_DIR", "artifacts"))
        self._checkpoint_freq = int(os.getenv("CONTINUOUS_TRAINING_CHECKPOINT_FREQ", "25"))
        self._generate_html = os.getenv("CONTINUOUS_TRAINING_HTML_REPORT", "true").lower() == "true"

        self._results_dir.mkdir(parents=True, exist_ok=True)
        self._reports_dir.mkdir(parents=True, exist_ok=True)

        self._run_id = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        self._all_results: List[Dict] = []

    def save_result(self, result: OptimizationResult) -> None:
        """Save a single result."""
        result_dict = {
            "config_id": result.config_id,
            "threshold": result.threshold,
            "prompt_version": result.prompt_version,
            "llm_weight": result.llm_weight,
            "baseline_score": result.baseline_score,
            "precision": result.precision,
            "recall": result.recall,
            "f1_score": result.f1_score,
            "tp": result.true_positives,
            "fp": result.false_positives,
            "tn": result.true_negatives,
            "fn": result.false_negatives,
            "iteration": result.iteration,
        }
        self._all_results.append(result_dict)

        if len(self._all_results) % self._checkpoint_freq == 0:
            self._save_checkpoint()

    def _save_checkpoint(self) -> None:
        """Save checkpoint of all results so far."""
        checkpoint_file = self._results_dir / f"checkpoint_{self._run_id}.json"
        with open(checkpoint_file, "w") as f:
            json.dump({"results": self._all_results, "timestamp": datetime.utcnow().isoformat()}, f)
        logger.debug(f"Checkpoint saved: {len(self._all_results)} results")

    def save_best_configuration(self, result: OptimizationResult) -> Path:
        """
        Save the best configuration for production use.

        Args:
            result: Best optimization result

        Returns:
            Path to saved configuration file
        """
        config = {
            "fraud_threshold": result.threshold,
            "prompt_version": result.prompt_version,
            "llm_weight": result.llm_weight,
            "baseline_score": result.baseline_score,
            "metrics": {
                "precision": result.precision,
                "recall": result.recall,
                "f1_score": result.f1_score,
            },
            "confusion_matrix": {
                "true_positives": result.true_positives,
                "false_positives": result.false_positives,
                "true_negatives": result.true_negatives,
                "false_negatives": result.false_negatives,
            },
            "config_id": result.config_id,
            "generated_at": datetime.utcnow().isoformat(),
        }

        config_file = self._results_dir / "best_configuration.json"
        with open(config_file, "w") as f:
            json.dump(config, f, indent=2)

        logger.info(f"Best configuration saved: {config_file}")
        return config_file

    def save_final_results(
        self,
        top_results: List[OptimizationResult],
        state: ConvergenceState,
    ) -> Path:
        """
        Save final optimization results.

        Args:
            top_results: Top N results
            state: Final convergence state

        Returns:
            Path to results file
        """
        results = {
            "run_id": self._run_id,
            "timestamp": datetime.utcnow().isoformat(),
            "convergence": {
                "is_converged": state.is_converged,
                "reason": state.reason,
                "iterations_completed": state.iterations_completed,
                "best_f1": state.best_f1,
            },
            "top_results": [
                {
                    "config_id": r.config_id,
                    "threshold": r.threshold,
                    "prompt_version": r.prompt_version,
                    "f1_score": r.f1_score,
                    "precision": r.precision,
                    "recall": r.recall,
                }
                for r in top_results
            ],
            "all_results": self._all_results,
        }

        results_file = self._results_dir / f"optimization_results_{self._run_id}.json"
        with open(results_file, "w") as f:
            json.dump(results, f, indent=2)

        logger.info(f"Final results saved: {results_file}")
        return results_file

    def generate_html_report(
        self,
        top_results: List[OptimizationResult],
        state: ConvergenceState,
        best_result: Optional[OptimizationResult] = None,
    ) -> Optional[Path]:
        """
        Generate HTML report of optimization.

        Args:
            top_results: Top N results
            state: Final convergence state
            best_result: Best result found

        Returns:
            Path to HTML report or None
        """
        if not self._generate_html:
            return None

        html = self._build_html_report(top_results, state, best_result)
        report_file = self._reports_dir / f"optimization_report_{self._run_id}.html"

        with open(report_file, "w") as f:
            f.write(html)

        logger.info(f"HTML report generated: {report_file}")
        return report_file

    def _build_html_report(
        self,
        top_results: List[OptimizationResult],
        state: ConvergenceState,
        best_result: Optional[OptimizationResult],
    ) -> str:
        """Build HTML report content."""
        best_section = ""
        if best_result:
            best_section = f"""
            <div class="best-config">
                <h2>Best Configuration</h2>
                <table>
                    <tr><td>Threshold</td><td>{best_result.threshold:.2f}</td></tr>
                    <tr><td>Prompt Version</td><td>{best_result.prompt_version}</td></tr>
                    <tr><td>LLM Weight</td><td>{best_result.llm_weight:.2f}</td></tr>
                    <tr><td>F1 Score</td><td><b>{best_result.f1_score:.4f}</b></td></tr>
                    <tr><td>Precision</td><td>{best_result.precision:.4f}</td></tr>
                    <tr><td>Recall</td><td>{best_result.recall:.4f}</td></tr>
                </table>
            </div>
            """

        rows = "\n".join(
            f"<tr><td>{i+1}</td><td>{r.config_id}</td><td>{r.threshold:.2f}</td>"
            f"<td>{r.prompt_version}</td><td>{r.f1_score:.4f}</td>"
            f"<td>{r.precision:.4f}</td><td>{r.recall:.4f}</td></tr>"
            for i, r in enumerate(top_results)
        )

        return f"""<!DOCTYPE html>
<html><head>
<title>Optimization Report - {self._run_id}</title>
<style>
body {{ font-family: Arial, sans-serif; margin: 20px; }}
h1, h2 {{ color: #333; }}
table {{ border-collapse: collapse; width: 100%; margin: 10px 0; }}
th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
th {{ background: #4CAF50; color: white; }}
tr:nth-child(even) {{ background: #f2f2f2; }}
.best-config {{ background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0; }}
.convergence {{ background: #fff3e0; padding: 15px; border-radius: 5px; margin: 20px 0; }}
</style>
</head><body>
<h1>Continuous Training Optimization Report</h1>
<p>Run ID: {self._run_id}</p>
<p>Generated: {datetime.utcnow().isoformat()} UTC</p>

<div class="convergence">
<h2>Convergence Status</h2>
<p><b>Converged:</b> {state.is_converged}</p>
<p><b>Reason:</b> {state.reason}</p>
<p><b>Iterations:</b> {state.iterations_completed}</p>
<p><b>Best F1:</b> {state.best_f1:.4f}</p>
</div>

{best_section}

<h2>Top Results</h2>
<table>
<tr><th>#</th><th>Config</th><th>Threshold</th><th>Prompt</th>
<th>F1</th><th>Precision</th><th>Recall</th></tr>
{rows}
</table>
</body></html>"""

    def load_checkpoint(self, run_id: str) -> Optional[List[Dict]]:
        """Load checkpoint from previous run."""
        checkpoint_file = self._results_dir / f"checkpoint_{run_id}.json"
        if not checkpoint_file.exists():
            return None

        with open(checkpoint_file, "r") as f:
            data = json.load(f)

        self._all_results = data.get("results", [])
        logger.info(f"Loaded checkpoint: {len(self._all_results)} results")
        return self._all_results
