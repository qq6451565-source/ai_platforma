import { describe, expect, it } from "vitest";

import type { AdminGroup, AdminUser, PassportData, StudentProfile, Subject, TeacherSubject } from "../../../api/admin";
import {
  buildEditableUserFormValues,
  buildPassportFormData,
  buildPassportFormValues,
  buildStudentPlacementFormValues,
  buildTeacherWorkloadFormValues,
  buildUserSubmitPayload,
  filterGroupsByDirection,
  filterGroupsBySubject,
  getRoleFilterFromSearch,
} from "./adminWorkflowForms";

const groups: AdminGroup[] = [
  { id: 1, name: "SE-201", direction: 10, level: 2, language: "uz" },
  { id: 2, name: "CS-301", direction: 20, level: 3, language: "uz" },
];

describe("adminWorkflowForms", () => {
  it("reads role filter from search params", () => {
    expect(getRoleFilterFromSearch("?tab=users&role=teacher")).toBe("teacher");
    expect(getRoleFilterFromSearch("?tab=users&role=guest")).toBeNull();
  });

  it("builds user edit values and strips empty password from submit payload", () => {
    const user: AdminUser = {
      id: 11,
      username: "ali",
      email: "ali@example.com",
      first_name: "Ali",
      last_name: "Valiyev",
      phone: "+99890",
      group: 1,
      role: "student",
      is_active: true,
    };

    expect(buildEditableUserFormValues(user)).toEqual({
      username: "ali",
      first_name: "Ali",
      last_name: "Valiyev",
      email: "ali@example.com",
      phone: "+99890",
      role: "student",
      is_active: true,
    });
    expect(buildUserSubmitPayload({ username: "ali", password: "" })).toEqual({ username: "ali" });
  });

  it("builds passport form values and multipart payload", () => {
    const passport: PassportData = {
      id: 4,
      user: 11,
      passport_series: "AA",
      passport_number: "1234567",
      birth_date: "2000-01-02",
      extracted_fullname: "Ali Valiyev",
    };
    const front = new File(["front"], "front.png", { type: "image/png" });
    const payload = buildPassportFormData({
      passportUserId: 11,
      passportSeries: "AA",
      passportNumber: "1234567",
      birthDate: "2000-01-02",
      extracted_fullname: "Ali Valiyev",
      files: { front },
    });

    expect(buildPassportFormValues(passport)).toEqual({
      passport_series: "AA",
      passport_number: "1234567",
      birth_date: "2000-01-02",
      extracted_fullname: "Ali Valiyev",
    });
    expect(Array.from(payload.keys())).toEqual(
      expect.arrayContaining([
        "user",
        "passport_series",
        "passport_number",
        "birth_date",
        "extracted_fullname",
        "front_image",
      ]),
    );
  });

  it("builds placement and workload form defaults", () => {
    const profile: StudentProfile = {
      id: 3,
      user: 11,
      direction: 10,
      group: 1,
      admission_year: 2024,
      status: "active",
    };
    const assignment: TeacherSubject = {
      id: 7,
      teacher: 22,
      subject: 99,
      groups: [1, 2],
    };
    const groupMap = new Map(groups.map((group) => [group.id, group] as const));

    expect(buildStudentPlacementFormValues(profile, groupMap)).toEqual({
      direction_id: 10,
      group_id: 1,
      admission_year: 2024,
      status: "active",
    });
    expect(buildTeacherWorkloadFormValues(assignment)).toEqual({
      subject: 99,
      groups: [1, 2],
      subject_id: 99,
      group_ids: [1, 2],
    });
  });

  it("filters groups by direction and subject", () => {
    const subject: Subject = {
      id: 99,
      name: "Algorithms",
      directions: [10],
      direction_names: ["SE"],
    };

    expect(filterGroupsByDirection(groups, 10).map((group) => group.id)).toEqual([1]);
    expect(filterGroupsBySubject(groups, subject).map((group) => group.id)).toEqual([1]);
  });
});
