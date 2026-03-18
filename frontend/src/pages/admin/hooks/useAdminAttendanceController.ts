import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";

import type { Direction } from "../../../api/admin";
import { markAttendance } from "../../../api/attendance";
import { adminQueryOptions } from "../utils/adminQueryOptions";
import {
  buildAttendanceGroupMap,
  buildAttendanceGroupOptions,
  buildAttendanceLessonMap,
  buildAttendanceRows,
  buildAttendanceSubjectCards,
  buildLessonSubjectMap,
  buildLessonsForSubject,
  filterAttendanceStudents,
  filterStudentsForDirection,
  filterStudentsForSubject,
  type AttendanceSubjectCard,
  type HistoryTarget,
  type OverrideDraft,
  type StudentRow,
} from "../utils/adminAttendance";
import {
  ADMIN_QUERY_KEYS,
  getAdminApiErrorMessage,
  invalidateAdminQueries,
} from "../utils/adminWorkflowMutations";

export const useAdminAttendanceController = () => {
  const qc = useQueryClient();

  const { data: directions, isLoading: loadingDirections } = useQuery(adminQueryOptions.directions());
  const { data: subjects } = useQuery(adminQueryOptions.subjects());
  const { data: groups } = useQuery(adminQueryOptions.groups());
  const { data: students } = useQuery(adminQueryOptions.students());
  const { data: lessons } = useQuery(adminQueryOptions.lessons());
  const { data: teacherSubjects } = useQuery(adminQueryOptions.teacherSubjects());

  const [selectedDirection, setSelectedDirection] = useState<Direction | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<AttendanceSubjectCard | null>(null);
  const [groupFilter, setGroupFilter] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [overrideDraft, setOverrideDraft] = useState<OverrideDraft | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [historyTarget, setHistoryTarget] = useState<HistoryTarget | null>(null);

  const groupMap = useMemo(() => buildAttendanceGroupMap(groups || []), [groups]);
  const lessonMap = useMemo(() => buildAttendanceLessonMap(lessons || []), [lessons]);
  const lessonSubjectMap = useMemo(
    () => buildLessonSubjectMap(teacherSubjects || []),
    [teacherSubjects],
  );

  const studentsForDirection = useMemo(
    () => filterStudentsForDirection(students || [], groupMap, selectedDirection?.id),
    [students, groupMap, selectedDirection],
  );
  const subjectCards = useMemo(
    () => buildAttendanceSubjectCards(subjects || [], selectedDirection?.id),
    [selectedDirection, subjects],
  );
  const lessonsForSubject = useMemo(
    () => buildLessonsForSubject(lessons || [], selectedSubject?.id, lessonSubjectMap),
    [lessonSubjectMap, lessons, selectedSubject],
  );
  const lessonIds = useMemo(
    () => lessonsForSubject.map((lesson) => lesson.id),
    [lessonsForSubject],
  );
  const lessonIdsKey = useMemo(() => lessonIds.join(","), [lessonIds]);

  const { data: attendanceRecords = [], isLoading: loadingAttendance } = useQuery({
    ...adminQueryOptions.attendance(lessonIds),
    enabled: lessonIds.length > 0,
  });
  const { data: overrideHistory = [], isLoading: loadingOverrideHistory } = useQuery({
    ...adminQueryOptions.attendanceOverrideHistory(historyTarget?.lesson, historyTarget?.student),
    enabled: Boolean(historyTarget),
  });

  const lessonGroupIds = useMemo(
    () =>
      new Set(
        lessonsForSubject
          .map((lesson) => lesson.group)
          .filter((groupId): groupId is number => typeof groupId === "number"),
      ),
    [lessonsForSubject],
  );
  const studentsForSubject = useMemo(
    () => filterStudentsForSubject(studentsForDirection, selectedSubject?.id, lessonGroupIds),
    [lessonGroupIds, selectedSubject, studentsForDirection],
  );
  const relevantGroupIds = useMemo(
    () =>
      new Set(
        studentsForSubject
          .map((student) => student.group)
          .filter((groupId): groupId is number => typeof groupId === "number"),
      ),
    [studentsForSubject],
  );
  const groupOptions = useMemo(
    () => buildAttendanceGroupOptions(relevantGroupIds, groupMap),
    [groupMap, relevantGroupIds],
  );
  const filteredStudents = useMemo(
    () =>
      filterAttendanceStudents({
        students: studentsForSubject,
        groupMap,
        groupFilter,
        search,
      }),
    [groupFilter, groupMap, search, studentsForSubject],
  );
  const rows = useMemo(
    () =>
      buildAttendanceRows({
        students: filteredStudents,
        attendanceRecords,
        groupMap,
        lessonMap,
      }),
    [attendanceRecords, filteredStudents, groupMap, lessonMap],
  );

  useEffect(() => {
    if (!selectedStudent) return;
    const updatedStudent = rows.find((row) => row.studentId === selectedStudent.studentId);
    if (!updatedStudent) {
      setSelectedStudent(null);
      return;
    }
    setSelectedStudent(updatedStudent);
  }, [rows, selectedStudent]);

  const markMutation = useMutation({
    mutationFn: (payload: { student: number; lesson: number; status: "present" | "absent"; reason: string }) =>
      markAttendance(payload),
    onSuccess: async () => {
      message.success("Davomat override qilindi.");
      setOverrideDraft(null);
      setOverrideReason("");
      await invalidateAdminQueries(qc, [
        ADMIN_QUERY_KEYS.attendance(lessonIdsKey),
        ADMIN_QUERY_KEYS.attendanceOverrideHistory(),
      ]);
    },
    onError: (error) =>
      message.error(
        getAdminApiErrorMessage(error, ["reason", "detail"], "Override saqlanmadi."),
      ),
  });

  const resetFilters = () => {
    setGroupFilter(null);
    setSearch("");
  };

  const selectDirection = (direction: Direction) => {
    setSelectedDirection(direction);
    setSelectedSubject(null);
    setSelectedStudent(null);
    setHistoryTarget(null);
    resetFilters();
  };

  const resetDirectionSelection = () => {
    setSelectedDirection(null);
    setSelectedSubject(null);
    setSelectedStudent(null);
    setHistoryTarget(null);
    resetFilters();
  };

  const selectSubject = (subject: AttendanceSubjectCard) => {
    setSelectedSubject(subject);
    setSelectedStudent(null);
    setHistoryTarget(null);
    resetFilters();
  };

  const clearSelectedSubject = () => {
    setSelectedSubject(null);
    setSelectedStudent(null);
    setHistoryTarget(null);
    resetFilters();
  };

  const openOverrideModal = (draft: OverrideDraft) => {
    setOverrideDraft(draft);
    setOverrideReason("");
  };

  const closeOverrideModal = () => {
    if (markMutation.isPending) return;
    setOverrideDraft(null);
    setOverrideReason("");
  };

  const submitOverride = () => {
    if (!overrideDraft) return;
    const reason = overrideReason.trim();
    if (reason.length < 5) {
      message.warning("Override uchun kamida 5 ta belgi sabab yozing.");
      return;
    }
    markMutation.mutate({ ...overrideDraft, reason });
  };

  return {
    clearSelectedSubject,
    closeHistory: () => setHistoryTarget(null),
    closeOverrideModal,
    closeStudentDetails: () => setSelectedStudent(null),
    directions: directions || [],
    groupFilter,
    groupOptions,
    historyTarget,
    loadingAttendance,
    loadingDirections,
    loadingOverrideHistory,
    openHistory: (target: HistoryTarget) => setHistoryTarget(target),
    openOverrideModal,
    overrideDraft,
    overrideHistory,
    overrideReason,
    overrideSaving: markMutation.isPending,
    resetDirectionSelection,
    rows,
    search,
    selectDirection,
    selectedDirection,
    selectedStudent,
    selectedSubject,
    selectStudent: (student: StudentRow) => setSelectedStudent(student),
    selectSubject,
    setGroupFilter,
    setOverrideReason,
    setSearch,
    subjectCards,
    submitOverride,
  };
};

export type AdminAttendanceController = ReturnType<typeof useAdminAttendanceController>;
