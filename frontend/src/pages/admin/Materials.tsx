import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  List,
  message,
  Modal,
  Popconfirm,
  Select,
  Skeleton,
  Tag,
  Typography,
  Upload,
} from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useMemo, useState } from "react";
import { createMaterial, deleteMaterial, updateMaterial } from "../../api/materials";
import type { Material, MaterialResource } from "../../types/material";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";
import { toAbsoluteUrl } from "../../api/client";
import { useTranslation } from 'react-i18next';
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

const isVideo = (url?: string | null) => !!url && /\.(mp4|webm|ogg)$/i.test(url);

const renderResources = (resources: MaterialResource[], fallbackFile?: string | null) => {
  const items = resources?.length
    ? resources
    : fallbackFile
      ? [{ id: "legacy-file", resource_type: "file", file: fallbackFile } as any]
      : [];
  if (!items.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 'var(--space-1-5)' }}>
      {items.map((res) => {
        const key = res.id ?? `${res.resource_type}-${res.url || res.file}`;
        const label = res.title || res.file || res.resource_type;
        if (res.resource_type === "file" && res.file) {
          const fileUrl = toAbsoluteUrl(res.file);
          return (
            <div key={key} style={{ display: "flex", flexDirection: "column", gap: 'var(--space-1-5)' }}>
              {isVideo(fileUrl) ? (
                <video src={fileUrl} controls style={{ maxWidth: 240, borderRadius: 'var(--radius-sm)' }} />
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

const AdminMaterialsPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: materials, isLoading } = useQuery(adminQueryOptions.materials());
  const { data: subjects } = useQuery(adminQueryOptions.subjects());
  const { data: groups } = useQuery(adminQueryOptions.groups());
  const { data: teachers } = useQuery(adminQueryOptions.teachers());
  const { data: teacherSubjects } = useQuery(adminQueryOptions.teacherSubjects());

  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [filterSubject, setFilterSubject] = useState<number | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<Material | null>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);
  const [editFileList, setEditFileList] = useState<UploadFile[]>([]);
  const [editTeacher, setEditTeacher] = useState<number | null>(null);
  const [editSubject, setEditSubject] = useState<number | null>(null);

  const getErrorMessage = (err: unknown) => {
    if (!axios.isAxiosError(err)) return t('common.error');
    const data = err.response?.data;
    if (!data) return t('common.error');
    if (typeof data === "string") return data;
    if (data.detail) return data.detail;
    if (Array.isArray(data)) return data.join(" ");
    const entry = Object.entries(data)[0];
    if (entry) {
      const [field, msg] = entry;
      if (Array.isArray(msg)) return `${field}: ${msg.join(" ")}`;
      return `${field}: ${msg}`;
    }
    return t('common.error');
  };

  const teacherMap = useMemo(() => {
    const map = new Map<number, Map<number, Set<number>>>();
    (teacherSubjects || []).forEach((ts) => {
      if (!map.has(ts.teacher)) map.set(ts.teacher, new Map());
      const subjectMap = map.get(ts.teacher) as Map<number, Set<number>>;
      if (!subjectMap.has(ts.subject)) subjectMap.set(ts.subject, new Set());
      ts.groups.forEach((g) => subjectMap.get(ts.subject)?.add(g));
    });
    return map;
  }, [teacherSubjects]);

  const allSubjectIds = useMemo(() => (subjects || []).map((s) => s.id), [subjects]);
  const allGroupIds = useMemo(() => (groups || []).map((g) => g.id), [groups]);

  const getAllowedSubjects = (teacherId?: number | null) => {
    if (!teacherId) return allSubjectIds;
    return Array.from(teacherMap.get(teacherId)?.keys() || []);
  };

  const getAllowedGroups = (teacherId?: number | null, subjectId?: number | null) => {
    if (!teacherId) return allGroupIds;
    const subjectMap = teacherMap.get(teacherId);
    if (!subjectMap) return [];
    if (subjectId) return Array.from(subjectMap.get(subjectId) || []);
    const merged = new Set<number>();
    subjectMap.forEach((set) => set.forEach((id) => merged.add(id)));
    return Array.from(merged);
  };

  const subjectCards = useMemo(() => {
    const counts = new Map<number, number>();
    (materials || []).forEach((m) => {
      counts.set(m.subject, (counts.get(m.subject) || 0) + 1);
    });
    return (subjects || []).map((s) => ({
      id: s.id,
      name: s.name,
      count: counts.get(s.id) || 0,
    }));
  }, [materials, subjects]);

  const groupOptions = useMemo(() => {
    const allowed = new Set(getAllowedGroups(selectedTeacher, selectedSubject));
    return (groups || [])
      .filter((g) => allowed.has(g.id))
      .map((g) => ({ value: g.id, label: `${g.name} (${g.level}-bosqich)` }));
  }, [groups, selectedTeacher, selectedSubject, allGroupIds, teacherMap]);

  const editSubjectOptions = useMemo(() => {
    const allowed = new Set(getAllowedSubjects(editTeacher));
    return (subjects || [])
      .filter((s) => allowed.has(s.id))
      .map((s) => ({ value: s.id, label: s.name }));
  }, [subjects, editTeacher, allSubjectIds, teacherMap]);

  const editGroupOptions = useMemo(() => {
    const allowed = new Set(getAllowedGroups(editTeacher, editSubject));
    return (groups || [])
      .filter((g) => allowed.has(g.id))
      .map((g) => ({ value: g.id, label: `${g.name} (${g.level}-bosqich)` }));
  }, [groups, editTeacher, editSubject, allGroupIds, teacherMap]);

  const teacherOptions = useMemo(
    () =>
      (teachers || []).map((t) => ({
        value: t.id,
        label: t.first_name || t.last_name ? `${t.first_name} ${t.last_name}`.trim() : t.username,
      })),
    [teachers]
  );

  const filtered = useMemo(() => {
    if (!filterSubject) return [];
    return (materials || []).filter((m) => m.subject === filterSubject);
  }, [materials, filterSubject]);

  const onFinish = async (values: any) => {
    const files = extractFiles(fileList);
    if (!files.length) {
      message.warning(t('adminMaterials.fileRequired'));
      return;
    }
    setSubmitting(true);
    try {
      await createMaterial({
        title: values.title,
        subject: filterSubject ?? undefined,
        groups: values.groups,
        teacher: values.teacher || undefined,
        files,
      });
      message.success(t('adminMaterials.added'));
      form.resetFields();
      setSelectedTeacher(null);
      setSelectedSubject(null);
      setFileList([]);
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.materials });
    } catch (err: unknown) {
      message.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const renderFileLinks = (resources: MaterialResource[]) => {
    const files = resources.filter((r) => r.resource_type === "file" && r.file);
    if (!files.length) return "-";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 'var(--space-1)' }}>
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

  return (
    <Card title={t('adminMaterials.pageTitle')} style={{ marginBottom: 'var(--space-4)' }}>
      {filterSubject ? (
        <Form layout="vertical" form={form} onFinish={onFinish} style={{ maxWidth: 680, width: '100%', marginBottom: 'var(--space-4)' }}>
          <Form.Item name="title" label={t('adminMaterials.title')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label={t('adminMaterials.subject')}>
            <Input value={subjectCards.find((s) => s.id === filterSubject)?.name || t('adminMaterials.subject')} disabled />
          </Form.Item>
          <Form.Item name="teacher" label={t('adminMaterials.teacherOptional')}>
            <Select
              allowClear
              showSearch
              options={teacherOptions}
              onChange={(v) => {
                setSelectedTeacher(v ?? null);
                setSelectedSubject(filterSubject);
                form.setFieldValue("groups", undefined);
              }}
            />
          </Form.Item>
          <Form.Item name="groups" label={t('adminMaterials.groups')} rules={[{ required: true }]}>
            <Select mode="multiple" showSearch options={groupOptions} placeholder={t('adminMaterials.selectGroups')} />
          </Form.Item>
          <Form.Item label={t('adminMaterials.files')}>
            <Upload
              multiple
              fileList={fileList}
              beforeUpload={(f) => {
                if (!isAllowedFile(f)) {
                  message.error(t('adminMaterials.allowedFormats', { formats: allowedExtensionsLabel }));
                  return Upload.LIST_IGNORE;
                }
                return false;
              }}
              onChange={({ fileList: nextList }) => setFileList(nextList)}
              accept={acceptExtensions}
            >
              <Button>{t('common.filesUpload')}</Button>
            </Upload>
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={submitting}>
            {t('common.add')}
          </Button>
        </Form>
      ) : null}

      {isLoading ? (
        <Skeleton active />
      ) : (
        <>
          {!filterSubject ? (
            subjectCards.length ? (
              <List
                grid={{ gutter: 12, column: 3 }}
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
                      <div style={{ marginTop: 'var(--space-1-5)', color: "var(--color-text-muted)" }}>{t('adminMaterials.materialCount', { count: subject.count })}</div>
                    </Card>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description={t('common.noData')} />
            )
          ) : (
            (() => {
              const subjectName =
                subjectCards.find((s) => s.id === filterSubject)?.name || `Fan #${filterSubject}`;
              return (
                <>
                  <div style={{ display: "flex", gap: 'var(--space-2)', marginBottom: 'var(--space-3)', alignItems: "center", flexWrap: "wrap" }}>
                    <Button
                      onClick={() => {
                        setFilterSubject(null);
                        setSelectedSubject(null);
                        setSelectedTeacher(null);
                      }}
                    >
                      {t('common.back')}
                    </Button>
                    <Typography.Title level={5} style={{ margin: 0 }}>
                      {subjectName}
                    </Typography.Title>
                  </div>
                  {filtered.length ? (
                    <List
                      dataSource={filtered}
                      pagination={{ pageSize: 6 }}
                      locale={{ emptyText: <Empty description={t('common.noData')} /> }}
                      renderItem={(m) => (
                        <List.Item
                          actions={[
                            <Button
                              key="edit"
                              type="link"
                              onClick={() => {
                                setEditItem(m);
                                editForm.setFieldsValue({
                                  title: m.title,
                                  subject: m.subject,
                                  groups: m.group_ids || [],
                                  teacher: m.teacher ?? undefined,
                                });
                                setEditTeacher(m.teacher ?? null);
                                setEditSubject(m.subject ?? null);
                                setEditFileList([]);
                                setEditOpen(true);
                              }}
                            >
                              {t('common.edit')}
                            </Button>,
                            <Popconfirm
                              key="delete"
                              title={t('common.confirmDelete')}
                              onConfirm={() =>
                                deleteMaterial(m.id)
                                  .then(() => qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.materials }))
                                  .catch(() => message.error(t('common.deleteError')))
                              }
                            >
                              <Button danger type="link">
                                {t('common.delete')}
                              </Button>
                            </Popconfirm>,
                          ]}
                        >
                          {(() => {
                            const currentResources = (m.resources?.length
                              ? m.resources
                              : m.file
                                ? ([{ id: "legacy-file", resource_type: "file", file: m.file }] as any)
                                : []) as MaterialResource[];
                            return (
                              <div style={{ width: "100%" }}>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "140px 1fr",
                                    rowGap: 6,
                                    columnGap: 12,
                                    marginBottom: 'var(--space-2-5)',
                                  }}
                                >
                                  <span style={{ color: "var(--color-text-muted)" }}>{t('adminMaterials.title')}</span>
                                  <div style={{ display: "flex", alignItems: "center", gap: 'var(--space-2)' }}>
                                    <strong>{m.title}</strong>
                                    <Tag color="blue">v{m.current_version || 1}</Tag>
                                  </div>
                                  <span style={{ color: "var(--color-text-muted)" }}>{t('adminMaterials.subject')}</span>
                                  <span>{m.subject_name || `Fan #${m.subject}`}</span>
                                  <span style={{ color: "var(--color-text-muted)" }}>{t('adminMaterials.teacher')}</span>
                                  <span>{m.teacher_name || "-"}</span>
                                  <span style={{ color: "var(--color-text-muted)" }}>{t('adminMaterials.groups')}</span>
                                  <span>{(m.group_names || []).join(", ") || "-"}</span>
                                  <span style={{ color: "var(--color-text-muted)" }}>{t('adminSubmissions.fileLink')}</span>
                                  {renderFileLinks(currentResources)}
                                </div>
                              </div>
                            );
                          })()}
                          {m.versions && m.versions.length > 1 ? (
                            <details style={{ marginTop: 'var(--space-2)' }}>
                              <summary>{t('adminMaterials.versions', { count: m.versions.length })}</summary>
                              <div style={{ display: "flex", flexDirection: "column", gap: 'var(--space-2)', marginTop: 'var(--space-1-5)' }}>
                                {m.versions.map((ver) => (
                                  <div key={ver.version}>
                                    <strong>v{ver.version}</strong>
                                    {renderResources(ver.resources || [])}
                                  </div>
                                ))}
                              </div>
                            </details>
                          ) : null}
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty description={t('common.noData')} />
                  )}
                </>
              );
            })()
          )}
        </>
      )}

      <Modal
        title={t('adminMaterials.editTitle')}
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
              teacher: vals.teacher || undefined,
              files,
            });
            message.success(t('common.updated'));
            setEditOpen(false);
            await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.materials });
          } catch (err: unknown) {
            if (!(typeof err === 'object' && err !== null && 'errorFields' in err)) message.error(getErrorMessage(err));
          } finally {
            setEditLoading(false);
          }
        }}
        confirmLoading={editLoading}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="title" label={t('adminMaterials.title')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="teacher" label={t('adminMaterials.teacherOptional')}>
            <Select
              allowClear
              showSearch
              options={teacherOptions}
              onChange={(v) => {
                setEditTeacher(v ?? null);
                setEditSubject(null);
                editForm.setFieldValue("subject", undefined);
                editForm.setFieldValue("groups", undefined);
              }}
            />
          </Form.Item>
          <Form.Item name="subject" label={t('adminMaterials.subject')} rules={[{ required: true }]}>
            <Select
              showSearch
              options={editSubjectOptions}
              onChange={(v) => {
                setEditSubject(v ?? null);
                editForm.setFieldValue("groups", undefined);
              }}
            />
          </Form.Item>
          <Form.Item name="groups" label={t('adminMaterials.groups')} rules={[{ required: true }]}>
            <Select mode="multiple" showSearch options={editGroupOptions} />
          </Form.Item>
          <Form.Item label={t('adminMaterials.newFiles')}>
            <Upload
              multiple
              fileList={editFileList}
              beforeUpload={(f) => {
                if (!isAllowedFile(f)) {
                  message.error(t('adminMaterials.allowedFormats', { formats: allowedExtensionsLabel }));
                  return Upload.LIST_IGNORE;
                }
                return false;
              }}
              onChange={({ fileList: nextList }) => setEditFileList(nextList)}
              accept={acceptExtensions}
            >
              <Button>{t('common.filesUpload')}</Button>
            </Upload>
          </Form.Item>
          <div style={{ fontSize: 'var(--font-size-tiny)', color: "var(--color-text-secondary)" }}>
            {t('adminMaterials.newVersionNote')}
          </div>
        </Form>
      </Modal>
    </Card>
  );
};

export default AdminMaterialsPage;
