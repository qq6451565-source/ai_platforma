import { Alert, Button, Form, Input, List, Select, Skeleton, Upload, Typography, message, Modal, Popconfirm, Empty } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchMaterials, createMaterial, deleteMaterial, updateMaterial } from "../../api/materials";
import { fetchSubjects } from "../../api/subjects";
import { fetchGroups } from "../../api/groups";
import { fetchTeacherSubjects } from "../../api/teacherSubjects";

const TeacherMaterials = () => {
  const qc = useQueryClient();
  const { data: materials, isLoading } = useQuery({
    queryKey: ["materials"],
    queryFn: fetchMaterials,
  });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const { data: groups } = useQuery({ queryKey: ["groups"], queryFn: fetchGroups });
  const { data: teacherSubjects } = useQuery({
    queryKey: ["teacher-subjects"],
    queryFn: fetchTeacherSubjects,
  });
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [file, setFile] = useState<File | undefined>();
  const [editFile, setEditFile] = useState<File | null | undefined>(undefined);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);
  const [filterSubject, setFilterSubject] = useState<number | null>(null);
  const [filterGroup, setFilterGroup] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);

  const teacherSubjectMap = useMemo(() => {
    const map = new Map<number, Set<number>>();
    (teacherSubjects || []).forEach((ts) => {
      if (!map.has(ts.subject)) map.set(ts.subject, new Set());
      ts.groups.forEach((g) => map.get(ts.subject)?.add(g));
    });
    return map;
  }, [teacherSubjects]);
  const allowedSubjectIds = useMemo(() => Array.from(teacherSubjectMap.keys()), [teacherSubjectMap]);
  const allowedGroupIds = useMemo(() => {
    const set = new Set<number>();
    teacherSubjectMap.forEach((groupsSet) => groupsSet.forEach((g) => set.add(g)));
    return Array.from(set);
  }, [teacherSubjectMap]);

  const subjectOptions = useMemo(
    () => (subjects || []).filter((s) => allowedSubjectIds.includes(s.id)).map((s) => ({
      value: s.id,
      label: `${s.name} (${s.code})`,
    })),
    [subjects, allowedSubjectIds]
  );
  const groupOptions = useMemo(() => {
    const allowed = selectedSubject ? Array.from(teacherSubjectMap.get(selectedSubject) || []) : allowedGroupIds;
    return (groups || []).filter((g) => allowed.includes(g.id)).map((g) => ({
      value: g.id,
      label: `${g.name} (${g.year})`,
    }));
  }, [groups, allowedGroupIds, selectedSubject, teacherSubjectMap]);
  const filterGroupOptions = useMemo(() => {
    return (groups || []).filter((g) => allowedGroupIds.includes(g.id)).map((g) => ({
      value: g.id,
      label: `${g.name} (${g.year})`,
    }));
  }, [groups, allowedGroupIds]);

  const getErrorMessage = (err: any) => {
    const data = err?.response?.data;
    if (!data) return "Xatolik";
    if (typeof data === "string") return data;
    if (data.detail) return data.detail;
    if (Array.isArray(data)) return data.join(" ");
    const entry = Object.entries(data)[0];
    if (entry) {
      const [field, msg] = entry;
      if (Array.isArray(msg)) return `${field}: ${msg.join(" ")}`;
      return `${field}: ${msg}`;
    }
    return "Xatolik";
  };

  const onFinish = async (values: any) => {
    setSubmitting(true);
    try {
      await createMaterial({
        title: values.title,
        description: values.description,
        subject: values.subject,
        group: values.group,
        material_type: values.material_type,
        file,
      });
      message.success("Material yaratildi");
      setFile(undefined);
      form.resetFields();
      await qc.invalidateQueries({ queryKey: ["materials"] });
    } catch (err: any) {
      message.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4}>Materiallar</Typography.Title>
      {!allowedSubjectIds.length ? (
        <Alert
          type="warning"
          message="Sizga fan/guruh biriktirilmagan"
          description="Material qo‘shish uchun admin tomonidan o‘qituvchi–fan–guruh biriktirilsin."
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}
      <Form layout="vertical" form={form} onFinish={onFinish} style={{ maxWidth: 520, marginBottom: 24 }}>
        <Form.Item name="title" label="Sarlavha" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="description" label="Izoh">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="subject" label="Fan" rules={[{ required: true }]}>
          <Select
            showSearch
            options={subjectOptions}
            onChange={(v) => {
              setSelectedSubject(v ?? null);
              form.setFieldValue("group", undefined);
            }}
          />
        </Form.Item>
        <Form.Item name="group" label="Guruh" rules={[{ required: true }]}>
          <Select
            showSearch
            options={groupOptions}
          />
        </Form.Item>
        <Form.Item name="material_type" label="Turi" rules={[{ required: true }]}>
          <Select
            options={[
              { value: "pdf", label: "PDF" },
              { value: "ppt", label: "PPT" },
              { value: "doc", label: "DOC" },
              { value: "video", label: "Video" },
              { value: "audio", label: "Audio" },
              { value: "image", label: "Image" },
              { value: "other", label: "Other" },
            ]}
          />
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
          <Button type="primary" htmlType="submit" loading={submitting} disabled={!allowedSubjectIds.length}>
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
              options={subjectOptions}
            />
            <Select
              allowClear
              placeholder="Guruh bo'yicha filter"
              style={{ minWidth: 180 }}
              onChange={(v) => setFilterGroup(v ?? null)}
              options={filterGroupOptions}
            />
          </div>
          {(() => {
            const filtered = (materials || []).filter(
              (m) =>
                (filterSubject ? m.subject === filterSubject : true) &&
                (filterGroup ? m.group === filterGroup : true)
            );
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
                            title: item.title,
                            description: item.description,
                            subject: item.subject,
                            group: item.group,
                            material_type: item.material_type,
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
                            await deleteMaterial(item.id);
                            message.success("O'chirildi");
                            await qc.invalidateQueries({ queryKey: ["materials"] });
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
                      description={`${item.material_type || ""} | Fan: ${
                        item.subject_name || item.subject
                      } | Guruh: ${item.group_name || ""}`}
                    />
                    {item.file ? (
                      <a href={item.file} target="_blank" rel="noreferrer">
                        Yuklab olish
                      </a>
                    ) : null}
                  </List.Item>
                )}
              />
            );
          })()}
        </>
      )}

      <Modal
        title="Materialni tahrirlash"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={async () => {
          if (!editItem) return;
          setEditLoading(true);
          try {
            const vals = await editForm.validateFields();
            await updateMaterial(editItem.id, {
              title: vals.title,
              description: vals.description,
              subject: vals.subject,
              group: vals.group,
              material_type: vals.material_type,
              file: editFile === undefined ? undefined : editFile,
            });
            message.success("Yangilandi");
            setEditOpen(false);
            await qc.invalidateQueries({ queryKey: ["materials"] });
          } catch (err: any) {
            if (!err?.errorFields) message.error(getErrorMessage(err));
          } finally {
            setEditLoading(false);
          }
        }}
        confirmLoading={editLoading}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="title" label="Sarlavha" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Izoh">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="subject" label="Fan" rules={[{ required: true }]}>
            <Select
              showSearch
              options={(subjects || []).map((s) => ({ value: s.id, label: `${s.name} (${s.code})` }))}
            />
          </Form.Item>
          <Form.Item name="group" label="Guruh" rules={[{ required: true }]}>
            <Select
              showSearch
              options={(groups || []).map((g) => ({ value: g.id, label: `${g.name} (${g.year})` }))}
            />
          </Form.Item>
          <Form.Item name="material_type" label="Turi" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "pdf", label: "PDF" },
                { value: "ppt", label: "PPT" },
                { value: "doc", label: "DOC" },
                { value: "video", label: "Video" },
                { value: "audio", label: "Audio" },
                { value: "image", label: "Image" },
                { value: "other", label: "Other" },
              ]}
            />
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

export default TeacherMaterials;
