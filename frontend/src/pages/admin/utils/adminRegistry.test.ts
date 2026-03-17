import { describe, expect, it } from "vitest";

import type { AdminGroup, AdminUser, StudentProfile, Subject, TeacherSubject } from "../../../api/admin";
import {
  buildAssignmentsByTeacher,
  buildDirectionNameMap,
  buildGroupEntityMap,
  buildGroupNameMap,
  buildProfileByUser,
  buildSubjectEntityMap,
  buildSubjectNameMap,
  filterAdminUsers,
  filterStudentPlacementUsers,
  filterTeachersByWorkload,
  getAdminUserRoleCounts,
  getStudentPlacementStats,
  getTeacherWorkloadStats,
} from "./adminRegistry";

const users: AdminUser[] = [
  {
    id: 1,
    username: "student_ali",
    email: "ali@example.com",
    first_name: "Ali",
    last_name: "Valiyev",
    phone: "+998901112233",
    group: 10,
    role: "student",
    is_active: true,
  },
  {
    id: 2,
    username: "teacher_dilshod",
    email: "dilshod@example.com",
    first_name: "Dilshod",
    last_name: "Karimov",
    phone: "+998909998877",
    group: null,
    role: "teacher",
    is_active: true,
  },
  {
    id: 3,
    username: "admin_sara",
    email: "sara@example.com",
    first_name: "Sara",
    last_name: "Akbarova",
    phone: null,
    group: null,
    role: "admin",
    is_active: true,
  },
];

const studentProfiles: StudentProfile[] = [
  {
    id: 1,
    user: 1,
    direction: 100,
    group: 10,
    admission_year: 2024,
    status: "active",
  },
];

const groups: AdminGroup[] = [
  { id: 10, name: "SE-201", direction: 100, level: 2, language: "uz" },
  { id: 20, name: "CS-301", direction: 200, level: 3, language: "uz" },
];

const directions = [
  { id: 100, name: "Software Engineering", language: "uz", degree: "bachelor" },
  { id: 200, name: "Computer Science", language: "uz", degree: "bachelor" },
];

const subjects: Subject[] = [
  { id: 501, name: "Algorithms", directions: [100, 200], direction_names: ["SE", "CS"] },
];

const teacherSubjects: TeacherSubject[] = [
  { id: 90, teacher: 2, subject: 501, groups: [10] },
];

describe("adminRegistry utils", () => {
  it("builds role counts correctly", () => {
    expect(getAdminUserRoleCounts(users)).toEqual({
      all: 3,
      admin: 1,
      teacher: 1,
      student: 1,
    });
  });

  it("filters admin users by academic search context", () => {
    const filtered = filterAdminUsers({
      assignmentsByTeacher: buildAssignmentsByTeacher(teacherSubjects),
      directionMap: buildDirectionNameMap(directions),
      groupNameMap: buildGroupNameMap(groups),
      profileByUser: buildProfileByUser(studentProfiles),
      roleFilter: null,
      search: "algorithms",
      subjectNameMap: buildSubjectNameMap(subjects),
      users,
    });

    expect(filtered.map((user) => user.id)).toEqual([2]);
  });

  it("returns student placement stats and placement filtering", () => {
    const profileByUser = buildProfileByUser(studentProfiles);
    expect(getStudentPlacementStats(users.filter((user) => user.role === "student"), profileByUser)).toEqual({
      total: 1,
      placed: 1,
      missingGroup: 0,
    });

    const filtered = filterStudentPlacementUsers({
      directionMap: buildDirectionNameMap(directions),
      groupMap: buildGroupEntityMap(groups),
      profileByUser,
      search: "software",
      users: users.filter((user) => user.role === "student"),
    });

    expect(filtered.map((user) => user.id)).toEqual([1]);
  });

  it("calculates teacher workload stats and workload search", () => {
    const assignmentsByTeacher = buildAssignmentsByTeacher(teacherSubjects);
    expect(
      getTeacherWorkloadStats(users.filter((user) => user.role === "teacher"), assignmentsByTeacher, teacherSubjects),
    ).toEqual({
      total: 1,
      withWorkload: 1,
      withoutWorkload: 0,
      mappings: 1,
    });

    const filtered = filterTeachersByWorkload({
      assignmentsByTeacher,
      groupMap: buildGroupEntityMap(groups),
      search: "se-201",
      subjectMap: buildSubjectEntityMap(subjects),
      teachers: users.filter((user) => user.role === "teacher"),
    });

    expect(filtered.map((user) => user.id)).toEqual([2]);
  });
});
