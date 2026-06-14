import { Button, Card, List, Typography, Skeleton, Upload, Modal, Tag, message, Empty, Grid } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { fetchAssignments } from "../../api/assignments";
import { fetchLessons } from "../../api/lessons";
import { fetchMySubmissions, submitAssignment } from "../../api/submissions";
import type { Assignment } from "../../types/assignment";
import type { LessonAccessSnapshot } from "../../types/test";
import { toAbsoluteUrl } from "../../api/client";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getApiError } from "../../utils/getApiError";
import { useTranslation } from "react-i18next";
import { trackLessonOpen } from "../../api/attendance";

const PENDING_ACCESS_POLL_MS = 10000;

const extractFile = (list: UploadFile[]) => {
  const item = list[0];
  if (!item) return undefined;
  return (item.originFileObj ?? (item as unknown as File)) as File | undefined;
};

const formatRatio = (value?: number | null) => (value == null ? "-" : `${Math.round(value * 100)}%`);

const getAttendanceLabel = (access: LessonAccessSnapshot | null | undefined, t: (k: string) => string) => {
  if (!access) return "-";
  if (!access.attendance_finalized) return t('access.notFinalized');
  if (access.attendance_status === "present") return t('access.present');
  if (access.attendance_status === "absent") return t('access.absent');
  return "-";
};

const getUploadState = (assignment: Assignment, hasSubmission: boolean, t: (k: string) => string) => {
  const access = assignment.access;
  const defaultLabel = hasSubmission ? t('studentAssignments.resubmit') : t('common.submit');
  if (!access) {
    return {
      canSubmit: false,
      actionLabel: t('access.checking'),
      statusLabel: t('access.checking'),
      color: "default" as const,
      reason: t('access.permissionLoading'),
    };
  }
  if (access.allowed) {
    return {
      canSubmit: true,
      actionLabel: defaultLabel,
      statusLabel: t('access.open'),
      color: "green" as const,
      reason: t('access.canSubmit'),
    };
  }
  if (access.status === "pending_attendance") {
    return {
      canSubmit: false,
      actionLabel: t('access.pending'),
      statusLabel: t('access.pending'),
      color: "gold" as const,
      reason: access.reason || t('access.pendingReason'),
    };
  }
  return {
    canSubmit: false,
    actionLabel: t('access.blocked'),
    statusLabel: t('access.blocked'),
    color: "red" as const,
    reason: access.reason || t('access.blockedAssignment'),
  };
};

const hasPendingAccess = (items?: Assignment[]) =>
  Boolean(items?.some((item) => item.access?.status === "pending_attendance"));

const StudentAssignments = () => {
  usePageTitle('nav.assignments');
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["assignments"],
    queryFn: fetchAssignments,
    refetchInterval: (query) => {
      const items = query.state.data as Assignment[] | undefined;
      return hasPendingAccess(items) ? PENDING_ACCESS_POLL_MS : false;
    },
    refetchIntervalInBackground: true,
  });
  const { data: lessons } = useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
  });
  const { data: submissions } = useQuery({
    queryKey: ["my-submissions"],
    queryFn: fetchMySubmissions,
  });

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const subjectCards = useMemo(() => {
    const lessonSubjects = new Set<string>();
    (lessons || []).forEach((l) => {
      if (l.subject_name) lessonSubjects.add(l.subject_name);
    });
    const counts = new Map<string, number>();
    (assignments || []).forEach((a) => {
      if (a.subject) counts.set(a.subject, (counts.get(a.subject) || 0) + 1);
    });
    return Array.from(lessonSubjects).map((name) => ({ name, count: counts.get(name) || 0 }));
  }, [assignments, lessons]);

  const filteredAssignments = useMemo(() => {
    if (!selectedSubject) return [];
    return (assignments || []).filter((a) => a.subject === selectedSubject);
  }, [assignments, selectedSubject]);
  const hasPendingAssignments = useMemo(() => hasPendingAccess(assignments), [assignments]);

  const getSubmission = (assignmentId: number) =>
    (submissions || []).find((s) => s.assignment === assignmentId);

  const handleSubmit = async () => {
    if (!selectedId) return;
    const file = extractFile(fileList);
    if (!file) {
      message.warning(t('studentAssignments.fileRequired'));
      return;
    }
    setUploading(true);
    try {
      await submitAssignment({ assignment: selectedId, file });
      message.success(t('studentAssignments.submitted'));
      setOpen(false);
      setFileList([]);
      await qc.invalidateQueries({ queryKey: ["my-submissions"] });
    } catch (err: unknown) {
      message.error(getApiError(err, t('studentAssignments.submitError')));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-shell">
      <Typography.Title level={4} className="page-title">{t('nav.assignments')}</Typography.Title>
      {hasPendingAssignments && (
        <Typography.Text type="secondary">
          {t('access.autoUpdateAssignment')}
        </Typography.Text>
      )}
      {!selectedSubject ? (
        isLoading ? (
          <Skeleton active />
        ) : !subjectCards.length ? (
          <Empty description={t('studentAssignments.noAssignments')} />
        ) : (
          <div className="card-grid">
            {subjectCards.map((card) => (
              <Card key={card.name} hoverable onClick={() => setSelectedSubject(card.name)}>
                <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>{card.name}</div>
                <div style={{ opacity: 0.7, marginTop: 'var(--space-1-5)' }}>{card.count} {t('studentAssignments.countSuffix')}</div>
              </Card>
            ))}
          </div>
        )
      ) : (
        <>
          <div className="page-header-row">
            <Button onClick={() => setSelectedSubject(null)}>{t('common.back')}</Button>
            <Typography.Text strong>{selectedSubject}</Typography.Text>
          </div>

          {isLoading ? (
            <Skeleton active />
          ) : !filteredAssignments.length ? (
            <Empty description={t('studentAssignments.noAssignments')} />
          ) : (
            <List
              dataSource={filteredAssignments}
              renderItem={(item) => {
                const sub = getSubmission(item.id);
                const uploadState = getUploadState(item, !!sub, t);
                return (
                  <List.Item>
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)', marginBottom: 'var(--space-3)', flexWrap: 'wrap' }}>
                        <div>
                          <Typography.Text strong style={{ fontSize: 'var(--font-size-base)' }}>{item.title}</Typography.Text>
                          <div className="caption" style={{ marginTop: 'var(--space-0-5)' }}>
                            {t('studentAssignments.deadlineLabel')}: {dayjs(item.deadline).format('DD.MM.YYYY HH:mm')}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexShrink: 0 }}>
                          <Tag color={uploadState.color}>{uploadState.statusLabel}</Tag>
                          <Button
                            type={uploadState.canSubmit ? 'primary' : 'default'}
                            size="small"
                            disabled={!uploadState.canSubmit}
                            onClick={() => {
                              if (!uploadState.canSubmit) return;
                              setSelectedId(item.id);
                              setFileList([]);
                              setOpen(true);
                              if (item.lesson) {
                                trackLessonOpen(item.lesson).catch(() => { });
                              }
                            }}
                          >
                            {uploadState.actionLabel}
                          </Button>
                        </div>
                      </div>
                      <div className="kv-grid">
                        <span>{t('studentAssignments.lessonLabel')}</span>
                        <span>{item.lesson_topic || '-'}</span>
                        <span>{t('access.attendance')}</span>
                        <span>{getAttendanceLabel(item.access, t)}</span>
                        <span>{t('access.participation')}</span>
                        <span>{formatRatio(item.access?.attendance_joined_ratio)}</span>
                        <span>{t('access.faceRatio')}</span>
                        <span>{formatRatio(item.access?.attendance_face_verified_ratio)}</span>
                        <span>{t('common.status')}</span>
                        <span>{uploadState.reason}</span>
                        <span>{t('studentAssignments.submittedAt')}</span>
                        <span>
                          {sub ? (
                            <>{t('studentAssignments.submittedAt')} {sub.submitted_at ? dayjs(sub.submitted_at).format('DD.MM.YYYY HH:mm') : ''}{sub.grade != null ? ` | ${t('studentAssignments.grade')}: ${sub.grade}` : ''}</>
                          ) : t('studentAssignments.notSubmitted')}
                        </span>
                        {item.file && (
                          <>
                            <span>{t('studentAssignments.assignmentFile')}</span>
                            <a href={toAbsoluteUrl(item.file)} target="_blank" rel="noreferrer">{t('common.download')}</a>
                          </>
                        )}
                      </div>
                    </div>
                  </List.Item>
                );
              }}
            />
          )}
        </>
      )}

      <Modal
        title={t('studentAssignments.submitTitle')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        okText={t('common.submit')}
        confirmLoading={uploading}
      >
        <Upload
          maxCount={1}
          fileList={fileList}
          beforeUpload={() => false}
          onChange={({ fileList: next }) => setFileList(next)}
        >
          <Button>{t('common.upload')}</Button>
        </Upload>
      </Modal>
    </div>
  );
};

export default StudentAssignments;
