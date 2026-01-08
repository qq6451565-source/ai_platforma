import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Card,
  Form,
  Select,
  InputNumber,
  Button,
  List,
  Empty,
  Popconfirm,
  Modal,
  message,
} from "antd";
import {
  fetchGradebookEntries,
  createGradebookEntry,
  updateGradebookEntry,
  deleteGradebookEntry,
  recalcGradebookEntry,
  fetchSubjectsAdmin,
  fetchSemesters,
  fetchUsers,
} from "../../api/admin";

const AdminGradebookPage = () => {
  const qc = useQueryClient();
  const { data: entries, isLoading } = useQuery({
    queryKey: ["admin-gradebook"],
    queryFn: fetchGradebookEntries,
  });
  const { data: subjects } = useQuery({ queryKey: ["admin-subjects"], queryFn: fetchSubjectsAdmin });
  const { data: semesters } = useQuery({ queryKey: ["admin-semesters"], queryFn: fetchSemesters });
  const { data: students } = useQuery({ queryKey: ["admin-students"], queryFn: () => fetchUsers("student") });

  const subjectMap = new Map((subjects || []).map((s) => [s.id, s.name]));
  const semesterMap = new Map((semesters || []).map((s) => [s.id, s.number]));
  const studentMap = new Map((students || []).map((s) => [s.id, `${s.first_name} ${s.last_name}`.trim() || s.username]));

  const [editItem, setEditItem] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);

  const createMut = useMutation({
    mutationFn: (vals: any) => createGradebookEntry(vals),
    onSuccess: async () => {
      message.success("Baholar yozuvi qo'shildi");
      await qc.invalidateQueries({ queryKey: ["admin-gradebook"] });
    },
    onError: () => message.error("Qo'shishda xato"),
  });

  return (
    <Card title="Baholar (Gradebook)" style={{ marginBottom: 16 }}>
      <Form layout="vertical" onFinish={createMut.mutate} style={{ marginBottom: 12 }}>
        <Form.Item name="student" label="Talaba" rules={[{ required: true }]}>
          <Select
            showSearch
            options={(students || []).map((s) => ({
              value: s.id,
              label: `${s.first_name} ${s.last_name}`.trim() || s.username,
            }))}
          />
        </Form.Item>
        <Form.Item name="subject" label="Fan" rules={[{ required: true }]}>
          <Select
            showSearch
            options={(subjects || []).map((s) => ({ value: s.id, label: s.name }))}
          />
        </Form.Item>
        <Form.Item name="semester" label="Semestr" rules={[{ required: true }]}>
          <Select
            showSearch
            options={(semesters || []).map((s) => ({ value: s.id, label: `Semestr ${s.number}` }))}
          />
        </Form.Item>
        <Form.Item name="attendance_score" label="Davomat balli">
          <InputNumber min={0} max={100} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="assignment_score" label="Topshiriq balli">
          <InputNumber min={0} max={100} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="midterm_score" label="Oraliq balli">
          <InputNumber min={0} max={100} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="final_score" label="Yakuniy ball">
          <InputNumber min={0} max={100} style={{ width: "100%" }} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={createMut.isLoading}>
          Qo'shish
        </Button>
      </Form>

      <List
        loading={isLoading}
        dataSource={entries || []}
        locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
        renderItem={(e) => (
          <List.Item
            actions={[
              <Button
                type="link"
                onClick={() => {
                  setEditItem(e);
                  editForm.setFieldsValue({
                    student: e.student,
                    subject: e.subject,
                    semester: e.semester,
                    attendance_score: e.attendance_score,
                    assignment_score: e.assignment_score,
                    midterm_score: e.midterm_score,
                    final_score: e.final_score,
                    total_score: e.total_score,
                  });
                }}
              >
                Tahrirlash
              </Button>,
              <Button
                type="link"
                onClick={() =>
                  recalcGradebookEntry(e.id)
                    .then(() => {
                      message.success("Qayta hisoblandi");
                      qc.invalidateQueries({ queryKey: ["admin-gradebook"] });
                    })
                    .catch(() => message.error("Xatolik"))
                }
              >
                Qayta hisoblash
              </Button>,
              <Popconfirm title="O'chirish?" onConfirm={() => deleteGradebookEntry(e.id).then(() => qc.invalidateQueries({ queryKey: ["admin-gradebook"] }))}>
                <Button danger type="link">O'chirish</Button>
              </Popconfirm>,
            ]}
          >
            {studentMap.get(e.student) || `Student #${e.student}`} | {subjectMap.get(e.subject) || `Fan #${e.subject}`} | Semestr{" "}
            {semesterMap.get(e.semester) || e.semester} | Total: {e.total_score}
          </List.Item>
        )}
      />

      <Modal
        title="Bahoni tahrirlash"
        open={!!editItem}
        onCancel={() => setEditItem(null)}
        onOk={async () => {
          if (!editItem) return;
          setEditLoading(true);
          try {
            const vals = await editForm.validateFields();
            await updateGradebookEntry(editItem.id, vals);
            message.success("Yangilandi");
            setEditItem(null);
            await qc.invalidateQueries({ queryKey: ["admin-gradebook"] });
          } catch (err: any) {
            if (!err?.errorFields) message.error("Xatolik");
          } finally {
            setEditLoading(false);
          }
        }}
        confirmLoading={editLoading}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="student" label="Talaba" rules={[{ required: true }]}>
            <Select
              options={(students || []).map((s) => ({
                value: s.id,
                label: `${s.first_name} ${s.last_name}`.trim() || s.username,
              }))}
            />
          </Form.Item>
          <Form.Item name="subject" label="Fan" rules={[{ required: true }]}>
            <Select options={(subjects || []).map((s) => ({ value: s.id, label: s.name }))} />
          </Form.Item>
          <Form.Item name="semester" label="Semestr" rules={[{ required: true }]}>
            <Select options={(semesters || []).map((s) => ({ value: s.id, label: `Semestr ${s.number}` }))} />
          </Form.Item>
          <Form.Item name="attendance_score" label="Davomat balli">
            <InputNumber min={0} max={100} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="assignment_score" label="Topshiriq balli">
            <InputNumber min={0} max={100} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="midterm_score" label="Oraliq balli">
            <InputNumber min={0} max={100} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="final_score" label="Yakuniy ball">
            <InputNumber min={0} max={100} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="total_score" label="Umumiy ball">
            <InputNumber min={0} max={100} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AdminGradebookPage;
