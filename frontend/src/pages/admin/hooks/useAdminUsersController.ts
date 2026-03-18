import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Form, message } from "antd";
import { useLocation, useNavigate } from "react-router-dom";

import {
  AdminUser,
  createAdminUser,
  createPassportData,
  deleteAdminUser,
  deletePassportData,
  fetchDirections,
  fetchGroupsAdmin,
  fetchPassportData,
  fetchStudentProfiles,
  fetchSubjectsAdmin,
  fetchTeacherSubjects,
  fetchUsers,
  setUserRole,
  updateAdminUser,
  updatePassportData,
} from "../../../api/admin";
import {
  buildAssignmentsByTeacher,
  buildDirectionNameMap,
  buildGroupNameMap,
  buildProfileByUser,
  buildSubjectNameMap,
  filterAdminUsers,
  getAdminUserRoleCounts,
} from "../utils/adminRegistry";
import {
  buildEditableUserFormValues,
  buildPassportFormData,
  buildPassportFormValues,
  buildUserSubmitPayload,
  getRoleFilterFromSearch,
} from "../utils/adminWorkflowForms";
import {
  ADMIN_QUERY_KEYS,
  ADMIN_INVALIDATION_GROUPS,
  getAdminApiErrorMessage,
  invalidateAdminQueries,
} from "../utils/adminWorkflowMutations";
import { updateAdminHubSearch } from "../utils/workflowRouting";

export const useAdminUsersController = () => {
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  const { data: users, isLoading } = useQuery({
    queryKey: ADMIN_QUERY_KEYS.users,
    queryFn: () => fetchUsers(),
  });
  const { data: studentProfiles } = useQuery({
    queryKey: ADMIN_QUERY_KEYS.studentProfiles,
    queryFn: fetchStudentProfiles,
  });
  const { data: directions } = useQuery({
    queryKey: ADMIN_QUERY_KEYS.directions,
    queryFn: fetchDirections,
  });
  const { data: groups } = useQuery({
    queryKey: ADMIN_QUERY_KEYS.groups,
    queryFn: fetchGroupsAdmin,
  });
  const { data: subjects } = useQuery({
    queryKey: ADMIN_QUERY_KEYS.subjects,
    queryFn: fetchSubjectsAdmin,
  });
  const { data: teacherSubjects } = useQuery({
    queryKey: ADMIN_QUERY_KEYS.teacherSubjects,
    queryFn: fetchTeacherSubjects,
  });
  const { data: passports } = useQuery({
    queryKey: ADMIN_QUERY_KEYS.passports,
    queryFn: fetchPassportData,
  });

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [passportModalOpen, setPassportModalOpen] = useState(false);
  const [passportFrontFile, setPassportFrontFile] = useState<File | null>(null);
  const [passportBackFile, setPassportBackFile] = useState<File | null>(null);
  const [passportSelfieFile, setPassportSelfieFile] = useState<File | null>(null);
  const [form] = Form.useForm();
  const [passportForm] = Form.useForm();

  const profileByUser = useMemo(() => buildProfileByUser(studentProfiles || []), [studentProfiles]);
  const passportByUser = useMemo(
    () => new Map((passports || []).map((passport) => [passport.user, passport])),
    [passports],
  );
  const assignmentsByTeacher = useMemo(
    () => buildAssignmentsByTeacher(teacherSubjects || []),
    [teacherSubjects],
  );
  const directionMap = useMemo(() => buildDirectionNameMap(directions || []), [directions]);
  const groupMap = useMemo(() => buildGroupNameMap(groups || []), [groups]);
  const subjectMap = useMemo(() => buildSubjectNameMap(subjects || []), [subjects]);

  const selectedStudentProfile = useMemo(() => {
    if (!selectedUser) return null;
    return profileByUser.get(selectedUser.id) || null;
  }, [profileByUser, selectedUser]);
  const selectedTeacherAssignments = useMemo(() => {
    if (!selectedUser) return [];
    return assignmentsByTeacher.get(selectedUser.id) || [];
  }, [assignmentsByTeacher, selectedUser]);
  const selectedPassport = useMemo(() => {
    if (!selectedUser) return null;
    return passportByUser.get(selectedUser.id) || null;
  }, [passportByUser, selectedUser]);

  useEffect(() => {
    const role = getRoleFilterFromSearch(location.search);
    if (role) {
      setRoleFilter(role);
      return;
    }
    setRoleFilter(null);
  }, [location.search]);

  useEffect(() => {
    if (!selectedUser) return;
    const freshUser = (users || []).find((user) => user.id === selectedUser.id);
    if (freshUser) {
      setSelectedUser(freshUser);
      return;
    }
    setDrawerOpen(false);
    setSelectedUser(null);
  }, [selectedUser?.id, users]);

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: number; role: "student" | "teacher" | "admin" }) =>
      setUserRole(id, role),
    onSuccess: async (_response, variables) => {
      message.success("Rol yangilandi");
      if (selectedUser?.id === variables.id) {
        setSelectedUser((current) => (current ? { ...current, role: variables.role } : current));
      }
      await invalidateAdminQueries(qc, ADMIN_INVALIDATION_GROUPS.roleChange);
    },
    onError: (error) =>
      message.error(getAdminApiErrorMessage(error, ["detail"], "Rolni yangilashda xato")),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => createAdminUser(payload),
    onSuccess: async () => {
      message.success("Foydalanuvchi qo'shildi");
      await invalidateAdminQueries(qc, ADMIN_INVALIDATION_GROUPS.usersOnly);
      setModalOpen(false);
      form.resetFields();
    },
    onError: (error) =>
      message.error(getAdminApiErrorMessage(error, ["username", "email", "detail"], "Foydalanuvchi qo'shishda xato")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      updateAdminUser(id, payload),
    onSuccess: async () => {
      message.success("Foydalanuvchi yangilandi");
      await invalidateAdminQueries(qc, ADMIN_INVALIDATION_GROUPS.usersOnly);
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
    },
    onError: (error) =>
      message.error(getAdminApiErrorMessage(error, ["username", "email", "detail"], "Yangilashda xato")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminUser(id),
    onSuccess: async () => {
      message.success("O'chirildi");
      await invalidateAdminQueries(qc, ADMIN_INVALIDATION_GROUPS.userDirectory);
      if (selectedUser) {
        setDrawerOpen(false);
        setSelectedUser(null);
      }
    },
    onError: (error) =>
      message.error(getAdminApiErrorMessage(error, ["detail"], "O'chirishda xato")),
  });

  const filteredUsers = useMemo(
    () =>
      filterAdminUsers({
        assignmentsByTeacher,
        directionMap,
        groupNameMap: groupMap,
        profileByUser,
        roleFilter,
        search,
        subjectNameMap: subjectMap,
        users: users || [],
      }),
    [assignmentsByTeacher, directionMap, groupMap, profileByUser, roleFilter, search, subjectMap, users],
  );

  const roleCounts = useMemo(() => getAdminUserRoleCounts(users || []), [users]);

  const setRoleFromTab = (key: string) => {
    const nextRole = key === "all" ? null : key;
    setRoleFilter(nextRole);
    navigate(
      {
        pathname: location.pathname,
        search: updateAdminHubSearch(location.search, {
          tab: "users",
          role: nextRole,
        }),
      },
      { replace: true },
    );
  };

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    setEditing(user);
    form.setFieldsValue(buildEditableUserFormValues(user));
    setModalOpen(true);
  };

  const closeUserModal = () => {
    setModalOpen(false);
    setEditing(null);
    form.resetFields();
  };

  const openProfile = (user: AdminUser) => {
    setSelectedUser(user);
    setDrawerOpen(true);
  };

  const closeProfile = () => {
    setDrawerOpen(false);
    setSelectedUser(null);
    setPassportModalOpen(false);
  };

  const openWorkflow = (tab: "student-placement" | "teacher-workload", userId: number) => {
    navigate(
      {
        pathname: location.pathname,
        search: updateAdminHubSearch(location.search, { tab, userId }),
      },
      { replace: true },
    );
  };

  const openPassportEditor = () => {
    if (!selectedUser) return;
    passportForm.resetFields();
    passportForm.setFieldsValue(buildPassportFormValues(selectedPassport));
    setPassportFrontFile(null);
    setPassportBackFile(null);
    setPassportSelfieFile(null);
    setPassportModalOpen(true);
  };

  const closePassportModal = () => {
    setPassportModalOpen(false);
  };

  const savePassport = async () => {
    if (!selectedUser) return;
    try {
      const values = await passportForm.validateFields();
      if (!selectedPassport && (!passportFrontFile || !passportBackFile)) {
        message.warning("Passport rasm(lar)i kerak: old va orqa tomoni");
        return;
      }

      const payload = buildPassportFormData({
        birthDate: values.birth_date,
        extracted_fullname: values.extracted_fullname,
        files: {
          front: passportFrontFile,
          back: passportBackFile,
          selfie: passportSelfieFile,
        },
        passportNumber: values.passport_number,
        passportSeries: values.passport_series,
        passportUserId: !selectedPassport?.id ? selectedUser.id : undefined,
      });

      if (selectedPassport?.id) {
        await updatePassportData(selectedPassport.id, payload);
      } else {
        await createPassportData(payload);
      }

      message.success("Passport ma'lumotlari saqlandi");
      await invalidateAdminQueries(qc, ADMIN_INVALIDATION_GROUPS.passportsOnly);
      setPassportModalOpen(false);
    } catch (error: any) {
      if (!error?.errorFields) {
        message.error(
          getAdminApiErrorMessage(
            error,
            ["passport_series", "passport_number", "detail"],
            "Passport ma'lumotlarini saqlashda xato",
          ),
        );
      }
    }
  };

  const deletePassport = async () => {
    if (!selectedPassport?.id) return;
    await deletePassportData(selectedPassport.id);
    message.success("Passport ma'lumotlari o'chirildi");
    await invalidateAdminQueries(qc, ADMIN_INVALIDATION_GROUPS.passportsOnly);
  };

  const submitUserForm = (values: Record<string, unknown>) => {
    const payload = buildUserSubmitPayload(values);
    if (editing) {
      updateMutation.mutate({ id: editing.id, payload });
      return;
    }
    createMutation.mutate(payload);
  };

  return {
    assignmentsByTeacher,
    changeRole: (id: number, role: "student" | "teacher" | "admin") =>
      roleMutation.mutate({ id, role }),
    closePassportModal,
    closeProfile,
    closeUserModal,
    deletePassport,
    directionMap,
    drawerOpen,
    editing,
    filteredUsers,
    form,
    groupMap,
    isLoading,
    modalOpen,
    openCreate,
    openEdit,
    openPassportEditor,
    openProfile,
    openWorkflow,
    passportForm,
    passportModalOpen,
    profileByUser,
    removeUser: (id: number) => deleteMutation.mutate(id),
    roleCounts,
    roleFilter,
    savePassport,
    search,
    selectedPassport,
    selectedStudentProfile,
    selectedTeacherAssignments,
    selectedUser,
    setPassportBackFile,
    setPassportFrontFile,
    setPassportSelfieFile,
    setRoleFromTab,
    setSearch,
    subjectMap,
    submitUserForm,
    userFormLoading: createMutation.isPending || updateMutation.isPending,
  };
};
