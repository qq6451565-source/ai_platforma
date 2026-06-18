import { useEffect } from "react";
import { Card, Col, Empty, List, Progress, Row, Skeleton, Tag, Tooltip, Typography } from "antd";
import {
  CheckCircleFilled,
  CloseCircleFilled,
  FileDoneOutlined,
  PlayCircleFilled,
  ReadOutlined,
  TrophyFilled,
} from "@ant-design/icons";
import { useQuery } from "@tanstack/react-query";
import { fetchMyActivityLogs, LessonActivityLog, trackLessonOpen } from "../../api/attendance";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useTranslation } from "react-i18next";

const { Title, Text } = Typography;

// Holat rangi va belgisi
const STATUS_CONFIG: Record<
  string,
  { color: string; bg: string; label: string; tagColor: string }
> = {
  active: {
    color: "#52c41a",
    bg: "linear-gradient(135deg,#f6ffed 0%,#d9f7be 100%)",
    label: "Faol qatnashdi",
    tagColor: "success",
  },
  partial: {
    color: "#faad14",
    bg: "linear-gradient(135deg,#fffbe6 0%,#fff1b8 100%)",
    label: "Qisman qatnashdi",
    tagColor: "warning",
  },
  absent: {
    color: "#ff4d4f",
    bg: "linear-gradient(135deg,#fff1f0 0%,#ffd8d6 100%)",
    label: "Qatnashmadi",
    tagColor: "error",
  },
};

// Bitta ko'rsatkich qatori
const IndicatorRow = ({
  icon,
  label,
  done,
  extra,
}: {
  icon: React.ReactNode;
  label: string;
  done: boolean;
  extra?: string;
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: "6px 0",
      borderBottom: "1px solid #f0f0f0",
    }}
  >
    <span style={{ fontSize: 18 }}>{icon}</span>
    <Text style={{ flex: 1 }}>{label}</Text>
    {extra && (
      <Text type="secondary" style={{ fontSize: 12 }}>
        {extra}
      </Text>
    )}
    {done ? (
      <CheckCircleFilled style={{ color: "#52c41a", fontSize: 18 }} />
    ) : (
      <CloseCircleFilled style={{ color: "#d9d9d9", fontSize: 18 }} />
    )}
  </div>
);

// Bitta dars kartochkasi
const ActivityCard = ({ record }: { record: LessonActivityLog }) => {
  const cfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.absent;
  const progressColor =
    record.total_score >= 70
      ? "#52c41a"
      : record.total_score >= 40
        ? "#faad14"
        : "#ff4d4f";

  // Asinxron (video) dars uchun ko'rilgan foiz
  const hasVideoData = (record.video_duration_seconds ?? 0) > 0;
  const videoPercent = Math.round((record.video_progress_ratio ?? 0) * 100);
  const materialExtra = hasVideoData
    ? `Video: ${videoPercent}% ko'rildi ${record.video_completed ? "✓" : ""}`
    : "+30 ball";

  return (
    <Card
      style={{
        background: cfg.bg,
        borderRadius: 14,
        border: `1.5px solid ${cfg.color}33`,
        marginBottom: 16,
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.2s",
      }}
      bodyStyle={{ padding: "20px 24px" }}
    >
      {/* Sarlavha qatori */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ReadOutlined style={{ color: cfg.color, fontSize: 20 }} />
            <Title level={5} style={{ margin: 0 }}>
              {record.lesson_topic || `Dars #${record.lesson}`}
            </Title>
          </div>
          {record.updated_at && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Yangilangan: {new Date(record.updated_at).toLocaleString("uz-UZ")}
            </Text>
          )}
        </div>
        <Tag color={cfg.tagColor} style={{ fontSize: 13, padding: "4px 12px", borderRadius: 8 }}>
          {cfg.label}
        </Tag>
      </div>

      <Row gutter={[16, 0]} align="middle" style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12}>
          <Tooltip title={`Jami ball: ${record.total_score} / 100`}>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Umumiy ball
              </Text>
              <Progress
                percent={Math.round(record.total_score)}
                strokeColor={progressColor}
                trailColor="#f0f0f0"
                strokeWidth={10}
                format={(p) => (
                  <span style={{ color: progressColor, fontWeight: 700 }}>{p}</span>
                )}
              />
            </div>
          </Tooltip>
        </Col>
        <Col xs={24} sm={12}>
          <div
            style={{
              textAlign: "center",
              padding: "8px 16px",
              background: "#fff",
              borderRadius: 10,
              border: `1px solid ${cfg.color}44`,
            }}
          >
            <TrophyFilled style={{ color: cfg.color, fontSize: 22 }} />
            <div style={{ fontWeight: 800, fontSize: 24, color: cfg.color, lineHeight: 1.2 }}>
              {Math.round(record.total_score)}
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              dan 100 ball
            </Text>
          </div>
        </Col>
      </Row>

      {/* Ko'rsatkichlar */}
      <div style={{ background: "#fff", borderRadius: 10, padding: "4px 12px" }}>
        <IndicatorRow
          icon={<ReadOutlined style={{ color: "#1677ff" }} />}
          label="Dars sahifasi ochildi"
          done={record.lesson_opened}
          extra="+20 ball"
        />
        <IndicatorRow
          icon={<PlayCircleFilled style={{ color: "#722ed1" }} />}
          label="Material / video ko'rildi"
          done={record.material_viewed || !!record.video_completed}
          extra={materialExtra}
        />
        <IndicatorRow
          icon={<TrophyFilled style={{ color: "#fa8c16" }} />}
          label={
            record.test_attended
              ? `Test ishlandi (${Math.round(record.test_score)}%)`
              : "Test hali ishlanmadi"
          }
          done={record.test_attended}
          extra="+30 ball (proporsional)"
        />
        <IndicatorRow
          icon={<FileDoneOutlined style={{ color: "#13c2c2" }} />}
          label="Topshiriq yuborildi"
          done={record.assignment_submitted}
          extra="+20 ball"
        />
      </div>
    </Card>
  );
};

const StudentAttendance = () => {
  usePageTitle("nav.attendance");
  const { t } = useTranslation();

  const { data: logs, isLoading } = useQuery({
    queryKey: ["my-activity-logs"],
    queryFn: () => fetchMyActivityLogs(),
    staleTime: 30_000,
  });

  // Sahifa ochilganda biz uni frontend tomonidan track qilmaymiz — 
  // bu faqat dars sahifasida (Materials/Lessons) chaqiriladi.

  const sorted = (logs || []).slice().sort((a, b) => {
    const aT = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const bT = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return bT - aT;
  });

  // Umumiy statistika
  const total = sorted.length;
  const active = sorted.filter((r) => r.status === "active").length;
  const partial = sorted.filter((r) => r.status === "partial").length;
  const absent = sorted.filter((r) => r.status === "absent").length;

  return (
    <div className="page-shell">
      <Title level={4} className="page-title">
        📊 Dars Faoliyati Davomati
      </Title>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : !sorted.length ? (
        <Empty
          description="Hali biror darsda faoliyat qayd etilmagan"
          style={{ marginTop: 60 }}
        />
      ) : (
        <>
          {/* Statistika kartochkalari */}
          <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
            {[
              { label: "Jami dars", value: total, color: "#1677ff", icon: "📚" },
              { label: "Faol qatnashdi", value: active, color: "#52c41a", icon: "✅" },
              { label: "Qisman qatnashdi", value: partial, color: "#faad14", icon: "⚠️" },
              { label: "Qatnashmadi", value: absent, color: "#ff4d4f", icon: "❌" },
            ].map((s) => (
              <Col xs={12} sm={6} key={s.label}>
                <Card
                  style={{
                    borderRadius: 12,
                    textAlign: "center",
                    border: `1.5px solid ${s.color}33`,
                    background: `linear-gradient(135deg, #fff 0%, ${s.color}11 100%)`,
                  }}
                  bodyStyle={{ padding: "14px 10px" }}
                >
                  <div style={{ fontSize: 24 }}>{s.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: 26, color: s.color }}>
                    {s.value}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {s.label}
                  </Text>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Darslar ro'yxati */}
          {sorted.map((record) => (
            <ActivityCard key={record.id} record={record} />
          ))}
        </>
      )}
    </div>
  );
};

export default StudentAttendance;
