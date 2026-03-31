import { Button, Card, List, Modal, Skeleton, Space, Typography, Grid } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchLessons } from "../../api/lessons";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";

const StudentSchedule = () => {
  const { t } = useTranslation();
  const { data: lessons, isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
  });
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(() => {
    const today = dayjs();
    return today.day() === 0 ? today.add(1, "day") : today;
  });
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [dayOpen, setDayOpen] = useState(false);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const weekdayNames = [
    t('days.monday'),
    t('days.tuesday'),
    t('days.wednesday'),
    t('days.thursday'),
    t('days.friday'),
    t('days.saturday')
  ];

  const normalizeDate = (date: dayjs.Dayjs) => (date.day() === 0 ? date.add(1, "day") : date);

  useEffect(() => {
    if (isMobile && viewMode !== "week") {
      setViewMode("week");
    }
  }, [isMobile, viewMode]);

  const lessonsByDate = (lessons || []).reduce<Record<string, any[]>>((acc, lesson) => {
    const key = lesson.start_time ? dayjs(lesson.start_time).format("YYYY-MM-DD") : "";
    if (!key) return acc;
    if (!acc[key]) acc[key] = [];
    acc[key].push(lesson);
    return acc;
  }, {});

  const daysFromMonday = selectedDate.day() === 0 ? 6 : selectedDate.day() - 1;
  const weekStart = selectedDate.subtract(daysFromMonday, "day");
  const weekDays = Array.from({ length: 6 }, (_, idx) => weekStart.add(idx, "day"));
  const weekLabel = `${weekStart.format("DD.MM")} - ${weekStart.add(5, "day").format("DD.MM.YYYY")}`;
  const monthLabel = selectedDate.format("MM.YYYY");
  const monthStart = selectedDate.startOf("month");
  const monthEnd = selectedDate.endOf("month");
  const monthStartOffset = monthStart.day() === 0 ? 6 : monthStart.day() - 1;
  const monthEndOffset = monthEnd.day() === 0 ? 6 : 6 - monthEnd.day();
  const gridStart = monthStart.subtract(monthStartOffset, "day");
  const gridEnd = monthEnd.add(monthEndOffset, "day");
  const monthDays = Array.from({ length: gridEnd.diff(gridStart, "day") + 1 }, (_, idx) =>
    gridStart.add(idx, "day")
  ).filter((day) => day.day() !== 0);
  const selectedKey = selectedDate.format("YYYY-MM-DD");
  const selectedLessons = (lessonsByDate[selectedKey] || [])
    .slice()
    .sort((a, b) => dayjs(a.start_time).valueOf() - dayjs(b.start_time).valueOf());

  const getLiveStatus = (lesson: any) => {
    if (!lesson?.start_time || !lesson?.end_time) {
      return { canJoin: false, label: t('schedule.noSchedule') };
    }
    const start = dayjs(lesson.start_time);
    const end = dayjs(lesson.end_time);
    const now = dayjs();
    if (now.isBefore(start)) return { canJoin: false, label: t('schedule.waitForStart') };
    if (now.isAfter(end)) return { canJoin: false, label: t('schedule.lessonEnded') };
    return { canJoin: true, label: t('schedule.joinLive') };
  };

  return (
    <div className="page-shell page-container">
      <Typography.Title level={4} className="page-title">{t('schedule.title')}</Typography.Title>
      {isLoading ? (
        <Skeleton active />
      ) : (
        <>
          <Card style={{ marginBottom: 24 }}>
            <div className="d-flex justify-between items-center flex-wrap gap-4">
              <Space size="middle">
                <Button
                  size="small"
                  onClick={() =>
                    setSelectedDate(
                      normalizeDate(viewMode === "week" ? selectedDate.subtract(1, "week") : selectedDate.subtract(1, "month"))
                    )
                  }
                >
                  {"<"}
                </Button>
                <Button
                  size="small"
                  onClick={() =>
                    setSelectedDate(
                      normalizeDate(viewMode === "week" ? selectedDate.add(1, "week") : selectedDate.add(1, "month"))
                    )
                  }
                >
                  {">"}
                </Button>
                <Button size="small" onClick={() => setSelectedDate(normalizeDate(dayjs()))}>
                  {t('common.today')}
                </Button>
                <Button
                  size="small"
                  type={viewMode === "week" ? "primary" : "default"}
                  onClick={() => setViewMode("week")}
                >
                  {t('common.week')}
                </Button>
                {!isMobile && (
                  <Button
                    size="small"
                    type={viewMode === "month" ? "primary" : "default"}
                    onClick={() => setViewMode("month")}
                  >
                    {t('common.month')}
                  </Button>
                )}
              </Space>
              <Typography.Text className="font-bold text-lg">
                {viewMode === "week" ? weekLabel : monthLabel}
              </Typography.Text>
            </div>
          </Card>

          <div className={`grid-cards ${viewMode === "week" ? "schedule-week-grid" : "schedule-month-grid"}`}>
            {(viewMode === "week" ? weekDays : monthDays).map((day) => {
              const key = day.format("YYYY-MM-DD");
              const dayLessons = (lessonsByDate[key] || [])
                .slice()
                .sort((a, b) => dayjs(a.start_time).valueOf() - dayjs(b.start_time).valueOf());
              const isToday = day.isSame(dayjs(), "day");
              const isOutside = viewMode === "month" && day.month() !== selectedDate.month();
              const weekdayIndex = day.day() === 0 ? null : day.day() - 1;

              return (
                <Card
                  key={key}
                  hoverable={!isOutside}
                  style={{ opacity: isOutside ? 0.5 : 1, cursor: isOutside ? 'default' : 'pointer', minHeight: '180px' }}
                  onClick={() => {
                    if (!isOutside) {
                      setSelectedDate(day);
                      setDayOpen(true);
                    }
                  }}
                >
                  <div className="d-flex justify-between items-center mb-4">
                    <Typography.Text strong>
                      {weekdayIndex !== null ? weekdayNames[weekdayIndex] : ''}
                    </Typography.Text>
                    {isToday && (
                      <span style={{
                        padding: '2px 8px',
                        background: 'rgba(37, 99, 235, 0.1)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: '#2563eb'
                      }}>
                        {t('common.today')}
                      </span>
                    )}
                  </div>
                  <Typography.Text style={{
                    display: 'block',
                    fontSize: '24px',
                    fontWeight: 700,
                    marginBottom: 16
                  }}>
                    {day.format("DD.MM")}
                  </Typography.Text>
                  <div className="d-flex flex-column gap-2">
                    {dayLessons.slice(0, 3).map((item) => {
                      const subjectLabel = item.subject_name || t('schedule.subject');
                      const timeLabel =
                        item.start_time && item.end_time
                          ? `${dayjs(item.start_time).format("HH:mm")} - ${dayjs(item.end_time).format("HH:mm")}`
                          : "-";
                      return (
                        <div key={item.id} className="lesson-chip">
                          <Typography.Text className="lesson-chip-title">
                            {subjectLabel}
                          </Typography.Text>
                          <Typography.Text className="lesson-chip-time">
                            {timeLabel}
                          </Typography.Text>
                        </div>
                      );
                    })}
                    {dayLessons.length > 3 && (
                      <Typography.Text style={{ fontSize: '12px' }}>
                        +{dayLessons.length - 3} {t('schedule.moreLessons')}
                      </Typography.Text>
                    )}
                    {!dayLessons.length && (
                      <Typography.Text style={{ fontSize: '12px' }}>
                        {t('schedule.empty')}
                      </Typography.Text>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          <Modal
            title={`${t('schedule.dayLessons')}: ${selectedDate.format("DD.MM.YYYY")}`}
            open={dayOpen}
            onCancel={() => setDayOpen(false)}
            footer={[
            <Button key="close" onClick={() => setDayOpen(false)}>
                {t('common.close')}
              </Button>,
            ]}
            styles={{ body: { maxHeight: 460, overflowY: "auto" } }}
          >
            <List
              dataSource={selectedLessons}
              locale={{ emptyText: t('schedule.noLessonsToday') }}
              renderItem={(item) => {
                const subjectLabel = item.subject_name || t('schedule.subject');
                const groupLabel = item.group_name || `${t('schedule.group')} #${item.group}`;
                const timeLabel =
                  item.start_time && item.end_time
                    ? `${dayjs(item.start_time).format("HH:mm")} - ${dayjs(item.end_time).format("HH:mm")}`
                    : "-";
                const liveStatus = getLiveStatus(item);
                return (
                  <List.Item
                    actions={[
                      <Button
                        key="live"
                        size="small"
                        type={liveStatus.canJoin ? "primary" : "default"}
                        disabled={!liveStatus.canJoin}
                        onClick={() => navigate(`/app/live/${item.id}`)}
                      >
                        {liveStatus.label}
                      </Button>,
                    ]}
                  >
                    <Space direction="vertical" size={0}>
                      <div style={{ color: '#374151' }}>{`${subjectLabel} - ${groupLabel}`}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>{timeLabel}</div>
                    </Space>
                  </List.Item>
                );
              }}
            />
          </Modal>
        </>
      )}
    </div>
  );
};

export default StudentSchedule;