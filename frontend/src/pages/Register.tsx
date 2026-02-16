import {
  CameraOutlined,
  IdcardOutlined,
  PhoneOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Form, message } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { login, register } from "../api/auth";
import { fetchMe } from "../api/user";
import { Button, Input, Card } from "../components/ui";
import { clearTokens, saveTokens } from "../utils/token";
import { savePendingCredentials } from "../utils/pendingCredentials";
import "./Register.css";

type ProfileFormValues = {
  full_name: string;
  email: string;
  phone: string;
};

type LivenessStage = "idle" | "align" | "left" | "right" | "blink" | "capturing" | "done";

const normalizeApiError = (error: any, fallback: string): string => {
  const data = error?.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (typeof data?.detail === "string") return data.detail;

  if (typeof data === "object") {
    for (const value of Object.values(data)) {
      if (typeof value === "string") return value;
      if (Array.isArray(value) && value.length) return String(value[0]);
      if (value && typeof value === "object") {
        const nested = Object.values(value as Record<string, unknown>);
        if (nested.length) {
          const first = nested[0];
          if (typeof first === "string") return first;
          if (Array.isArray(first) && first.length) return String(first[0]);
        }
      }
    }
  }

  return fallback;
};

const RegisterPage = () => {
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [profileData, setProfileData] = useState<ProfileFormValues | null>(null);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [passportPreview, setPassportPreview] = useState<string | null>(null);

  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [livenessStage, setLivenessStage] = useState<LivenessStage>("idle");
  const [scannerNotice, setScannerNotice] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const detectorRef = useRef<any>(null);
  const analysisTimerRef = useRef<number | null>(null);
  const analysisBusyRef = useRef(false);
  const stageSinceRef = useRef<number>(0);
  const livenessStageRef = useRef<LivenessStage>("idle");
  const cameraActiveRef = useRef(false);
  const videoReadyRef = useRef(false);
  const loadingRef = useRef(false);
  const neutralYRef = useRef<number | null>(null);

  const stepTitles = useMemo(
    () => [t("register.steps.personal"), t("register.steps.passport"), t("register.steps.face")],
    [t]
  );

  const livenessTasks = useMemo(
    () => [
      { key: "align", label: t("register.alignFace") },
      { key: "left", label: t("register.lookLeft") },
      { key: "right", label: t("register.lookRight") },
      { key: "blink", label: t("register.blinkEyes") },
    ],
    [t]
  );

  const livenessInstruction = useMemo(() => {
    if (livenessStage === "align") return t("register.alignFaceHint");
    if (livenessStage === "left") return t("register.lookLeftHint");
    if (livenessStage === "right") return t("register.lookRightHint");
    if (livenessStage === "blink") return t("register.blinkEyesHint");
    if (livenessStage === "capturing") return t("register.capturingHint");
    if (livenessStage === "done") return t("register.submittingHint");
    return t("register.startSelfieHint");
  }, [livenessStage, t]);

  useEffect(() => {
    if (!passportFile) {
      setPassportPreview(null);
      return;
    }
    const url = URL.createObjectURL(passportFile);
    setPassportPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [passportFile]);

  useEffect(() => {
    if (!selfieFile) {
      setSelfiePreview(null);
      return;
    }
    const url = URL.createObjectURL(selfieFile);
    setSelfiePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selfieFile]);

  useEffect(() => {
    livenessStageRef.current = livenessStage;
  }, [livenessStage]);

  useEffect(() => {
    cameraActiveRef.current = cameraActive;
  }, [cameraActive]);

  useEffect(() => {
    videoReadyRef.current = videoReady;
  }, [videoReady]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const stopAnalysis = () => {
    if (analysisTimerRef.current) {
      window.clearInterval(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }
    analysisBusyRef.current = false;
  };

  const setStage = (stage: LivenessStage) => {
    livenessStageRef.current = stage;
    setLivenessStage(stage);
    stageSinceRef.current = Date.now();
  };

  const stopCamera = () => {
    stopAnalysis();
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setVideoReady(false);
    livenessStageRef.current = "idle";
    setLivenessStage("idle");
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (currentStep !== 2 && cameraActive) {
      stopCamera();
    }
  }, [currentStep, cameraActive]);

  const handleProfileSubmit = (values: ProfileFormValues) => {
    setProfileData({
      full_name: (values.full_name || "").trim(),
      email: (values.email || "").trim(),
      phone: (values.phone || "").trim(),
    });
    message.success(t("register.profileSaved"));
    setCurrentStep(1);
  };

  const handlePassportNext = () => {
    if (!passportFile) {
      message.warning(t("register.passportRequired"));
      return;
    }
    setCurrentStep(2);
  };

  const getFaceDetector = () => {
    if (detectorRef.current) return detectorRef.current;
    const Detector = (window as any).FaceDetector;
    if (!Detector) return null;
    detectorRef.current = new Detector({ fastMode: true, maxDetectedFaces: 1 });
    return detectorRef.current;
  };

  const startCamera = async () => {
    try {
      stopCamera();
      setVideoReady(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
          aspectRatio: { ideal: 4 / 3 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
          setVideoReady(true);
        }
      }

      setCameraActive(true);
      return true;
    } catch {
      message.error(t("register.cameraError"));
      return false;
    }
  };

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current || !videoReady) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context || !video.videoWidth || !video.videoHeight) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const arr = dataUrl.split(",");
    if (arr.length < 2) return null;

    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);

    return new File([u8arr], "selfie.jpg", { type: mime });
  };

  const submitRegistration = async (capturedSelfie: File) => {
    if (!profileData) {
      message.warning(t("register.profileError"));
      setCurrentStep(0);
      return;
    }

    if (!passportFile) {
      message.warning(t("register.passportRequired"));
      setCurrentStep(1);
      return;
    }

    try {
      setLoading(true);
      const res = await register({
        full_name: profileData.full_name,
        email: profileData.email,
        phone: profileData.phone,
        passport_front: passportFile,
        selfie_image: capturedSelfie,
      });

      message.success(res.detail || t("register.completed"));
      if (res.login_username && res.login_password) {
        savePendingCredentials(res.login_username, res.login_password);
      }

      if (res.access) {
        try {
          saveTokens(res.access, res.refresh);
          await fetchMe();
          window.location.replace("/app/student/profile");
          return;
        } catch {
          clearTokens();
        }
      }

      if (res.login_username && res.login_password) {
        await autoLoginAndRedirect(res.login_username, res.login_password);
        return;
      }

      message.warning(t("register.credentialsNote"));
      setScannerNotice(t("register.profileError"));
    } catch (error: any) {
      message.error(normalizeApiError(error, t("register.profileError")));
    } finally {
      setLoading(false);
    }
  };

  const finishSelfieFlow = async () => {
    const selfie = captureSelfie();
    if (!selfie) {
      setScannerNotice(t("register.scanError"));
      setStage("idle");
      stopCamera();
      return;
    }

    setSelfieFile(selfie);
    setStage("done");
    setScannerNotice(t("register.submittingHint"));
    stopCamera();
    await submitRegistration(selfie);
  };

  const analyzeLiveness = async () => {
    if (
      analysisBusyRef.current ||
      !videoRef.current ||
      !cameraActiveRef.current ||
      !videoReadyRef.current ||
      loadingRef.current
    ) {
      return;
    }
    analysisBusyRef.current = true;

    try {
      const video = videoRef.current;
      const detector = getFaceDetector();
      const stage = livenessStageRef.current;

      if (!detector) {
        if (Date.now() - stageSinceRef.current > 4500) {
          setStage("capturing");
          stopAnalysis();
          await finishSelfieFlow();
        }
        return;
      }

      const faces = await detector.detect(video);
      if (!faces?.length) {
        setScannerNotice(t("register.faceNotDetected"));
        stageSinceRef.current = Date.now();
        return;
      }

      setScannerNotice(null);
      const face = faces[0];
      const box = face.boundingBox;

      if (!box || !video.videoWidth || !video.videoHeight) return;

      const cx = (box.x + box.width / 2) / video.videoWidth;
      const cy = (box.y + box.height / 2) / video.videoHeight;
      const area = (box.width * box.height) / (video.videoWidth * video.videoHeight);
      const centered = Math.abs(cx - 0.5) < 0.18 && Math.abs(cy - 0.5) < 0.2 && area > 0.1;
      const now = Date.now();

      if (stage === "align") {
        if (!centered) {
          stageSinceRef.current = now;
          return;
        }
        if (now - stageSinceRef.current >= 900) {
          neutralYRef.current = cy;
          setStage("left");
        }
        return;
      }

      if (stage === "left") {
        if (cx <= 0.38) {
          if (now - stageSinceRef.current >= 800) {
            setStage("right");
          }
        } else {
          stageSinceRef.current = now;
        }
        return;
      }

      if (stage === "right") {
        if (cx >= 0.62) {
          if (now - stageSinceRef.current >= 800) {
            setStage("blink");
          }
        } else {
          stageSinceRef.current = now;
        }
        return;
      }

      if (stage === "blink") {
        // Browser-level blink detection is not available consistently.
        // We hold the face centered for a short time on the final step.
        const neutralY = neutralYRef.current ?? cy;
        const blinkLikeMove = Math.abs(cy - neutralY) > 0.02;
        if ((centered && now - stageSinceRef.current >= 1200) || blinkLikeMove) {
          setStage("capturing");
          stopAnalysis();
          await finishSelfieFlow();
        } else if (!centered) {
          stageSinceRef.current = now;
        }
      }
    } catch {
      setScannerNotice(t("register.scanError"));
      stopAnalysis();
      stopCamera();
      setStage("idle");
    } finally {
      analysisBusyRef.current = false;
    }
  };

  const startSelfieFlow = async () => {
    setScannerNotice(null);
    setSelfieFile(null);
    setSelfiePreview(null);
    neutralYRef.current = null;

    const started = await startCamera();
    if (!started) return;

    setStage("align");

    if (analysisTimerRef.current) {
      window.clearInterval(analysisTimerRef.current);
    }
    analysisTimerRef.current = window.setInterval(() => {
      void analyzeLiveness();
    }, 350);
  };

  const autoLoginAndRedirect = async (username?: string, password?: string) => {
    if (!username || !password) {
      throw new Error("credentials_missing");
    }

    savePendingCredentials(username, password);
    const tokens = await login({ username, password });
    saveTokens(tokens.access, tokens.refresh);
    await fetchMe();
    // Use hard redirect to ensure app boots with fresh auth context.
    window.location.replace("/app/student/profile");
  };

  return (
    <div className="registration-page">
      <div className="registration-container">
        <Card
          className="wizard-card"
          title={t("register.title")}
          extra={
            <Link to="/login" className="body-sm">
              {t("register.loginLink")}
            </Link>
          }
          hasBeam
        >
          <div className="wizard-steps">
            {stepTitles.map((title, index) => (
              <div
                key={title}
                className={`wizard-step ${index === currentStep ? "active" : ""} ${
                  index < currentStep ? "done" : ""
                }`}
              >
                <div className="step-index">{index + 1}</div>
                <span>{title}</span>
              </div>
            ))}
          </div>

          {currentStep === 0 && (
            <Form
              form={form}
              layout="vertical"
              onFinish={handleProfileSubmit}
              onFinishFailed={({ errorFields }) => {
                const firstError = errorFields?.[0]?.errors?.[0];
                if (firstError) message.error(firstError);
              }}
              requiredMark={false}
            >
              <div className="wizard-grid">
                <Form.Item
                  label={t("register.fullName")}
                  name="full_name"
                  rules={[{ required: true, message: t("register.fullNameRequired") }]}
                >
                  <Input icon={<UserOutlined />} placeholder={t("register.fullNamePlaceholder")} />
                </Form.Item>

                <Form.Item
                  label={t("register.email")}
                  name="email"
                  rules={[
                    { required: true, message: t("register.emailRequired") },
                    { type: "email", message: t("register.emailInvalid") },
                  ]}
                >
                  <Input icon={<UserOutlined />} placeholder={t("register.emailPlaceholder")} type="email" />
                </Form.Item>

                <Form.Item
                  label={t("register.phoneNumber")}
                  name="phone"
                  rules={[{ required: true, message: t("register.phoneRequired") }]}
                >
                  <Input icon={<PhoneOutlined />} placeholder={t("register.phonePlaceholder")} />
                </Form.Item>
              </div>

              <Button type="submit" block isLoading={loading} size="lg" onClick={() => form.submit()}>
                {t("common.next")}
              </Button>
            </Form>
          )}

          {currentStep === 1 && (
            <div className="wizard-step-body">
              <p className="wizard-text">{t("register.passportSubtitle")}</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setPassportFile(file);
                }}
                className="hidden-file-input"
                id="passport-upload-input"
              />
              <Button
                variant="outline"
                icon={<IdcardOutlined />}
                block
                onClick={() => document.getElementById("passport-upload-input")?.click()}
              >
                {t("register.passportUpload")}
              </Button>

              {passportPreview && (
                <div className="neon-preview-card">
                  <img src={passportPreview} alt="passport preview" />
                </div>
              )}

              <div className="wizard-actions">
                <Button variant="ghost" onClick={() => setCurrentStep(0)}>
                  {t("common.back")}
                </Button>
                <Button onClick={handlePassportNext} isLoading={loading}>
                  {t("common.next")}
                </Button>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="wizard-step-body">
              <p className="wizard-text">{t("register.faceSubtitle")}</p>

              <div className="scanner-section">
                <div className={`scanner-frame ${cameraActive ? "active" : ""}`}>
                  <video
                    ref={videoRef}
                    className="scanner-video"
                    autoPlay
                    muted
                    playsInline
                    onLoadedMetadata={() => setVideoReady(true)}
                  />
                  <canvas ref={canvasRef} className="scanner-canvas" />
                  {!cameraActive && selfiePreview && (
                    <img src={selfiePreview} className="scanner-video" alt="selfie preview" />
                  )}
                  {!cameraActive && !selfiePreview && (
                    <div className="scanner-placeholder">{t("register.startSelfieHint")}</div>
                  )}
                  <div className="scanner-overlay" />
                  <div className="scanner-oval" />
                </div>

                <div className="scanner-status-list">
                  {livenessTasks.map((task) => {
                    const currentIndex = livenessTasks.findIndex((item) => item.key === livenessStage);
                    const itemIndex = livenessTasks.findIndex((item) => item.key === task.key);
                    const done = currentIndex > itemIndex || livenessStage === "done";
                    const active = livenessStage === task.key;
                    return (
                      <div
                        key={task.key}
                        className={`status-chip ${done ? "success" : ""} ${active ? "active" : ""}`}
                      >
                        {task.label}
                      </div>
                    );
                  })}
                </div>

                <div className="wizard-text">{livenessInstruction}</div>
                {scannerNotice && <div className="wizard-hint">{scannerNotice}</div>}
                {!cameraActive && !selfieFile && <div className="wizard-hint">{t("register.selfieRequired")}</div>}
                {selfieFile && <div className="status-chip success">{t("register.faceVerified")}</div>}

                <div className="scanner-actions">
                  <Button
                    icon={<CameraOutlined />}
                    onClick={startSelfieFlow}
                    disabled={cameraActive || loading}
                    isLoading={loading || (cameraActive && livenessStage !== "idle")}
                  >
                    {t("register.startSelfieFlow")}
                  </Button>
                </div>
              </div>

              <div className="wizard-actions">
                <Button variant="ghost" onClick={() => setCurrentStep(1)} disabled={loading}>
                  {t("common.back")}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
