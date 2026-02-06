import { Button, List, Modal, Skeleton, Space, Typography, Grid } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchLessons } from "../../api/lessons";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Card } from "../../components/ui";
import dayjs from "dayjs";

const StudentSchedule = () => {
  const { t } = useTranslation();
  const { data: lessons, isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
  });
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [dayOpen, setDayOpen] = useState(false);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const weekdayNames = [
    t('days.sunday'),
    t('days.monday'),
    t('days.tuesday'),
    t('days.wednesday'),
    t('days.thursday'),
    t('days.friday'),
    t('days.saturday')
  ];

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

  const weekStart = selectedDate.subtract((selectedDate.day() + 6) % 7, "day");
  const weekDays = Array.from({ length: 7 }, (_, idx) => weekStart.add(idx, "day"));
  const weekLabel = `${weekStart.format("DD.MM")} - ${weekStart.add(6, "day").format("DD.MM.YYYY")}`;
  const monthLabel = selectedDate.format("MM.YYYY");
  const monthStart = selectedDate.startOf("month");
  const monthEnd = selectedDate.endOf("month");
  const gridStart = monthStart.subtract((monthStart.day() + 6) % 7, "day");
  const monthEndIndex = (monthEnd.day() + 6) % 7;
  const gridEnd = monthEnd.add(6 - monthEndIndex, "day");
  const monthDays = Array.from({ length: gridEnd.diff(gridStart, "day") + 1 }, (_, idx) =>
    gridStart.add(idx, "day")
  );
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
          <div className="mb-6">
            <Space size="middle">
              <Button
                size="small"
                onClick={() => setSelectedDate(viewMode === "week" ? selectedDate.subtract(1, "week") : selectedDate.subtract(1, "month"))}
              >
                {"<"}
              </Button>
              <Button
                size="small"
                onClick={() => setSelectedDate(viewMode === "week" ? selectedDate.add(1, "week") : selectedDate.add(1, "month"))}
              >
                {">"}
              </Button>
              <Button size="small" onClick={() => setSelectedDate(dayjs())}>
                {t('common.today')}
              </Button>
              <Button
                size="small"
                variant={viewMode === "week" ? "primary" : "secondary"}
                onClick={() => setViewMode("week")}
              >
                {t('common.week')}
              </Button>
              {!isMobile && (
                <Button
                  size="small"
                  variant={viewMode === "month" ? "primary" : "secondary"}
                  onClick={() => setViewMode("month")}
                >
                  {t('common.month')}
                </Button>
              )}
            </Space>
            <Typography.Text className="ml-6">
              {viewMode === "week" ? weekLabel : monthLabel}
            </Typography.Text>
          </div>

          <div className="grid-cards">
            {(viewMode === "week" ? weekDays : monthDays).map((day) => {
              const key = day.format("YYYY-MM-DD");
              const dayLessons = (lessonsByDate[key] || [])
                .slice()
                .sort((a, b) => dayjs(a.start_time).valueOf() - dayjs(b.start_time).valueOf());
              const isToday = day.isSame(dayjs(), "day");
              const isOutside = viewMode === "month" && day.month() !== selectedDate.month();

              return (
                <Card
                  key={key}
                  hasBeam={isToday}
                  hoverable={!isOutside}
                  style={{
                    opacity: isOutside ? 0.5 : 1,
                    cursor: isOutside ? 'default' : 'pointer',
                    minHeight: '200px'
                  }}
                  onClick={() => {
                    if (!isOutside) {
                      setSelectedDate(day);
                      setDayOpen(true);
                    }
                  }}
                >
                  <div className="d-flex justify-between items-center mb-4">
                    <Typography.Text strong>
                      {weekdayNames[day.day()]}
                    </Typography.Text>
                    {isToday && (
                      <span style={{
                        padding: '2px 8px',
                        background: 'rgba(0, 255, 255, 0.2)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        color: 'var(--neon-cyan)'
                      }}>
                        {t('common.today')}
                      </span>
                    )}
                  </div>
                  <Typography.Text style={{
                    display: 'block',
                    fontSize: '24px',
                    fontWeight: 700,
                    marginBottom: 'var(--space-4)'
                  }}>
                    {day.format("DD.MM")}
                  </Typography.Text>
                  <div className="d-flex flex-column gap-2">
                    {dayLessons.slice(0, 3).map((item) => {
                      const subjectLabel = item.subject_name || t('schedule.subject');
                      const groupLabel = item.group_name || `${t('schedule.group')} #${item.group}`;
                      const timeLabel =
                        item.start_time && item.end_time
                          ? `${dayjs(item.start_time).format("HH:mm")} - ${dayjs(item.end_time).format("HH:mm")}`
                          : "-";
                      return (
                        <div key={item.id} style={{
                          padding: 'var(--space-2)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '4px',
                          border: '1px solid var(--color-border)'
                        }}>
                          <Typography.Text style={{ display: 'block', fontSize: '13px' }}>
                            {subjectLabel}
                          </Typography.Text>
                          <Typography.Text style={{ display: 'block', fontSize: '12px' }}>
                            {timeLabel}
                          </Typography.Text>
                        </div>
                      );
                    })}
                    {dayLessons.length > 3 && (
                      <Typography.Text style={{ fontSize: '12px' }}>
                        +{dayLessons.length - 3} {t('schedule.noLessons')}
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
            bodyStyle={{ maxHeight: 460, overflowY: "auto" }}
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
                        variant={liveStatus.canJoin ? "primary" : "secondary"}
                        disabled={!liveStatus.canJoin}
                        onClick={() => navigate(`/app/live/${item.id}`)}
                      >
                        {liveStatus.label}
                      </Button>,
                    ]}
                  >
                    <Space direction="vertical" size={0}>
                      <div style={{ color: 'var(--color-text-primary)' }}>{`${subjectLabel} - ${groupLabel}`}</div>
                      <div style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{timeLabel}</div>
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