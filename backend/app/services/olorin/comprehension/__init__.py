"""Comprehension Mode services (Phase 1 — Foundation & Turn Loop).

Houses the trigger, question generator, scorer, and eval harness for the
comprehension turn loop. Per-service modules land here during Plans 01-02.

DEV/TEST boundary: eval_harness is invoked only from tests/eval/*, never
from a request path.
"""
