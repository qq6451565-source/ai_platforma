import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  Form,
  Switch,
  InputNumber,
  Button,
  message,
  Spin,
  Tag,
  Descriptions,
  Space,
  Input,
  Divider,
  Row,
  Col,
} from "antd";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { fetchAISettings, updateAISettings, fetchAIHealth } from "../../api/admin";

const AdminAISettingsPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-ai-settings"],
    queryFn: fetchAISettings,
  });
  const { data: health, isLoading: healthLoading, refetch } = useQuery({
    queryKey: ["admin-ai-health"],
    queryFn: fetchAIHealth,
  });
  const [form] = Form.useForm();

  const updateMut = useMutation({
    mutationFn: (vals: any) => updateAISettings(vals),
    onSuccess: async () => {
      message.success(t("aiSettings.messages.updated"));
      await qc.invalidateQueries({ queryKey: ["admin-ai-settings"] });
    },
    onError: () => message.error(t("aiSettings.messages.updateError")),
  });

  useEffect(() => {
    if (data) form.setFieldsValue(data);
  }, [data, form]);

  if (isLoading) {
    return (
      <div style={{ padding: 24 }}>
        <Spin />
      </div>
    );
  }

  const status = health?.status || "unknown";
  const statusColor =
    status === "ok" ? "green" : status === "disabled" ? "gold" : status === "unconfigured" ? "orange" : "red";
  const statusLabel =
    status === "ok"
      ? t("aiSettings.status.ok")
      : status === "disabled"
        ? t("aiSettings.status.disabled")
        : status === "unconfigured"
          ? t("aiSettings.status.unconfigured")
          : status === "unreachable"
            ? t("aiSettings.status.unreachable")
            : t("aiSettings.status.unknown");

  return (
    <Card title={t("aiSettings.title")}>
      <Card
        type="inner"
        title={t("aiSettings.gateway.title")}
        extra={
          <Button size="small" onClick={() => refetch()}>
            {t("aiSettings.gateway.refresh")}
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        {healthLoading ? (
          <Spin />
        ) : (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Space align="center" size="middle">
              <Tag color={statusColor}>{statusLabel}</Tag>
              <span>{health?.base_url || "-"}</span>
            </Space>
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label={t("aiSettings.gateway.aiEnabled")}>{health?.enabled ? t("common.yes") : t("common.no")}</Descriptions.Item>
              <Descriptions.Item label={t("aiSettings.gateway.apiKeyPresent")}>{health?.api_key_set ? t("common.yes") : t("common.no")}</Descriptions.Item>
              <Descriptions.Item label={t("aiSettings.gateway.timeout")}>{health?.timeout ?? "-"}</Descriptions.Item>
              <Descriptions.Item label={t("aiSettings.gateway.gatewayStatus")}>{health?.gateway?.status || "-"}</Descriptions.Item>
            </Descriptions>
          </Space>
        )}
      </Card>
      <Form layout="vertical" form={form} initialValues={data} onFinish={updateMut.mutate}>
        <Divider orientation="left">{t("aiSettings.sections.connection")}</Divider>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="ai_enabled" label={t("aiSettings.fields.aiEnabled")} valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item name="api_base_url" label={t("aiSettings.fields.apiBaseUrl")}>
              <Input placeholder="http://127.0.0.1:8001" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="api_key" label={t("aiSettings.fields.apiKey")}>
              <Input.Password placeholder={t("aiSettings.fields.apiKey")} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="timeout_seconds" label={t("aiSettings.fields.timeoutSeconds")}>
              <InputNumber min={1} max={120} step={1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="retry_count" label={t("aiSettings.fields.retryCount")}>
              <InputNumber min={0} max={10} step={1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">{t("aiSettings.sections.ocr")}</Divider>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="ocr_confidence_threshold" label={t("aiSettings.fields.ocrThreshold")}>
              <InputNumber min={0} max={1} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="max_image_size_mb" label={t("aiSettings.fields.maxImageSizeMb")}>
              <InputNumber min={1} max={25} step={0.5} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">{t("aiSettings.sections.faceMatch")}</Divider>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="enable_face_match" label={t("aiSettings.fields.faceMatchEnabled")} valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="face_match_threshold" label={t("aiSettings.fields.faceMatchThreshold")}>
              <InputNumber min={0} max={1} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="face_model" label={t("aiSettings.fields.faceModel")}>
              <Input placeholder="Facenet512 / ArcFace" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="detection_backend" label={t("aiSettings.fields.detectionBackend")}>
              <Input placeholder="opencv / retinaface / mtcnn" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="enforce_detection" label={t("aiSettings.fields.enforceDetection")} valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">{t("aiSettings.sections.presence")}</Divider>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="enable_presence" label={t("aiSettings.fields.presenceEnabled")} valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="presence_threshold" label={t("aiSettings.fields.presenceThreshold")}>
              <InputNumber min={0} max={1} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">{t("aiSettings.sections.proctor")}</Divider>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="proctor_strict" label={t("aiSettings.fields.proctorStrict")} valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="proctor_missing_seconds" label={t("aiSettings.fields.proctorMissingSeconds")}>
              <InputNumber min={10} max={600} step={5} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Button type="primary" htmlType="submit" loading={updateMut.isPending}>
          {t("common.save")}
        </Button>
      </Form>
    </Card>
  );
};

export default AdminAISettingsPage;
