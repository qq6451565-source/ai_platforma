import { Skeleton, List } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchLessons } from "../../api/lessons";
import { fetchAssignments } from "../../api/assignments";
import { fetchTests } from "../../api/tests";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { PageContainer, SectionCard, GridLayout, Button } from "../../components/ui";
import { useTranslation } from "react-i18next";

const StudentDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: lessons, isLoading: loadingLessons } = useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
  });

  const { data: assignments, isLoading: loadingAssignments } = useQuery({
    queryKey: ["assignments"],
    queryFn: fetchAssignments,
  });

  const { data: tests, isLoading: loadingTests } = useQuery({
    queryKey: ["tests"],
    queryFn: fetchTests,
  });

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
    <PageContainer 
      title={t('dashboard.title')}
      subtitle={dayjs().format('DD.MM.YYYY')}
    >
      <GridLayout columns="auto" minColumnWidth="320px" gap="lg">
        <SectionCard title={t('dashboard.todayLessons')} loading={loadingLessons}>
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
                    onClick={() => navigate("/app/student/schedule")}
                    extra={
                      <Button
                        size="sm"
                        variant={liveStatus.canJoin ? "primary" : "outline"}
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
        </SectionCard>

        <SectionCard title={t('dashboard.todayAssignments')} loading={loadingAssignments}>
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
                  onClick={() => navigate("/app/student/assignments")}
                >
                  <List.Item.Meta
                    title={<span className="font-medium text-primary">{item.title}</span>}
                    description={<span className="caption">{item.subject || t('schedule.subject')}</span>}
                  />
                </List.Item>
              )}
            />
          )}
        </SectionCard>

        <SectionCard title={t('dashboard.todayTests')} loading={loadingTests}>
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
                  onClick={() => navigate("/app/student/tests")}
                >
                  <List.Item.Meta
                    title={<span className="font-medium text-primary">{item.title}</span>}
                    description={<span className="caption">{item.subject_name || t('schedule.subject')}</span>}
                  />
                </List.Item>
              )}
            />
          )}
        </SectionCard>
      </GridLayout>
    </PageContainer>
  );
};

export default StudentDashboard;
