import { describe, expect, it, vi } from "vitest";

import {
  ADMIN_INVALIDATION_GROUPS,
  ADMIN_QUERY_KEYS,
  getAdminApiErrorMessage,
  invalidateAdminQueries,
} from "./adminWorkflowMutations";

describe("adminWorkflowMutations", () => {
  it("extracts preferred API field errors before detail fallback", () => {
    const error = {
      response: {
        data: {
          group_ids: ["Group tanlang"],
          detail: "Fallback detail",
        },
      },
    };

    expect(getAdminApiErrorMessage(error, ["group_ids"], "Unknown error")).toBe("Group tanlang");
    expect(getAdminApiErrorMessage({ response: { data: { detail: "Only detail" } } }, [], "Unknown error")).toBe(
      "Only detail",
    );
    expect(getAdminApiErrorMessage({}, ["group_ids"], "Unknown error")).toBe("Unknown error");
  });

  it("invalidates each configured query key", async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);

    await invalidateAdminQueries(
      { invalidateQueries } as any,
      ADMIN_INVALIDATION_GROUPS.roleChange,
    );

    expect(invalidateQueries).toHaveBeenCalledTimes(5);
    expect(invalidateQueries).toHaveBeenNthCalledWith(1, { queryKey: ADMIN_QUERY_KEYS.users });
    expect(invalidateQueries).toHaveBeenNthCalledWith(5, { queryKey: ADMIN_QUERY_KEYS.teacherSubjects });
  });
});
