import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Form, message } from "antd";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';

import {
  AdminUser,
  TeacherSubject,
  assignStudentPlacement,
  assignTeacherWorkload,
  createAdminUser,
  createPassportData,
  deleteAdminUser,
  deletePassportData,
  deleteTeacherSubject,
  setUserRole,
  updateAdminUser,
  updatePassportData,
  updateTeacherSubject,
} from "../../../api/admin";
import {
  buildAssignmentsByTeacher,
  buildDirectionNameMap,
  buildGroupEntityMap,
  buildGroupNameMap,
  buildProfileByUser,
  buildSubjectEntityMap,
  buildSubjectNameMap,
  filterAdminUsers,
  getAdminUserRoleCounts,
} from "../utils/adminRegistry";
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
} from "../utils/adminWorkflowForms";
import { adminQueryOptions } from "../utils/adminQueryOptions";
import {
  ADMIN_INVALIDATION_GROUPS,
  getAdminApiErrorMessage,
  invalidateAdminQueries,
} from "../utils/adminWorkflowMutations";
import { updateAdminHubSearch } from "../utils/workflowRouting";

export const useAdminUsersController = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  const { data: users, isLoading } = useQuery(adminQueryOptions.users());
  const { data: studentProfiles } = useQuery(adminQueryOptions.studentProfiles());
  const { data: directions } = useQuery(adminQueryOptions.directions());
  const { data: groups } = useQuery(adminQueryOptions.groups());
  const { data: subjects } = useQuery(adminQueryOptions.subjects());
  const { data: teacherSubjects } = useQuery(adminQueryOptions.teacherSubjects());
  const { data: passports } = useQuery(adminQueryOptions.passports());

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

  // Placement state
  const [placementModalOpen, setPlacementModalOpen] = useState(false);
  const [placementForm] = Form.useForm();

  // Workload state
  const [workloadDrawerOpen, setWorkloadDrawerOpen] = useState(false);
  const [workloadModalOpen, setWorkloadModalOpen] = useState(false);
  const [editingWorkloadAssignment, setEditingWorkloadAssignment] = useState<TeacherSubject | null>(null);
  const [workloadForm] = Form.useForm();

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
  const groupEntityMap = useMemo(() => buildGroupEntityMap(groups || []), [groups]);
  const subjectMap = useMemo(() => buildSubjectNameMap(subjects || []), [subjects]);
  const subjectEntityMap = useMemo(() => buildSubjectEntityMap(subjects || []), [subjects]);

  const selectedPlacementDirectionId = Form.useWatch("direction_id", placementForm);
  const availablePlacementGroups = useMemo(
    () => filterGroupsByDirection(groups || [], selectedPlacementDirectionId),
    [groups, selectedPlacementDirectionId],
  );

  const selectedWorkloadSubjectId = Form.useWatch("subject", workloadForm);
  const availableWorkloadGroups = useMemo(
    () =>
      filterGroupsBySubject(
        groups || [],
        selectedWorkloadSubjectId ? subjectEntityMap.get(selectedWorkloadSubjectId) : undefined,
      ),
    [groups, selectedWorkloadSubjectId, subjectEntityMap],
  );

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
      message.success(t('adminUsers.roleUpdated'));
      if (selectedUser?.id === variables.id) {
        setSelectedUser((current) => (current ? { ...current, role: variables.role } : current));
      }
      await invalidateAdminQueries(qc, ADMIN_INVALIDATION_GROUPS.roleChange);
    },
    onError: (error) =>
      message.error(getAdminApiErrorMessage(error, ["detail"], t('adminUsers.roleUpdateError'))),
  });

  const createMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => createAdminUser(payload),
    onSuccess: async () => {
      message.success(t('adminUsers.userCreated'));
      await invalidateAdminQueries(qc, ADMIN_INVALIDATION_GROUPS.usersOnly);
      setModalOpen(false);
      form.resetFields();
    },
    onError: (error) =>
      message.error(getAdminApiErrorMessage(error, ["username", "email", "detail"], t('adminUsers.userCreateError'))),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Record<string, unknown> }) =>
      updateAdminUser(id, payload),
    onSuccess: async () => {
      message.success(t('adminUsers.userUpdated'));
      await invalidateAdminQueries(qc, ADMIN_INVALIDATION_GROUPS.usersOnly);
      setModalOpen(false);
      setEditing(null);
      form.resetFields();
    },
    onError: (error) =>
      message.error(getAdminApiErrorMessage(error, ["username", "email", "detail"], t('adminUsers.userUpdateError'))),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAdminUser(id),
    onSuccess: async () => {
      message.success(t('common.deleted'));
      await invalidateAdminQueries(qc, ADMIN_INVALIDATION_GROUPS.userDirectory);
      if (selectedUser) {
        setDrawerOpen(false);
        setSelectedUser(null);
      }
    },
    onError: (error) =>
      message.error(getAdminApiErrorMessage(error, ["detail"], t('common.deleteError'))),
  });

  const placementMutation = useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: number;
      payload: {
        direction_id?: number | null;
        group_id?: number | null;
        admission_year?: number;
        status?: "active" | "academic_leave" | "expelled" | "graduated";
      };
    }) => assignStudentPlacement(userId, payload),
    onSuccess: async () => {
      message.success(t('adminUsers.placementSaved'));
      await invalidateAdminQueries(qc, ADMIN_INVALIDATION_GROUPS.studentPlacement);
      setPlacementModalOpen(false);
      placementForm.resetFields();
    },
    onError: (error: any) =>
      message.error(getAdminApiErrorMessage(error, ["group_id", "group"], t('adminUsers.placementSaveError'))),
  });

  const workloadSaveMutation = useMutation({
    mutationFn: ({
      userId,
      payload,
      assignmentId,
    }: {
      userId: number;
      payload: { subject_id?: number; group_ids?: number[]; subject?: number; groups?: number[] };
      assignmentId?: number | null;
    }) => {
      if (assignmentId) {
        return updateTeacherSubject(assignmentId, {
          teacher: userId,
          subject: payload.subject,
          groups: payload.groups || [],
        });
      }
      return assignTeacherWorkload(userId, {
        subject_id: payload.subject_id as number,
        group_ids: payload.group_ids || [],
      });
    },
    onSuccess: async () => {
      message.success(t('adminUsers.workloadSaved'));
      await invalidateAdminQueries(qc, ADMIN_INVALIDATION_GROUPS.teacherWorkload);
      setWorkloadModalOpen(false);
      setEditingWorkloadAssignment(null);
      workloadForm.resetFields();
    },
    onError: (error: any) =>
      message.error(
        getAdminApiErrorMessage(error, ["groups", "group_ids", "non_field_errors"], t('adminUsers.workloadSaveError')),
      ),
  });

  const workloadDeleteMutation = useMutation({
    mutationFn: (id: number) => deleteTeacherSubject(id),
    onSuccess: async () => {
      message.success(t('adminUsers.workloadDeleted'));
      await invalidateAdminQueries(qc, ADMIN_INVALIDATION_GROUPS.teacherWorkload);
    },
    onError: (error: any) =>
      message.error(getAdminApiErrorMessage(error, ["detail"], t('adminUsers.workloadDeleteError'))),
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

  const openWorkflow = (tab: "student-placement" | "teacher-workload", _userId: number) => {
    if (tab === "student-placement") {
      if (!selectedUser) return;
      placementForm.resetFields();
      placementForm.setFieldsValue(buildStudentPlacementFormValues(selectedStudentProfile, groupEntityMap));
      setPlacementModalOpen(true);
    } else {
      setWorkloadDrawerOpen(true);
    }
  };

  const closePlacementModal = () => {
    setPlacementModalOpen(false);
    placementForm.resetFields();
  };

  const submitPlacement = async (values: {
    direction_id?: number | null;
    group_id?: number | null;
    admission_year?: number;
    status?: "active" | "academic_leave" | "expelled" | "graduated";
  }) => {
    if (!selectedUser) return;
    await placementMutation.mutateAsync({ userId: selectedUser.id, payload: values });
  };

  const closeWorkloadDrawer = () => {
    setWorkloadDrawerOpen(false);
  };

  const openWorkloadCreateModal = () => {
    setEditingWorkloadAssignment(null);
    workloadForm.resetFields();
    setWorkloadModalOpen(true);
  };

  const openWorkloadEditModal = (_teacher: AdminUser, assignment: TeacherSubject) => {
    setEditingWorkloadAssignment(assignment);
    workloadForm.setFieldsValue(buildTeacherWorkloadFormValues(assignment));
    setWorkloadModalOpen(true);
  };

  const closeWorkloadModal = () => {
    setWorkloadModalOpen(false);
    setEditingWorkloadAssignment(null);
    workloadForm.resetFields();
  };

  const submitWorkload = async (values: {
    subject_id?: number;
    group_ids?: number[];
    subject?: number;
    groups?: number[];
  }) => {
    if (!selectedUser) return;
    await workloadSaveMutation.mutateAsync({
      userId: selectedUser.id,
      payload: values,
      assignmentId: editingWorkloadAssignment?.id ?? null,
    });
  };

  const deleteWorkload = async (assignmentId: number) => {
    await workloadDeleteMutation.mutateAsync(assignmentId);
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
        message.warning(t('adminUsers.passportImagesRequired'));
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

      message.success(t('adminUsers.passportSaved'));
      await invalidateAdminQueries(qc, ADMIN_INVALIDATION_GROUPS.passportsOnly);
      setPassportModalOpen(false);
    } catch (error: any) {
      if (!error?.errorFields) {
        message.error(
          getAdminApiErrorMessage(
            error,
            ["passport_series", "passport_number", "detail"],
            t('adminUsers.passportSaveError'),
          ),
        );
      }
    }
  };

  const deletePassport = async () => {
    if (!selectedPassport?.id) return;
    await deletePassportData(selectedPassport.id);
    message.success(t('adminUsers.passportDeleted'));
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
    availablePlacementGroups,
    availableWorkloadGroups,
    changeRole: (id: number, role: "student" | "teacher" | "admin") =>
      roleMutation.mutate({ id, role }),
    closePassportModal,
    closePlacementModal,
    closeProfile,
    closeUserModal,
    closeWorkloadDrawer,
    closeWorkloadModal,
    deletePassport,
    deleteWorkload,
    directions: directions || [],
    directionMap,
    drawerOpen,
    editingWorkloadAssignment,
    editing,
    filteredUsers,
    form,
    groupEntityMap,
    groupMap,
    isLoading,
    modalOpen,
    openCreate,
    openEdit,
    openPassportEditor,
    openProfile,
    openWorkflow,
    openWorkloadCreateModal,
    openWorkloadEditModal,
    passportForm,
    passportModalOpen,
    placementForm,
    placementLoading: placementMutation.isPending,
    placementModalOpen,
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
    subjectEntityMap,
    subjectMap,
    subjects: subjects || [],
    submitPlacement,
    submitUserForm,
    submitWorkload,
    userFormLoading: createMutation.isPending || updateMutation.isPending,
    workloadDeleteLoading: workloadDeleteMutation.isPending,
    workloadDrawerOpen,
    workloadForm,
    workloadModalOpen,
    workloadSaveLoading: workloadSaveMutation.isPending,
  };
};
