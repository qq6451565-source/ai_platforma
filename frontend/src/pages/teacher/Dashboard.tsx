import { Skeleton } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchLessons } from "../../api/lessons";
import { fetchAssignments } from "../../api/assignments";
import { fetchTests } from "../../api/tests";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import "../student/Dashboard.css";

const TeacherDashboard = () => {
  const { t } = useTranslation();
  usePageTitle('nav.dashboard');
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

  const lessonTypeColors = ['var(--color-success)', 'var(--color-warning)', 'var(--accent)', 'var(--accent-3)', 'var(--color-error)', 'var(--color-info)'];
  const getLessonColor = (index: number) => lessonTypeColors[index % lessonTypeColors.length];

  return (
    <div className="hemis-dashboard">
      <div className="hemis-page-header">
        <div>
          <h1 className="hemis-page-title">{t('roles.teacher')}</h1>
        </div>
        <div className="hemis-page-date">{dayjs().format('DD MMMM, YYYY')}</div>
      </div>

      <div className="hemis-dashboard-grid">
        {/* Today's Lessons */}
        <div className="hemis-card">
          <div className="hemis-card-header">
            <h3 className="hemis-card-title">{t('dashboard.todayLessons')}</h3>
            <span className="hemis-card-date">{dayjs().format('DD MMMM')} - {dayjs().format('dddd')}</span>
          </div>
          <div className="hemis-card-body">
            {loadingLessons ? (
              <Skeleton active paragraph={{ rows: 4 }} />
            ) : todayLessons.length === 0 ? (
              <div className="hemis-empty">{t('dashboard.noLessonsToday')}</div>
            ) : (
              <div className="hemis-schedule-list">
                {todayLessons.map((item, idx) => {
                  const liveStatus = getLiveStatus(item);
                  const color = getLessonColor(idx);
                  return (
                    <div
                      key={item.id}
                      className="hemis-schedule-item"
                      style={{ '--lesson-color': color } as React.CSSProperties}
                      onClick={() => navigate("/app/teacher/lessons")}
                    >
                      <div className="hemis-schedule-color" style={{ background: color }}></div>
                      <div className="hemis-schedule-content">
                        <span className="hemis-schedule-type" style={{ color }}>
                          {item.topic || item.subject_name || t('schedule.subject')}
                        </span>
                        <span className="hemis-schedule-teacher">{item.subject_name}</span>
                        <span className="hemis-schedule-time">
                          {dayjs(item.start_time).format("HH:mm")} - {dayjs(item.end_time).format("HH:mm")}
                        </span>
                      </div>
                      {item.lesson_type === 'live' ? (
                        liveStatus.canJoin && (
                          <button
                            className="hemis-live-btn"
                            onClick={(e) => { e.stopPropagation(); navigate(`/app/live/${item.id}`); }}
                          >
                            {liveStatus.label}
                          </button>
                        )
                      ) : item.lesson_type === 'video' ? (
                        <span className="hemis-badge hemis-badge-info" style={{ background: 'var(--color-info)', color: 'white', padding: '4px 8px', borderRadius: '4px' }}>
                          Videodars
                        </span>
                      ) : (
                        <span className="hemis-badge" style={{ background: 'var(--color-muted)', padding: '4px 8px', borderRadius: '4px' }}>
                          Kutilyapti
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Today's Assignments */}
        <div className="hemis-card">
          <div className="hemis-card-header">
            <h3 className="hemis-card-title">{t('dashboard.todayAssignments')}</h3>
            <button type="button" className="hemis-card-action" onClick={() => navigate("/app/teacher/assignments")}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <div className="hemis-card-body">
            {loadingAssignments ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : todayAssignments.length === 0 ? (
              <div className="hemis-empty">{t('dashboard.noAssignmentsToday')}</div>
            ) : (
              <div className="hemis-assignment-list">
                {todayAssignments.map((item, idx) => (
                  <div key={item.id || idx} className="hemis-assignment-item" role="button" tabIndex={0} onClick={() => navigate("/app/teacher/assignments")}>
                    <div className="hemis-assignment-info">
                      <span className="hemis-assignment-title">{item.title}</span>
                      <span className="hemis-assignment-meta">{item.subject || t('schedule.subject')}</span>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Today's Tests */}
        <div className="hemis-card">
          <div className="hemis-card-header">
            <h3 className="hemis-card-title">{t('dashboard.todayTests')}</h3>
            <button type="button" className="hemis-card-action" onClick={() => navigate("/app/teacher/tests")}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <div className="hemis-card-body">
            {loadingTests ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : todayTests.length === 0 ? (
              <div className="hemis-empty">{t('dashboard.noTestsToday')}</div>
            ) : (
              <div className="hemis-assignment-list">
                {todayTests.map((item, idx) => (
                  <div key={item.id || idx} className="hemis-assignment-item" role="button" tabIndex={0} onClick={() => navigate("/app/teacher/tests")}>
                    <div className="hemis-assignment-info">
                      <span className="hemis-assignment-title">{item.title}</span>
                      <span className="hemis-assignment-meta">{item.subject_name || t('schedule.subject')}</span>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submissions Overview */}
        <div className="hemis-card">
          <div className="hemis-card-header">
            <h3 className="hemis-card-title">{t('nav.submissions')}</h3>
            <button type="button" className="hemis-card-action" onClick={() => navigate("/app/teacher/submissions")}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <div className="hemis-card-body">
            <div className="hemis-empty">{t('nav.submissions')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
