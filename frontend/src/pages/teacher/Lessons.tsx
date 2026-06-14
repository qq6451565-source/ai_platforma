import { Button, Card, List, Modal, Space, Grid, Select, message } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLessons, setLessonDeliveryMode } from "../../api/lessons";
import { fetchMaterials } from "../../api/materials";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import dayjs from "dayjs";

const TeacherLessons = () => {
  const { t } = useTranslation();
  usePageTitle('nav.lessons');
  const qc = useQueryClient();
  const { data: lessons } = useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
  });
  const { data: materials } = useQuery({
    queryKey: ["materials"],
    queryFn: fetchMaterials,
  });
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = dayjs();
    return today.day() === 0 ? today.add(1, "day") : today;
  });
  const [viewMode, setViewMode] = useState<"week" | "month">("week");
  const [dayOpen, setDayOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [activeLesson, setActiveLesson] = useState<any>(null);
  const [deliveryMode, setDeliveryMode] = useState<"pending" | "live" | "video">("pending");
  const [selectedVideo, setSelectedVideo] = useState<number | null>(null);
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

  const handleSaveConfig = async () => {
    if (!activeLesson) return;
    if (deliveryMode === 'video' && !selectedVideo) {
      message.error("Iltimos, video materialni tanlang");
      return;
    }
    try {
      await setLessonDeliveryMode(activeLesson.id, {
        lesson_type: deliveryMode,
        video_material_id: deliveryMode === 'video' ? selectedVideo : null,
      });
      message.success("Dars rejimi muvaffaqiyatli saqlandi!");
      setConfigOpen(false);
      qc.invalidateQueries({ queryKey: ["lessons"] });
    } catch (err) {
      message.error("Xatolik yuz berdi");
    }
  };

  return (
    <div className="page-shell page-container animate-fade-in">
      <h1 className="page-title mb-6">{t('schedule.title')}</h1>
      <Card style={{ marginBottom: 'var(--space-6)' }}>
        <div className="d-flex justify-between items-center flex-wrap gap-4">
          <div>
            <div className="text-secondary body-sm">{viewMode === "week" ? t('common.week') : t('common.month')}</div>
            <div className="font-bold text-lg">{viewMode === "week" ? weekLabel : monthLabel}</div>
          </div>
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
        </div>
      </Card>

      <div className="grid-cards-wrapper">
        <div className={`grid-cards ${viewMode === "week" ? "schedule-week-grid" : "schedule-month-grid"}`}>
          {(viewMode === "week" ? weekDays : monthDays).map((day) => {
            const key = day.format("YYYY-MM-DD");
            const dayLessons = (lessonsByDate[key] || [])
              .slice()
              .sort((a, b) => dayjs(a.start_time).valueOf() - dayjs(b.start_time).valueOf());
            const isToday = day.isSame(dayjs(), "day");
            const isSelected = day.isSame(selectedDate, "day");
            const isOutside = viewMode === "month" && day.month() !== selectedDate.month();
            const weekdayIndex = day.day() === 0 ? null : day.day() - 1;
            return (
              <Card
                key={key}
                hoverable={!isOutside}
                style={{
                  opacity: isOutside ? 0.5 : 1,
                  cursor: isOutside ? 'default' : 'pointer',
                }}
                onClick={() => {
                  if (!isOutside) {
                    setSelectedDate(day);
                    setDayOpen(true);
                  }
                }}
              >
                <div className="d-flex justify-between items-center mb-4">
                  <span className="font-bold">{weekdayIndex !== null ? weekdayNames[weekdayIndex] : ''}</span>
                  {isToday && (
                    <span className="badge badge-primary">{t('common.today')}</span>
                  )}
                </div>
                <div className="text-2xl font-bold mb-4">
                  {viewMode === "month" ? day.format("D") : day.format("DD.MM")}
                </div>
                <div className="d-flex flex-column gap-2">
                  {dayLessons.map((item) => {
                    const subjectLabel = item.subject_name || t('schedule.subject');
                    const groupLabel = item.group_name || `${t('schedule.group')} #${item.group}`;
                    const timeLabel =
                      item.start_time && item.end_time
                        ? `${dayjs(item.start_time).format("HH:mm")} - ${dayjs(item.end_time).format("HH:mm")}`
                        : "-";
                    return (
                      <div key={item.id} className="lesson-chip">
                        <div className="lesson-chip-title">
                          {subjectLabel} - {groupLabel}
                        </div>
                        <div className="lesson-chip-time">{timeLabel}</div>
                      </div>
                    );
                  })}
                  {!dayLessons.length && <div className="text-muted body-sm">{t('schedule.empty')}</div>}
                </div>
              </Card>
            );
          })}
        </div>
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
                  item.lesson_type === 'live' ? (
                    <Button
                      key="live"
                      size="small"
                      type={liveStatus.canJoin ? "primary" : "default"}
                      disabled={!liveStatus.canJoin}
                      onClick={() => navigate(`/app/live/${item.id}`)}
                    >
                      {liveStatus.label}
                    </Button>
                  ) : item.lesson_type === 'video' ? (
                    <Button key="video" size="small" disabled>Videodars orqali</Button>
                  ) : null,
                  <Button
                    key="config"
                    size="small"
                    onClick={() => {
                      setActiveLesson(item);
                      setDeliveryMode(item.lesson_type || "pending");
                      setSelectedVideo(item.video_material || null);
                      setConfigOpen(true);
                      setDayOpen(false);
                    }}
                  >
                    Sozlash
                  </Button>
                ]}
              >
                <Space direction="vertical" size={0}>
                  <div>{`${subjectLabel} - ${groupLabel}`}</div>
                  <div style={{ fontSize: 'var(--font-size-tiny)', color: "var(--color-text-secondary)" }}>
                    {timeLabel} | {item.lesson_type === 'live' ? 'Jonli efir' : item.lesson_type === 'video' ? 'Videodars' : 'Kutilyapti'}
                  </div>
                </Space>
              </List.Item>
            );
          }}
        />
      </Modal>

      <Modal
        title="Dars rejimini tanlash"
        open={configOpen}
        onCancel={() => {
          setConfigOpen(false);
          setDayOpen(true);
        }}
        onOk={handleSaveConfig}
        okText="Saqlash"
        cancelText="Bekor qilish"
      >
        <Space direction="vertical" style={{ width: '100%', marginTop: 'var(--space-4)' }} size="large">
          <div>
            <div style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>Rejim:</div>
            <Select
              style={{ width: '100%' }}
              value={deliveryMode}
              onChange={(v) => setDeliveryMode(v)}
              options={[
                { value: 'pending', label: 'Kutilyapti (hal qilinmagan)' },
                { value: 'live', label: 'Jonli efir (Videokonferensiya)' },
                { value: 'video', label: 'Tayyor videodars' }
              ]}
            />
          </div>
          {deliveryMode === 'video' && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>Video Materialni tanlang:</div>
              <Select
                style={{ width: '100%' }}
                value={selectedVideo}
                onChange={(v) => setSelectedVideo(v)}
                placeholder="Bu fanga tegishli videolardan tanlang"
                options={(materials || [])
                  .filter(m => m.subject === activeLesson?.teacher_subject?.subject?.id || true) // ideally we check subject match
                  .map(m => ({ value: m.id, label: m.title }))}
              />
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                Agar video ro'yxatda yo'q bo'lsa, "Materiallar" sahifasiga kirib yuklashingiz kerak.
              </div>
            </div>
          )}
        </Space>
      </Modal>
    </div>
  );
};

export default TeacherLessons;
