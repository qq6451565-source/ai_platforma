import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Form, message } from "antd";

import type { EnrollmentDetailItem, EnrollmentItem } from "../../../api/admin";
import {
  approveEnrollment,
  deleteEnrollmentApplicant,
  reopenEnrollment,
  rejectEnrollment,
  reverifyEnrollment,
  updateEnrollmentApplicant,
} from "../../../api/admin";
import { buildDirectionNameMap } from "../utils/adminRegistry";
import {
  getBlockedEnrollmentActionItems,
  getEnrollmentActionReason,
  getEnrollmentAllowedActions,
  getEnrollmentActionReasons,
} from "../utils/adminEnrollment";
import { adminQueryOptions } from "../utils/adminQueryOptions";
import {
  getAdminApiErrorMessage,
  getEnrollmentInvalidationKeys,
  invalidateAdminQueries,
} from "../utils/adminWorkflowMutations";

type ApproveValues = {
  role: "student" | "teacher";
  group_id?: number;
  subject_id?: number;
  group_ids?: number[];
  admission_year?: number;
  manual_override_reason?: string;
};

type RejectValues = {
  reject_reason?: string;
};

type ReopenValues = {
  reopen_reason?: string;
};

type EditValues = {
  full_name?: string;
  phone?: string;
  email?: string;
  direction_choice?: number | null;
};

export const useAdminEnrollmentController = () => {
  const qc = useQueryClient();
  const [detailOpen, setDetailOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedApplicant, setSelectedApplicant] = useState<EnrollmentItem | EnrollmentDetailItem | null>(null);
  const [detailApplicantId, setDetailApplicantId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [approveForm] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const [reopenForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const { data: applicants, isLoading } = useQuery(adminQueryOptions.enrollmentList());
  const { data: groups } = useQuery(adminQueryOptions.groups());
  const { data: subjects } = useQuery(adminQueryOptions.subjects());
  const { data: directions } = useQuery(adminQueryOptions.directions());
  const { data: detailApplicant, isFetching: detailLoading } = useQuery({
    ...adminQueryOptions.enrollmentDetail(detailApplicantId),
    enabled: detailOpen && detailApplicantId !== null,
  });
  const { data: applicantAuditHistory, isFetching: applicantAuditLoading } = useQuery({
    ...adminQueryOptions.enrollmentAudit(detailApplicantId),
    enabled: detailOpen && detailApplicantId !== null,
  });

  const currentApplicant = (detailApplicant ?? selectedApplicant) as
    | EnrollmentDetailItem
    | EnrollmentItem
    | null;

  const directionMap = useMemo(
    () => buildDirectionNameMap(directions || []),
    [directions],
  );

  const invalidateEnrollment = async (id?: number | null) => {
    await invalidateAdminQueries(qc, getEnrollmentInvalidationKeys(id));
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailApplicantId(null);
  };

  const openDetails = (item: EnrollmentItem | EnrollmentDetailItem) => {
    setSelectedApplicant(item);
    setDetailApplicantId(item.id);
    setDetailOpen(true);
  };

  const openApprove = (item: EnrollmentItem | EnrollmentDetailItem) => {
    if (!getEnrollmentAllowedActions(item).can_approve) {
      message.warning(getEnrollmentActionReason(item, "can_approve", "Bu ariza uchun tasdiqlash yopilgan."));
      return;
    }
    setSelectedApplicant(item);
    approveForm.setFieldsValue({
      role: "student",
      group_id: undefined,
      admission_year: new Date().getFullYear(),
      subject_id: undefined,
      group_ids: [],
      manual_override_reason: undefined,
    });
    setApproveOpen(true);
  };

  const closeApprove = () => setApproveOpen(false);

  const openReject = (item: EnrollmentItem | EnrollmentDetailItem) => {
    if (!getEnrollmentAllowedActions(item).can_reject) {
      message.warning(getEnrollmentActionReason(item, "can_reject", "Bu ariza uchun rad etish yopilgan."));
      return;
    }
    setSelectedApplicant(item);
    rejectForm.setFieldsValue({
      reject_reason: undefined,
    });
    setRejectOpen(true);
  };

  const closeReject = () => setRejectOpen(false);

  const openEdit = (item: EnrollmentItem | EnrollmentDetailItem) => {
    if (!getEnrollmentAllowedActions(item).can_edit) {
      message.warning(getEnrollmentActionReason(item, "can_edit", "Bu ariza uchun tahrirlash yopilgan."));
      return;
    }
    setSelectedApplicant(item);
    editForm.setFieldsValue({
      full_name: item.full_name || "",
      phone: item.phone || "",
      email: item.email || "",
      direction_choice: item.direction_choice ?? undefined,
    });
    setEditOpen(true);
  };

  const closeEdit = () => setEditOpen(false);

  const openReopen = (item: EnrollmentItem | EnrollmentDetailItem) => {
    if (!getEnrollmentAllowedActions(item).can_reopen) {
      message.warning(getEnrollmentActionReason(item, "can_reopen", "Bu ariza uchun qayta ochish yopilgan."));
      return;
    }
    setSelectedApplicant(item);
    reopenForm.setFieldsValue({
      reopen_reason: undefined,
    });
    setReopenOpen(true);
  };

  const closeReopen = () => setReopenOpen(false);

  const approveMutation = useMutation({
    mutationFn: (payload: {
      id: number;
      role: "student" | "teacher";
      group_id?: number;
      subject_id?: number;
      group_ids?: number[];
      admission_year?: number;
      manual_override_reason?: string;
    }) => approveEnrollment(payload.id, payload),
    onSuccess: async (_response, payload) => {
      message.success("Ariza tasdiqlandi");
      await invalidateEnrollment(payload.id);
      setApproveOpen(false);
      approveForm.resetFields();
    },
    onError: (error) =>
      message.error(
        getAdminApiErrorMessage(
          error,
          ["group_id", "subject_id", "manual_override_reason", "detail"],
          "Tasdiqlashda xato",
        ),
      ),
  });

  const rejectMutation = useMutation({
    mutationFn: (payload: { id: number; reject_reason: string }) =>
      rejectEnrollment(payload.id, { reject_reason: payload.reject_reason }),
    onSuccess: async (_response, payload) => {
      message.success("Ariza rad etildi");
      await invalidateEnrollment(payload.id);
      setRejectOpen(false);
      rejectForm.resetFields();
    },
    onError: (error) =>
      message.error(
        getAdminApiErrorMessage(error, ["reject_reason", "detail"], "Rad etishda xato"),
      ),
  });

  const reopenMutation = useMutation({
    mutationFn: (payload: { id: number; reopen_reason: string }) =>
      reopenEnrollment(payload.id, { reopen_reason: payload.reopen_reason }),
    onSuccess: async (_response, payload) => {
      message.success("Ariza qayta ochildi");
      await invalidateEnrollment(payload.id);
      setReopenOpen(false);
      reopenForm.resetFields();
    },
    onError: (error) =>
      message.error(
        getAdminApiErrorMessage(error, ["reopen_reason", "detail"], "Qayta ochishda xato"),
      ),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { full_name?: string; phone?: string; email?: string; direction_choice?: number | null };
    }) => updateEnrollmentApplicant(id, data),
    onSuccess: async (_response, payload) => {
      message.success("Ariza yangilandi");
      await invalidateEnrollment(payload.id);
      setEditOpen(false);
      editForm.resetFields();
    },
    onError: (error) =>
      message.error(getAdminApiErrorMessage(error, ["full_name", "detail"], "Tahrirlashda xato")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteEnrollmentApplicant(id),
    onMutate: (id) => setDeleteId(id),
    onSuccess: async (_response, id) => {
      message.success("Ariza o'chirildi");
      await invalidateEnrollment(id);
      if (detailApplicantId === id) {
        closeDetail();
      }
      if (selectedApplicant?.id === id) {
        setSelectedApplicant(null);
      }
    },
    onError: (error) =>
      message.error(getAdminApiErrorMessage(error, ["detail"], "O'chirishda xato")),
    onSettled: () => setDeleteId(null),
  });

  const reverifyMutation = useMutation({
    mutationFn: (id: number) => reverifyEnrollment(id),
    onSuccess: async (_response, id) => {
      message.success("AI qayta tekshirildi");
      await invalidateEnrollment(id);
    },
    onError: (error) =>
      message.error(getAdminApiErrorMessage(error, ["detail", "error"], "AI tekshiruvda xato")),
  });

  const submitReject = async (values: RejectValues) => {
    if (!selectedApplicant) return;
    await rejectMutation.mutateAsync({
      id: selectedApplicant.id,
      reject_reason: values.reject_reason?.trim() || "",
    });
  };

  const submitReopen = async (values: ReopenValues) => {
    if (!selectedApplicant) return;
    await reopenMutation.mutateAsync({
      id: selectedApplicant.id,
      reopen_reason: values.reopen_reason?.trim() || "",
    });
  };

  const removeApplicant = async (item: EnrollmentItem | EnrollmentDetailItem) => {
    if (!getEnrollmentAllowedActions(item).can_delete) {
      message.warning(getEnrollmentActionReason(item, "can_delete", "Bu ariza uchun o'chirish yopilgan."));
      return;
    }
    setSelectedApplicant(item);
    await deleteMutation.mutateAsync(item.id);
  };

  const reverifyApplicant = async (item: EnrollmentItem | EnrollmentDetailItem) => {
    if (!getEnrollmentAllowedActions(item).can_reverify) {
      message.warning(
        getEnrollmentActionReason(item, "can_reverify", "Bu ariza uchun AI qayta tekshiruvi yopilgan."),
      );
      return;
    }
    setSelectedApplicant(item);
    await reverifyMutation.mutateAsync(item.id);
  };

  const submitApprove = async (values: ApproveValues) => {
    if (!selectedApplicant) return;
    const role = values.role;
    if (role === "student") {
      if (!values.group_id) {
        message.warning("Guruh tanlang");
        return;
      }
      await approveMutation.mutateAsync({
        id: selectedApplicant.id,
        role,
        group_id: values.group_id,
        admission_year: values.admission_year ?? new Date().getFullYear(),
        manual_override_reason: values.manual_override_reason?.trim() || undefined,
      });
      return;
    }

    if (!values.subject_id) {
      message.warning("Fan tanlang");
      return;
    }
    await approveMutation.mutateAsync({
      id: selectedApplicant.id,
      role,
      subject_id: values.subject_id,
      group_ids: values.group_ids || [],
      manual_override_reason: values.manual_override_reason?.trim() || undefined,
    });
  };

  const submitEdit = async (values: EditValues) => {
    if (!selectedApplicant) return;
    await updateMutation.mutateAsync({
      id: selectedApplicant.id,
      data: {
        full_name: values.full_name?.trim() || selectedApplicant.full_name || "",
        phone: values.phone || "",
        email: values.email || "",
        direction_choice: values.direction_choice ?? null,
      },
    });
  };

  return {
    applicantAuditLoading,
    applicants: applicants || [],
    approveForm,
    approveOpen,
    approving: approveMutation.isPending,
    blockedActionItems: getBlockedEnrollmentActionItems(currentApplicant),
    closeApprove,
    closeDetail,
    closeEdit,
    closeReject,
    closeReopen,
    currentActions: getEnrollmentAllowedActions(currentApplicant),
    currentApplicant,
    currentReasons: getEnrollmentActionReasons(currentApplicant),
    decisionHistory: applicantAuditHistory || [],
    deleteId,
    deletePending: deleteMutation.isPending,
    detailApplicant,
    detailHistory: (currentApplicant as EnrollmentDetailItem | null)?.verification_history || [],
    detailLoading,
    detailOpen,
    detailSummary: currentApplicant?.ai_summary,
    directionMap,
    directions: directions || [],
    editForm,
    editOpen,
    groups: groups || [],
    isLoading,
    openApprove,
    openDetails,
    openEdit,
    openReopen,
    openReject,
    rejectForm,
    rejectOpen,
    rejecting: rejectMutation.isPending,
    removeApplicant,
    reopenForm,
    reopenOpen,
    reopening: reopenMutation.isPending,
    reverifyApplicant,
    reverifying: reverifyMutation.isPending,
    selectedApplicant,
    setSelectedApplicant,
    submitApprove,
    submitEdit,
    submitReject,
    submitReopen,
    subjects: subjects || [],
    updating: updateMutation.isPending,
  };
};
