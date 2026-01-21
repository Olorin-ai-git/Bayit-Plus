"""
Convergence Detector
Feature: 026-llm-training-pipeline

Detects when training optimization has converged to optimal parameters.
"""

import os
from collections import deque
from dataclasses import dataclass, field
from typing import Deque, List, Optional

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


@dataclass
class OptimizationResult:
    """Result of a single configuration evaluation."""

    config_id: str
    threshold: float
    prompt_version: str
    llm_weight: float
    baseline_score: float
    precision: float
    recall: float
    f1_score: float
    true_positives: int
    false_positives: int
    true_negatives: int
    false_negatives: int
    iteration: int


@dataclass
class ConvergenceState:
    """Current state of convergence detection."""

    is_converged: bool = False
    reason: str = ""
    iterations_completed: int = 0
    best_f1: float = 0.0
    best_config_id: str = ""
    iterations_since_improvement: int = 0
    plateau_detected: bool = False


class ConvergenceDetector:
    """
    Detects when optimization has converged.

    Convergence criteria:
    1. Target F1 exceeded (optional)
    2. Plateau detected (top N within threshold)
    3. No improvement for M iterations
    4. Maximum iterations reached
    """

    def __init__(self):
        """Initialize convergence detector from environment."""
        self._window_size = int(os.getenv("CONTINUOUS_TRAINING_CONVERGENCE_WINDOW", "50"))
        self._improvement_threshold = float(
            os.getenv("CONTINUOUS_TRAINING_IMPROVEMENT_THRESHOLD", "0.001")
        )
        self._min_iterations = int(os.getenv("CONTINUOUS_TRAINING_MIN_ITERATIONS", "100"))
        self._target_f1 = float(os.getenv("CONTINUOUS_TRAINING_TARGET_F1", "0.70"))
        self._max_iterations = int(os.getenv("CONTINUOUS_TRAINING_MAX_ITERATIONS", "2000"))
        self._plateau_top_n = int(os.getenv("CONTINUOUS_TRAINING_PLATEAU_TOP_N", "5"))
        self._plateau_threshold = float(
            os.getenv("CONTINUOUS_TRAINING_PLATEAU_THRESHOLD", "0.01")
        )

        self._recent_results: Deque[OptimizationResult] = deque(maxlen=self._window_size)
        self._all_results: List[OptimizationResult] = []
        self._best_result: Optional[OptimizationResult] = None
        self._iterations_since_improvement = 0
        self._state = ConvergenceState()

    def add_result(self, result: OptimizationResult) -> ConvergenceState:
        """
        Add a new result and check convergence.

        Args:
            result: Optimization result to add

        Returns:
            Updated convergence state
        """
        self._all_results.append(result)
        self._recent_results.append(result)
        self._state.iterations_completed = len(self._all_results)

        if self._best_result is None or result.f1_score > self._best_result.f1_score:
            improvement = result.f1_score - (self._best_result.f1_score if self._best_result else 0)
            if improvement >= self._improvement_threshold:
                self._best_result = result
                self._iterations_since_improvement = 0
                self._state.best_f1 = result.f1_score
                self._state.best_config_id = result.config_id
                logger.info(
                    f"New best F1: {result.f1_score:.4f} (config={result.config_id})"
                )
            else:
                self._iterations_since_improvement += 1
        else:
            self._iterations_since_improvement += 1

        self._state.iterations_since_improvement = self._iterations_since_improvement

        self._check_convergence()

        return self._state

    def _check_convergence(self) -> None:
        """Check all convergence criteria."""
        if self._state.is_converged:
            return

        if self._state.iterations_completed < self._min_iterations:
            return

        if self._check_target_reached():
            return

        if self._check_plateau():
            return

        if self._check_no_improvement():
            return

        if self._check_max_iterations():
            return

    def _check_target_reached(self) -> bool:
        """Check if target F1 has been reached."""
        if self._best_result and self._best_result.f1_score >= self._target_f1:
            self._state.is_converged = True
            self._state.reason = f"Target F1 {self._target_f1:.2f} reached"
            logger.info(f"Convergence: {self._state.reason}")
            return True
        return False

    def _check_plateau(self) -> bool:
        """Check if top N results are within plateau threshold."""
        if len(self._all_results) < self._plateau_top_n:
            return False

        sorted_results = sorted(self._all_results, key=lambda r: r.f1_score, reverse=True)
        top_n = sorted_results[: self._plateau_top_n]

        if len(top_n) < self._plateau_top_n:
            return False

        max_f1 = top_n[0].f1_score
        min_f1 = top_n[-1].f1_score

        if max_f1 > 0 and (max_f1 - min_f1) / max_f1 < self._plateau_threshold:
            self._state.is_converged = True
            self._state.plateau_detected = True
            self._state.reason = f"Plateau: top {self._plateau_top_n} within {self._plateau_threshold:.1%}"
            logger.info(f"Convergence: {self._state.reason}")
            return True

        return False

    def _check_no_improvement(self) -> bool:
        """Check if no improvement for window size iterations."""
        if self._iterations_since_improvement >= self._window_size:
            self._state.is_converged = True
            self._state.reason = f"No improvement for {self._window_size} iterations"
            logger.info(f"Convergence: {self._state.reason}")
            return True
        return False

    def _check_max_iterations(self) -> bool:
        """Check if maximum iterations reached."""
        if self._state.iterations_completed >= self._max_iterations:
            self._state.is_converged = True
            self._state.reason = f"Max iterations ({self._max_iterations}) reached"
            logger.info(f"Convergence: {self._state.reason}")
            return True
        return False

    def get_best_result(self) -> Optional[OptimizationResult]:
        """Get the best result found so far."""
        return self._best_result

    def get_top_results(self, n: int = 10) -> List[OptimizationResult]:
        """Get top N results by F1 score."""
        sorted_results = sorted(self._all_results, key=lambda r: r.f1_score, reverse=True)
        return sorted_results[:n]

    def get_state(self) -> ConvergenceState:
        """Get current convergence state."""
        return self._state

    def reset(self) -> None:
        """Reset detector state."""
        self._recent_results.clear()
        self._all_results.clear()
        self._best_result = None
        self._iterations_since_improvement = 0
        self._state = ConvergenceState()
