import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Form, Button, List, message, Empty, Select, Popconfirm, Modal } from "antd";
import { useState } from "react";
import {
  createTeacherSubject,
  deleteTeacherSubject,
  updateTeacherSubject,
} from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const TeacherSubjectsPage = () => {
  const qc = useQueryClient();
  const { data: items, isLoading } = useQuery(adminQueryOptions.teacherSubjects());
  const { data: teachers } = useQuery(adminQueryOptions.teachers());
  const { data: subjects } = useQuery(adminQueryOptions.subjects());
  const { data: groups } = useQuery(adminQueryOptions.groups());
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);

  const teacherMap = new Map((teachers || []).map((t) => [t.id, t.username]));
  const subjectMap = new Map((subjects || []).map((s) => [s.id, s.name]));
  const groupMap = new Map((groups || []).map((g) => [g.id, g.name]));

  const createMut = useMutation({
    mutationFn: (vals: any) => createTeacherSubject(vals),
    onSuccess: async () => {
      message.success("Bog'lanish qo'shildi");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.teacherSubjects });
    },
    onError: () => message.error("Xatolik"),
  });

  return (
    <Card title="O'qituvchi - Fan - Guruh" style={{ marginBottom: 'var(--space-4)' }}>
      <Form layout="vertical" onFinish={createMut.mutate} style={{ marginBottom: 'var(--space-3)' }}>
        <Form.Item name="teacher" label="O'qituvchi" rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder="O'qituvchi"
            options={(teachers || []).map((t) => ({ value: t.id, label: t.username }))}
          />
        </Form.Item>
        <Form.Item name="subject" label="Fan" rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder="Fan"
            options={(subjects || []).map((s) => ({ value: s.id, label: s.name }))}
          />
        </Form.Item>
        <Form.Item name="groups" label="Guruhlar">
          <Select
            mode="multiple"
            allowClear
            placeholder="Guruhlar"
            options={(groups || []).map((g) => ({ value: g.id, label: g.name }))}
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={createMut.isPending}>
          Qo'shish
        </Button>
      </Form>

      <List
        loading={isLoading}
        dataSource={items || []}
        locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
        renderItem={(it) => (
          <List.Item
            actions={[
              <Button
                type="link"
                onClick={() => {
                  setEditItem(it);
                  editForm.setFieldsValue({
                    teacher: it.teacher,
                    subject: it.subject,
                    groups: it.groups,
                  });
                  setEditOpen(true);
                }}
              >
                Tahrirlash
              </Button>,
              <Popconfirm
                title="O'chirish?"
                onConfirm={() =>
                  deleteTeacherSubject(it.id)
                    .then(() => qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.teacherSubjects }))
                    .catch(() => message.error("O'chirishda xato"))
                }
              >
                <Button danger type="link">
                  O'chirish
                </Button>
              </Popconfirm>,
            ]}
          >
            {teacherMap.get(it.teacher) || `Teacher #${it.teacher}`} |{" "}
            {subjectMap.get(it.subject) || `Fan #${it.subject}`} | Guruhlar:{" "}
            {(it.groups || [])
              .map((gid) => groupMap.get(gid) || `#${gid}`)
              .join(", ")}
          </List.Item>
        )}
      />

      <Modal
        title="Bog'lanishni tahrirlash"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={async () => {
          if (!editItem) return;
          setEditLoading(true);
          try {
            const vals = await editForm.validateFields();
            await updateTeacherSubject(editItem.id, vals);
            message.success("Yangilandi");
            setEditOpen(false);
            await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.teacherSubjects });
          } catch (err: any) {
            if (!err?.errorFields) message.error("Xatolik");
          } finally {
            setEditLoading(false);
          }
        }}
        confirmLoading={editLoading}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="teacher" label="O'qituvchi" rules={[{ required: true }]}>
            <Select
              showSearch
              options={(teachers || []).map((t) => ({ value: t.id, label: t.username }))}
            />
          </Form.Item>
          <Form.Item name="subject" label="Fan" rules={[{ required: true }]}>
            <Select
              showSearch
              options={(subjects || []).map((s) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
          <Form.Item name="groups" label="Guruhlar">
            <Select
              mode="multiple"
              allowClear
              options={(groups || []).map((g) => ({ value: g.id, label: g.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default TeacherSubjectsPage;
