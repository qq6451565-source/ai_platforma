import { Button, Card, List, Modal, Skeleton, Space, Typography, Grid } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchLessons } from "../../api/lessons";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

const StudentSchedule = () => {
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

  const weekdayNames = ["Yakshanba", "Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];

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
      return { canJoin: false, label: "Jadval yo'q" };
    }
    const start = dayjs(lesson.start_time);
    const end = dayjs(lesson.end_time);
    const now = dayjs();
    if (now.isBefore(start)) return { canJoin: false, label: "Boshlanishini kuting" };
    if (now.isAfter(end)) return { canJoin: false, label: "Dars tugagan" };
    return { canJoin: true, label: "Live darsga o'tish" };
  };

  return (
    <div className="page-shell">
      <Typography.Title level={4} className="page-title">Dars jadvali</Typography.Title>
      {isLoading ? (
        <Skeleton active />
      ) : (
        <Card title="Dars jadvali" style={{ marginBottom: 16 }}>
          <div className="lesson-calendar">
            <div className="lesson-calendar__left">
              <div className="lesson-week">
                <div className="lesson-week__header">
                  <div>
                    <div className="lesson-week__title">{viewMode === "week" ? "Hafta" : "Oy"}</div>
                    <div className="lesson-week__range">{viewMode === "week" ? weekLabel : monthLabel}</div>
                  </div>
                  <div className="lesson-week__controls">
                    <Button
                      size="small"
                      type="text"
                      onClick={() =>
                        setSelectedDate(viewMode === "week" ? selectedDate.subtract(1, "week") : selectedDate.subtract(1, "month"))
                      }
                    >
                      {"<"}
                    </Button>
                    <Button
                      size="small"
                      type="text"
                      onClick={() =>
                        setSelectedDate(viewMode === "week" ? selectedDate.add(1, "week") : selectedDate.add(1, "month"))
                      }
                    >
                      {">"}
                    </Button>
                    <Button size="small" onClick={() => setSelectedDate(dayjs())}>
                      Bugun
                    </Button>
                    <Button
                      size="small"
                      type={viewMode === "week" ? "primary" : "default"}
                      onClick={() => setViewMode("week")}
                    >
                      Hafta
                    </Button>
                    {!isMobile && (
                      <Button
                        size="small"
                        type={viewMode === "month" ? "primary" : "default"}
                        onClick={() => setViewMode("month")}
                      >
                        Oy
                      </Button>
                    )}
                  </div>
                </div>
                <div className="lesson-week__grid-wrap">
                  <div className={viewMode === "week" ? "lesson-week__grid" : "lesson-month__grid"}>
                    {(viewMode === "week" ? weekDays : monthDays).map((day) => {
                      const key = day.format("YYYY-MM-DD");
                      const dayLessons = (lessonsByDate[key] || [])
                        .slice()
                        .sort((a, b) => dayjs(a.start_time).valueOf() - dayjs(b.start_time).valueOf());
                      const isToday = day.isSame(dayjs(), "day");
                      const isSelected = day.isSame(selectedDate, "day");
                      const isOutside = viewMode === "month" && day.month() !== selectedDate.month();
                      return (
                        <div
                          key={key}
                          className={`lesson-week__day${viewMode === "month" ? " lesson-month__day" : ""}${
                            isToday ? " is-today" : ""
                          }${isSelected ? " is-selected" : ""}${isOutside ? " is-outside" : ""}`}
                          onClick={() => {
                            setSelectedDate(day);
                            setDayOpen(true);
                          }}
                        >
                          <div className={`lesson-week__day-header${viewMode === "month" ? " lesson-month__day-header" : ""}`}>
                            <div className="lesson-week__weekday">{weekdayNames[day.day()]}</div>
                            <div className="lesson-week__date">
                              {viewMode === "month" ? day.format("D") : day.format("DD.MM")}
                            </div>
                          </div>
                          <div className={`lesson-week__items${viewMode === "month" ? " lesson-month__items" : ""}`}>
                            {dayLessons.map((item) => {
                              const subjectLabel = item.subject_name || "Fan";
                              const groupLabel = item.group_name || `Guruh #${item.group}`;
                              const timeLabel =
                                item.start_time && item.end_time
                                  ? `${dayjs(item.start_time).format("HH:mm")} - ${dayjs(item.end_time).format("HH:mm")}`
                                  : "-";
                              return (
                                <div key={item.id} className="lesson-week__chip">
                                  <div className="lesson-week__chip-title">
                                    {subjectLabel} - {groupLabel}
                                  </div>
                                  <div className="lesson-week__chip-time">{timeLabel}</div>
                                </div>
                              );
                            })}
                            {!dayLessons.length && <div className="lesson-week__empty">Bo'sh</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <Modal
            title={`Kundagi darslar: ${selectedDate.format("DD.MM.YYYY")}`}
            open={dayOpen}
            onCancel={() => setDayOpen(false)}
            footer={[
              <Button key="close" onClick={() => setDayOpen(false)}>
                Yopish
              </Button>,
            ]}
            bodyStyle={{ maxHeight: 460, overflowY: "auto" }}
          >
            <List
              dataSource={selectedLessons}
              locale={{ emptyText: "Bu kunda dars yo'q" }}
              renderItem={(item) => {
                const subjectLabel = item.subject_name || "Fan";
                const groupLabel = item.group_name || `Guruh #${item.group}`;
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
                      <div>{`${subjectLabel} - ${groupLabel}`}</div>
                      <div style={{ fontSize: 12, color: "#6a7280" }}>{timeLabel}</div>
                    </Space>
                  </List.Item>
                );
              }}
            />
          </Modal>
        </Card>
      )}
    </div>
  );
};

export default StudentSchedule;