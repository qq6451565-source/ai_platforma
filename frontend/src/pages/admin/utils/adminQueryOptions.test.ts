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
    expect(adminQueryOptions.enrollmentList().queryKey).toEqual(ADMIN_QUERY_KEYS.enrollmentList);
    expect(adminQueryOptions.enrollmentWindows().queryKey).toEqual(ADMIN_QUERY_KEYS.enrollmentWindows);
    expect(adminQueryOptions.authGroups().queryKey).toEqual(ADMIN_QUERY_KEYS.authGroups);
    expect(adminQueryOptions.liveRooms().queryKey).toEqual(ADMIN_QUERY_KEYS.liveRooms);
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

  it("builds enrollment detail and audit query keys from applicant id", () => {
    expect(adminQueryOptions.enrollmentDetail(15).queryKey).toEqual(
      ADMIN_QUERY_KEYS.enrollmentDetail(15),
    );
    expect(adminQueryOptions.enrollmentAudit(15).queryKey).toEqual(
      ADMIN_QUERY_KEYS.enrollmentAudit(15),
    );
  });

  it("builds audit log query keys from active filters", () => {
    expect(adminQueryOptions.auditLogs("enrollment", "all", "ali").queryKey).toEqual(
      ADMIN_QUERY_KEYS.auditLogs("enrollment", "all", "ali"),
    );
  });
});
