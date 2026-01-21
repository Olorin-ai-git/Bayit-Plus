import asyncio
import statistics
from typing import List, Tuple


class _VerificationLogStore:
    def __init__(self) -> None:
        self._lock = asyncio.Lock()
        self._passes: int = 0
        self._fails: int = 0
        self._durations_ms: List[float] = []  # rolling window
        self._max_window: int = 2000

    async def record(self, *, added_ms: float, passed: bool) -> None:
        async with self._lock:
            if passed:
                self._passes += 1
            else:
                self._fails += 1
            self._durations_ms.append(float(added_ms))
            if len(self._durations_ms) > self._max_window:
                # Trim oldest to keep window bounded
                over = len(self._durations_ms) - self._max_window
                del self._durations_ms[0:over]

    async def snapshot(self) -> dict:
        async with self._lock:
            total = self._passes + self._fails
            pass_rate = (self._passes / total) if total > 0 else 0.0
            p95 = 0.0
            if self._durations_ms:
                arr = sorted(self._durations_ms)
                idx = int(0.95 * (len(arr) - 1))
                p95 = arr[idx]
            return {
                "total": total,
                "passes": self._passes,
                "fails": self._fails,
                "pass_rate": pass_rate,
                "p95_added_ms": p95,
            }


verification_log_store = _VerificationLogStore()
