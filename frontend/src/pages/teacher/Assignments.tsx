import {
  Button,
  Form,
  Input,
  List,
  Skeleton,
  Upload,
  DatePicker,
  Typography,
  message,
  Select,
  Modal,
  Popconfirm,
  Empty,
} from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useState } from "react";
import { fetchAssignments, createAssignment, deleteAssignment, updateAssignment } from "../../api/assignments";
import { fetchTeacherSubjects } from "../../api/teacherSubjects";
import { fetchSubjects } from "../../api/subjects";
import { fetchGroups } from "../../api/groups";

const TeacherAssignments = () => {
  const qc = useQueryClient();
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["assignments"],
    queryFn: fetchAssignments,
  });
  const { data: teacherSubjects } = useQuery({
    queryKey: ["teacher-subjects"],
    queryFn: fetchTeacherSubjects,
  });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const { data: groups } = useQuery({ queryKey: ["groups"], queryFn: fetchGroups });
  const [form] = Form.useForm();
  const [file, setFile] = useState<File | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editFile, setEditFile] = useState<File | null | undefined>(undefined);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);
  const [filterSubject, setFilterSubject] = useState<number | null>(null);
  const [filterGroup, setFilterGroup] = useState<number | null>(null);

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      await createAssignment({
        teacher_subject: Number(values.teacher_subject),
        title: values.title,
        description: values.description,
        deadline: values.deadline.toISOString(),
        file,
      });
      message.success("Topshiriq yaratildi");
      setFile(undefined);
      form.resetFields();
      await qc.invalidateQueries({ queryKey: ["assignments"] });
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Xatolik");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4}>Topshiriqlar</Typography.Title>
      <Form
        form={form}
        layout="vertical"
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
        <Form.Item name="title" label="Sarlavha" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Izoh">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="deadline" label="Deadline" rules={[{ required: true }]}>
          <DatePicker showTime style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="Fayl">
          <Upload
            beforeUpload={(f) => {
              setFile(f);
              return false;
            }}
            maxCount={1}
          >
            <Button>Fayl yuklash</Button>
          </Upload>
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
          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <Select
              allowClear
              placeholder="Fan bo'yicha filter"
              style={{ minWidth: 180 }}
              onChange={(v) => setFilterSubject(v ?? null)}
              options={(subjects || []).map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
            />
            <Select
              allowClear
              placeholder="Guruh bo'yicha filter"
              style={{ minWidth: 180 }}
              onChange={(v) => setFilterGroup(v ?? null)}
              options={(groups || []).map((g) => ({ value: g.id, label: `${g.name} (${g.year})` }))}
            />
          </div>
          {(() => {
            const filtered = (assignments || []).filter((a) => {
              const groupMatch = filterGroup
                ? (a as any).group_names?.some((g: string) => g.includes(String(filterGroup))) ||
                  a.group === filterGroup
                : true;
              const subjMatch = filterSubject ? a.subject === filterSubject : true;
              return groupMatch && subjMatch;
            });
            if (!filtered.length) return <Empty description="Ma'lumot yo'q" />;
            return (
              <List
                dataSource={filtered}
                pagination={{ pageSize: 5 }}
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
                            title: item.title,
                            description: item.description,
                            deadline: dayjs(item.deadline),
                          });
                          setEditFile(undefined);
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
                            await deleteAssignment(item.id);
                            message.success("O'chirildi");
                            await qc.invalidateQueries({ queryKey: ["assignments"] });
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
                      title={item.title}
                      description={`Fan: ${item.subject || ""} | Guruhlar: ${
                        (item as any).group_names?.join(", ") || "-"
                      } | Deadline: ${dayjs(item.deadline).format("YYYY-MM-DD HH:mm")}`}
                    />
                  </List.Item>
                )}
              />
            );
          })()}
        </>
      )}

      <Modal
        title="Topshiriqni tahrirlash"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={async () => {
          if (!editItem) return;
          setEditLoading(true);
          try {
            const vals = await editForm.validateFields();
            await updateAssignment(editItem.id, {
              teacher_subject: vals.teacher_subject,
              title: vals.title,
              description: vals.description,
              deadline: vals.deadline.toISOString(),
              file: editFile === undefined ? undefined : editFile,
            });
            message.success("Yangilandi");
            setEditOpen(false);
            await qc.invalidateQueries({ queryKey: ["assignments"] });
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
          <Form.Item name="title" label="Sarlavha" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Izoh">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="deadline" label="Deadline" rules={[{ required: true }]}>
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Fayl (ixtiyoriy)">
            <Upload
              beforeUpload={(f) => {
                setEditFile(f);
                return false;
              }}
              maxCount={1}
            >
              <Button>Yangi fayl</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TeacherAssignments;
