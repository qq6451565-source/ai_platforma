import { Button, Card, Empty, List, Typography, Skeleton, Modal, Radio, message } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchTests } from "../../api/tests";
import { fetchLessons } from "../../api/lessons";
import { fetchAttendance } from "../../api/attendance";
import { useMe } from "../../hooks/useMe";
import { startTest, answerTest, finishTest, StartTestResponse } from "../../api/studentTests";
import { startTestProctoring, verifyProctoring, presenceProctoring, finishProctoring } from "../../api/proctoring";

const StudentTests = () => {
  const { data: me } = useMe();
  const { data: tests, isLoading } = useQuery({
    queryKey: ["tests"],
    queryFn: fetchTests,
  });
  const { data: lessons } = useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
  });
  const { data: attendance, isLoading: loadingAttendance } = useQuery({
    queryKey: ["attendance", me?.id],
    queryFn: () => fetchAttendance(me!.id),
    enabled: !!me?.id,
  });
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<StartTestResponse | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [studentTestId, setStudentTestId] = useState<number | null>(null);
  const [proctorSessionId, setProctorSessionId] = useState<number | null>(null);
  const [proctorVerified, setProctorVerified] = useState(false);
  const [proctorBlocked, setProctorBlocked] = useState(false);
  const [sending, setSending] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const presenceTimerRef = useRef<number | null>(null);
  const presenceBusyRef = useRef(false);
  const verifyDoneRef = useRef(false);
  const presenceWarnedRef = useRef(false);

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const attendedLessonIds = useMemo(() => {
    const set = new Set<number>();
    (attendance || []).forEach((record) => {
      if (record.status === "present") {
        set.add(record.lesson);
      }
    });
    return set;
  }, [attendance]);

  const attendedSubjects = useMemo(() => {
    const set = new Set<string>();
    (lessons || []).forEach((lesson) => {
      if (attendedLessonIds.has(lesson.id) && lesson.subject_name) {
        set.add(lesson.subject_name);
      }
    });
    return set;
  }, [attendedLessonIds, lessons]);

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

  const getStartState = (test: any) => {
    if (!test.is_active) return { canStart: false, label: "Inactive", reason: "Test faol emas" };
    if (loadingAttendance) return { canStart: false, label: "Tekshirilmoqda", reason: "" };
    if (test.lesson) {
      if (!attendedLessonIds.has(test.lesson)) {
        return { canStart: false, label: "Bloklangan", reason: "Darsda qatnashmagansiz" };
      }
    } else if (test.subject_name) {
      if (!attendedSubjects.has(test.subject_name)) {
        return { canStart: false, label: "Bloklangan", reason: "Fan bo'yicha qatnashuv yo'q" };
      }
    }
    return { canStart: true, label: "Boshlash", reason: "" };
  };

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
        setProctorVerified(true);
        verifyDoneRef.current = true;
      } else {
        setProctorVerified(false);
        message.error("Yuz tasdiqlanmadi. Qayta urinib ko'ring.");
      }
    } catch (err: any) {
      message.warning(err?.response?.data?.detail || "Yuz tekshiruvi ishlamadi");
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
      } catch (err: any) {
        message.warning(err?.response?.data?.detail || "Proktor ishga tushmadi");
      }
      await loadNext(resp);
      setOpen(true);
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Boshlashda xato");
    }
  };

  const handleAnswer = async () => {
    if (!studentTestId || !current?.question || !selectedOption) return;
    if (proctorSessionId && (!proctorVerified || proctorBlocked)) {
      message.error("Proktor tekshiruvi tugallanmagan yoki bloklangan.");
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
        message.info("Savollar tugadi, finish bosing");
        setCurrent({ ...resp, question: undefined });
      } else {
        await loadNext(resp);
      }
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Javob yuborishda xato");
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
        } catch (err: any) {
          message.warning(err?.response?.data?.detail || "Proktor yakunlanmadi");
        }
      }
      message.success(`Test yakunlandi: ${resp.score_percent ?? "-"}%`);
      setOpen(false);
      setCurrent(null);
      setStudentTestId(null);
      setProctorSessionId(null);
      setProctorVerified(false);
      setProctorBlocked(false);
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Finish xato");
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
      } catch (err: any) {
        if (!presenceWarnedRef.current) {
          presenceWarnedRef.current = true;
          message.warning(err?.message || "Kamera ruxsatini tekshiring");
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
            if (resp.blocked) {
              setProctorBlocked(true);
              message.error("Proktor blokladi: yuz uzoq vaqt yo'q");
              stopPresenceLoop();
              stopCamera();
            }
          } catch (err: any) {
            if (!presenceWarnedRef.current) {
              presenceWarnedRef.current = true;
              message.warning(err?.response?.data?.detail || "Proktor tekshiruvi ishlamadi");
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
    <div style={{ padding: 24 }}>
      <Typography.Title level={4}>Test / Imtihonlar</Typography.Title>
      {!selectedSubject ? (
        isLoading ? (
          <Skeleton active />
        ) : !subjectCards.length ? (
          <Empty description="Testlar yo'q" />
        ) : (
          <List
            grid={{ gutter: 12, column: 3 }}
            dataSource={subjectCards}
            renderItem={(card) => (
              <List.Item>
                <Card hoverable onClick={() => setSelectedSubject(card.name)}>
                  <Typography.Text strong>{card.name}</Typography.Text>
                  <div style={{ marginTop: 6, color: "#94a3b8" }}>{card.count} ta test</div>
                </Card>
              </List.Item>
            )}
          />
        )
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <Button onClick={() => setSelectedSubject(null)}>Orqaga</Button>
            <Typography.Text strong>{selectedSubject}</Typography.Text>
          </div>
          {isLoading ? (
            <Skeleton active />
          ) : !filteredTests.length ? (
            <Empty description="Testlar yo'q" />
          ) : (
            <List
              dataSource={filteredTests}
              renderItem={(item) => {
                const startState = getStartState(item);
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
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "140px 1fr",
                          rowGap: 6,
                          columnGap: 12,
                        }}
                      >
                        <span style={{ color: "#94a3b8" }}>Sarlavha</span>
                        <strong>{item.title}</strong>
                        <span style={{ color: "#94a3b8" }}>Fan</span>
                        <span>{item.subject_name || item.subject || "-"}</span>
                        <span style={{ color: "#94a3b8" }}>Dars</span>
                        <span>{item.lesson_topic || "-"}</span>
                        <span style={{ color: "#94a3b8" }}>Guruh</span>
                        <span>{item.group_name || item.group || "-"}</span>
                        <span style={{ color: "#94a3b8" }}>Vaqt</span>
                        <span>{item.time_limit_minutes ?? "-"} min</span>
                        <span style={{ color: "#94a3b8" }}>Umumiy ball</span>
                        <span>{item.total_score ?? "-"}</span>
                        <span style={{ color: "#94a3b8" }}>Holat</span>
                        <span>{startState.reason || (item.is_active ? "Active" : "Inactive")}</span>
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
        title="Test"
        open={open}
        onCancel={() => {
          setOpen(false);
          setCurrent(null);
          setStudentTestId(null);
          setProctorSessionId(null);
          setProctorVerified(false);
          setProctorBlocked(false);
          stopPresenceLoop();
          stopCamera();
        }}
        footer={[
          <Button key="verify" onClick={runVerify} disabled={!proctorSessionId || sending}>
            Yuzni tekshirish
          </Button>,
          <Button key="finish" onClick={handleFinish} disabled={!studentTestId} loading={sending}>
            Yakunlash
          </Button>,
          <Button key="answer" type="primary" onClick={handleAnswer} disabled={!canAnswer} loading={sending}>
            Javob yuborish
          </Button>,
        ]}
      >
        {current?.question ? (
          <>
            <Typography.Title level={5}>{current.question.text}</Typography.Title>
            <Radio.Group
              onChange={(e) => setSelectedOption(e.target.value)}
              value={selectedOption || undefined}
              style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}
            >
              {current.question.options.map((opt) => (
                <Radio key={opt.id} value={opt.id}>
                  {opt.text}
                </Radio>
              ))}
            </Radio.Group>
          </>
        ) : (
          <Typography.Text>Savollar tugagan, yakunlash tugmasini bosing.</Typography.Text>
        )}
      </Modal>
      <video ref={videoRef} style={{ display: "none" }} muted playsInline />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default StudentTests;
