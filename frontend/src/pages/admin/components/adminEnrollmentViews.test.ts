import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { EnrollmentItem } from "../../../api/admin";
import type { AdminEnrollmentController } from "../hooks/useAdminEnrollmentController";

vi.mock("antd", async () => {
  const ReactModule = await import("react");
  const actual = await vi.importActual<typeof import("antd")>("antd");

  const Modal = ({ open, title, children }: any) =>
    open
      ? ReactModule.createElement(
          "section",
          { "data-modal": title || "modal" },
          title ? ReactModule.createElement("h2", null, title) : null,
          children,
        )
      : null;
  const Drawer = ({ open, title, children }: any) =>
    open
      ? ReactModule.createElement(
          "aside",
          { "data-drawer": title || "drawer" },
          title ? ReactModule.createElement("h2", null, title) : null,
          children,
        )
      : null;

  return {
    ...actual,
    Drawer,
    Modal,
  };
});

import AdminEnrollmentApproveModal from "./AdminEnrollmentApproveModal";
import AdminEnrollmentDetailDrawer from "./AdminEnrollmentDetailDrawer";
import AdminEnrollmentEditModal from "./AdminEnrollmentEditModal";
import AdminEnrollmentRejectModal from "./AdminEnrollmentRejectModal";
import AdminEnrollmentReopenModal from "./AdminEnrollmentReopenModal";

const baseApplicant: EnrollmentItem = {
  id: 5,
  full_name: "Dilshoda Karimova",
  phone: "+998901112233",
  email: "dilshoda@example.com",
  direction_choice: 100,
  direction_name: "Software Engineering",
  status: "pending",
  ai_summary: {
    status: "verified",
    label: "Verified",
    color: "green",
    message: "Shaxs tasdiqlandi",
    confidence: 0.93,
    threshold: 0.8,
    checked_at: "2026-03-18T09:00:00Z",
    manual_review_required: false,
    face_embedding_ready: true,
    event_summary: ["Passport va selfie mos"],
  },
  allowed_actions: {
    can_edit: true,
    can_delete: true,
    can_approve: true,
    can_reject: true,
    can_reopen: false,
    can_reverify: true,
  },
  action_reasons: {},
  created_at: "2026-03-18T08:00:00Z",
};

const createController = (
  overrides: Partial<AdminEnrollmentController> = {},
): AdminEnrollmentController =>
  ({
    applicantAuditLoading: false,
    applicants: [],
    approveForm: undefined as any,
    approveOpen: false,
    approving: false,
    blockedActionItems: [],
    closeApprove: vi.fn(),
    closeDetail: vi.fn(),
    closeEdit: vi.fn(),
    closeReject: vi.fn(),
    closeReopen: vi.fn(),
    currentActions: {
      can_edit: true,
      can_delete: true,
      can_approve: true,
      can_reject: true,
      can_reopen: false,
      can_reverify: true,
    },
    currentApplicant: null,
    currentReasons: {},
    decisionHistory: [],
    deleteId: null,
    deletePending: false,
    detailApplicant: null,
    detailHistory: [],
    detailLoading: false,
    detailOpen: false,
    detailSummary: undefined,
    directionMap: new Map([[100, "Software Engineering"]]),
    directions: [{ id: 100, name: "Software Engineering" }],
    editForm: undefined as any,
    editOpen: false,
    groups: [{ id: 11, name: "SE-201", direction: 100, level: 2, language: "uz" }],
    isLoading: false,
    openApprove: vi.fn(),
    openDetails: vi.fn(),
    openEdit: vi.fn(),
    openReopen: vi.fn(),
    openReject: vi.fn(),
    rejectForm: undefined as any,
    rejectOpen: false,
    rejecting: false,
    removeApplicant: vi.fn(),
    reopenForm: undefined as any,
    reopenOpen: false,
    reopening: false,
    reverifyApplicant: vi.fn(),
    reverifying: false,
    selectedApplicant: null,
    setSelectedApplicant: vi.fn(),
    submitApprove: vi.fn(),
    submitEdit: vi.fn(),
    submitReject: vi.fn(),
    submitReopen: vi.fn(),
    subjects: [{ id: 7, name: "Databases", directions: [100] }],
    updating: false,
    ...overrides,
  }) as AdminEnrollmentController;

describe("admin enrollment view components", () => {
  it("renders detail drawer with applicant summary", () => {
    const controller = createController({
      detailOpen: true,
      currentApplicant: {
        ...baseApplicant,
        documents: {
          passport_front: "/passport.jpg",
          face_image: "/selfie.jpg",
        },
        verification_history: [],
      } as any,
      detailApplicant: baseApplicant as any,
      detailSummary: baseApplicant.ai_summary,
    });

    const html = renderToStaticMarkup(
      React.createElement(AdminEnrollmentDetailDrawer, { controller }),
    );

    expect(html).toContain("Ariza review");
    expect(html).toContain("Dilshoda Karimova");
    expect(html).toContain("Shaxs tasdiqlandi");
    expect(html).toContain("AI qayta tekshir");
  });

  it("renders enrollment action modals", () => {
    const controller = createController({
      selectedApplicant: baseApplicant as any,
      approveOpen: true,
      editOpen: true,
      rejectOpen: true,
      reopenOpen: true,
    });

    const html = renderToStaticMarkup(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(AdminEnrollmentApproveModal, { controller }),
        React.createElement(AdminEnrollmentEditModal, { controller }),
        React.createElement(AdminEnrollmentRejectModal, { controller }),
        React.createElement(AdminEnrollmentReopenModal, { controller }),
      ),
    );

    expect(html).toContain("Arizani tasdiqlash");
    expect(html).toContain("Arizani tahrirlash");
    expect(html).toContain("Arizani rad etish");
    expect(html).toContain("Arizani qayta ochish");
    expect(html).toContain("AI tasdiqladi");
  });
});
