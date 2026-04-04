import { Skeleton } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchLessons } from "../../api/lessons";
import { fetchAssignments } from "../../api/assignments";
import { fetchTests } from "../../api/tests";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../../hooks/usePageTitle";
import "./Dashboard.css";

const StudentDashboard = () => {
  const { t } = useTranslation();
  usePageTitle('nav.dashboard');
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

  const allAssignments = assignments || [];
  const completedAssignments = allAssignments.filter((a) => (a as any).status === "completed" || (a as any).submitted);

  const getLiveStatus = (lesson: any) => {
    if (!lesson?.start_time || !lesson?.end_time) {
      return { canJoin: false, label: t('schedule.noSchedule'), color: 'muted' as const };
    }
    const start = dayjs(lesson.start_time);
    const end = dayjs(lesson.end_time);
    const now = dayjs();
    if (now.isBefore(start)) return { canJoin: false, label: t('schedule.waitForStart'), color: 'warning' as const };
    if (now.isAfter(end)) return { canJoin: false, label: t('schedule.lessonEnded'), color: 'muted' as const };
    return { canJoin: true, label: t('schedule.joinLive'), color: 'success' as const };
  };

  const lessonTypeColors = ['var(--color-success)', 'var(--color-warning)', 'var(--accent)', 'var(--accent-3)', 'var(--color-error)', 'var(--color-info)'];
  const getLessonColor = (index: number) => lessonTypeColors[index % lessonTypeColors.length];

  return (
    <div className="hemis-dashboard">
      {/* ── Page Header ──────────────────────────────────── */}
      <div className="hemis-page-header">
        <div>
          <h1 className="hemis-page-title">{t('dashboard.title')}</h1>
        </div>
        <div className="hemis-page-date">{dayjs().format('DD MMMM, YYYY')}</div>
      </div>

      {/* ── Dashboard Grid ───────────────────────────────── */}
      <div className="hemis-dashboard-grid">

        {/* ── Topshiriqlar (Assignments) ──────────────────── */}
        <div className="hemis-card">
          <div className="hemis-card-header">
            <h3 className="hemis-card-title">{t('dashboard.todayAssignments')}</h3>
            <button type="button" className="hemis-card-action" onClick={() => navigate("/app/student/assignments")}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <div className="hemis-card-body">
            {loadingAssignments ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : allAssignments.length === 0 ? (
              <div className="hemis-empty">{t('dashboard.noAssignmentsToday')}</div>
            ) : (
              <div className="hemis-assignment-list">
                {allAssignments.slice(0, 5).map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="hemis-assignment-item"
                    onClick={() => navigate("/app/student/assignments")}
                  >
                    <div className="hemis-assignment-info">
                      <span className="hemis-assignment-title">{item.title}</span>
                      <span className="hemis-assignment-meta">
                        {item.subject || t('schedule.subject')}
                        {item.deadline && ` · ${t('assignments.deadline')}: ${dayjs(item.deadline).format('DD-MMMM, HH:mm')}`}
                      </span>
                    </div>
                    <div className="hemis-assignment-right">
                      <span className={`hemis-badge ${(item as any).submitted || (item as any).status === 'completed' ? 'hemis-badge-success' : 'hemis-badge-warning'}`}>
                        {(item as any).submitted || (item as any).status === 'completed'
                          ? t('assignments.submitted') || 'Topshirilgan'
                          : t('assignments.pending') || 'Kutilmoqda'}
                      </span>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {allAssignments.length > 0 && (
              <div className="hemis-card-stat">
                <span className={`hemis-badge-count ${completedAssignments.length === allAssignments.length ? 'hemis-badge-success' : 'hemis-badge-primary'}`}>
                  {completedAssignments.length} / {allAssignments.length}
                </span>
                <span className="hemis-stat-label">{t('nav.assignments')}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Dars jadvali - Bugun (Today's Schedule) ─────── */}
        <div className="hemis-card">
          <div className="hemis-card-header">
            <h3 className="hemis-card-title">
              {t('dashboard.todayLessons')}
            </h3>
            <div className="hemis-card-header-right">
              <span className="hemis-card-date">{dayjs().format('DD MMMM')} - {dayjs().format('dddd')}</span>
            </div>
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
                    >
                      <div className="hemis-schedule-color" style={{ background: color }}></div>
                      <div className="hemis-schedule-content">
                        <span className="hemis-schedule-type" style={{ color }}>
                          {item.topic || item.subject_name || t('schedule.subject')}
                        </span>
                        <span className="hemis-schedule-teacher">
                          {(item as any).teacher_name || item.subject_name || t('schedule.subject')}
                        </span>
                        <span className="hemis-schedule-time">
                          {dayjs(item.start_time).format("HH:mm")} - {dayjs(item.end_time).format("HH:mm")}
                          {(item as any).room && ` · ${(item as any).room}`}
                        </span>
                      </div>
                      {liveStatus.canJoin && (
                        <button
                          className="hemis-live-btn"
                          onClick={(e) => { e.stopPropagation(); navigate(`/app/live/${item.id}`); }}
                        >
                          {liveStatus.label}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── O'zlashtirish (Grades) ──────────────────────── */}
        <div className="hemis-card">
          <div className="hemis-card-header">
            <h3 className="hemis-card-title">{t('nav.grades')}</h3>
            <button type="button" className="hemis-card-action" onClick={() => navigate("/app/student/grades")}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <div className="hemis-card-body">
            {loadingTests ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : (tests || []).length === 0 ? (
              <div className="hemis-empty">{t('dashboard.noTestsToday')}</div>
            ) : (
              <div className="hemis-grades-list">
                {(tests || []).slice(0, 5).map((item, idx) => (
                  <div key={item.id || idx} className="hemis-grade-item" role="button" tabIndex={0} onClick={() => navigate("/app/student/grades")}>
                    <div className="hemis-grade-info">
                      <span className="hemis-grade-subject">{item.title || item.subject_name}</span>
                      <span className="hemis-grade-meta">{item.subject_name || t('schedule.subject')}</span>
                    </div>
                    <span className={`hemis-grade-score ${((item as any).score || 0) >= 60 ? 'hemis-score-good' : 'hemis-score-low'}`}>
                      {(item as any).score ?? '–'} / 100
                    </span>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Davomat (Attendance) ────────────────────────── */}
        <div className="hemis-card">
          <div className="hemis-card-header">
            <h3 className="hemis-card-title">{t('nav.attendance')}</h3>
            <button type="button" className="hemis-card-action" onClick={() => navigate("/app/student/attendance")}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
          <div className="hemis-card-body">
            {loadingLessons ? (
              <Skeleton active paragraph={{ rows: 3 }} />
            ) : todayLessons.length === 0 ? (
              <div className="hemis-empty">{t('dashboard.noLessonsToday')}</div>
            ) : (
              <div className="hemis-attendance-list">
                {todayLessons.map((item, idx) => {
                  const statusColors: Record<string, string> = {
                    present: 'var(--color-success)',
                    absent: 'var(--color-error)',
                    late: 'var(--color-warning)',
                  };
                  const statusColor = statusColors[(item as any).attendance_status || ''] || 'var(--color-text-muted)';
                  return (
                    <div key={item.id || idx} className="hemis-attendance-item">
                      <div className="hemis-attendance-dot" style={{ background: statusColor }}></div>
                      <div className="hemis-attendance-info">
                        <span className="hemis-attendance-subject">{item.subject_name || t('schedule.subject')}</span>
                        <span className="hemis-attendance-time">
                          {dayjs(item.start_time).format("HH:mm")} - {dayjs(item.end_time).format("HH:mm")}
                        </span>
                      </div>
                      <span className="hemis-attendance-status" style={{ color: statusColor }}>
                        {(item as any).attendance_status || '–'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentDashboard;
