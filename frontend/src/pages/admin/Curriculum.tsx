import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Form, Select, Button, List, Empty, Popconfirm, Modal, message } from "antd";
import { useState } from "react";
import {
  fetchCurriculums,
  createCurriculum,
  updateCurriculum,
  deleteCurriculum,
  fetchDirections,
  fetchSemesters,
  fetchSubjectsAdmin,
} from "../../api/admin";

const AdminCurriculumPage = () => {
  const qc = useQueryClient();
  const { data: curriculums, isLoading } = useQuery({
    queryKey: ["admin-curriculums"],
    queryFn: fetchCurriculums,
  });
  const { data: directions } = useQuery({
    queryKey: ["admin-directions"],
    queryFn: fetchDirections,
  });
  const { data: semesters } = useQuery({
    queryKey: ["admin-semesters"],
    queryFn: fetchSemesters,
  });
  const { data: subjects } = useQuery({
    queryKey: ["admin-subjects"],
    queryFn: fetchSubjectsAdmin,
  });

  const directionMap = new Map((directions || []).map((d) => [d.id, d.name]));
  const subjectMap = new Map((subjects || []).map((s) => [s.id, s.name]));
  const semesterMap = new Map((semesters || []).map((s) => [s.id, s.number]));

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);

  const createMut = useMutation({
    mutationFn: (vals: any) => createCurriculum(vals),
    onSuccess: async () => {
      message.success("O'quv reja qo'shildi");
      await qc.invalidateQueries({ queryKey: ["admin-curriculums"] });
    },
    onError: () => message.error("O'quv reja qo'shishda xato"),
  });

  const remove = (id: number) =>
    deleteCurriculum(id)
      .then(() => {
        message.success("O'chirildi");
        qc.invalidateQueries({ queryKey: ["admin-curriculums"] });
      })
      .catch(() => message.error("O'chirishda xato"));

  return (
    <Card title="O'quv rejalar (Curriculum)" style={{ marginBottom: 16 }}>
      <Form layout="vertical" onFinish={createMut.mutate} style={{ marginBottom: 12 }}>
        <Form.Item name="direction" label="Yo'nalish" rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder="Yo'nalish tanlang"
            options={(directions || []).map((d) => ({ value: d.id, label: d.name }))}
          />
        </Form.Item>
        <Form.Item name="semester" label="Semestr">
          <Select
            showSearch
            placeholder="Semestr (avto)"
            options={(semesters || []).map((s) => ({ value: s.id, label: `Semestr ${s.number}` }))}
          />
        </Form.Item>
        <Form.Item name="subjects" label="Fanlar" rules={[{ required: true }]}>
          <Select
            mode="multiple"
            placeholder="Fanlarni tanlang"
            options={(subjects || []).map((s) => ({ value: s.id, label: s.name }))}
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={createMut.isLoading}>
          Qo'shish
        </Button>
      </Form>

      <List
        loading={isLoading}
        dataSource={curriculums || []}
        locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
        renderItem={(c) => (
          <List.Item
            actions={[
              <Button
                type="link"
                onClick={() => {
                  setEditItem(c);
                  editForm.setFieldsValue({
                    direction: c.direction,
                    semester: c.semester,
                    subjects: c.subjects,
                  });
                  setEditOpen(true);
                }}
              >
                Tahrirlash
              </Button>,
              <Popconfirm title="O'chirish?" onConfirm={() => remove(c.id)}>
                <Button danger type="link">
                  O'chirish
                </Button>
              </Popconfirm>,
            ]}
          >
            {directionMap.get(c.direction) || `Yo'nalish #${c.direction}`}{" "}
            | Semestr {semesterMap.get(c.semester) || c.semester}{" "}
            | Fanlar: {(c.subjects || []).map((sid: number) => subjectMap.get(sid) || `#${sid}`).join(", ")}
          </List.Item>
        )}
      />

      <Modal
        title="O'quv rejani tahrirlash"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={async () => {
          if (!editItem) return;
          setEditLoading(true);
          try {
            const vals = await editForm.validateFields();
            await updateCurriculum(editItem.id, vals);
            message.success("Yangilandi");
            setEditOpen(false);
            await qc.invalidateQueries({ queryKey: ["admin-curriculums"] });
          } catch (err: any) {
            if (!err?.errorFields) message.error("Xatolik");
          } finally {
            setEditLoading(false);
          }
        }}
        confirmLoading={editLoading}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="direction" label="Yo'nalish" rules={[{ required: true }]}>
            <Select
              showSearch
              options={(directions || []).map((d) => ({ value: d.id, label: d.name }))}
            />
          </Form.Item>
          <Form.Item name="semester" label="Semestr">
            <Select
              showSearch
              options={(semesters || []).map((s) => ({ value: s.id, label: `Semestr ${s.number}` }))}
            />
          </Form.Item>
          <Form.Item name="subjects" label="Fanlar" rules={[{ required: true }]}>
            <Select
              mode="multiple"
              options={(subjects || []).map((s) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AdminCurriculumPage;
