import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import type { AttendanceOverrideLog } from "../../../api/attendance";
import type { AdminAttendanceController } from "../hooks/useAdminAttendanceController";

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

  return {
    ...actual,
    Modal,
  };
});

import AdminAttendanceDetailsModal from "./AdminAttendanceDetailsModal";
import AdminAttendanceHistoryModal from "./AdminAttendanceHistoryModal";
import AdminAttendanceOverrideModal from "./AdminAttendanceOverrideModal";

const createController = (
  overrides: Partial<AdminAttendanceController> = {},
): AdminAttendanceController =>
  ({
    closeHistory: vi.fn(),
    closeOverrideModal: vi.fn(),
    closeStudentDetails: vi.fn(),
    directions: [],
    groupFilter: null,
    groupOptions: [],
    historyTarget: null,
    loadingAttendance: false,
    loadingDirections: false,
    loadingOverrideHistory: false,
    openHistory: vi.fn(),
    openOverrideModal: vi.fn(),
    overrideDraft: null,
    overrideHistory: [] as AttendanceOverrideLog[],
    overrideReason: "",
    overrideSaving: false,
    resetDirectionSelection: vi.fn(),
    rows: [],
    search: "",
    selectDirection: vi.fn(),
    selectedDirection: null,
    selectedStudent: null,
    selectedSubject: null,
    selectStudent: vi.fn(),
    selectSubject: vi.fn(),
    setGroupFilter: vi.fn(),
    setOverrideReason: vi.fn(),
    setSearch: vi.fn(),
    subjectCards: [],
    submitOverride: vi.fn(),
    clearSelectedSubject: vi.fn(),
    ...overrides,
  }) as AdminAttendanceController;

describe("admin attendance view components", () => {
  it("renders selected student details", () => {
    const controller = createController({
      selectedStudent: {
        studentId: 7,
        studentName: "Ali Valiyev",
        groupName: "SE-201",
        levelLabel: "uz | 2-bosqich",
        absentCount: 1,
        absentLessons: [
          {
            lessonId: 51,
            topic: "Normalization",
            subject: "Databases",
            group: "SE-201",
            status: "absent",
            finalized: true,
            manualOverride: true,
            overrideReason: "Manual tekshirildi",
          },
        ],
      },
    });

    const html = renderToStaticMarkup(
      React.createElement(AdminAttendanceDetailsModal, { controller }),
    );

    expect(html).toContain("Davomat tafsilotlari");
    expect(html).toContain("Normalization");
    expect(html).toContain("Manual");
  });

  it("renders override and history modals", () => {
    const controller = createController({
      overrideDraft: {
        lesson: 51,
        student: 7,
        status: "present",
        studentName: "Ali Valiyev",
      },
      overrideReason: "Manual tekshirildi",
      historyTarget: {
        lesson: 51,
        student: 7,
        studentName: "Ali Valiyev",
      },
      overrideHistory: [
        {
          id: 1,
          attendance: 11,
          previous_status: "absent",
          new_status: "present",
          reason: "Manual tekshirildi",
          created_at: "2026-03-18T09:00:00Z",
        },
      ] as AttendanceOverrideLog[],
    });

    const html = renderToStaticMarkup(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(AdminAttendanceOverrideModal, { controller }),
        React.createElement(AdminAttendanceHistoryModal, { controller }),
      ),
    );

    expect(html).toContain("Davomat override");
    expect(html).toContain("Ali Valiyev");
    expect(html).toContain("Override tarixi");
    expect(html).toContain("Manual tekshirildi");
  });
});
