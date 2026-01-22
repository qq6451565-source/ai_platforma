import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Form, Switch, InputNumber, Button, message, Spin, Tag, Descriptions, Space } from "antd";
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
      <Form
        layout="vertical"
        form={form}
        initialValues={data}
        onFinish={updateMut.mutate}
      >
        <Form.Item name="enable_face_match" label="Face match yoqilgan" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="enable_presence" label="Presence yoqilgan" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item name="face_match_threshold" label="Face match threshold">
          <InputNumber min={0} max={1} step={0.01} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="presence_threshold" label="Presence threshold">
          <InputNumber min={0} max={1} step={0.01} style={{ width: "100%" }} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={updateMut.isPending}>
          Saqlash
        </Button>
      </Form>
    </Card>
  );
};

export default AdminAISettingsPage;
