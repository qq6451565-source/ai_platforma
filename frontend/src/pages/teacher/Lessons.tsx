import { Button, Form, Input, DatePicker, List, Skeleton, Typography, message, Select, Popconfirm, Modal, Empty } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchLessons, createLesson, deleteLesson, updateLesson } from "../../api/lessons";
import { useState } from "react";
import dayjs from "dayjs";
import { fetchTeacherSubjects } from "../../api/teacherSubjects";
import { fetchGroups } from "../../api/groups";

const TeacherLessons = () => {
  const qc = useQueryClient();
  const { data: lessons, isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
  });
  const { data: teacherSubjects } = useQuery({
    queryKey: ["teacher-subjects"],
    queryFn: fetchTeacherSubjects,
  });
  const { data: groups } = useQuery({ queryKey: ["groups"], queryFn: fetchGroups });
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [filterGroup, setFilterGroup] = useState<number | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm] = Form.useForm();

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      await createLesson({
        teacher_subject: Number(values.teacher_subject),
        group: Number(values.group),
        topic: values.topic,
        start_time: values.start_time.toISOString(),
        end_time: values.end_time.toISOString(),
      });
      message.success("Dars yaratildi");
      form.resetFields();
      await qc.invalidateQueries({ queryKey: ["lessons"] });
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4}>Mening darslarim</Typography.Title>
      <Form
        layout="vertical"
        form={form}
        onFinish={onFinish}
        style={{ maxWidth: 520, marginBottom: 24 }}
      >
        <Form.Item name="teacher_subject" label="TeacherSubject" rules={[{ required: true }]}>
          <Select
            showSearch
            options={(teacherSubjects || []).map((ts) => ({
              value: ts.id,
              label: `TS #${ts.id} (subj ${ts.subject}, groups ${ts.groups.join(",")})`,
            }))}
          />
        </Form.Item>
        <Form.Item name="group" label="Guruh" rules={[{ required: true }]}>
          <Select
            showSearch
            options={(groups || []).map((g) => ({ value: g.id, label: `${g.name} (${g.year})` }))}
          />
        </Form.Item>
        <Form.Item name="topic" label="Mavzu" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="start_time" label="Boshlanish" rules={[{ required: true }]}>
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="end_time" label="Tugash" rules={[{ required: true }]}>
          <DatePicker showTime style={{ width: "100%" }} />
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
        <>
          <div style={{ marginBottom: 12, maxWidth: 240 }}>
            <Select
              allowClear
              placeholder="Guruh bo'yicha filter"
              style={{ width: "100%" }}
              onChange={(v) => setFilterGroup(v ?? null)}
              options={(groups || []).map((g) => ({ value: g.id, label: `${g.name} (${g.year})` }))}
            />
          </div>
          {(() => {
            const filtered = (lessons || []).filter((l) => (filterGroup ? l.group === filterGroup : true));
            if (!filtered.length) return <Empty description="Ma'lumot yo'q" />;
            return (
              <List
                dataSource={filtered}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button
                        key="edit"
                        type="link"
                        onClick={() => {
                          setEditItem(item);
                          editForm.setFieldsValue({
                            teacher_subject: item.teacher_subject,
                            group: item.group,
                            topic: item.topic,
                            start_time: dayjs(item.start_time),
                            end_time: dayjs(item.end_time),
                          });
                          setEditOpen(true);
                        }}
                      >
                        Tahrirlash
                      </Button>,
                      <Popconfirm
                        key="delete"
                        title="O'chirish?"
                        onConfirm={async () => {
                          try {
                            await deleteLesson(item.id);
                            message.success("O'chirildi");
                            await qc.invalidateQueries({ queryKey: ["lessons"] });
                          } catch {
                            message.error("O'chirishda xato");
                          }
                        }}
                      >
                        <Button danger type="link">
                          O'chirish
                        </Button>
                      </Popconfirm>,
                    ]}
                  >
                    <List.Item.Meta
                      title={`${item.subject_name || ""} | ${item.topic}`}
                      description={`${item.group_name || ""} | ${new Date(item.start_time).toLocaleString()} - ${new Date(
                        item.end_time
                      ).toLocaleTimeString()}`}
                    />
                  </List.Item>
                )}
              />
            );
          })()}
        </>
      )}

      <Modal
        title="Darsni tahrirlash"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={async () => {
          if (!editItem) return;
          setEditLoading(true);
          try {
            const vals = await editForm.validateFields();
            await updateLesson(editItem.id, {
              teacher_subject: Number(vals.teacher_subject),
              group: Number(vals.group),
              topic: vals.topic,
              start_time: vals.start_time.toISOString(),
              end_time: vals.end_time.toISOString(),
            });
            message.success("Yangilandi");
            setEditOpen(false);
            await qc.invalidateQueries({ queryKey: ["lessons"] });
          } catch (err: any) {
            if (!err?.errorFields) message.error(err?.response?.data?.detail || "Xatolik");
          } finally {
            setEditLoading(false);
          }
        }}
        confirmLoading={editLoading}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="teacher_subject" label="TeacherSubject" rules={[{ required: true }]}>
            <Select
              showSearch
              options={(teacherSubjects || []).map((ts) => ({
                value: ts.id,
                label: `TS #${ts.id} (subj ${ts.subject}, groups ${ts.groups.join(",")})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="group" label="Guruh" rules={[{ required: true }]}>
            <Select
              showSearch
              options={(groups || []).map((g) => ({ value: g.id, label: `${g.name} (${g.year})` }))}
            />
          </Form.Item>
          <Form.Item name="topic" label="Mavzu" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="start_time" label="Boshlanish" rules={[{ required: true }]}>
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="end_time" label="Tugash" rules={[{ required: true }]}>
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TeacherLessons;
