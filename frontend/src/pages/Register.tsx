import {
  CameraOutlined,
  IdcardOutlined,
  PhoneOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Form, message } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { login, register } from "../api/auth";
import { Button, Input, Card } from "../components/ui";
import { clearTokens, saveTokens } from "../utils/token";
import { savePendingCredentials } from "../utils/pendingCredentials";
import "./Register.css";

type ProfileFormValues = {
  full_name: string;
  email: string;
  phone: string;
};

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
  const navigate = useNavigate();
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

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stepTitles = useMemo(
    () => [t("register.steps.personal"), t("register.steps.passport"), t("register.steps.face")],
    [t]
  );

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

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setVideoReady(false);
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

  const startCamera = async () => {
    try {
      stopCamera();
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
      }

      setCameraActive(true);
      setVideoReady(false);
    } catch {
      message.error(t("register.cameraError"));
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

  const handleCameraCapture = () => {
    if (!videoReady) {
      message.warning(t("register.cameraPreparing"));
      return;
    }

    const selfie = captureSelfie();
    if (!selfie) {
      message.error(t("register.scanError"));
      return;
    }

    setSelfieFile(selfie);
    stopCamera();
    message.success(t("register.scanSuccess"));
  };

  const handleRetake = () => {
    setSelfieFile(null);
    setSelfiePreview(null);
  };

  const autoLoginAndRedirect = async (username?: string, password?: string) => {
    if (!username || !password) {
      message.warning(t("register.credentialsNote"));
      navigate("/login", { replace: true });
      return;
    }

    try {
      savePendingCredentials(username, password);
      const tokens = await login({ username, password });
      saveTokens(tokens.access, tokens.refresh);
      // Use a hard redirect so the app re-initializes with the new token.
      // (App reads auth token from localStorage and otherwise may not re-render.)
      window.location.replace("/app/student/profile");
    } catch (error: any) {
      clearTokens();
      message.warning(normalizeApiError(error, t("register.profileError")));
      navigate("/login", { replace: true });
    }
  };

  const handleFinish = async () => {
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

    if (!selfieFile) {
      message.warning(t("register.selfieRequired"));
      return;
    }

    try {
      setLoading(true);
      const res = await register({
        full_name: profileData.full_name,
        email: profileData.email,
        phone: profileData.phone,
        passport_front: passportFile,
        selfie_image: selfieFile,
      });

      message.success(res.detail || t("register.completed"));
      // Registrationdan keyin avval login endpoint orqali token olamiz:
      // bu flow oddiy login bilan bir xil va barqarorroq.
      if (res.login_username && res.login_password) {
        await autoLoginAndRedirect(res.login_username, res.login_password);
        return;
      }

      // Fallback: agar backend faqat token qaytargan bo'lsa, shu bilan kiramiz.
      if (res.access) {
        saveTokens(res.access, res.refresh);
        window.location.replace("/app/student/profile");
        return;
      }

      message.warning(t("register.credentialsNote"));
      navigate("/login", { replace: true });
    } catch (error: any) {
      message.error(normalizeApiError(error, t("register.profileError")));
    } finally {
      setLoading(false);
    }
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
                    <div className="scanner-placeholder">{t("register.selfieRequired")}</div>
                  )}
                  <div className="scanner-overlay" />
                </div>

                <div className="scanner-actions">
                  {!cameraActive ? (
                    <Button icon={<CameraOutlined />} onClick={startCamera}>
                      {t("register.startCamera")}
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={stopCamera}>
                      {t("register.stopCamera")}
                    </Button>
                  )}

                  <Button onClick={handleCameraCapture} disabled={!cameraActive || !videoReady}>
                    {t("register.capturePhoto")}
                  </Button>

                  {selfieFile && (
                    <Button variant="ghost" onClick={handleRetake}>
                      {t("register.retakePhoto")}
                    </Button>
                  )}
                </div>

                {cameraActive && !videoReady && <div className="wizard-text">{t("register.cameraPreparing")}</div>}
                {!selfieFile && <div className="wizard-hint">{t("register.selfieRequired")}</div>}
                {selfieFile && <div className="status-chip success">{t("register.faceVerified")}</div>}
              </div>

              <div className="wizard-actions">
                <Button variant="ghost" onClick={() => setCurrentStep(1)}>
                  {t("common.back")}
                </Button>
                <Button onClick={handleFinish} disabled={!selfieFile} isLoading={loading}>
                  {t("register.finish")}
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
