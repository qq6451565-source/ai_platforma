import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, Form, Input, Button, List, message, Empty, Select, Popconfirm, DatePicker, Modal } from "antd";
import dayjs from "dayjs";
import {
  fetchLessonsAdmin,
  createLessonAdmin,
  deleteLessonAdmin,
  updateLessonAdmin,
  fetchTeacherSubjects,
  fetchGroupsAdmin,
} from "../../api/admin";

const AdminLessonsPage = () => {
  const qc = useQueryClient();
  const { data: lessons, isLoading } = useQuery({
    queryKey: ["admin-lessons"],
    queryFn: fetchLessonsAdmin,
  });
  const { data: teacherSubjects } = useQuery({
    queryKey: ["admin-teacher-subjects"],
    queryFn: fetchTeacherSubjects,
  });
  const { data: groups } = useQuery({
    queryKey: ["admin-groups"],
    queryFn: fetchGroupsAdmin,
  });
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);

  const tsMap = new Map(
    (teacherSubjects || []).map((ts) => [ts.id, `T:${ts.teacher} | S:${ts.subject}`])
  );
  const groupMap = new Map((groups || []).map((g) => [g.id, g.name]));

  const createMut = useMutation({
    mutationFn: (vals: any) =>
      createLessonAdmin({
        teacher_subject: vals.teacher_subject,
        group: vals.group,
        topic: vals.topic,
        start_time: vals.start_time?.toISOString(),
        end_time: vals.end_time?.toISOString(),
      }),
    onSuccess: async () => {
      message.success("Dars qo'shildi");
      await qc.invalidateQueries({ queryKey: ["admin-lessons"] });
    },
    onError: () => message.error("Dars qo'shishda xato"),
  });

  return (
    <Card title="Darslar" style={{ marginBottom: 16 }}>
      <Form layout="vertical" onFinish={createMut.mutate} style={{ marginBottom: 12 }}>
        <Form.Item name="teacher_subject" label="Teacher-Subject" rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder="Bog'lanish"
            options={(teacherSubjects || []).map((ts) => ({
              value: ts.id,
              label: `#${ts.id} | T:${ts.teacher} | S:${ts.subject}`,
            }))}
          />
        </Form.Item>
        <Form.Item name="group" label="Guruh" rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder="Guruh"
            options={(groups || []).map((g) => ({ value: g.id, label: g.name }))}
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
        <Button type="primary" htmlType="submit" loading={createMut.isLoading}>
          Qo'shish
        </Button>
      </Form>

      <List
        loading={isLoading}
        dataSource={lessons || []}
        locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
        renderItem={(l) => (
          <List.Item
            actions={[
              <Button
                type="link"
                onClick={() => {
                  setEditItem(l);
                  editForm.setFieldsValue({
                    teacher_subject: l.teacher_subject,
                    group: l.group,
                    topic: l.topic,
                    start_time: l.start_time ? dayjs(l.start_time) : null,
                    end_time: l.end_time ? dayjs(l.end_time) : null,
                  });
                  setEditOpen(true);
                }}
              >
                Tahrirlash
              </Button>,
              <Popconfirm
                title="O'chirish?"
                onConfirm={() =>
                  deleteLessonAdmin(l.id)
                    .then(() => qc.invalidateQueries({ queryKey: ["admin-lessons"] }))
                    .catch(() => message.error("O'chirishda xato"))
                }
              >
                <Button danger type="link">
                  O'chirish
                </Button>
              </Popconfirm>,
            ]}
          >
            {l.topic} | {groupMap.get(l.group) || `Guruh #${l.group}`} |{" "}
            {l.subject_name || tsMap.get(l.teacher_subject) || ""} |{" "}
            {l.start_time ? dayjs(l.start_time).format("YYYY-MM-DD HH:mm") : ""} -{" "}
            {l.end_time ? dayjs(l.end_time).format("YYYY-MM-DD HH:mm") : ""}
          </List.Item>
        )}
      />

      <Modal
        title="Darsni tahrirlash"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={async () => {
          if (!editItem) return;
          setEditLoading(true);
          try {
            const vals = await editForm.validateFields();
            await updateLessonAdmin(editItem.id, {
              teacher_subject: vals.teacher_subject,
              group: vals.group,
              topic: vals.topic,
              start_time: vals.start_time?.toISOString(),
              end_time: vals.end_time?.toISOString(),
            });
            message.success("Yangilandi");
            setEditOpen(false);
            await qc.invalidateQueries({ queryKey: ["admin-lessons"] });
          } catch (err: any) {
            if (!err?.errorFields) message.error("Xatolik");
          } finally {
            setEditLoading(false);
          }
        }}
        confirmLoading={editLoading}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="teacher_subject" label="Teacher-Subject" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Bog'lanish"
              options={(teacherSubjects || []).map((ts) => ({
                value: ts.id,
                label: `#${ts.id} | T:${ts.teacher} | S:${ts.subject}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="group" label="Guruh" rules={[{ required: true }]}>
            <Select
              showSearch
              placeholder="Guruh"
              options={(groups || []).map((g) => ({ value: g.id, label: g.name }))}
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
    </Card>
  );
};

export default AdminLessonsPage;
