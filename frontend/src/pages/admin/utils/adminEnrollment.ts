import type { AlertProps } from "antd";
import dayjs from "dayjs";

import type {
  AuditLog,
  EnrollmentAiSummary,
  EnrollmentDetailItem,
  EnrollmentItem,
} from "../../../api/admin";

export const ENROLLMENT_AI_REASON_LABELS: Record<string, string> = {
  timeout: "Timeout",
  gateway_unreachable: "Gateway ulanmayapti",
  connection_error: "Ulanish xatosi",
  dns_error: "DNS xatosi",
  ssl_error: "SSL xatosi",
  auth_error: "API kalit/ruxsat xatosi",
  rate_limited: "Rate limit",
  gateway_error: "Gateway ichki xatosi",
};

export const ENROLLMENT_AUDIT_ACTION_LABELS: Record<string, string> = {
  enrollment_approved: "Ariza tasdiqlandi",
  enrollment_override_approved: "Qo'lda tasdiqlab approve qilindi",
  enrollment_rejected: "Ariza rad etildi",
  enrollment_reopened: "Ariza qayta ochildi",
  enrollment_reverified: "AI qayta tekshirildi",
};

export const ENROLLMENT_ACTION_LABELS = {
  can_edit: "Tahrirlash",
  can_delete: "O'chirish",
  can_approve: "Tasdiqlash",
  can_reject: "Rad etish",
  can_reverify: "AI qayta tekshir",
} as const;

export type EnrollmentActionKey = keyof typeof ENROLLMENT_ACTION_LABELS;

export type EnrollmentBlockedActionItem = {
  key: EnrollmentActionKey;
  label: string;
  reason: string;
};

export const formatEnrollmentDateTime = (value?: string | null) =>
  value ? dayjs(value).format("YYYY-MM-DD HH:mm") : "-";

export const formatEnrollmentConfidence = (value?: number | null) =>
  typeof value === "number" ? value.toFixed(3) : "-";

export const getFallbackEnrollmentAllowedActions = (status?: string) => ({
  can_edit: status !== "approved" && status !== "rejected",
  can_delete: status !== "approved" && status !== "rejected",
  can_approve: status === "pending" || status === "verified",
  can_reject: status === "pending" || status === "verified",
  can_reopen: status === "rejected",
  can_reverify: status === "pending" || status === "verified",
});

export const getFallbackEnrollmentActionReasons = (status?: string) => ({
  can_edit:
    status === "approved"
      ? "Tasdiqlangan ariza final holatda va tahrirlanmaydi."
      : status === "rejected"
        ? "Rad etilgan ariza avval qayta ochilishi kerak."
        : null,
  can_delete:
    status === "approved" || status === "rejected"
      ? "Final arizalar audit uchun saqlanadi."
      : null,
  can_approve:
    status === "approved"
      ? "Ariza allaqachon tasdiqlangan."
      : status === "rejected"
        ? "Rad etilgan ariza avval qayta ochilishi kerak."
        : null,
  can_reject:
    status === "approved"
      ? "Tasdiqlangan arizani rad etib bo'lmaydi."
      : status === "rejected"
        ? "Ariza allaqachon rad etilgan."
        : null,
  can_reopen: status === "rejected" ? null : "Faqat rad etilgan ariza qayta ochiladi.",
  can_reverify:
    status === "approved"
      ? "Tasdiqlangan ariza qayta tekshirilmaydi."
      : status === "rejected"
        ? "Rad etilgan ariza avval qayta ochilishi kerak."
        : null,
});

export const getEnrollmentAllowedActions = (item?: EnrollmentItem | EnrollmentDetailItem | null) =>
  item?.allowed_actions || getFallbackEnrollmentAllowedActions(item?.status);

export const getEnrollmentActionReasons = (item?: EnrollmentItem | EnrollmentDetailItem | null) =>
  item?.action_reasons || getFallbackEnrollmentActionReasons(item?.status);

export const getEnrollmentActionReason = (
  item: EnrollmentItem | EnrollmentDetailItem,
  key: keyof ReturnType<typeof getFallbackEnrollmentAllowedActions>,
  fallback: string,
) => getEnrollmentActionReasons(item)?.[key] || fallback;

export const getBlockedEnrollmentActionItems = (
  item?: EnrollmentItem | EnrollmentDetailItem | null,
): EnrollmentBlockedActionItem[] => {
  if (!item) return [];
  const actions = getEnrollmentAllowedActions(item);
  const reasons = getEnrollmentActionReasons(item);
  return (Object.keys(ENROLLMENT_ACTION_LABELS) as EnrollmentActionKey[])
    .filter((key) => !actions[key] && Boolean(reasons[key]))
    .map((key) => ({
      key,
      label: ENROLLMENT_ACTION_LABELS[key],
      reason: reasons[key] as string,
    }));
};

export const getEnrollmentStatusMeta = (status?: string) => {
  if (status === "approved") return { color: "green", label: "Tasdiqlangan" };
  if (status === "rejected") return { color: "red", label: "Rad etilgan" };
  if (status === "verified") return { color: "blue", label: "AI tekshirilgan" };
  return { color: "default", label: "Pending" };
};

export const getEnrollmentAiAlertType = (
  summary: EnrollmentAiSummary,
): AlertProps["type"] => {
  if (summary.status === "verified") return "success";
  if (summary.status === "unavailable") return "warning";
  if (summary.status === "not_verified") return "error";
  return "info";
};

export const getEnrollmentAuditTagColor = (action: AuditLog["action"]) => {
  if (action === "enrollment_override_approved") return "gold";
  if (action === "enrollment_rejected") return "red";
  if (action === "enrollment_reopened") return "blue";
  return "cyan";
};
