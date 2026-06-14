import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Button, Card, Col, Empty, Progress, Row, Select,
  Skeleton, Statistic, Table, Tag, Tooltip, Typography,
} from "antd";
import {
  BarChartOutlined,
  CheckCircleFilled,
  CloseCircleFilled,
  DashboardOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { fetchActivityReport, type LessonActivityLog } from "../../api/attendance";

const { Title, Text } = Typography;

const ACTIVITY_STATUS_CFG = {
  active: { color: "#52c41a", label: "Faol qatnashdi", tagColor: "success" as const },
  partial: { color: "#faad14", label: "Qisman qatnashdi", tagColor: "warning" as const },
  absent: { color: "#ff4d4f", label: "Qatnashmadi", tagColor: "error" as const },
};

const BoolCell = ({ value }: { value: boolean }) =>
  value ? (
    <CheckCircleFilled style={{ color: "#52c41a" }} />
  ) : (
    <CloseCircleFilled style={{ color: "#d9d9d9" }} />
  );

// ── Activity Hisobot Panel ─────────────────────────────────
const ActivityReportPanel = () => {
  const [groupId, setGroupId] = useState<number | undefined>();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-activity-report", groupId],
    queryFn: () => fetchActivityReport(groupId ? { group_id: groupId } : undefined),
    staleTime: 30_000,
  });

  const columns = [
    {
      title: "Talaba",
      dataIndex: "student_name",
      key: "student_name",
      render: (v: string) => <strong>{v || "-"}</strong>,
    },
    {
      title: "Dars mavzusi",
      dataIndex: "lesson_topic",
      key: "lesson_topic",
      render: (v: string, r: LessonActivityLog) => v || `Dars #${r.lesson}`,
    },
    {
      title: "Sahifa",
      key: "lesson_opened",
      align: "center" as const,
      render: (_: unknown, r: LessonActivityLog) => <BoolCell value={r.lesson_opened} />,
    },
    {
      title: "Material",
      key: "material_viewed",
      align: "center" as const,
      render: (_: unknown, r: LessonActivityLog) => <BoolCell value={r.material_viewed} />,
    },
    {
      title: "Test",
      key: "test",
      align: "center" as const,
      render: (_: unknown, r: LessonActivityLog) =>
        r.test_attended ? (
          <Tag color={r.test_score >= 60 ? "green" : "orange"}>{Math.round(r.test_score)}%</Tag>
        ) : (
          <CloseCircleFilled style={{ color: "#d9d9d9" }} />
        ),
    },
    {
      title: "Topshiriq",
      key: "assignment",
      align: "center" as const,
      render: (_: unknown, r: LessonActivityLog) => <BoolCell value={r.assignment_submitted} />,
    },
    {
      title: "Ball",
      key: "total_score",
      sorter: (a: LessonActivityLog, b: LessonActivityLog) => a.total_score - b.total_score,
      render: (_: unknown, r: LessonActivityLog) => {
        const color =
          r.total_score >= 70 ? "#52c41a" : r.total_score >= 40 ? "#faad14" : "#ff4d4f";
        return (
          <Tooltip title={`${r.total_score}/100`}>
            <Progress percent={Math.round(r.total_score)} size="small" strokeColor={color} style={{ minWidth: 90 }} />
          </Tooltip>
        );
      },
    },
    {
      title: "Holat",
      key: "status",
      filters: [
        { text: "Faol", value: "active" },
        { text: "Qisman", value: "partial" },
        { text: "Qatnashmadi", value: "absent" },
      ],
      onFilter: (value: any, r: LessonActivityLog) => r.status === value,
      render: (_: unknown, r: LessonActivityLog) => {
        const cfg = ACTIVITY_STATUS_CFG[r.status] || ACTIVITY_STATUS_CFG.absent;
        return <Tag color={cfg.tagColor}>{cfg.label}</Tag>;
      },
    },
  ];

  const summary = data?.summary;

  return (
    <div>
      <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Button
          onClick={() => setGroupId(undefined)}
          type={!groupId ? "primary" : "default"}
        >
          Barcha guruhlar
        </Button>
      </div>

      {/* Umumiy statistika */}
      {summary && (
        <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
          {[
            { label: "Jami yozuv", value: summary.total, color: "#1677ff", icon: "📊" },
            {
              label: "Faol",
              value: summary.active,
              extra: summary.active_pct ? `${summary.active_pct}%` : undefined,
              color: "#52c41a",
              icon: "✅",
            },
            {
              label: "Qisman",
              value: summary.partial,
              extra: summary.partial_pct ? `${summary.partial_pct}%` : undefined,
              color: "#faad14",
              icon: "⚠️",
            },
            {
              label: "Qatnashmadi",
              value: summary.absent,
              extra: summary.absent_pct ? `${summary.absent_pct}%` : undefined,
              color: "#ff4d4f",
              icon: "❌",
            },
          ].map((s) => (
            <Col xs={12} sm={6} key={s.label}>
              <Card
                style={{
                  borderRadius: 10,
                  textAlign: "center",
                  border: `1.5px solid ${s.color}33`,
                  background: `linear-gradient(135deg,#fff,${s.color}11)`,
                }}
                bodyStyle={{ padding: "12px 8px" }}
              >
                <div style={{ fontSize: 20 }}>{s.icon}</div>
                <div style={{ fontWeight: 800, fontSize: 22, color: s.color }}>{s.value}</div>
                {s.extra && (
                  <div style={{ fontSize: 12, color: s.color, fontWeight: 600 }}>{s.extra}</div>
                )}
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {s.label}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (data?.records || []).length ? (
        <Table
          rowKey="id"
          columns={columns}
          dataSource={data?.records || []}
          pagination={{ pageSize: 25 }}
          scroll={{ x: 900 }}
          size="small"
        />
      ) : (
        <Empty description="Hali faoliyat davomati qayd etilmagan" />
      )}
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────
const AdminAnalyticsPage = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery(adminQueryOptions.analytics());
  const [activeSection, setActiveSection] = useState<"overview" | "activity">("overview");

  return (
    <div>
      {/* Section switcher */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Button
          type={activeSection === "overview" ? "primary" : "default"}
          icon={<DashboardOutlined />}
          onClick={() => setActiveSection("overview")}
        >
          Umumiy ko'rinish
        </Button>
        <Button
          type={activeSection === "activity" ? "primary" : "default"}
          icon={<BarChartOutlined />}
          onClick={() => setActiveSection("activity")}
        >
          Dars faoliyati hisoboti
        </Button>
      </div>

      {activeSection === "overview" ? (
        <Card title={t("adminAnalytics.pageTitle")}>
          {isLoading ? (
            <Skeleton active />
          ) : (
            <>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={6}>
                  <Statistic title={t("adminAnalytics.users")} value={data?.users?.total || 0} />
                </Col>
                <Col xs={24} md={6}>
                  <Statistic title={t("adminAnalytics.students")} value={data?.users?.students || 0} />
                </Col>
                <Col xs={24} md={6}>
                  <Statistic title={t("adminAnalytics.teachers")} value={data?.users?.teachers || 0} />
                </Col>
                <Col xs={24} md={6}>
                  <Statistic title={t("adminAnalytics.admins")} value={data?.users?.admins || 0} />
                </Col>
              </Row>
              <Row gutter={[16, 16]} style={{ marginTop: "var(--space-4)" }}>
                <Col xs={24} md={6}>
                  <Statistic title={t("adminAnalytics.groups")} value={data?.groups || 0} />
                </Col>
                <Col xs={24} md={6}>
                  <Statistic title={t("adminAnalytics.lessonsTotal")} value={data?.lessons_total || 0} />
                </Col>
                <Col xs={24} md={6}>
                  <Statistic title={t("adminAnalytics.testsTotal")} value={data?.tests_total || 0} />
                </Col>
                <Col xs={24} md={6}>
                  <Statistic title={t("adminAnalytics.assignmentsTotal")} value={data?.assignments_total || 0} />
                </Col>
              </Row>
              <Row gutter={[16, 16]} style={{ marginTop: "var(--space-4)" }}>
                <Col xs={24} md={6}>
                  <Statistic title={t("adminAnalytics.todayLessons")} value={data?.today?.lessons || 0} />
                </Col>
                <Col xs={24} md={6}>
                  <Statistic title={t("adminAnalytics.todayTests")} value={data?.today?.tests || 0} />
                </Col>
                <Col xs={24} md={6}>
                  <Statistic title={t("adminAnalytics.teacherSubject")} value={data?.teacher_subject_links || 0} />
                </Col>
              </Row>
            </>
          )}
        </Card>
      ) : (
        <Card
          title={
            <span>
              <BarChartOutlined style={{ marginRight: 8 }} />
              Dars Faoliyati Davomati Hisoboti
            </span>
          }
        >
          <ActivityReportPanel />
        </Card>
      )}
    </div>
  );
};

export default AdminAnalyticsPage;
