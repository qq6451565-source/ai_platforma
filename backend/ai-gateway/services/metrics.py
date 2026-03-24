"""
Thread-safe metrics collection for AI Gateway.
"""

import threading
import time
from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, Optional


@dataclass
class EndpointMetrics:
    request_count: int = 0
    error_count: int = 0
    total_duration_ms: float = 0.0
    success_count: int = 0


class MetricsCollector:
    """Thread-safe metrics collector for API Gateway."""

    def __init__(self):
        self._lock = threading.Lock()
        self._start_time = time.time()
        self._total_requests = 0
        self._total_errors = 0
        self._total_duration_ms = 0.0
        self._auth_failures = 0
        self._face_match_successes = 0
        self._face_match_total = 0
        self._ocr_total = 0
        self._ocr_successes = 0
        self._endpoints: Dict[str, EndpointMetrics] = defaultdict(EndpointMetrics)

    def record_request(
        self,
        endpoint: str,
        duration_ms: float,
        success: bool,
        is_auth_failure: bool = False,
    ) -> None:
        with self._lock:
            self._total_requests += 1
            self._total_duration_ms += duration_ms
            if not success:
                self._total_errors += 1
            if is_auth_failure:
                self._auth_failures += 1

            ep = self._endpoints[endpoint]
            ep.request_count += 1
            ep.total_duration_ms += duration_ms
            if success:
                ep.success_count += 1
            else:
                ep.error_count += 1

    def record_face_match(self, verified: bool) -> None:
        with self._lock:
            self._face_match_total += 1
            if verified:
                self._face_match_successes += 1

    def record_ocr(self, success: bool) -> None:
        with self._lock:
            self._ocr_total += 1
            if success:
                self._ocr_successes += 1

    def get_snapshot(self) -> dict:
        with self._lock:
            uptime = time.time() - self._start_time
            avg_ms = (
                self._total_duration_ms / self._total_requests
                if self._total_requests > 0
                else 0.0
            )
            face_rate = (
                self._face_match_successes / self._face_match_total
                if self._face_match_total > 0
                else None
            )
            ocr_rate = (
                self._ocr_successes / self._ocr_total
                if self._ocr_total > 0
                else None
            )
            endpoint_stats = {}
            for name, ep in self._endpoints.items():
                ep_avg = (
                    ep.total_duration_ms / ep.request_count
                    if ep.request_count > 0
                    else 0.0
                )
                endpoint_stats[name] = {
                    "request_count": ep.request_count,
                    "error_count": ep.error_count,
                    "success_count": ep.success_count,
                    "avg_duration_ms": round(ep_avg, 2),
                }
            return {
                "uptime_seconds": round(uptime, 1),
                "total_requests": self._total_requests,
                "total_errors": self._total_errors,
                "avg_response_time_ms": round(avg_ms, 2),
                "auth_failures": self._auth_failures,
                "face_match": {
                    "total": self._face_match_total,
                    "successes": self._face_match_successes,
                    "success_rate": round(face_rate, 4) if face_rate is not None else None,
                },
                "ocr": {
                    "total": self._ocr_total,
                    "successes": self._ocr_successes,
                    "success_rate": round(ocr_rate, 4) if ocr_rate is not None else None,
                },
                "endpoints": endpoint_stats,
            }


# Singleton instance shared across the app
metrics = MetricsCollector()
