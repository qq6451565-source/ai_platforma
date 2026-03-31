import { Button, Card, Skeleton, List } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchLessons } from "../../api/lessons";
import { fetchAssignments } from "../../api/assignments";
import { fetchTests } from "../../api/tests";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const TeacherDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: lessons, isLoading: loadingLessons } = useQuery({ queryKey: ["lessons"], queryFn: fetchLessons });
  const { data: assignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ["assignments"],
    queryFn: fetchAssignments,
  });
  const { data: tests, isLoading: loadingTests } = useQuery({ queryKey: ["tests"], queryFn: fetchTests });

  const todayLessons = (lessons || [])
    .filter((lesson) => lesson.start_time && dayjs(lesson.start_time).isSame(dayjs(), "day"))
    .sort((a, b) => dayjs(a.start_time).valueOf() - dayjs(b.start_time).valueOf());
  const todayLessonIds = new Set(todayLessons.map((lesson) => lesson.id));
  const todayAssignments = (assignments || []).filter((item) => item.lesson && todayLessonIds.has(item.lesson));
  const todayTests = (tests || []).filter((item) => item.lesson && todayLessonIds.has(item.lesson));

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
    <div className="page-container animate-fade-in">
      <div className="d-flex justify-between items-center mb-6">
        <h1 className="m-0">{t('dashboard.title')}</h1>
        <div className="body-sm text-secondary">{dayjs().format('DD.MM.YYYY')}</div>
      </div>

      <div className="d-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        <Card title={t('dashboard.todayLessons')} style={{ height: '100%' }}>
          {loadingLessons ? (
            <Skeleton active />
          ) : (
            <List
              size="small"
              dataSource={todayLessons}
              locale={{ emptyText: t('dashboard.noLessonsToday') }}
              renderItem={(item) => {
                const liveStatus = getLiveStatus(item);
                return (
                  <List.Item
                    style={{ cursor: "pointer", padding: '12px 0' }}
                    onClick={() => navigate("/app/teacher/lessons")}
                    extra={
                      <Button
                        size="small"
                        type={liveStatus.canJoin ? "primary" : "default"}
                        disabled={!liveStatus.canJoin}
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/app/live/${item.id}`);
                        }}
                      >
                        {liveStatus.label}
                      </Button>
                    }
                  >
                    <List.Item.Meta
                      title={<span className="font-bold text-primary">{item.subject_name || t('schedule.subject')}</span>}
                      description={
                        <div>
                          <div className="text-secondary body-sm">{item.topic || t('schedule.empty')}</div>
                          <div className="caption">
                            {dayjs(item.start_time).format("HH:mm")} - {dayjs(item.end_time).format("HH:mm")}
                          </div>
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          )}
        </Card>

        <Card title={t('dashboard.todayAssignments')} style={{ height: '100%' }}>
          {loadingAssignments ? (
            <Skeleton active />
          ) : (
            <List
              size="small"
              dataSource={todayAssignments}
              locale={{ emptyText: t('dashboard.noAssignmentsToday') }}
              renderItem={(item) => (
                <List.Item
                  style={{ cursor: "pointer", padding: '12px 0' }}
                  onClick={() => navigate("/app/teacher/assignments")}
                >
                  <List.Item.Meta
                    title={<span className="font-medium text-primary">{item.title}</span>}
                    description={<span className="caption">{item.subject || t('schedule.subject')}</span>}
                  />
                </List.Item>
              )}
            />
          )}
        </Card>

        <Card title={t('dashboard.todayTests')} style={{ height: '100%' }}>
          {loadingTests ? (
            <Skeleton active />
          ) : (
            <List
              size="small"
              dataSource={todayTests}
              locale={{ emptyText: t('dashboard.noTestsToday') }}
              renderItem={(item) => (
                <List.Item
                  style={{ cursor: "pointer", padding: '12px 0' }}
                  onClick={() => navigate("/app/teacher/tests")}
                >
                  <List.Item.Meta
                    title={<span className="font-medium text-primary">{item.title}</span>}
                    description={<span className="caption">{item.subject_name || t('schedule.subject')}</span>}
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default TeacherDashboard;
