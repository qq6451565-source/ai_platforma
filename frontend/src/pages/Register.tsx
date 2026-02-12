import {
  CameraOutlined,
  IdcardOutlined,
  PhoneOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Form, Upload, message } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { login, register } from "../api/auth";
import { Button, Input, Card } from "../components/ui";
import { clearTokens, saveTokens } from "../utils/token";
import { clearPendingCredentials, savePendingCredentials } from "../utils/pendingCredentials";
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

  useEffect(() => {
    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (currentStep !== 2 && cameraActive) {
      stopCamera();
    }
  }, [currentStep, cameraActive]);

  const handleProfileSubmit = (values: ProfileFormValues) => {
    const payload = {
      full_name: (values.full_name || "").trim(),
      email: (values.email || "").trim(),
      phone: (values.phone || "").trim(),
    };
    setProfileData(payload);
    message.success(t("register.profileSaved"));
    setCurrentStep(1);
  };

  const handlePassportUpload = () => {
    if (!passportFile) {
      message.warning(t("register.passportRequired"));
      return;
    }
    setCurrentStep(2);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      message.error(t("register.cameraError"));
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context || !video.videoWidth || !video.videoHeight) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
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
      navigate("/app/student/profile", { replace: true });
    } catch (error: any) {
      clearPendingCredentials();
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
      message.warning(t("register.scanError"));
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
      await autoLoginAndRedirect(res.login_username, res.login_password);
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
              <Upload
                accept="image/*"
                beforeUpload={() => false}
                maxCount={1}
                showUploadList={false}
                onChange={(info) => {
                  const file = info.fileList?.[0]?.originFileObj as File | undefined;
                  setPassportFile(file || null);
                }}
              >
                <Button variant="outline" icon={<IdcardOutlined />} block>
                  {t("register.passportUpload")}
                </Button>
              </Upload>

              {passportPreview && (
                <div className="neon-preview-card">
                  <img src={passportPreview} alt="passport preview" />
                </div>
              )}

              <div className="wizard-actions">
                <Button variant="ghost" onClick={() => setCurrentStep(0)}>
                  {t("common.back")}
                </Button>
                <Button onClick={handlePassportUpload} isLoading={loading}>
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
                  <video ref={videoRef} className="scanner-video" />
                  <canvas ref={canvasRef} className="scanner-canvas" />
                  {!cameraActive && selfiePreview && (
                    <img src={selfiePreview} className="scanner-video" alt="selfie" />
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

                  <Button onClick={handleCameraCapture} disabled={!cameraActive}>
                    Rasmga olish
                  </Button>

                  {selfieFile && (
                    <Button variant="ghost" onClick={handleRetake}>
                      Qayta olish
                    </Button>
                  )}
                </div>

                {!selfieFile && <div className="wizard-hint">Selfie rasm olish majburiy.</div>}
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
