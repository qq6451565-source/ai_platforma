import { CalendarOutlined, IdcardOutlined, PhoneOutlined, UserOutlined } from "@ant-design/icons";
import { Form, Upload, message, Modal } from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { register } from "../api/auth";
import { Button, Input, Card } from "../components/ui";
import "./Register.css";

type ProfileFormValues = {
  first_name: string;
  last_name: string;
  email: string;
  patronymic: string;
  birth_date: string | { format?: (pattern: string) => string };
  passport_series: string;
  phone: string;
};

const RegisterPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const maxBirthDate = new Date().toISOString().split("T")[0];
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [passportPreview, setPassportPreview] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileFormValues | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [faceVerified, setFaceVerified] = useState(false);
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

  const normalizeBirthDate = (value: ProfileFormValues["birth_date"]) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value.format === "function") return value.format("YYYY-MM-DD");
    return "";
  };

  const handleProfileSubmit = (values: ProfileFormValues) => {
    const normalizedBirthDate = normalizeBirthDate(values.birth_date);
    if (!normalizedBirthDate || normalizedBirthDate.length < 10) {
      message.error(t("register.birthYearRequired"));
      return;
    }
    const normalizedPassport = (values.passport_series || "").replace(/\s+/g, "").toUpperCase();
    const payload = {
      ...values,
      birth_date: normalizedBirthDate,
      passport_series: normalizedPassport,
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
    } catch (error) {
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
    if (!context) return null;

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

  const handleScan = () => {
    const selfie = captureSelfie();
    if (!selfie) {
      message.error(t("register.scanError"));
      return;
    }
    setSelfieFile(selfie);
    setFaceVerified(true);
    message.success(t("register.scanSuccess"));
  };

  const handleFinish = async () => {
    if (!profileData) {
      message.warning(t("register.profileError"));
      setCurrentStep(0);
      return;
    }
    if (!passportFile || !selfieFile) {
      message.warning(t("register.passportRequired"));
      return;
    }
    try {
      setLoading(true);
      const fullName = `${profileData.first_name} ${profileData.last_name}`.trim();
      const res = await register({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        full_name: fullName,
        email: profileData.email,
        phone: profileData.phone,
        patronymic: profileData.patronymic,
        birth_date: profileData.birth_date,
        passport_series: profileData.passport_series,
        passport_front: passportFile,
        selfie_image: selfieFile,
      });
      message.success(res.detail || t("register.completed"));
      stopCamera();
      if (res.login_username && res.login_password) {
        Modal.info({
          title: t("register.credentialsTitle"),
          content: (
            <div>
              <p>{t("register.credentialsUser", { username: res.login_username })}</p>
              <p>{t("register.credentialsPass", { password: res.login_password })}</p>
              <p className="wizard-text">{t("register.credentialsNote")}</p>
            </div>
          ),
          onOk: () => navigate("/login"),
        });
      } else {
        navigate("/login");
      }
    } catch (error: any) {
      message.error(error?.response?.data?.detail || t("register.profileError"));
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
                if (firstError) {
                  message.error(firstError);
                }
              }}
              requiredMark={false}
            >
              <div className="wizard-grid">
                <Form.Item
                  label={t("register.firstName")}
                  name="first_name"
                  rules={[{ required: true, message: t("register.firstNameRequired") }]}
                >
                  <Input icon={<UserOutlined />} placeholder={t("register.firstNamePlaceholder")} />
                </Form.Item>
                <Form.Item
                  label={t("register.lastName")}
                  name="last_name"
                  rules={[{ required: true, message: t("register.lastNameRequired") }]}
                >
                  <Input icon={<UserOutlined />} placeholder={t("register.lastNamePlaceholder")} />
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
                  label={t("register.patronymic")}
                  name="patronymic"
                  rules={[{ required: true, message: t("register.patronymicRequired") }]}
                >
                  <Input icon={<UserOutlined />} placeholder={t("register.patronymicPlaceholder")} />
                </Form.Item>
                <Form.Item
                  label={t("register.birthYear")}
                  name="birth_date"
                  rules={[{ required: true, message: t("register.birthYearRequired") }]}
                >
                  <Input icon={<CalendarOutlined />} type="date" max={maxBirthDate} />
                </Form.Item>
                <Form.Item
                  label={t("register.passportSeries")}
                  name="passport_series"
                  rules={[{ required: true, message: t("register.passportSeriesRequired") }]}
                >
                  <Input icon={<IdcardOutlined />} placeholder="AB1234567" />
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
                  if (file) {
                    setPassportFile(file);
                  } else {
                    setPassportFile(null);
                  }
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
                  <div className="scanner-overlay"></div>
                </div>
                <div className="scanner-actions">
                  {!cameraActive ? (
                    <Button onClick={startCamera}>{t("register.startCamera")}</Button>
                  ) : (
                    <Button variant="outline" onClick={stopCamera}>
                      {t("register.stopCamera")}
                    </Button>
                  )}
                  <Button onClick={handleScan} disabled={!cameraActive}>
                    {t("register.scanNow")}
                  </Button>
                </div>
                {faceVerified && <div className="status-chip success">{t("register.faceVerified")}</div>}
              </div>

              <div className="wizard-actions">
                <Button variant="ghost" onClick={() => setCurrentStep(1)}>
                  {t("common.back")}
                </Button>
                <Button onClick={handleFinish} disabled={!faceVerified}>
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
