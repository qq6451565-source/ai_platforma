import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Form, Switch, InputNumber, Button, message, Spin } from "antd";
import { useEffect } from "react";
import { fetchAISettings, updateAISettings } from "../../api/admin";

const AdminAISettingsPage = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-ai-settings"],
    queryFn: fetchAISettings,
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

  return (
    <Card title="AI sozlamalari">
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
        <Button type="primary" htmlType="submit" loading={updateMut.isLoading}>
          Saqlash
        </Button>
      </Form>
    </Card>
  );
};

export default AdminAISettingsPage;
