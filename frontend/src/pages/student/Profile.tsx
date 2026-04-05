import { Alert, Avatar, Button, Card, Input, Tabs, Form, Upload, message } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { updateProfile, changePassword } from "../../api/profile";
import { useMe } from "../../hooks/useMe";
import { runProfileAiVerification } from "../../api/auth";
import {
  clearPendingCredentials,
  getPendingCredentials,
  type PendingCredentials,
} from "../../utils/pendingCredentials";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { getApiError } from "../../utils/getApiError";

const AI_AUTO_RETRY_LIMIT = 3;
const AI_AUTO_RETRY_DELAY_MS = 90_000;

const StudentProfile = () => {
  usePageTitle('nav.profile');
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: user } = useMe();

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);
  const [file, setFile] = useState<File | undefined>(undefined);
  const [pendingCredentials, setPendingCredentials] = useState<PendingCredentials | null>(null);
  const [aiCheckMessage, setAiCheckMessage] = useState<string>("");
  const [aiCheckType, setAiCheckType] = useState<"info" | "success" | "warning" | "error">("info");
  const [aiChecking, setAiChecking] = useState(false);
  const aiCheckTriggeredRef = useRef(false);
  const aiCheckRetryCountRef = useRef(0);
  const aiRetryTimerRef = useRef<number | null>(null);
  const runAiCheckRef = useRef<(mode: "initial" | "retry") => void>(() => {});

  const [profileForm] = Form.useForm();
  const [passForm] = Form.useForm();

  const isPendingStudent = user?.role === "student" && !user?.group;

  useEffect(() => {
    profileForm.setFieldsValue({
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      email: user?.email || "",
      phone: user?.phone || "",
    });
  }, [user, profileForm]);

  useEffect(() => {
    if (!user) return;

    if (user.role === "student" && !user.group) {
      setPendingCredentials(getPendingCredentials());
      return;
    }

    clearPendingCredentials();
    setPendingCredentials(null);
  }, [user]);

  const profileStatusText = useMemo(() => {
    return isPendingStudent ? t('studentProfilePage.pending') : t('studentProfilePage.activeStatus');
  }, [isPendingStudent, t]);

  const runAiCheck = useCallback(
    (mode: "initial" | "retry") => {
      if (!user || !isPendingStudent || aiChecking) return;

      const queueRetry = () => {
        if (aiCheckRetryCountRef.current >= AI_AUTO_RETRY_LIMIT) return;
        if (aiRetryTimerRef.current) return;
        aiRetryTimerRef.current = window.setTimeout(() => {
          aiRetryTimerRef.current = null;
          runAiCheckRef.current("retry");
        }, AI_AUTO_RETRY_DELAY_MS);
      };

      setAiChecking(true);
      setAiCheckType("info");
      setAiCheckMessage(
        mode === "initial"
          ? t('studentProfilePage.aiCheckAutoStarted')
          : t('studentProfilePage.aiCheckRetrying'),
      );

      runProfileAiVerification()
        .then((result) => {
          if (result.verified) {
            setAiCheckType("success");
            setAiCheckMessage(result.detail || t('studentProfilePage.aiCheckSuccess'));
            return;
          }

          const events = Array.isArray(result.events_json) ? result.events_json : [];
          const unavailable = events.find(
            (event) => event?.type === "ai" && event?.status === "unavailable",
          ) as { detail?: string } | undefined;

          if (unavailable) {
            setAiCheckType("warning");
            setAiCheckMessage(unavailable.detail || result.detail || t('studentProfilePage.aiServiceUnavailable'));
            aiCheckRetryCountRef.current += 1;
            queueRetry();
            return;
          }

          if (result.action === "cooldown") {
            setAiCheckType("info");
            setAiCheckMessage(result.detail || t('studentProfilePage.aiCheckCooldown'));
            aiCheckRetryCountRef.current += 1;
            queueRetry();
            return;
          }

          setAiCheckType("info");
          setAiCheckMessage(result.detail || t('studentProfilePage.aiCheckDone'));
        })
        .catch((err: unknown) => {
          const detail = axios.isAxiosError(err)
            ? (err.response?.data?.detail || err.response?.data?.error || t('studentProfilePage.aiCheckError'))
            : t('studentProfilePage.aiCheckError');
          setAiCheckType("error");
          setAiCheckMessage(detail);
          aiCheckRetryCountRef.current += 1;
          queueRetry();
        })
        .finally(() => {
          setAiChecking(false);
        });
    },
    [aiChecking, isPendingStudent, user],
  );

  useEffect(() => {
    runAiCheckRef.current = runAiCheck;
  }, [runAiCheck]);

  useEffect(() => {
    if (!user || !isPendingStudent || aiCheckTriggeredRef.current) return;
    aiCheckTriggeredRef.current = true;
    runAiCheck("initial");
  }, [isPendingStudent, runAiCheck, user]);

  useEffect(() => {
    return () => {
      if (aiRetryTimerRef.current) {
        window.clearTimeout(aiRetryTimerRef.current);
      }
    };
  }, []);

  const onSaveProfile = async (values: any) => {
    setLoadingProfile(true);
    try {
      await updateProfile({ ...values, face_image: file });
      message.success(t('studentProfilePage.profileUpdated'));
      setFile(undefined);
      await qc.invalidateQueries({ queryKey: ["me"] });
    } catch (err: unknown) {
      message.error(getApiError(err, t('common.error')));
    } finally {
      setLoadingProfile(false);
    }
  };

  const onChangePassword = async (values: any) => {
    setLoadingPass(true);
    try {
      await changePassword(values);
      message.success(t('studentProfilePage.passwordUpdated'));
      passForm.resetFields();
    } catch (err: unknown) {
      message.error(getApiError(err, t('common.error')));
    } finally {
      setLoadingPass(false);
    }
  };

  const items = [
    {
      key: "profile",
      label: t('studentProfilePage.personalInfo'),
      children: (
        <Card>
          <div className="d-flex items-center mb-6 gap-4">
            <Avatar size={80} src={user?.face_image || undefined}>
              {user?.first_name?.[0] || user?.username?.[0] || "U"}
            </Avatar>
            <Upload
              beforeUpload={(f) => {
                setFile(f);
                return false;
              }}
              maxCount={1}
              showUploadList={false}
            >
              <Button size="small">{t('studentProfilePage.uploadPhoto')}</Button>
            </Upload>
            {file && <span className="caption">{file.name}</span>}
          </div>

          <Form form={profileForm} layout="vertical" onFinish={onSaveProfile}>
            <div
              className="d-grid"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "var(--space-4)" }}
            >
            <Form.Item label={t('studentProfilePage.firstName')} name="first_name" rules={[{ required: true, message: t('profile.firstNameRequired') }]}>
                <Input />
              </Form.Item>
              <Form.Item label={t('studentProfilePage.lastName')} name="last_name" rules={[{ required: true, message: t('profile.lastNameRequired') }]}>
                <Input />
              </Form.Item>
              <Form.Item label={t('studentProfilePage.email')} name="email" rules={[{ type: 'email', message: t('profile.emailInvalid') }]}>
                <Input type="email" />
              </Form.Item>
              <Form.Item label={t('studentProfilePage.phone')} name="phone">
                <Input />
              </Form.Item>
            </div>
            <div className="mt-4">
              <Button type="primary" htmlType="submit" loading={loadingProfile}>{t('common.save')}</Button>
            </div>
          </Form>
        </Card>
      ),
    },
    {
      key: "security",
      label: t('studentProfilePage.security'),
      children: (
        <div style={{ maxWidth: "500px", width: "100%" }}>
          <Card>
            <Form form={passForm} layout="vertical" onFinish={onChangePassword}>
              <Form.Item
                label={t('studentProfilePage.oldPassword')}
                name="old_password"
                rules={[{ required: true, message: t('profile.oldPasswordRequired') }]}
              >
                <Input.Password />
              </Form.Item>
              <Form.Item
                label={t('studentProfilePage.newPassword')}
                name="new_password"
                rules={[{ required: true, message: t('profile.newPasswordRequired') }, { min: 8, message: t('profile.newPasswordMin') }]}
              >
                <Input.Password />
              </Form.Item>
              <div className="mt-4">
              <Button type="primary" htmlType="submit" loading={loadingPass}>{t('studentProfilePage.updatePassword')}</Button>
              </div>
            </Form>
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container animate-fade-in">
      <h1 className="mb-6">{t('studentProfilePage.pageTitle')}</h1>

      {isPendingStudent && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 'var(--space-4)' }}
          message={t('studentProfilePage.applicationAccepted')}
          description={t('studentProfilePage.applicationPendingDesc')}
        />
      )}

      {isPendingStudent && aiCheckMessage && (
        <Alert
          type={aiCheckType}
          showIcon
          style={{ marginBottom: 'var(--space-4)' }}
          message={aiChecking ? t('studentProfilePage.aiCheckRunning') : t('studentProfilePage.aiCheckStatus')}
          description={aiCheckMessage}
        />
      )}

      {isPendingStudent && pendingCredentials && (
        <Card style={{ marginBottom: 'var(--space-4)' }}>
          <div style={{ marginBottom: 'var(--space-2)', fontWeight: 'var(--font-weight-semibold)' }}>{t('studentProfilePage.loginCredentials')}</div>
          <div className="d-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "var(--space-3)" }}>
            <div><strong>Username:</strong> {pendingCredentials.username}</div>
            <div>
              <strong>{t('studentProfilePage.newPassword')}:</strong> {"•".repeat(8)}{" "}
              <Button
                type="link"
                size="small"
                onClick={() => {
                  navigator.clipboard.writeText(pendingCredentials.password);
                  message.success(t('studentProfilePage.passwordCopied'));
                }}
              >
                {t('studentProfilePage.copyBtn')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card style={{ marginBottom: 'var(--space-4)' }}>
        <div className="d-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-3)" }}>
          <div><strong>{t('studentProfilePage.loginLabel')}:</strong> {user?.username || "-"}</div>
          <div><strong>{t('studentProfilePage.statusLabel')}:</strong> {profileStatusText}</div>
          <div><strong>{t('studentProfilePage.roleLabel')}:</strong> {user?.role || "-"}</div>
          <div><strong>{t('studentProfilePage.groupLabel')}:</strong> {user?.group ? String(user.group) : t('studentProfilePage.notAssigned')}</div>
        </div>
      </Card>

      <Tabs items={items} />
    </div>
  );
};

export default StudentProfile;
