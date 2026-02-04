import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  List,
  Select,
  Skeleton,
  Upload,
  Typography,
  message,
  Modal,
  Popconfirm,
  Empty,
  Tag,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchMaterials, createMaterial, deleteMaterial, updateMaterial } from "../../api/materials";
import { fetchLessons } from "../../api/lessons";
import { fetchSubjects } from "../../api/subjects";
import { fetchGroups } from "../../api/groups";
import { fetchTeacherSubjects } from "../../api/teacherSubjects";
import type { Material, MaterialResource } from "../../types/material";

const API_BASE =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_BASE_URL ||
  "http://127.0.0.1:8000";
const toAbsoluteUrl = (url?: string | null) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/media/")) return `${API_BASE}${url}`;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/media/${url}`;
};
const isVideo = (url?: string) => !!url && /\.(mp4|webm|ogg)$/i.test(url);
const allowedExtensions = new Set(["doc", "docx", "xls", "xlsx", "ppt", "pptx", "mp4", "webm"]);
const allowedExtensionsLabel = "doc, docx, xls, xlsx, ppt, pptx, mp4, webm";
const acceptExtensions = Array.from(allowedExtensions)
  .map((ext) => `.${ext}`)
  .join(",");
const isAllowedFile = (file: File) => {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  return !!ext && allowedExtensions.has(ext);
};
const extractFiles = (list: UploadFile[]) =>
  list
    .map((item) => item.originFileObj ?? (item as unknown as File))
    .filter((item): item is File => item instanceof File);

const TeacherMaterials = () => {
  const qc = useQueryClient();
  const { data: materials, isLoading } = useQuery({
    queryKey: ["materials"],
    queryFn: fetchMaterials,
  });
  const { data: lessons } = useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
  });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const { data: groups } = useQuery({ queryKey: ["groups"], queryFn: fetchGroups });
  const { data: teacherSubjects } = useQuery({
    queryKey: ["teacher-subjects"],
    queryFn: fetchTeacherSubjects,
  });
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Material | null>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);
  const [editFileList, setEditFileList] = useState<UploadFile[]>([]);
  const [filterSubject, setFilterSubject] = useState<number | null>(null);
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
    () =>
      (subjects || [])
        .filter((s) => allowedSubjectIds.includes(s.id))
        .map((s) => ({ value: s.id, label: `${s.name}` })),
    [subjects, allowedSubjectIds]
  );
  const groupOptions = useMemo(() => {
    const allowed = selectedSubject ? Array.from(teacherSubjectMap.get(selectedSubject) || []) : allowedGroupIds;
    return (groups || [])
      .filter((g) => allowed.includes(g.id))
      .map((g) => ({ value: g.id, label: `${g.name} (${g.level}-bosqich)` }));
  }, [groups, allowedGroupIds, selectedSubject, teacherSubjectMap]);
  const activeSubjectName =
    subjectOptions.find((opt) => opt.value === filterSubject)?.label || "Fan";

  const subjectCards = useMemo(() => {
    const names = new Map<number, string>();
    (subjectOptions || []).forEach((opt) => {
      names.set(opt.value, opt.label as string);
    });
    (lessons || []).forEach((lesson: any) => {
      if (!lesson.subject) return;
      if (!names.has(lesson.subject)) {
        names.set(lesson.subject, lesson.subject_name || `Fan #${lesson.subject}`);
      }
    });
    (materials || []).forEach((m) => {
      if (!m.subject) return;
      if (!names.has(m.subject)) {
        names.set(m.subject, m.subject_name || `Fan #${m.subject}`);
      }
    });
    const counts = new Map<number, number>();
    (materials || []).forEach((m) => {
      if (!m.subject) return;
      counts.set(m.subject, (counts.get(m.subject) || 0) + 1);
    });
    return Array.from(names.entries()).map(([id, name]) => ({
      id,
      name,
      count: counts.get(id) || 0,
    }));
  }, [materials, subjectOptions, lessons]);

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
    const files = extractFiles(fileList);
    if (!files.length) {
      message.warning("Fayl majburiy.");
      return;
    }
    setSubmitting(true);
    try {
      await createMaterial({
        title: values.title,
        subject: filterSubject ?? undefined,
        groups: values.groups,
        files,
      });
      message.success("Material yaratildi");
      setFileList([]);
      form.resetFields();
      await qc.invalidateQueries({ queryKey: ["materials"] });
    } catch (err: any) {
      message.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const renderFileLinks = (resources: MaterialResource[]) => {
    const files = resources.filter((r) => r.resource_type === "file" && r.file);
    if (!files.length) return "-";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {files.map((res) => {
          const fileUrl = toAbsoluteUrl(res.file);
          const name = res.title || fileUrl.split("/").pop() || "Fayl";
          return (
            <a key={res.id ?? res.file} href={fileUrl} target="_blank" rel="noreferrer">
              {name}
            </a>
          );
        })}
      </div>
    );
  };

  const renderResources = (resources: MaterialResource[]) => {
    if (!resources.length) return null;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {resources.map((res) => {
          const label = res.title || res.file || res.resource_type;
          if (res.resource_type === "file" && res.file) {
            const fileUrl = toAbsoluteUrl(res.file);
            return (
              <div key={res.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {isVideo(fileUrl) ? (
                  <video src={fileUrl} controls style={{ maxWidth: 240, borderRadius: 6 }} />
                ) : null}
                <a href={fileUrl} target="_blank" rel="noreferrer">
                  Yuklab olish
                </a>
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  };

  return (
    <div className="page-shell">
      <Typography.Title level={4} className="page-title">Materiallar</Typography.Title>
      {!allowedSubjectIds.length ? (
        <Alert
          type="warning"
          message="Sizga fan/guruh biriktirilmagan"
          description="Material qo'shish uchun admin tomonidan o'qituvchi-fan-guruh biriktirilsin."
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}
      {filterSubject ? (
        <Form layout="vertical" form={form} onFinish={onFinish} style={{ maxWidth: 620, marginBottom: 24 }}>
          <Form.Item name="title" label="Sarlavha" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Fan">
            <Input value={activeSubjectName} disabled />
          </Form.Item>
          <Form.Item name="groups" label="Guruhlar" rules={[{ required: true }]}>
            <Select
              mode="multiple"
              showSearch
              options={groupOptions}
              placeholder="Bir yoki bir nechta guruh tanlang"
            />
          </Form.Item>
          <Form.Item label="Fayllar">
            <Upload
              multiple
              fileList={fileList}
              beforeUpload={(f) => {
                if (!isAllowedFile(f)) {
                  message.error(`Ruxsat etilgan formatlar: ${allowedExtensionsLabel}`);
                  return Upload.LIST_IGNORE;
                }
                return false;
              }}
              onChange={({ fileList: nextList }) => setFileList(nextList)}
              accept={acceptExtensions}
            >
              <Button>Fayl(lar) yuklash</Button>
            </Upload>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting} disabled={!allowedSubjectIds.length}>
              Yaratish
            </Button>
          </Form.Item>
        </Form>
      ) : null}

      {isLoading ? (
        <Skeleton active />
      ) : (
        <>
          {!filterSubject ? (
            subjectCards.length ? (
              <List
                grid={{ gutter: 12, xs: 1, sm: 2, md: 3 }}
                dataSource={subjectCards}
                renderItem={(subject) => (
                  <List.Item>
                    <Card
                      hoverable
                      onClick={() => {
                        setFilterSubject(subject.id);
                        setSelectedSubject(subject.id);
                        form.setFieldValue("groups", undefined);
                        setFileList([]);
                      }}
                    >
                      <Typography.Text strong>{subject.name}</Typography.Text>
                      <div style={{ marginTop: 6, color: "#94a3b8" }}>{subject.count} ta material</div>
                    </Card>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="Ma'lumot yo'q" />
            )
          ) : (
            (() => {
              const subjectName =
                subjectCards.find((s) => s.id === filterSubject)?.name || `Fan #${filterSubject}`;
              const filtered = (materials || []).filter((m) => m.subject === filterSubject);
              return (
                <>
                  <div className="page-header-row">
                    <Button
                      onClick={() => {
                        setFilterSubject(null);
                        setSelectedSubject(null);
                      }}
                    >
                      Orqaga
                    </Button>
                    <Typography.Title level={5} style={{ margin: 0 }}>
                      {subjectName}
                    </Typography.Title>
                  </div>
                  {filtered.length ? (
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
                                  subject: item.subject,
                                  groups: item.group_ids || [],
                                });
                                setEditFileList([]);
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
                          {(() => {
                            const currentResources = (item.resources?.length
                              ? item.resources
                              : item.file
                                ? ([{ id: "legacy-file", resource_type: "file", file: item.file }] as any)
                                : []) as MaterialResource[];
                            return (
                              <div style={{ width: "100%" }}>
                                <div className="kv-grid" style={{ marginBottom: 10 }}>
                                  <span style={{ color: "#94a3b8" }}>Sarlavha</span>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <strong>{item.title}</strong>
                                    <Tag color="blue">v{item.current_version || 1}</Tag>
                                  </div>
                                  <span style={{ color: "#94a3b8" }}>Fan</span>
                                  <span>{item.subject_name || `Fan #${item.subject}`}</span>
                                  <span style={{ color: "#94a3b8" }}>O'qituvchi</span>
                                  <span>{item.teacher_name || "-"}</span>
                                  <span style={{ color: "#94a3b8" }}>Guruhlar</span>
                                  <span>{(item.group_names || []).join(", ") || "-"}</span>
                                  <span style={{ color: "#94a3b8" }}>Fayl</span>
                                  {renderFileLinks(currentResources)}
                                </div>
                              </div>
                            );
                          })()}
                          {item.versions && item.versions.length > 1 ? (
                            <details style={{ marginTop: 8 }}>
                              <summary>Versiyalar ({item.versions.length})</summary>
                              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                                {item.versions.map((ver) => (
                                  <div key={ver.version}>
                                    <strong>v{ver.version}</strong>
                                    {renderResources(ver.resources)}
                                  </div>
                                ))}
                              </div>
                            </details>
                          ) : null}
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty description="Ma'lumot yo'q" />
                  )}
                </>
              );
            })()
          )}
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
            const files = extractFiles(editFileList);
            await updateMaterial(editItem.id, {
              title: vals.title,
              subject: vals.subject,
              groups: vals.groups,
              files,
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
          <Form.Item name="subject" label="Fan" rules={[{ required: true }]}>
            <Select
              showSearch
              options={(subjects || []).map((s) => ({ value: s.id, label: `${s.name}` }))}
            />
          </Form.Item>
          <Form.Item name="groups" label="Guruhlar" rules={[{ required: true }]}>
            <Select mode="multiple" showSearch options={groupOptions} />
          </Form.Item>
          <Form.Item label="Yangi fayl(lar)">
            <Upload
              multiple
              fileList={editFileList}
              beforeUpload={(f) => {
                if (!isAllowedFile(f)) {
                  message.error(`Ruxsat etilgan formatlar: ${allowedExtensionsLabel}`);
                  return Upload.LIST_IGNORE;
                }
                return false;
              }}
              onChange={({ fileList: nextList }) => setEditFileList(nextList)}
              accept={acceptExtensions}
            >
              <Button>Fayl(lar) yuklash</Button>
            </Upload>
          </Form.Item>
          <div style={{ fontSize: 12, color: "#6a7280" }}>
            Yangi fayl qo'shsangiz yangi versiya yaratiladi.
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default TeacherMaterials;
