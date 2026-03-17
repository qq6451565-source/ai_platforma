import { describe, expect, it } from "vitest";

import {
  clearRequestedUserIdSearch,
  getRequestedUserId,
  updateAdminHubSearch,
} from "./workflowRouting";

describe("workflowRouting", () => {
  it("reads valid requested user ids and rejects invalid values", () => {
    expect(getRequestedUserId("?tab=student-placement&userId=42")).toBe(42);
    expect(getRequestedUserId("?userId=0")).toBeNull();
    expect(getRequestedUserId("?userId=abc")).toBeNull();
    expect(getRequestedUserId("")).toBeNull();
  });

  it("updates workflow search params without dropping existing values", () => {
    const next = updateAdminHubSearch("?tab=users&role=student", {
      tab: "teacher-workload",
      userId: 17,
    });

    expect(next).toBe("?tab=teacher-workload&role=student&userId=17");
  });

  it("clears contextual params when requested", () => {
    expect(clearRequestedUserIdSearch("?tab=student-placement&userId=99")).toBe(
      "?tab=student-placement",
    );
    expect(updateAdminHubSearch("?tab=users&role=teacher&userId=7", { role: null })).toBe(
      "?tab=users&userId=7",
    );
  });
});
