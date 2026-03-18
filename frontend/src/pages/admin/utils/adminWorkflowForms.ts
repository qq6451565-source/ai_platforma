import type {
  AdminGroup,
  AdminUser,
  PassportData,
  StudentProfile,
  Subject,
  TeacherSubject,
} from "../../../api/admin";

export const getRoleFilterFromSearch = (search: string) => {
  const role = new URLSearchParams(search).get("role");
  return role === "admin" || role === "teacher" || role === "student" ? role : null;
};

export const buildEditableUserFormValues = (user: AdminUser) => ({
  username: user.username,
  first_name: user.first_name,
  last_name: user.last_name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  is_active: user.is_active ?? true,
});

export const buildUserSubmitPayload = (values: Record<string, unknown>) => {
  const payload = { ...values };
  if (!payload.password) {
    delete payload.password;
  }
  return payload;
};

export const buildPassportFormValues = (passport: PassportData | null) => ({
  passport_series: passport?.passport_series,
  passport_number: passport?.passport_number,
  birth_date: passport?.birth_date,
  extracted_fullname: passport?.extracted_fullname,
});

export const buildPassportFormData = ({
  extracted_fullname,
  files,
  passportNumber,
  passportSeries,
  passportUserId,
  birthDate,
}: {
  birthDate?: string;
  extracted_fullname?: string;
  files: {
    back?: File | null;
    front?: File | null;
    selfie?: File | null;
  };
  passportNumber: string;
  passportSeries: string;
  passportUserId?: number;
}) => {
  const payload = new FormData();
  if (passportUserId) {
    payload.append("user", String(passportUserId));
  }
  payload.append("passport_series", passportSeries);
  payload.append("passport_number", passportNumber);
  if (birthDate) payload.append("birth_date", birthDate);
  if (extracted_fullname) payload.append("extracted_fullname", extracted_fullname);
  if (files.front) payload.append("front_image", files.front);
  if (files.back) payload.append("back_image", files.back);
  if (files.selfie) payload.append("selfie_image", files.selfie);
  return payload;
};

export const buildStudentPlacementFormValues = (
  profile: StudentProfile | null | undefined,
  groupMap: Map<number, AdminGroup>,
) => ({
  direction_id:
    profile?.direction ?? (profile?.group ? groupMap.get(profile.group)?.direction : undefined),
  group_id: profile?.group,
  admission_year: profile?.admission_year,
  status: profile?.status || "active",
});

export const filterGroupsByDirection = (
  groups: AdminGroup[],
  selectedDirectionId?: number,
) => {
  if (!selectedDirectionId) return groups;
  return groups.filter((group) => group.direction === selectedDirectionId);
};

export const buildTeacherWorkloadFormValues = (assignment: TeacherSubject) => ({
  subject: assignment.subject,
  groups: assignment.groups || [],
  subject_id: assignment.subject,
  group_ids: assignment.groups || [],
});

export const filterGroupsBySubject = (groups: AdminGroup[], subject?: Subject) => {
  if (!subject) return groups;
  return groups.filter((group) => subject.directions.includes(group.direction || 0));
};
