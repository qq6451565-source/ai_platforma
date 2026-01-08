import { Button, Form, Input, List, Select, Skeleton, Typography, message } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { fetchAnnouncements, createAnnouncement } from "../../api/announcements";
import { fetchSubjects } from "../../api/subjects";
import { fetchGroups } from "../../api/groups";

const TeacherAnnouncements = () => {
  const qc = useQueryClient();
  const { data: items, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: fetchAnnouncements,
  });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const { data: groups } = useQuery({ queryKey: ["groups"], queryFn: fetchGroups });

  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      await createAnnouncement({
        title: values.title,
        message: values.message,
        subject: values.subject || null,
        group: values.group || null,
      });
      message.success("E'lon yaratildi");
      form.resetFields();
      await qc.invalidateQueries({ queryKey: ["announcements"] });
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4}>E'lonlar (teacher)</Typography.Title>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        style={{ maxWidth: 520, marginBottom: 24 }}
      >
        <Form.Item name="title" label="Sarlavha" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="message" label="Matn" rules={[{ required: true }]}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="subject" label="Fan (ixtiyoriy)">
          <Select
            allowClear
            showSearch
            options={(subjects || []).map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
          />
        </Form.Item>
        <Form.Item name="group" label="Guruh (ixtiyoriy)">
          <Select
            allowClear
            showSearch
            options={(groups || []).map((g) => ({ value: g.id, label: `${g.name} (${g.year})` }))}
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            Yaratish
          </Button>
        </Form.Item>
      </Form>

      {isLoading ? (
        <Skeleton active />
      ) : (
        <List
          dataSource={items || []}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={item.title}
                description={`${item.group_name || ""} ${
                  item.subject_name ? " | Fan: " + item.subject_name : ""
                } | ${item.creator_name || ""} | ${
                  item.created_at ? new Date(item.created_at).toLocaleString() : ""
                }`}
              />
              <div>{item.message}</div>
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default TeacherAnnouncements;
