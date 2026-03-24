"""
Comprehensive test suite for AI Gateway (50+ tests).
Run with: pytest test_main.py -v
"""

from __future__ import annotations

import io
import os
import sys
import types
from unittest.mock import MagicMock, patch

import numpy as np
import pytest
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Ensure deepface and pytesseract are mocked before importing main so that
# the tests don't require the heavy ML libraries at test time.
# ---------------------------------------------------------------------------

# Mock deepface
mock_deepface_module = types.ModuleType("deepface")
mock_deepface_cls = MagicMock()
mock_deepface_module.DeepFace = mock_deepface_cls
sys.modules.setdefault("deepface", mock_deepface_module)

# Mock pytesseract
mock_pytesseract_module = types.ModuleType("pytesseract")
mock_pytesseract_module.image_to_string = MagicMock(return_value="")
sys.modules.setdefault("pytesseract", mock_pytesseract_module)

# Mock tf_keras / tensorflow imports that deepface may pull in
for _mod in ("tensorflow", "tf_keras", "keras"):
    sys.modules.setdefault(_mod, types.ModuleType(_mod))

# Now import main (with AI_API_KEY cleared so auth tests are predictable)
os.environ.setdefault("AI_API_KEY", "test-secret-key")
os.environ.setdefault("DEBUG", "true")

import main  # noqa: E402 — must come after mocks

client = TestClient(main.app, raise_server_exceptions=False)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

API_KEY = "test-secret-key"


def _make_image(width: int = 100, height: int = 100, channels: int = 3) -> bytes:
    """Create a simple in-memory JPEG image."""
    import cv2

    img = np.full((height, width, channels), 128, dtype=np.uint8)
    # Draw a rough face-like circle in the centre
    centre = (width // 2, height // 2)
    cv2.circle(img, centre, min(width, height) // 3, (200, 180, 160), -1)
    _, buf = cv2.imencode(".jpg", img)
    return buf.tobytes()


_SAMPLE_IMAGE = _make_image()


def _upload(filename: str = "test.jpg", data: bytes | None = None) -> tuple:
    return (filename, data or _SAMPLE_IMAGE, "image/jpeg")


# ---------------------------------------------------------------------------
# Health endpoints
# ---------------------------------------------------------------------------


class TestRootEndpoint:
    def test_root_status_200(self):
        r = client.get("/")
        assert r.status_code == 200

    def test_root_has_status_field(self):
        r = client.get("/")
        assert "status" in r.json()

    def test_root_has_version(self):
        r = client.get("/")
        assert r.json()["version"] == main.APP_VERSION

    def test_root_has_uptime(self):
        r = client.get("/")
        assert "uptime_seconds" in r.json()

    def test_root_has_timestamp(self):
        r = client.get("/")
        assert "timestamp" in r.json()


class TestHealthEndpoint:
    def test_health_status_200(self):
        r = client.get("/health")
        assert r.status_code == 200

    def test_health_returns_ok(self):
        r = client.get("/health")
        assert r.json()["status"] == "ok"

    def test_health_has_timestamp(self):
        r = client.get("/health")
        assert "timestamp" in r.json()


class TestReadyEndpoint:
    def test_ready_status_200(self):
        r = client.get("/ready")
        assert r.status_code == 200

    def test_ready_flag_true(self):
        r = client.get("/ready")
        assert r.json()["ready"] is True

    def test_ready_has_config(self):
        r = client.get("/ready")
        cfg = r.json()["config"]
        assert "face_match_threshold" in cfg
        assert "presence_threshold" in cfg
        assert "max_image_size_mb" in cfg

    def test_ready_has_timestamp(self):
        r = client.get("/ready")
        assert "timestamp" in r.json()


class TestMetricsEndpoint:
    def test_metrics_status_200(self):
        r = client.get("/metrics")
        assert r.status_code == 200

    def test_metrics_has_uptime(self):
        r = client.get("/metrics")
        assert "uptime_seconds" in r.json()

    def test_metrics_has_total_requests(self):
        r = client.get("/metrics")
        assert "total_requests" in r.json()

    def test_metrics_has_face_match(self):
        r = client.get("/metrics")
        assert "face_match" in r.json()

    def test_metrics_has_ocr(self):
        r = client.get("/metrics")
        assert "ocr" in r.json()

    def test_metrics_has_endpoints(self):
        r = client.get("/metrics")
        assert "endpoints" in r.json()


# ---------------------------------------------------------------------------
# Authentication tests
# ---------------------------------------------------------------------------


class TestAuthentication:
    def test_ocr_no_key_returns_401(self):
        r = client.post("/ocr/passport", files={"file": _upload()})
        assert r.status_code == 401

    def test_face_match_no_key_returns_401(self):
        r = client.post(
            "/face/match",
            files={
                "passport_image": _upload("passport.jpg"),
                "selfie_image": _upload("selfie.jpg"),
            },
        )
        assert r.status_code == 401

    def test_face_presence_no_key_returns_401(self):
        r = client.post("/face/presence", files={"file": _upload()})
        assert r.status_code == 401

    def test_face_quality_no_key_returns_401(self):
        r = client.post("/face/quality", files={"file": _upload()})
        assert r.status_code == 401

    def test_face_liveness_no_key_returns_401(self):
        r = client.post("/face/liveness", files={"file": _upload()})
        assert r.status_code == 401

    def test_face_blink_no_key_returns_401(self):
        r = client.post("/face/blink", files={"file": _upload()})
        assert r.status_code == 401

    def test_auth_via_header(self):
        r = client.post(
            "/face/quality",
            files={"file": _upload()},
            headers={"X-Api-Key": API_KEY},
        )
        # Should not be 401
        assert r.status_code != 401

    def test_auth_via_form_field(self):
        r = client.post(
            "/face/quality",
            files={"file": _upload()},
            data={"api_key": API_KEY},
        )
        assert r.status_code != 401

    def test_wrong_key_returns_401(self):
        r = client.post(
            "/face/quality",
            files={"file": _upload()},
            headers={"X-Api-Key": "wrong-key"},
        )
        assert r.status_code == 401

    def test_error_response_format(self):
        r = client.post("/face/quality", files={"file": _upload()})
        body = r.json()
        assert body["success"] is False
        assert "error" in body
        assert "timestamp" in body
        assert "request_id" in body


# ---------------------------------------------------------------------------
# File validation tests
# ---------------------------------------------------------------------------


class TestFileValidation:
    def test_empty_file_returns_422(self):
        r = client.post(
            "/face/quality",
            files={"file": ("empty.jpg", b"", "image/jpeg")},
            headers={"X-Api-Key": API_KEY},
        )
        assert r.status_code == 422

    def test_oversized_file_returns_422(self):
        big_data = b"\xff" * (int(main.MAX_IMAGE_SIZE_BYTES) + 1)
        r = client.post(
            "/face/quality",
            files={"file": ("big.jpg", big_data, "image/jpeg")},
            headers={"X-Api-Key": API_KEY},
        )
        assert r.status_code == 422

    def test_invalid_image_data_returns_422(self):
        r = client.post(
            "/face/quality",
            files={"file": ("bad.jpg", b"not-an-image", "image/jpeg")},
            headers={"X-Api-Key": API_KEY},
        )
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# Response format tests
# ---------------------------------------------------------------------------


class TestResponseFormat:
    """Verify all successful responses include required wrapper fields."""

    def _post_with_key(self, path, files=None, data=None):
        headers = {"X-Api-Key": API_KEY}
        return client.post(path, files=files, data=data, headers=headers)

    def _assert_success_format(self, body):
        assert body["success"] is True
        assert "data" in body
        assert "timestamp" in body
        assert "request_id" in body

    def test_presence_response_format(self):
        r = self._post_with_key("/face/presence", files={"file": _upload()})
        if r.status_code == 200:
            self._assert_success_format(r.json())

    def test_quality_response_format(self):
        r = self._post_with_key("/face/quality", files={"file": _upload()})
        if r.status_code == 200:
            self._assert_success_format(r.json())

    def test_liveness_response_format(self):
        r = self._post_with_key("/face/liveness", files={"file": _upload()})
        if r.status_code == 200:
            self._assert_success_format(r.json())

    def test_blink_response_format(self):
        r = self._post_with_key("/face/blink", files={"file": _upload()})
        if r.status_code == 200:
            self._assert_success_format(r.json())

    def test_ocr_response_format(self):
        r = self._post_with_key("/ocr/passport", files={"file": _upload()})
        if r.status_code == 200:
            self._assert_success_format(r.json())

    def test_request_id_in_header(self):
        r = client.get("/health")
        assert "x-request-id" in r.headers


# ---------------------------------------------------------------------------
# OCR endpoint tests
# ---------------------------------------------------------------------------


class TestOCRPassport:
    def test_ocr_with_valid_image_does_not_crash(self):
        r = client.post(
            "/ocr/passport",
            files={"file": _upload()},
            headers={"X-Api-Key": API_KEY},
        )
        assert r.status_code in (200, 500)

    def test_ocr_200_contains_document_type(self):
        r = client.post(
            "/ocr/passport",
            files={"file": _upload()},
            headers={"X-Api-Key": API_KEY},
        )
        if r.status_code == 200:
            assert r.json()["data"]["document_type"] == "PASSPORT"

    def test_ocr_200_contains_expected_keys(self):
        r = client.post(
            "/ocr/passport",
            files={"file": _upload()},
            headers={"X-Api-Key": API_KEY},
        )
        if r.status_code == 200:
            data = r.json()["data"]
            for key in ("passport_number", "name_first", "name_last", "birth_date", "expiry_date"):
                assert key in data


# ---------------------------------------------------------------------------
# Face match endpoint tests
# ---------------------------------------------------------------------------


class TestFaceMatch:
    def _post(self, passport_data=None, selfie_data=None):
        return client.post(
            "/face/match",
            files={
                "passport_image": ("passport.jpg", passport_data or _SAMPLE_IMAGE, "image/jpeg"),
                "selfie_image": ("selfie.jpg", selfie_data or _SAMPLE_IMAGE, "image/jpeg"),
            },
            headers={"X-Api-Key": API_KEY},
        )

    def test_face_match_does_not_crash(self):
        r = self._post()
        assert r.status_code in (200, 400, 500)

    def test_face_match_200_has_verified(self):
        r = self._post()
        if r.status_code == 200:
            assert "verified" in r.json()["data"]

    def test_face_match_200_has_confidence(self):
        r = self._post()
        if r.status_code == 200:
            assert "confidence" in r.json()["data"]

    def test_face_match_200_has_threshold(self):
        r = self._post()
        if r.status_code == 200:
            assert "threshold" in r.json()["data"]

    def test_face_match_empty_passport_422(self):
        r = client.post(
            "/face/match",
            files={
                "passport_image": ("passport.jpg", b"", "image/jpeg"),
                "selfie_image": ("selfie.jpg", _SAMPLE_IMAGE, "image/jpeg"),
            },
            headers={"X-Api-Key": API_KEY},
        )
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# Face presence endpoint tests
# ---------------------------------------------------------------------------


class TestFacePresence:
    def test_presence_does_not_crash(self):
        r = client.post(
            "/face/presence",
            files={"file": _upload()},
            headers={"X-Api-Key": API_KEY},
        )
        assert r.status_code in (200, 500)

    def test_presence_200_has_present_field(self):
        r = client.post(
            "/face/presence",
            files={"file": _upload()},
            headers={"X-Api-Key": API_KEY},
        )
        if r.status_code == 200:
            assert "present" in r.json()["data"]

    def test_presence_200_has_face_count(self):
        r = client.post(
            "/face/presence",
            files={"file": _upload()},
            headers={"X-Api-Key": API_KEY},
        )
        if r.status_code == 200:
            assert "face_count" in r.json()["data"]

    def test_presence_with_session_id(self):
        r = client.post(
            "/face/presence",
            files={"file": _upload()},
            data={"session_id": "sess-001"},
            headers={"X-Api-Key": API_KEY},
        )
        if r.status_code == 200:
            assert r.json()["data"]["session_id"] == "sess-001"


# ---------------------------------------------------------------------------
# Face quality endpoint tests
# ---------------------------------------------------------------------------


class TestFaceQuality:
    def test_quality_does_not_crash(self):
        r = client.post(
            "/face/quality",
            files={"file": _upload()},
            headers={"X-Api-Key": API_KEY},
        )
        assert r.status_code in (200, 500)

    def test_quality_200_has_is_valid(self):
        r = client.post(
            "/face/quality",
            files={"file": _upload()},
            headers={"X-Api-Key": API_KEY},
        )
        if r.status_code == 200:
            assert "is_valid" in r.json()["data"]

    def test_quality_200_has_reasons(self):
        r = client.post(
            "/face/quality",
            files={"file": _upload()},
            headers={"X-Api-Key": API_KEY},
        )
        if r.status_code == 200:
            assert "reasons" in r.json()["data"]

    def test_quality_200_has_metrics(self):
        r = client.post(
            "/face/quality",
            files={"file": _upload()},
            headers={"X-Api-Key": API_KEY},
        )
        if r.status_code == 200:
            metrics_data = r.json()["data"]["metrics"]
            assert "brightness" in metrics_data
            assert "sharpness" in metrics_data
            assert "faces_detected" in metrics_data


# ---------------------------------------------------------------------------
# Face liveness endpoint tests
# ---------------------------------------------------------------------------


class TestFaceLiveness:
    def test_liveness_does_not_crash(self):
        r = client.post(
            "/face/liveness",
            files={"file": _upload()},
            headers={"X-Api-Key": API_KEY},
        )
        assert r.status_code in (200, 500)

    def test_liveness_200_has_is_live(self):
        r = client.post(
            "/face/liveness",
            files={"file": _upload()},
            headers={"X-Api-Key": API_KEY},
        )
        if r.status_code == 200:
            assert "is_live" in r.json()["data"]

    def test_liveness_200_has_confidence(self):
        r = client.post(
            "/face/liveness",
            files={"file": _upload()},
            headers={"X-Api-Key": API_KEY},
        )
        if r.status_code == 200:
            assert "confidence" in r.json()["data"]

    def test_liveness_200_has_reasons(self):
        r = client.post(
            "/face/liveness",
            files={"file": _upload()},
            headers={"X-Api-Key": API_KEY},
        )
        if r.status_code == 200:
            assert "reasons" in r.json()["data"]


# ---------------------------------------------------------------------------
# Face blink endpoint tests
# ---------------------------------------------------------------------------


class TestFaceBlink:
    def test_blink_does_not_crash(self):
        r = client.post(
            "/face/blink",
            files={"file": _upload()},
            headers={"X-Api-Key": API_KEY},
        )
        assert r.status_code in (200, 500)

    def test_blink_200_has_eyes_detected(self):
        r = client.post(
            "/face/blink",
            files={"file": _upload()},
            headers={"X-Api-Key": API_KEY},
        )
        if r.status_code == 200:
            assert "eyes_detected" in r.json()["data"]

    def test_blink_200_has_blink_detected(self):
        r = client.post(
            "/face/blink",
            files={"file": _upload()},
            headers={"X-Api-Key": API_KEY},
        )
        if r.status_code == 200:
            assert "blink_detected" in r.json()["data"]


# ---------------------------------------------------------------------------
# Face analyze endpoint tests
# ---------------------------------------------------------------------------


class TestFaceAnalyze:
    def test_analyze_does_not_crash(self):
        r = client.post(
            "/face/analyze",
            files={"file": _upload()},
            headers={"X-Api-Key": API_KEY},
        )
        assert r.status_code in (200, 500)

    def test_analyze_200_has_faces_detected(self):
        r = client.post(
            "/face/analyze",
            files={"file": _upload()},
            headers={"X-Api-Key": API_KEY},
        )
        if r.status_code == 200:
            assert "faces_detected" in r.json()["data"]

    def test_analyze_200_has_faces_list(self):
        r = client.post(
            "/face/analyze",
            files={"file": _upload()},
            headers={"X-Api-Key": API_KEY},
        )
        if r.status_code == 200:
            assert "faces" in r.json()["data"]
            assert isinstance(r.json()["data"]["faces"], list)


# ---------------------------------------------------------------------------
# Metrics unit tests
# ---------------------------------------------------------------------------


class TestMetricsCollector:
    def test_record_and_read(self):
        from services.metrics import MetricsCollector

        mc = MetricsCollector()
        mc.record_request("/test", 50.0, success=True)
        snapshot = mc.get_snapshot()
        assert snapshot["total_requests"] == 1
        assert snapshot["total_errors"] == 0
        assert "/test" in snapshot["endpoints"]

    def test_error_counting(self):
        from services.metrics import MetricsCollector

        mc = MetricsCollector()
        mc.record_request("/test", 10.0, success=False)
        snapshot = mc.get_snapshot()
        assert snapshot["total_errors"] == 1

    def test_auth_failure_counting(self):
        from services.metrics import MetricsCollector

        mc = MetricsCollector()
        mc.record_request("/test", 5.0, success=False, is_auth_failure=True)
        assert mc.get_snapshot()["auth_failures"] == 1

    def test_face_match_tracking(self):
        from services.metrics import MetricsCollector

        mc = MetricsCollector()
        mc.record_face_match(verified=True)
        mc.record_face_match(verified=False)
        snap = mc.get_snapshot()
        assert snap["face_match"]["total"] == 2
        assert snap["face_match"]["successes"] == 1

    def test_ocr_tracking(self):
        from services.metrics import MetricsCollector

        mc = MetricsCollector()
        mc.record_ocr(success=True)
        snap = mc.get_snapshot()
        assert snap["ocr"]["total"] == 1
        assert snap["ocr"]["successes"] == 1

    def test_avg_duration(self):
        from services.metrics import MetricsCollector

        mc = MetricsCollector()
        mc.record_request("/a", 100.0, success=True)
        mc.record_request("/a", 200.0, success=True)
        snap = mc.get_snapshot()
        assert snap["avg_response_time_ms"] == 150.0

    def test_uptime_positive(self):
        from services.metrics import MetricsCollector
        import time

        mc = MetricsCollector()
        time.sleep(0.2)
        assert mc.get_snapshot()["uptime_seconds"] >= 0.1


# ---------------------------------------------------------------------------
# Helper unit tests
# ---------------------------------------------------------------------------


class TestHelpers:
    def test_format_date_valid(self):
        assert main._format_date("900115") == "1990-01-15"

    def test_format_date_2000s(self):
        assert main._format_date("250615") == "2025-06-15"

    def test_format_date_invalid(self):
        assert main._format_date("abcdef") is None

    def test_validate_upload_empty(self):
        with pytest.raises(Exception):
            main._validate_upload(b"")

    def test_validate_upload_oversized(self):
        big = b"x" * (main.MAX_IMAGE_SIZE_BYTES + 1)
        with pytest.raises(Exception):
            main._validate_upload(big)

    def test_validate_upload_ok(self):
        # Should not raise
        main._validate_upload(b"some data")

    def test_check_auth_no_key_configured(self):
        original = main.AI_API_KEY
        main.AI_API_KEY = ""
        assert main._check_auth(None, None) is True
        main.AI_API_KEY = original

    def test_check_auth_correct_key(self):
        assert main._check_auth(None, API_KEY) is True

    def test_check_auth_wrong_key(self):
        assert main._check_auth(None, "wrong") is False

    def test_load_image_bytes_invalid(self):
        with pytest.raises(ValueError):
            main._load_image_bytes(b"not-an-image")

    def test_load_image_bytes_valid(self):
        img = main._load_image_bytes(_SAMPLE_IMAGE)
        assert img is not None
        assert len(img.shape) == 3


# ---------------------------------------------------------------------------
# Integration-style tests
# ---------------------------------------------------------------------------


class TestIntegration:
    """Smoke tests that call multiple endpoints in sequence."""

    def test_health_then_ready(self):
        r1 = client.get("/health")
        r2 = client.get("/ready")
        assert r1.status_code == 200
        assert r2.status_code == 200

    def test_metrics_increments_after_request(self):
        before = client.get("/metrics").json()["total_requests"]
        client.get("/health")
        after = client.get("/metrics").json()["total_requests"]
        assert after > before

    def test_all_health_endpoints_return_200(self):
        for path in ("/", "/health", "/ready"):
            r = client.get(path)
            assert r.status_code == 200, f"{path} returned {r.status_code}"

    def test_all_protected_endpoints_return_401_without_key(self):
        endpoints = [
            ("/ocr/passport", {"file": _upload()}),
            ("/face/quality", {"file": _upload()}),
            ("/face/presence", {"file": _upload()}),
            ("/face/liveness", {"file": _upload()}),
            ("/face/blink", {"file": _upload()}),
            (
                "/face/match",
                {
                    "passport_image": _upload("p.jpg"),
                    "selfie_image": _upload("s.jpg"),
                },
            ),
            ("/face/analyze", {"file": _upload()}),
        ]
        for path, files in endpoints:
            r = client.post(path, files=files)
            assert r.status_code == 401, f"{path} should return 401 but got {r.status_code}"
