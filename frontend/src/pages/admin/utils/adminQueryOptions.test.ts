import { describe, expect, it } from "vitest";

import { adminQueryOptions } from "./adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./adminWorkflowMutations";

describe("adminQueryOptions", () => {
  it("uses shared keys for static admin datasets", () => {
    expect(adminQueryOptions.users().queryKey).toEqual(ADMIN_QUERY_KEYS.users);
    expect(adminQueryOptions.students().queryKey).toEqual(ADMIN_QUERY_KEYS.students);
    expect(adminQueryOptions.subjects().queryKey).toEqual(ADMIN_QUERY_KEYS.subjects);
    expect(adminQueryOptions.materials().queryKey).toEqual(ADMIN_QUERY_KEYS.materials);
    expect(adminQueryOptions.timetables().queryKey).toEqual(ADMIN_QUERY_KEYS.timetables);
    expect(adminQueryOptions.examTypes().queryKey).toEqual(ADMIN_QUERY_KEYS.examTypes);
    expect(adminQueryOptions.authTokens().queryKey).toEqual(ADMIN_QUERY_KEYS.authTokens);
  });

  it("builds lesson attendance query keys from lesson ids", () => {
    expect(adminQueryOptions.attendance([11, 22]).queryKey).toEqual(
      ADMIN_QUERY_KEYS.attendance("11,22"),
    );
  });

  it("builds override history query keys from lesson and student", () => {
    expect(adminQueryOptions.attendanceOverrideHistory(7, 9).queryKey).toEqual(
      ADMIN_QUERY_KEYS.attendanceOverrideHistory(7, 9),
    );
  });
});
