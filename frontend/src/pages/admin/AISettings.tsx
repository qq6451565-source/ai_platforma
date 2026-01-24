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
import { fetchAISettings, updateAISettings, fetchAIHealth } from "../../api/admin";

const AdminAISettingsPage = () => {
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
      message.success("AI sozlamalari yangilandi");
      await qc.invalidateQueries({ queryKey: ["admin-ai-settings"] });
    },
    onError: () => message.error("Yangilashda xato"),
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
      ? "Ulangan"
      : status === "disabled"
        ? "O'chirilgan"
        : status === "unconfigured"
          ? "Sozlanmagan"
          : status === "unreachable"
            ? "Ulanmadi"
            : "Noma'lum";

  return (
    <Card title="AI sozlamalari">
      <Card
        type="inner"
        title="AI Gateway holati"
        extra={
          <Button size="small" onClick={() => refetch()}>
            Yangilash
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
              <Descriptions.Item label="AI yoqilgan">{health?.enabled ? "Ha" : "Yo'q"}</Descriptions.Item>
              <Descriptions.Item label="API key mavjud">{health?.api_key_set ? "Ha" : "Yo'q"}</Descriptions.Item>
              <Descriptions.Item label="Timeout (sekund)">{health?.timeout ?? "-"}</Descriptions.Item>
              <Descriptions.Item label="Gateway status">{health?.gateway?.status || "-"}</Descriptions.Item>
            </Descriptions>
          </Space>
        )}
      </Card>
      <Form layout="vertical" form={form} initialValues={data} onFinish={updateMut.mutate}>
        <Divider orientation="left">Ulanish sozlamalari</Divider>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="ai_enabled" label="AI yoqilgan" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} md={16}>
            <Form.Item name="api_base_url" label="AI Gateway URL">
              <Input placeholder="http://127.0.0.1:8001" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="api_key" label="API key">
              <Input.Password placeholder="API key" />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="timeout_seconds" label="Timeout (sekund)">
              <InputNumber min={1} max={120} step={1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="retry_count" label="Retry (urinish)">
              <InputNumber min={0} max={10} step={1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">OCR sozlamalari</Divider>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="ocr_confidence_threshold" label="OCR threshold">
              <InputNumber min={0} max={1} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="max_image_size_mb" label="Max rasm hajmi (MB)">
              <InputNumber min={1} max={25} step={0.5} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Face match sozlamalari</Divider>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="enable_face_match" label="Face match yoqilgan" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="face_match_threshold" label="Face match threshold">
              <InputNumber min={0} max={1} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="face_model" label="Face model">
              <Input placeholder="Facenet512 / ArcFace" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="detection_backend" label="Detection backend">
              <Input placeholder="opencv / retinaface / mtcnn" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="enforce_detection" label="Detection majburiy" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Presence (davomat) sozlamalari</Divider>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="enable_presence" label="Presence yoqilgan" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="presence_threshold" label="Presence threshold">
              <InputNumber min={0} max={1} step={0.01} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Divider orientation="left">Proktor sozlamalari</Divider>
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item name="proctor_strict" label="Proktor qat'iy" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="proctor_missing_seconds" label="Yo'q bo'lish limiti (soniya)">
              <InputNumber min={10} max={600} step={5} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Button type="primary" htmlType="submit" loading={updateMut.isPending}>
          Saqlash
        </Button>
      </Form>
    </Card>
  );
};

export default AdminAISettingsPage;
