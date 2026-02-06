import { List, Modal, Space, Typography, Grid } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchLessons } from "../../api/lessons";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import dayjs from "dayjs";

const TeacherLessons = () => {
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
    <div className="page-shell page-container animate-fade-in">
      <h1 className="page-title neon-text-gradient mb-6">Dars jadvali</h1>
      <Card className="mb-6">
        <div className="d-flex justify-between items-center flex-wrap gap-4">
          <div>
            <div className="text-secondary body-sm">{viewMode === "week" ? "Hafta" : "Oy"}</div>
            <div className="font-bold text-lg">{viewMode === "week" ? weekLabel : monthLabel}</div>
          </div>
          <Space size="middle">
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setSelectedDate(viewMode === "week" ? selectedDate.subtract(1, "week") : selectedDate.subtract(1, "month"))
              }
            >
              {"<"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setSelectedDate(viewMode === "week" ? selectedDate.add(1, "week") : selectedDate.add(1, "month"))
              }
            >
              {">"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setSelectedDate(dayjs())}>
              Bugun
            </Button>
            <Button
              size="sm"
              variant={viewMode === "week" ? "primary" : "secondary"}
              onClick={() => setViewMode("week")}
            >
              Hafta
            </Button>
            {!isMobile && (
              <Button
                size="sm"
                variant={viewMode === "month" ? "primary" : "secondary"}
                onClick={() => setViewMode("month")}
              >
                Oy
              </Button>
            )}
          </Space>
        </div>
      </Card>

      <div className="grid-cards-wrapper">
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
              <Card
                key={key}
                hasBeam={isToday}
                hoverable={!isOutside}
                className={`${isToday ? "is-today" : ""} ${isSelected ? "is-selected" : ""} ${isOutside ? "is-outside" : ""}`}
                style={{
                  opacity: isOutside ? 0.5 : 1,
                  cursor: isOutside ? 'default' : 'pointer',
                  minHeight: viewMode === 'week' ? '300px' : '150px'
                }}
                onClick={() => {
                  if (!isOutside) {
                    setSelectedDate(day);
                    setDayOpen(true);
                  }
                }}
              >
                <div className="d-flex justify-between items-center mb-4">
                  <span className="font-bold">{weekdayNames[day.day()]}</span>
                  {isToday && (
                    <span className="badge-neon">Bugun</span>
                  )}
                </div>
                <div className="text-2xl font-bold mb-4">
                  {viewMode === "month" ? day.format("D") : day.format("DD.MM")}
                </div>
                <div className="d-flex flex-column gap-2">
                  {dayLessons.map((item) => {
                    const subjectLabel = item.subject_name || "Fan";
                    const groupLabel = item.group_name || `Guruh #${item.group}`;
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
                  {!dayLessons.length && <div className="text-muted body-sm">Bo'sh</div>}
                </div>
              </Card>
            );
          })}
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
    </div>
  );
};

export default TeacherLessons;
