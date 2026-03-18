import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Form, message } from "antd";
import { useLocation, useNavigate } from "react-router-dom";

import {
  AdminUser,
  TeacherSubject,
  assignTeacherWorkload,
  deleteTeacherSubject,
  fetchGroupsAdmin,
  fetchSubjectsAdmin,
  fetchTeacherSubjects,
  fetchUsers,
  updateTeacherSubject,
} from "../../../api/admin";
import {
  buildAssignmentsByTeacher,
  buildGroupEntityMap,
  buildSubjectEntityMap,
  filterTeachersByWorkload,
  getTeacherWorkloadStats,
} from "../utils/adminRegistry";
import {
  buildTeacherWorkloadFormValues,
  filterGroupsBySubject,
} from "../utils/adminWorkflowForms";
import { clearRequestedUserIdSearch, getRequestedUserId } from "../utils/workflowRouting";

export const useTeacherWorkloadController = () => {
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<AdminUser | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<TeacherSubject | null>(null);
  const [form] = Form.useForm();

  const { data: teachers, isLoading } = useQuery({
    queryKey: ["admin-users", "teacher-workload"],
    queryFn: () => fetchUsers("teacher"),
  });
  const { data: teacherSubjects } = useQuery({
    queryKey: ["admin-teacher-subjects"],
    queryFn: fetchTeacherSubjects,
  });
  const { data: subjects } = useQuery({
    queryKey: ["admin-subjects"],
    queryFn: fetchSubjectsAdmin,
  });
  const { data: groups } = useQuery({
    queryKey: ["admin-groups"],
    queryFn: fetchGroupsAdmin,
  });

  const requestedUserId = useMemo(() => getRequestedUserId(location.search), [location.search]);

  const saveMutation = useMutation({
    mutationFn: ({
      userId,
      payload,
      assignmentId,
    }: {
      userId: number;
      payload: {
        subject_id?: number;
        group_ids?: number[];
        subject?: number;
        groups?: number[];
      };
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
      message.success("Teacher workload saqlandi");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-teacher-subjects"] }),
        qc.invalidateQueries({ queryKey: ["admin-users", "teacher-workload"] }),
      ]);
      setModalOpen(false);
      setEditingAssignment(null);
      form.resetFields();
    },
    onError: (error: any) => {
      const detail =
        error?.response?.data?.groups?.[0] ||
        error?.response?.data?.group_ids?.[0] ||
        error?.response?.data?.non_field_errors?.[0] ||
        error?.response?.data?.detail ||
        "Teacher workloadni saqlashda xato";
      message.error(detail);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTeacherSubject(id),
    onSuccess: async () => {
      message.success("Biriktirish o'chirildi");
      await qc.invalidateQueries({ queryKey: ["admin-teacher-subjects"] });
    },
    onError: () => message.error("Biriktirishni o'chirishda xato"),
  });

  const subjectMap = useMemo(() => buildSubjectEntityMap(subjects || []), [subjects]);
  const groupMap = useMemo(() => buildGroupEntityMap(groups || []), [groups]);
  const assignmentsByTeacher = useMemo(
    () => buildAssignmentsByTeacher(teacherSubjects || []),
    [teacherSubjects],
  );

  const filteredTeachers = useMemo(
    () =>
      filterTeachersByWorkload({
        assignmentsByTeacher,
        groupMap,
        search,
        subjectMap,
        teachers: teachers || [],
      }),
    [assignmentsByTeacher, groupMap, search, subjectMap, teachers],
  );

  const stats = useMemo(
    () => getTeacherWorkloadStats(teachers || [], assignmentsByTeacher, teacherSubjects || []),
    [assignmentsByTeacher, teacherSubjects, teachers],
  );

  const openDrawer = (teacher: AdminUser) => {
    setSelectedTeacher(teacher);
    setDrawerOpen(true);
  };

  const openCreateModal = (teacher: AdminUser) => {
    setSelectedTeacher(teacher);
    setEditingAssignment(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (teacher: AdminUser, assignment: TeacherSubject) => {
    setSelectedTeacher(teacher);
    setEditingAssignment(assignment);
    form.setFieldsValue(buildTeacherWorkloadFormValues(assignment));
    setModalOpen(true);
  };

  const closeDrawer = () => {
    navigate(
      { pathname: location.pathname, search: clearRequestedUserIdSearch(location.search) },
      { replace: true },
    );
    setDrawerOpen(false);
    setSelectedTeacher(null);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingAssignment(null);
    form.resetFields();
  };

  const submitWorkload = (values: {
    subject_id?: number;
    group_ids?: number[];
    subject?: number;
    groups?: number[];
  }) => {
    if (!selectedTeacher) return;
    if (editingAssignment) {
      saveMutation.mutate({
        userId: selectedTeacher.id,
        assignmentId: editingAssignment.id,
        payload: values,
      });
      return;
    }
    saveMutation.mutate({
      userId: selectedTeacher.id,
      payload: values,
    });
  };

  const selectedSubjectId = Form.useWatch(editingAssignment ? "subject" : "subject_id", form);
  const availableGroups = useMemo(
    () => filterGroupsBySubject(groups || [], subjectMap.get(selectedSubjectId)),
    [groups, selectedSubjectId, subjectMap],
  );

  useEffect(() => {
    if (!requestedUserId || !teachers?.length || drawerOpen) return;
    const matchedTeacher = teachers.find((teacher) => teacher.id === requestedUserId);
    if (matchedTeacher) {
      openDrawer(matchedTeacher);
      return;
    }
    navigate(
      { pathname: location.pathname, search: clearRequestedUserIdSearch(location.search) },
      { replace: true },
    );
  }, [drawerOpen, location.pathname, location.search, navigate, requestedUserId, teachers]);

  return {
    assignmentsByTeacher,
    availableGroups,
    closeDrawer,
    closeModal,
    deleteAssignment: (assignmentId: number) => deleteMutation.mutate(assignmentId),
    deletePending: deleteMutation.isPending,
    drawerOpen,
    editingAssignment,
    filteredTeachers,
    form,
    groupMap,
    isLoading,
    modalOpen,
    openCreateModal,
    openDrawer,
    openEditModal,
    savePending: saveMutation.isPending,
    search,
    selectedTeacher,
    setSearch,
    stats,
    subjectMap,
    subjects: subjects || [],
    submitWorkload,
  };
};
