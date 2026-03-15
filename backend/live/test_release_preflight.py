from __future__ import annotations

import json
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import SimpleTestCase, override_settings

from live.release_preflight import STATUS_FAIL, STATUS_PASS, STATUS_WARN, build_release_preflight_report


class ReleasePreflightTests(SimpleTestCase):
    @override_settings(
        SECRET_KEY="prod-secret-key-with-32-characters!!",
        DEBUG=False,
        ALLOWED_HOSTS=["example.com"],
        CSRF_TRUSTED_ORIGINS=["https://example.com"],
        AGORA_APP_ID="agora-app-id",
        AGORA_APP_CERTIFICATE="agora-app-certificate",
        LIVEKIT_URL="wss://live.example.com",
        LIVEKIT_API_KEY="livekit-prod-key",
        LIVEKIT_API_SECRET="livekit-prod-secret-value",
        FACE_ATTENDANCE_MIN_SAMPLES=6,
        FACE_ATTENDANCE_PRESENT_RATIO=0.70,
        LIVE_ATTENDANCE_MIN_DURATION_RATIO=0.75,
        LIVE_PARTICIPANT_STALE_SECONDS=30,
    )
    @patch("live.release_preflight.get_pending_migration_names", return_value=[])
    def test_report_passes_with_production_like_settings(self, mocked_pending) -> None:
        report = build_release_preflight_report()

        self.assertEqual(report["overall_status"], STATUS_PASS)
        self.assertEqual(report["counts"][STATUS_FAIL], 0)
        self.assertEqual(report["counts"][STATUS_WARN], 0)
        self.assertEqual(len(report["checks"]), 6)
        mocked_pending.assert_called_once()

    @override_settings(
        SECRET_KEY="prod-secret-key-with-32-characters!!",
        DEBUG=True,
        ALLOWED_HOSTS=["example.com"],
        CSRF_TRUSTED_ORIGINS=["https://example.com"],
        AGORA_APP_ID="agora-app-id",
        AGORA_APP_CERTIFICATE="agora-app-certificate",
        LIVEKIT_URL="ws://127.0.0.1:7880",
        LIVEKIT_API_KEY="devkey",
        LIVEKIT_API_SECRET="devsecret_very_long_32_chars_minimum",
        FACE_ATTENDANCE_MIN_SAMPLES=3,
        FACE_ATTENDANCE_PRESENT_RATIO=0.50,
        LIVE_ATTENDANCE_MIN_DURATION_RATIO=0.70,
        LIVE_PARTICIPANT_STALE_SECONDS=30,
    )
    @patch("live.release_preflight.get_pending_migration_names", return_value=[])
    def test_report_warns_for_debug_and_soft_thresholds(self, mocked_pending) -> None:
        report = build_release_preflight_report()
        status_by_key = {check["key"]: check["status"] for check in report["checks"]}

        self.assertEqual(report["overall_status"], STATUS_WARN)
        self.assertEqual(report["counts"][STATUS_FAIL], 0)
        self.assertGreaterEqual(report["counts"][STATUS_WARN], 3)
        self.assertEqual(status_by_key["runtime"], STATUS_WARN)
        self.assertEqual(status_by_key["livekit"], STATUS_WARN)
        self.assertEqual(status_by_key["attendance_thresholds"], STATUS_WARN)
        mocked_pending.assert_called_once()

    @override_settings(
        SECRET_KEY="django-insecure-test-key",
        DEBUG=False,
        ALLOWED_HOSTS=["example.com"],
        CSRF_TRUSTED_ORIGINS=["https://example.com"],
        AGORA_APP_ID="",
        AGORA_APP_CERTIFICATE="",
        LIVEKIT_URL="wss://live.example.com",
        LIVEKIT_API_KEY="livekit-prod-key",
        LIVEKIT_API_SECRET="livekit-prod-secret-value",
        FACE_ATTENDANCE_MIN_SAMPLES=6,
        FACE_ATTENDANCE_PRESENT_RATIO=0.70,
        LIVE_ATTENDANCE_MIN_DURATION_RATIO=0.75,
        LIVE_PARTICIPANT_STALE_SECONDS=30,
    )
    @patch("live.release_preflight.get_pending_migration_names", return_value=["attendance.0006_manual_override"])
    def test_report_fails_for_pending_migrations_and_missing_agora(self, mocked_pending) -> None:
        report = build_release_preflight_report()
        status_by_key = {check["key"]: check["status"] for check in report["checks"]}

        self.assertEqual(report["overall_status"], STATUS_FAIL)
        self.assertGreaterEqual(report["counts"][STATUS_FAIL], 3)
        self.assertEqual(status_by_key["pending_migrations"], STATUS_FAIL)
        self.assertEqual(status_by_key["secret_key"], STATUS_FAIL)
        self.assertEqual(status_by_key["agora"], STATUS_FAIL)
        mocked_pending.assert_called_once()

    @override_settings(
        SECRET_KEY="prod-secret-key-with-32-characters!!",
        DEBUG=False,
        ALLOWED_HOSTS=["example.com"],
        CSRF_TRUSTED_ORIGINS=["https://example.com"],
        AGORA_APP_ID="agora-app-id",
        AGORA_APP_CERTIFICATE="agora-app-certificate",
        LIVEKIT_URL="wss://live.example.com",
        LIVEKIT_API_KEY="livekit-prod-key",
        LIVEKIT_API_SECRET="livekit-prod-secret-value",
        FACE_ATTENDANCE_MIN_SAMPLES=6,
        FACE_ATTENDANCE_PRESENT_RATIO=0.70,
        LIVE_ATTENDANCE_MIN_DURATION_RATIO=0.75,
        LIVE_PARTICIPANT_STALE_SECONDS=30,
    )
    @patch("live.release_preflight.get_pending_migration_names", return_value=[])
    def test_command_can_emit_json_report(self, mocked_pending) -> None:
        output = StringIO()

        call_command("release_preflight", "--json", stdout=output)
        payload = json.loads(output.getvalue())

        self.assertEqual(payload["overall_status"], STATUS_PASS)
        self.assertEqual(payload["counts"][STATUS_FAIL], 0)
        mocked_pending.assert_called_once()
