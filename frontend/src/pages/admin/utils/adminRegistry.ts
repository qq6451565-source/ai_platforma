import type {
  AdminGroup,
  AdminUser,
  Direction,
  StudentProfile,
  Subject,
  TeacherSubject,
} from "../../../api/admin";

type StringMap = Map<number, string>;
type GroupMap = Map<number, AdminGroup>;
type ProfileByUserMap = Map<number, StudentProfile>;
type TeacherAssignmentsMap = Map<number, TeacherSubject[]>;

const normalize = (value: string | null | undefined) => (value || "").trim().toLowerCase();

export const buildProfileByUser = (profiles: StudentProfile[]) =>
  new Map(profiles.map((profile) => [profile.user, profile] as const));

export const buildDirectionNameMap = (directions: Direction[]) =>
  new Map(directions.map((direction) => [direction.id, direction.name] as const));

export const buildGroupEntityMap = (groups: AdminGroup[]) =>
  new Map(groups.map((group) => [group.id, group] as const));

export const buildGroupNameMap = (groups: AdminGroup[]) =>
  new Map(groups.map((group) => [group.id, group.name] as const));

export const buildSubjectNameMap = (subjects: Subject[]) =>
  new Map(subjects.map((subject) => [subject.id, subject.name] as const));

export const buildSubjectEntityMap = (subjects: Subject[]) =>
  new Map(subjects.map((subject) => [subject.id, subject] as const));

export const buildAssignmentsByTeacher = (assignments: TeacherSubject[]) => {
  const grouped = new Map<number, TeacherSubject[]>();
  assignments.forEach((assignment) => {
    const current = grouped.get(assignment.teacher) || [];
    current.push(assignment);
    grouped.set(assignment.teacher, current);
  });
  return grouped;
};

export const getAdminUserRoleCounts = (users: AdminUser[]) => ({
  all: users.length,
  admin: users.filter((user) => user.role === "admin").length,
  teacher: users.filter((user) => user.role === "teacher").length,
  student: users.filter((user) => user.role === "student").length,
});

export const filterAdminUsers = ({
  assignmentsByTeacher,
  directionMap,
  groupNameMap,
  profileByUser,
  roleFilter,
  search,
  subjectNameMap,
  users,
}: {
  assignmentsByTeacher: TeacherAssignmentsMap;
  directionMap: StringMap;
  groupNameMap: StringMap;
  profileByUser: ProfileByUserMap;
  roleFilter: string | null;
  search: string;
  subjectNameMap: StringMap;
  users: AdminUser[];
}) => {
  const query = normalize(search);
  return users.filter((user) => {
    if (roleFilter && user.role !== roleFilter) return false;
    if (!query) return true;

    const profile = profileByUser.get(user.id);
    const workload = assignmentsByTeacher.get(user.id) || [];
    const directionName = profile?.direction ? directionMap.get(profile.direction) || "" : "";
    const groupName =
      user.group
        ? groupNameMap.get(user.group) || ""
        : profile?.group
          ? groupNameMap.get(profile.group) || ""
          : "";
    const subjectNames = workload
      .map((assignment) => subjectNameMap.get(assignment.subject) || "")
      .join(" ");

    return (
      normalize(user.username).includes(query) ||
      normalize(`${user.first_name || ""} ${user.last_name || ""}`).includes(query) ||
      normalize(user.email).includes(query) ||
      normalize(user.phone).includes(query) ||
      normalize(directionName).includes(query) ||
      normalize(groupName).includes(query) ||
      normalize(subjectNames).includes(query)
    );
  });
};

export const filterStudentPlacementUsers = ({
  directionMap,
  groupMap,
  profileByUser,
  search,
  users,
}: {
  directionMap: StringMap;
  groupMap: GroupMap;
  profileByUser: ProfileByUserMap;
  search: string;
  users: AdminUser[];
}) => {
  const query = normalize(search);
  return users.filter((user) => {
    if (!query) return true;
    const profile = profileByUser.get(user.id);
    const groupName = profile?.group ? groupMap.get(profile.group)?.name || "" : "";
    const directionName = profile?.direction ? directionMap.get(profile.direction) || "" : "";
    return (
      normalize(user.username).includes(query) ||
      normalize(`${user.first_name || ""} ${user.last_name || ""}`).includes(query) ||
      normalize(user.email).includes(query) ||
      normalize(user.phone).includes(query) ||
      normalize(groupName).includes(query) ||
      normalize(directionName).includes(query)
    );
  });
};

export const getStudentPlacementStats = (users: AdminUser[], profileByUser: ProfileByUserMap) => {
  const placed = users.filter((user) => Boolean(profileByUser.get(user.id)?.group)).length;
  return {
    total: users.length,
    placed,
    missingGroup: users.length - placed,
  };
};

export const filterTeachersByWorkload = ({
  assignmentsByTeacher,
  groupMap,
  search,
  subjectMap,
  teachers,
}: {
  assignmentsByTeacher: TeacherAssignmentsMap;
  groupMap: GroupMap;
  search: string;
  subjectMap: Map<number, Subject>;
  teachers: AdminUser[];
}) => {
  const query = normalize(search);
  return teachers.filter((teacher) => {
    if (!query) return true;
    const assignments = assignmentsByTeacher.get(teacher.id) || [];
    const workloadText = assignments
      .map((assignment) => {
        const subjectName = subjectMap.get(assignment.subject)?.name || "";
        const groupNames = (assignment.groups || []).map((groupId) => groupMap.get(groupId)?.name || "");
        return [subjectName, ...groupNames].join(" ");
      })
      .join(" ");

    return (
      normalize(teacher.username).includes(query) ||
      normalize(`${teacher.first_name || ""} ${teacher.last_name || ""}`).includes(query) ||
      normalize(teacher.email).includes(query) ||
      normalize(teacher.phone).includes(query) ||
      normalize(workloadText).includes(query)
    );
  });
};

export const getTeacherWorkloadStats = (
  teachers: AdminUser[],
  assignmentsByTeacher: TeacherAssignmentsMap,
  teacherSubjects: TeacherSubject[],
) => {
  const withWorkload = teachers.filter((teacher) => (assignmentsByTeacher.get(teacher.id) || []).length > 0).length;
  return {
    total: teachers.length,
    withWorkload,
    withoutWorkload: teachers.length - withWorkload,
    mappings: teacherSubjects.length,
  };
};
