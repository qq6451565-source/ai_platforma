import { Button, Card, Empty, List, Typography, Skeleton, Modal, Radio, Tag, message } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchTests } from "../../api/tests";
import { fetchLessons } from "../../api/lessons";
import { startTest, answerTest, finishTest, StartTestResponse } from "../../api/studentTests";
import { startTestProctoring, verifyProctoring, presenceProctoring, finishProctoring } from "../../api/proctoring";
import type { LessonAccessSnapshot, TestItem } from "../../types/test";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getApiError } from "../../utils/getApiError";
import type { TFunction } from "i18next";

const PENDING_ACCESS_POLL_MS = 10000;

const formatRatio = (value?: number | null) => (value == null ? "-" : `${Math.round(value * 100)}%`);

const getAttendanceLabel = (t: TFunction, access?: LessonAccessSnapshot | null) => {
  if (!access) return "-";
  if (!access.attendance_finalized) return t('studentTests.notFinalized');
  if (access.attendance_status === "present") return t('studentTests.present');
  if (access.attendance_status === "absent") return t('studentTests.absent');
  return "-";
};

const getStartState = (t: TFunction, test: TestItem) => {
  const access = test.access;
  if (test.is_active === false) {
    return {
      canStart: false,
      label: t('studentTests.inactive'),
      reason: t('studentTests.testInactive'),
      statusLabel: t('studentTests.inactive'),
      color: "default" as const,
    };
  }
  if (!access) {
    return {
      canStart: false,
      label: t('studentTests.checking'),
      reason: t('studentTests.loadingAccess'),
      statusLabel: t('studentTests.checking'),
      color: "default" as const,
    };
  }

  if (access.allowed) {
    return {
      canStart: true,
      label: t('studentTests.start'),
      reason: t('studentTests.canStart'),
      statusLabel: t('studentTests.open'),
      color: "green" as const,
    };
  }

  if (access.status === "pending_attendance") {
    return {
      canStart: false,
      label: t('studentTests.pending'),
      reason: access.reason || t('studentTests.pendingReason'),
      statusLabel: t('studentTests.pending'),
      color: "gold" as const,
    };
  }

  return {
    canStart: false,
    label: t('studentTests.blocked'),
    reason: access.reason || t('studentTests.blockedReason'),
    statusLabel: t('studentTests.blocked'),
    color: "red" as const,
  };
};

const hasPendingAccess = (items?: TestItem[]) =>
  Boolean(items?.some((item) => item.access?.status === "pending_attendance"));

const StudentTests = () => {
  const { t } = useTranslation();
  usePageTitle('nav.tests');
  const { data: tests, isLoading } = useQuery({
    queryKey: ["tests"],
    queryFn: fetchTests,
    refetchInterval: (query) => {
      const items = query.state.data as TestItem[] | undefined;
      return hasPendingAccess(items) ? PENDING_ACCESS_POLL_MS : false;
    },
    refetchIntervalInBackground: true,
  });
  const { data: lessons } = useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
  });
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<StartTestResponse | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [studentTestId, setStudentTestId] = useState<number | null>(null);
  const [proctorSessionId, setProctorSessionId] = useState<number | null>(null);
  const [proctorVerified, setProctorVerified] = useState(false);
  const [proctorBlocked, setProctorBlocked] = useState(false);
  const [faceStatus, setFaceStatus] = useState<"DETECTED" | "NOT_DETECTED" | "CHECKING">("CHECKING");
  const [faceRatio, setFaceRatio] = useState<number>(0);
  const [totalChecks, setTotalChecks] = useState<number>(0);
  const [sending, setSending] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const presenceTimerRef = useRef<number | null>(null);
  const presenceBusyRef = useRef(false);
  const verifyDoneRef = useRef(false);
  const presenceWarnedRef = useRef(false);
  const presenceStatsRef = useRef({ ok: 0, total: 0 });

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const subjectCards = useMemo(() => {
    const counts = new Map<string, number>();
    (lessons || []).forEach((lesson) => {
      if (lesson.subject_name && !counts.has(lesson.subject_name)) {
        counts.set(lesson.subject_name, 0);
      }
    });
    (tests || []).forEach((test) => {
      if (!test.subject_name) return;
      counts.set(test.subject_name, (counts.get(test.subject_name) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [lessons, tests]);

  const filteredTests = useMemo(() => {
    if (!selectedSubject) return [];
    return (tests || []).filter((test) => test.subject_name === selectedSubject);
  }, [selectedSubject, tests]);
  const hasPendingTests = useMemo(() => hasPendingAccess(tests), [tests]);

  const stopPresenceLoop = () => {
    if (presenceTimerRef.current) {
      window.clearInterval(presenceTimerRef.current);
      presenceTimerRef.current = null;
    }
    presenceBusyRef.current = false;
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    verifyDoneRef.current = false;
    presenceWarnedRef.current = false;
    presenceStatsRef.current = { ok: 0, total: 0 };
  };

  const startCamera = async () => {
    if (streamRef.current) return;
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }
  };

  const captureFrame = async (): Promise<Blob | null> => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return null;
    const canvas = canvasRef.current ?? document.createElement("canvas");
    canvasRef.current = canvas;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob || null), "image/jpeg", 0.8);
    });
  };

  const loadNext = async (resp: StartTestResponse) => {
    setCurrent(resp);
    setSelectedOption(null);
  };

  const runVerify = async () => {
    if (!proctorSessionId) return;
    const frame = await captureFrame();
    if (!frame) return;
    try {
      const resp = await verifyProctoring(proctorSessionId, frame);
      setProctorBlocked(!!resp.blocked);
      if (resp.verified) {
        setFaceStatus("DETECTED");
        setProctorVerified(true);
        verifyDoneRef.current = true;
      } else {
        setFaceStatus("NOT_DETECTED");
        setProctorVerified(false);
        message.error(t('studentTests.faceNotVerified'));
      }
    } catch (err: unknown) {
      message.warning(getApiError(err, t('studentTests.faceCheckFailed')));
    }
  };

  const handleStart = async (testId: number) => {
    try {
      const resp = await startTest(testId);
      setStudentTestId(resp.student_test_id);
      setProctorVerified(false);
      setProctorBlocked(false);
      try {
        const proctor = await startTestProctoring(resp.student_test_id);
        setProctorSessionId(proctor.session_id);
      } catch (err: unknown) {
        message.warning(getApiError(err, t('studentTests.proctorFailed')));
      }
      await loadNext(resp);
      setOpen(true);
    } catch (err: unknown) {
      message.error(getApiError(err, t('studentTests.startError')));
    }
  };

  const handleAnswer = async () => {
    if (!studentTestId || !current?.question || !selectedOption) return;
    if (proctorSessionId && (!proctorVerified || proctorBlocked)) {
      message.error(t('studentTests.proctorNotReady'));
      return;
    }
    setSending(true);
    try {
      const resp = await answerTest({
        student_test_id: studentTestId,
        question_id: current.question.id,
        option_id: selectedOption,
      });
      if (resp.detail && resp.detail.includes("Savollar tugadi")) {
        message.info(t('studentTests.questionsFinishedPrompt'));
        setCurrent({ ...resp, question: undefined });
      } else {
        await loadNext(resp);
      }
    } catch (err: unknown) {
      message.error(getApiError(err, t('studentTests.answerError')));
    } finally {
      setSending(false);
    }
  };

  const handleFinish = async () => {
    if (!studentTestId) return;
    setSending(true);
    try {
      const resp = await finishTest(studentTestId);
      if (proctorSessionId) {
        try {
          await finishProctoring(proctorSessionId);
        } catch (err: unknown) {
          message.warning(getApiError(err, t('studentTests.proctorFinishFailed')));
        }
      }

      // Foiz yakuniy baholash
      const stats = presenceStatsRef.current;
      const finalRatio = stats.total > 0 ? stats.ok / stats.total : null;

      if ((resp as any).is_accepted === false) {
        message.error(
          t('studentTests.testRejected', { ratio: finalRatio !== null ? Math.round(finalRatio * 100) : '?' }),
          8
        );
      } else {
        message.success(t('studentTests.testCompleted', { score: resp.score_percent ?? '-' }));
      }

      setOpen(false);
      setCurrent(null);
      setStudentTestId(null);
      setProctorSessionId(null);
      setProctorVerified(false);
      setProctorBlocked(false);
      setFaceStatus("CHECKING");
      setFaceRatio(0);
      setTotalChecks(0);
    } catch (err: unknown) {
      message.error(getApiError(err, t('studentTests.finishError')));
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (!open || !proctorSessionId) return;
    let cancelled = false;

    const init = async () => {
      try {
        await startCamera();
      } catch (err: unknown) {
        if (!presenceWarnedRef.current) {
          presenceWarnedRef.current = true;
          message.warning(err instanceof Error ? err.message : t('studentTests.cameraPermission'));
        }
        return;
      }
      if (cancelled) return;
      if (!verifyDoneRef.current) {
        await runVerify();
      }

      if (!presenceTimerRef.current) {
        presenceTimerRef.current = window.setInterval(async () => {
          if (presenceBusyRef.current || cancelled) return;
          const frame = await captureFrame();
          if (!frame) return;
          presenceBusyRef.current = true;
          try {
            const resp = await presenceProctoring(proctorSessionId, frame);
            const isPresent = !!resp.present;
            setFaceStatus(isPresent ? "DETECTED" : "NOT_DETECTED");

            // Foiz hisoblash
            const stats = presenceStatsRef.current;
            stats.total += 1;
            if (isPresent) stats.ok += 1;
            const ratio = stats.total > 0 ? stats.ok / stats.total : 0;
            setFaceRatio(ratio);
            setTotalChecks(stats.total);

            // 50% dan pastga tushsa ogohlantirish
            if (stats.total >= 3 && ratio < 0.5 && !presenceWarnedRef.current) {
              presenceWarnedRef.current = true;
              message.warning(
                t('studentTests.faceWarning', { ratio: Math.round(ratio * 100) }),
                6
              );
            }

            if (resp.blocked) {
              setProctorBlocked(true);
              message.error(t('studentTests.proctorBlocked'));
              stopPresenceLoop();
              stopCamera();
            }
          } catch (err: unknown) {
            if (!presenceWarnedRef.current) {
              presenceWarnedRef.current = true;
              message.warning(getApiError(err, t('studentTests.proctorCheckFailed')));
            }
          } finally {
            presenceBusyRef.current = false;
          }
        }, 15000);
      }
    };

    init();
    return () => {
      cancelled = true;
      stopPresenceLoop();
      stopCamera();
    };
  }, [open, proctorSessionId]);

  const canAnswer = !!selectedOption && !sending && (!proctorSessionId || (proctorVerified && !proctorBlocked));

  return (
    <div className="page-shell">
      <Typography.Title level={4} className="page-title">{t('studentTests.title')}</Typography.Title>
      {hasPendingTests && (
        <Typography.Text type="secondary">
          {t('studentTests.pendingInfo')}
        </Typography.Text>
      )}
      {!selectedSubject ? (
        isLoading ? (
          <Skeleton active />
        ) : !subjectCards.length ? (
          <Empty description={t('studentTests.noTests')} />
        ) : (
          <List
            grid={{ gutter: 12, xs: 1, sm: 2, md: 3 }}
            dataSource={subjectCards}
            renderItem={(card) => (
              <List.Item>
                <Card hoverable onClick={() => setSelectedSubject(card.name)}>
                  <Typography.Text strong>{card.name}</Typography.Text>
                  <div style={{ marginTop: 'var(--space-1-5)', color: "var(--color-text-muted)" }}>{card.count} {t('studentTests.countSuffix')}</div>
                </Card>
              </List.Item>
            )}
          />
        )
      ) : (
        <>
          <div className="page-header-row">
            <Button onClick={() => setSelectedSubject(null)}>{t('common.back')}</Button>
            <Typography.Text strong>{selectedSubject}</Typography.Text>
          </div>
          {isLoading ? (
            <Skeleton active />
          ) : !filteredTests.length ? (
            <Empty description={t('studentTests.noTests')} />
          ) : (
            <List
              dataSource={filteredTests}
              renderItem={(item) => {
                const startState = getStartState(t, item);
                return (
                  <List.Item
                    actions={[
                      <Button
                        type={startState.canStart ? "primary" : "default"}
                        key="start"
                        disabled={!startState.canStart}
                        onClick={() => handleStart(item.id)}
                      >
                        {startState.label}
                      </Button>,
                    ]}
                  >
                    <div style={{ width: "100%" }}>
                      <div className="kv-grid">
                        <span style={{ color: "var(--color-text-muted)" }}>{t('studentTests.titleLabel')}</span>
                        <strong>{item.title}</strong>
                        <span style={{ color: "var(--color-text-muted)" }}>{t('studentTests.subject')}</span>
                        <span>{item.subject_name || item.subject || "-"}</span>
                        <span style={{ color: "var(--color-text-muted)" }}>{t('studentTests.lesson')}</span>
                        <span>{item.lesson_topic || "-"}</span>
                        <span style={{ color: "var(--color-text-muted)" }}>{t('studentTests.group')}</span>
                        <span>{item.group_name || item.group || "-"}</span>
                        <span style={{ color: "var(--color-text-muted)" }}>{t('studentTests.time')}</span>
                        <span>{item.time_limit_minutes ?? "-"} min</span>
                        <span style={{ color: "var(--color-text-muted)" }}>{t('studentTests.totalScore')}</span>
                        <span>{item.total_score ?? "-"}</span>
                        <span style={{ color: "var(--color-text-muted)" }}>{t('studentTests.statusLabel')}</span>
                        <span>
                          <Tag color={startState.color}>{startState.statusLabel}</Tag>
                        </span>
                        <span style={{ color: "var(--color-text-muted)" }}>{t('studentTests.reason')}</span>
                        <span>{startState.reason}</span>
                        <span style={{ color: "var(--color-text-muted)" }}>{t('studentTests.attendance')}</span>
                        <span>{getAttendanceLabel(t, item.access)}</span>
                        <span style={{ color: "var(--color-text-muted)" }}>{t('studentTests.participation')}</span>
                        <span>{formatRatio(item.access?.attendance_joined_ratio)}</span>
                        <span style={{ color: "var(--color-text-muted)" }}>{t('studentTests.faceRatioLabel')}</span>
                        <span>{formatRatio(item.access?.attendance_face_verified_ratio)}</span>
                        <span style={{ color: "var(--color-text-muted)" }}>{t('studentTests.finalLabel')}</span>
                        <span>{item.access?.attendance_finalized ? t('common.yes') : t('common.no')}</span>
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
        title={t('studentTests.test')}
        open={open}
        onCancel={() => {
          setOpen(false);
          setCurrent(null);
          setStudentTestId(null);
          setProctorSessionId(null);
          setProctorVerified(false);
          setProctorBlocked(false);
          setFaceStatus("CHECKING");
          stopPresenceLoop();
          stopCamera();
        }}
        footer={
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button key="verify" onClick={runVerify} disabled={!proctorSessionId || sending}>
              {t('studentTests.faceVerify')}
            </Button>
            <Button key="finish" onClick={handleFinish} disabled={!studentTestId} loading={sending}>
              {t('studentTests.finish')}
            </Button>
            <Button key="answer" type="primary" onClick={handleAnswer} disabled={!canAnswer} loading={sending}>
              {t('studentTests.answerSubmit')}
            </Button>
          </div>
        }
      >
        {proctorSessionId && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 'var(--space-3)' }}>
            <div
              style={{
                position: "relative",
                width: 'clamp(100px, 30vw, 140px)',
                height: 'clamp(75px, 22vw, 105px)',
                borderRadius: 'var(--radius-base)',
                overflow: "hidden",
                border: `2.5px solid ${faceStatus === "DETECTED"
                    ? "var(--color-success)"
                    : faceStatus === "NOT_DETECTED"
                      ? "var(--color-error)"
                      : "rgba(var(--live-border-rgb),0.35)"
                  }`,
                boxShadow:
                  faceStatus === "DETECTED"
                    ? "0 0 8px rgba(var(--color-success-rgb),0.5)"
                    : faceStatus === "NOT_DETECTED"
                      ? "0 0 8px rgba(var(--color-error-rgb),0.5)"
                      : "none",
                transition: "border-color 0.3s, box-shadow 0.3s",
                background: "var(--color-text-primary)",
                flexShrink: 0,
              }}
            >
              <video
                ref={videoRef}
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
                muted
                playsInline
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: "rgba(var(--color-black-rgb),0.62)",
                  padding: "3px 6px",
                  textAlign: "center",
                  fontSize: 'var(--font-size-xs)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color:
                    faceStatus === "DETECTED"
                      ? "var(--color-success)"
                      : faceStatus === "NOT_DETECTED"
                        ? "var(--color-error)"
                        : "var(--color-text-muted)",
                }}
              >
                {faceStatus === "DETECTED"
                  ? t('studentTests.faceDetected')
                  : faceStatus === "NOT_DETECTED"
                    ? t('studentTests.faceNotVisible')
                    : t('studentTests.faceChecking')}
              </div>
              {totalChecks > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    background: "rgba(var(--color-black-rgb),0.52)",
                    padding: "2px 6px",
                    textAlign: "center",
                    fontSize: 'var(--font-size-2xs)',
                    fontWeight: 'var(--font-weight-bold)',
                    color: faceRatio >= 0.5 ? "var(--color-success)" : "var(--color-error)",
                  }}
                >
                  {Math.round(faceRatio * 100)}% • {totalChecks} {t('studentTests.checkCount')}
                </div>
              )}
            </div>
          </div>
        )}
        {current?.question ? (
          <>
            <Typography.Title level={5}>{current.question.text}</Typography.Title>
            <Radio.Group
              onChange={(e) => setSelectedOption(e.target.value)}
              value={selectedOption || undefined}
              style={{ display: "flex", flexDirection: "column", gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}
            >
              {current.question.options.map((opt) => (
                <Radio key={opt.id} value={opt.id}>
                  {opt.text}
                </Radio>
              ))}
            </Radio.Group>
          </>
        ) : (
          <Typography.Text>{t('studentTests.questionsFinished')}</Typography.Text>
        )}
      </Modal>
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default StudentTests;
