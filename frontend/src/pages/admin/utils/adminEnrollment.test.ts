import { describe, expect, it } from "vitest";

import type { EnrollmentAiSummary, EnrollmentItem } from "../../../api/admin";
import {
  formatEnrollmentConfidence,
  getBlockedEnrollmentActionItems,
  getEnrollmentAiAlertType,
  getEnrollmentStatusMeta,
} from "./adminEnrollment";

const baseAiSummary: EnrollmentAiSummary = {
  status: "verified",
  label: "Verified",
  color: "green",
  message: "OK",
  confidence: 0.93,
  threshold: 0.8,
  checked_at: "2026-03-10T10:00:00Z",
  manual_review_required: false,
  face_embedding_ready: true,
  event_summary: [],
};

describe("adminEnrollment utils", () => {
  it("returns status metadata and confidence formatting", () => {
    expect(getEnrollmentStatusMeta("approved")).toEqual({
      color: "green",
      label: "Tasdiqlangan",
    });
    expect(formatEnrollmentConfidence(0.9123)).toBe("0.912");
    expect(formatEnrollmentConfidence(null)).toBe("-");
  });

  it("builds blocked action items from fallback rules", () => {
    const item = {
      id: 1,
      full_name: "Ali Valiyev",
      status: "approved",
      ai_summary: baseAiSummary,
    } as EnrollmentItem;

    const blocked = getBlockedEnrollmentActionItems(item);

    expect(blocked.map((entry) => entry.key)).toEqual([
      "can_edit",
      "can_delete",
      "can_approve",
      "can_reject",
      "can_reverify",
    ]);
  });

  it("maps AI status to alert type", () => {
    expect(getEnrollmentAiAlertType(baseAiSummary)).toBe("success");
    expect(
      getEnrollmentAiAlertType({
        ...baseAiSummary,
        status: "unavailable",
      }),
    ).toBe("warning");
    expect(
      getEnrollmentAiAlertType({
        ...baseAiSummary,
        status: "not_verified",
      }),
    ).toBe("error");
  });
});
