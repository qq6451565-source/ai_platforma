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
import { updateAdminHubSearch } from "../utils/workflowRouting";

export const useAdminUsersController = () => {
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers(),
  });
  const { data: studentProfiles } = useQuery({
    queryKey: ["admin-student-profiles"],
    queryFn: fetchStudentProfiles,
  });
  const { data: directions } = useQuery({
    queryKey: ["admin-directions"],
    queryFn: fetchDirections,
  });
  const { data: groups } = useQuery({
    queryKey: ["admin-groups"],
    queryFn: fetchGroupsAdmin,
  });
  const { data: subjects } = useQuery({
    queryKey: ["admin-subjects"],
    queryFn: fetchSubjectsAdmin,
  });
  const { data: teacherSubjects } = useQuery({
    queryKey: ["admin-teacher-subjects"],
    queryFn: fetchTeacherSubjects,
  });
  const { data: passports } = useQuery({
    queryKey: ["admin-passports"],
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
    const params = new URLSearchParams(location.search);
    const role = params.get("role");
    if (role === "admin" || role === "teacher" || role === "student") {
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
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-users"] }),
        qc.invalidateQueries({ queryKey: ["admin-users", "student-placement"] }),
        qc.invalidateQueries({ queryKey: ["admin-users", "teacher-workload"] }),
        qc.invalidateQueries({ queryKey: ["admin-student-profiles"] }),
        qc.invalidateQueries({ queryKey: ["admin-teacher-subjects"] }),
      ]);
    },
    onError: () => message.error("Rolni yangilashda xato"),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => createAdminUser(payload),
    onSuccess: async () => {
      message.success("Foydalanuvchi qo'shildi");
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      setModalOpen(false);
      form.resetFields();
    },
    onError: () => message.error("Foydalanuvchi qo'shishda xato"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      updateAdminUser(id, payload),
    onSuccess: async () => {
      message.success("Foydalanuvchi yangilandi");
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
    },
    onError: () => message.error("Yangilashda xato"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminUser(id),
    onSuccess: async () => {
      message.success("O'chirildi");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-users"] }),
        qc.invalidateQueries({ queryKey: ["admin-users", "student-placement"] }),
        qc.invalidateQueries({ queryKey: ["admin-users", "teacher-workload"] }),
      ]);
      if (selectedUser) {
        setDrawerOpen(false);
        setSelectedUser(null);
      }
    },
    onError: () => message.error("O'chirishda xato"),
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
    form.setFieldsValue({
      username: user.username,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      is_active: user.is_active ?? true,
    });
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
    passportForm.setFieldsValue({
      passport_series: selectedPassport?.passport_series,
      passport_number: selectedPassport?.passport_number,
      birth_date: selectedPassport?.birth_date,
      extracted_fullname: selectedPassport?.extracted_fullname,
    });
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

      const payload = new FormData();
      if (!selectedPassport?.id) {
        payload.append("user", String(selectedUser.id));
      }
      payload.append("passport_series", values.passport_series);
      payload.append("passport_number", values.passport_number);
      if (values.birth_date) payload.append("birth_date", values.birth_date);
      if (values.extracted_fullname) payload.append("extracted_fullname", values.extracted_fullname);
      if (passportFrontFile) payload.append("front_image", passportFrontFile);
      if (passportBackFile) payload.append("back_image", passportBackFile);
      if (passportSelfieFile) payload.append("selfie_image", passportSelfieFile);

      if (selectedPassport?.id) {
        await updatePassportData(selectedPassport.id, payload);
      } else {
        await createPassportData(payload);
      }

      message.success("Passport ma'lumotlari saqlandi");
      await qc.invalidateQueries({ queryKey: ["admin-passports"] });
      setPassportModalOpen(false);
    } catch (error: any) {
      if (!error?.errorFields) {
        message.error("Passport ma'lumotlarini saqlashda xato");
      }
    }
  };

  const deletePassport = async () => {
    if (!selectedPassport?.id) return;
    await deletePassportData(selectedPassport.id);
    message.success("Passport ma'lumotlari o'chirildi");
    await qc.invalidateQueries({ queryKey: ["admin-passports"] });
  };

  const submitUserForm = (values: Record<string, unknown>) => {
    const payload = { ...values };
    if (!payload.password) {
      delete payload.password;
    }
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
