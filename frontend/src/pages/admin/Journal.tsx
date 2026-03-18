import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Card,
  Form,
  Select,
  Input,
  InputNumber,
  Button,
  List,
  Empty,
  Popconfirm,
  Modal,
  message,
} from "antd";
import {
  createJournalRecord,
  updateJournalRecord,
  deleteJournalRecord,
} from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const AdminJournalPage = () => {
  const qc = useQueryClient();
  const { data: records, isLoading } = useQuery(adminQueryOptions.journalRecords());
  const { data: lessons } = useQuery(adminQueryOptions.lessons());
  const { data: groups } = useQuery(adminQueryOptions.groups());
  const { data: students } = useQuery(adminQueryOptions.students());

  const lessonMap = new Map((lessons || []).map((l) => [l.id, l.topic || `Dars #${l.id}`]));
  const groupMap = new Map((groups || []).map((g) => [g.id, g.name]));
  const studentMap = new Map((students || []).map((s) => [s.id, `${s.first_name} ${s.last_name}`.trim() || s.username]));

  const [editItem, setEditItem] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);

  const createMut = useMutation({
    mutationFn: (vals: any) => createJournalRecord(vals),
    onSuccess: async () => {
      message.success("Jurnal yozuvi qo'shildi");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.journalRecords });
    },
    onError: () => message.error("Qo'shishda xato"),
  });

  return (
    <Card title="Jurnal" style={{ marginBottom: 16 }}>
      <Form layout="vertical" onFinish={createMut.mutate} style={{ marginBottom: 12 }}>
        <Form.Item name="lesson" label="Dars" rules={[{ required: true }]}>
          <Select
            showSearch
            options={(lessons || []).map((l) => ({ value: l.id, label: l.topic || `Dars #${l.id}` }))}
          />
        </Form.Item>
        <Form.Item name="group" label="Guruh" rules={[{ required: true }]}>
          <Select
            showSearch
            options={(groups || []).map((g) => ({ value: g.id, label: g.name }))}
          />
        </Form.Item>
        <Form.Item name="student" label="Talaba" rules={[{ required: true }]}>
          <Select
            showSearch
            options={(students || []).map((s) => ({
              value: s.id,
              label: `${s.first_name} ${s.last_name}`.trim() || s.username,
            }))}
          />
        </Form.Item>
        <Form.Item name="attendance" label="Holat" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "present", label: "Bor" },
              { value: "absent", label: "Yoq" },
            ]}
          />
        </Form.Item>
        <Form.Item name="grade" label="Baho">
          <InputNumber min={0} max={100} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="comment" label="Izoh">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={createMut.isPending}>
          Qo'shish
        </Button>
      </Form>

      <List
        loading={isLoading}
        dataSource={records || []}
        locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
        renderItem={(r) => (
          <List.Item
            actions={[
              <Button
                type="link"
                onClick={() => {
                  setEditItem(r);
                  editForm.setFieldsValue({
                    lesson: r.lesson,
                    group: r.group,
                    student: r.student,
                    attendance: r.attendance === "absent" ? "absent" : "present",
                    grade: r.grade,
                    comment: r.comment,
                  });
                }}
              >
                Tahrirlash
              </Button>,
              <Popconfirm title="O'chirish?" onConfirm={() => deleteJournalRecord(r.id).then(() => qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.journalRecords }))}>
                <Button danger type="link">O'chirish</Button>
              </Popconfirm>,
            ]}
          >
            {lessonMap.get(r.lesson) || `Dars #${r.lesson}`} | {studentMap.get(r.student) || `Student #${r.student}`} |{" "}
            {groupMap.get(r.group) || `Guruh #${r.group}`} | {r.attendance === "absent" ? "Yoq" : "Bor"}
          </List.Item>
        )}
      />

      <Modal
        title="Jurnal yozuvini tahrirlash"
        open={!!editItem}
        onCancel={() => setEditItem(null)}
        onOk={async () => {
          if (!editItem) return;
          setEditLoading(true);
          try {
            const vals = await editForm.validateFields();
            await updateJournalRecord(editItem.id, vals);
            message.success("Yangilandi");
            setEditItem(null);
            await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.journalRecords });
          } catch (err: any) {
            if (!err?.errorFields) message.error("Xatolik");
          } finally {
            setEditLoading(false);
          }
        }}
        confirmLoading={editLoading}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="lesson" label="Dars" rules={[{ required: true }]}>
            <Select options={(lessons || []).map((l) => ({ value: l.id, label: l.topic || `Dars #${l.id}` }))} />
          </Form.Item>
          <Form.Item name="group" label="Guruh" rules={[{ required: true }]}>
            <Select options={(groups || []).map((g) => ({ value: g.id, label: g.name }))} />
          </Form.Item>
          <Form.Item name="student" label="Talaba" rules={[{ required: true }]}>
            <Select
              options={(students || []).map((s) => ({
                value: s.id,
                label: `${s.first_name} ${s.last_name}`.trim() || s.username,
              }))}
            />
          </Form.Item>
          <Form.Item name="attendance" label="Holat" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "present", label: "Bor" },
                { value: "absent", label: "Yoq" },
              ]}
            />
          </Form.Item>
          <Form.Item name="grade" label="Baho">
            <InputNumber min={0} max={100} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="comment" label="Izoh">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AdminJournalPage;
