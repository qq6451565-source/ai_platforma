import axios from "axios";
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
import { toAbsoluteUrl } from "../../api/client";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useTranslation } from "react-i18next";
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
  usePageTitle('nav.materials');
  const { t } = useTranslation();
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
    subjectOptions.find((opt) => opt.value === filterSubject)?.label || t('teacherMaterials.subject');

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

  const onFinish = async (values: any) => {
    const files = extractFiles(fileList);
    if (!files.length) {
      message.warning(t('teacherMaterials.fileRequired'));
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
      message.success(t('teacherMaterials.created'));
      setFileList([]);
      form.resetFields();
      await qc.invalidateQueries({ queryKey: ["materials"] });
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
          const name = res.title || fileUrl.split("/").pop() || t('teacherMaterials.file');
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
      <div style={{ display: "flex", flexDirection: "column", gap: 'var(--space-1-5)' }}>
        {resources.map((res) => {
          const label = res.title || res.file || res.resource_type;
          if (res.resource_type === "file" && res.file) {
            const fileUrl = toAbsoluteUrl(res.file);
            return (
              <div key={res.id} style={{ display: "flex", flexDirection: "column", gap: 'var(--space-1-5)' }}>
                {isVideo(fileUrl) ? (
                  <video src={fileUrl} controls style={{ maxWidth: 240, borderRadius: 'var(--radius-sm)' }} />
                ) : null}
                <a href={fileUrl} target="_blank" rel="noreferrer">
                  {t('common.download')}
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
      <Typography.Title level={4} className="page-title">{t('teacherMaterials.pageTitle')}</Typography.Title>
      {!allowedSubjectIds.length ? (
        <Alert
          type="warning"
          message={t('teacherMaterials.noSubjectWarning')}
          description={t('teacherMaterials.noSubjectDescription')}
          showIcon
          style={{ marginBottom: 'var(--space-4)' }}
        />
      ) : null}
      {filterSubject ? (
        <Form layout="vertical" form={form} onFinish={onFinish} style={{ maxWidth: 620, marginBottom: 'var(--space-6)' }}>
          <Form.Item name="title" label={t('form.title')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label={t('form.subject')}>
            <Input value={activeSubjectName} disabled />
          </Form.Item>
          <Form.Item name="groups" label={t('form.group')} rules={[{ required: true }]}>
            <Select
              mode="multiple"
              showSearch
              options={groupOptions}
              placeholder={t('teacherMaterials.selectGroups')}
            />
          </Form.Item>
          <Form.Item label={t('teacherMaterials.files')}>
            <Upload
              multiple
              fileList={fileList}
              beforeUpload={(f) => {
                if (!isAllowedFile(f)) {
                  message.error(t('teacherMaterials.allowedFormats', { formats: allowedExtensionsLabel }));
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
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting} disabled={!allowedSubjectIds.length}>
              {t('common.create')}
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
                      <div style={{ marginTop: 'var(--space-1-5)', color: "var(--color-text-muted)" }}>{t('teacherMaterials.materialsCount', { count: subject.count })}</div>
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
                      {t('common.back')}
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
                        <List.Item>
                          {(() => {
                            const currentResources = (item.resources?.length
                              ? item.resources
                              : item.file
                                ? ([{ id: "legacy-file", resource_type: "file", file: item.file }] as any)
                                : []) as MaterialResource[];
                            return (
                              <div style={{ width: "100%" }}>
                                <div className="kv-grid" style={{ marginBottom: 'var(--space-2-5)' }}>
                                  <span style={{ color: "var(--color-text-muted)" }}>{t('teacherMaterials.heading')}</span>
                                  <div style={{ display: "flex", alignItems: "center", gap: 'var(--space-2)' }}>
                                    <strong>{item.title}</strong>
                                    <Tag color="blue">v{item.current_version || 1}</Tag>
                                  </div>
                                  <span style={{ color: "var(--color-text-muted)" }}>{t('teacherMaterials.subject')}</span>
                                  <span>{item.subject_name || `Fan #${item.subject}`}</span>
                                  <span style={{ color: "var(--color-text-muted)" }}>{t('teacherMaterials.teacher')}</span>
                                  <span>{item.teacher_name || "-"}</span>
                                  <span style={{ color: "var(--color-text-muted)" }}>{t('teacherMaterials.groups')}</span>
                                  <span>{(item.group_names || []).join(", ") || "-"}</span>
                                  <span style={{ color: "var(--color-text-muted)" }}>{t('teacherMaterials.file')}</span>
                                  {renderFileLinks(currentResources)}
                                </div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  <Button
                                    size="small"
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
                                    {t('common.edit')}
                                  </Button>
                                  <Popconfirm
                                    title={t('teacherMaterials.deleteConfirm')}
                                    onConfirm={async () => {
                                      try {
                                        await deleteMaterial(item.id);
                                        message.success(t('teacherMaterials.deleted'));
                                        await qc.invalidateQueries({ queryKey: ["materials"] });
                                      } catch {
                                        message.error(t('common.deleteError'));
                                      }
                                    }}
                                  >
                                    <Button danger size="small" type="link">
                                      {t('common.delete')}
                                    </Button>
                                  </Popconfirm>
                                </div>
                                {item.versions && item.versions.length > 1 ? (
                                  <details style={{ marginTop: 'var(--space-2)' }}>
                                    <summary>{t('teacherMaterials.versions')} ({item.versions.length})</summary>
                                    <div style={{ display: "flex", flexDirection: "column", gap: 'var(--space-2)', marginTop: 'var(--space-1-5)' }}>
                                      {item.versions.map((ver) => (
                                        <div key={ver.version}>
                                          <strong>v{ver.version}</strong>
                                          {renderResources(ver.resources)}
                                        </div>
                                      ))}
                                    </div>
                                  </details>
                                ) : null}
                              </div>
                            );
                          })()}
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
        title={t('teacherMaterials.editTitle')}
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
            message.success(t('common.updated'));
            setEditOpen(false);
            await qc.invalidateQueries({ queryKey: ["materials"] });
          } catch (err: unknown) {
            if (!(typeof err === 'object' && err !== null && 'errorFields' in err)) message.error(getErrorMessage(err));
          } finally {
            setEditLoading(false);
          }
        }}
        confirmLoading={editLoading}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="title" label={t('form.title')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="subject" label={t('form.subject')} rules={[{ required: true }]}>
            <Select
              showSearch
              options={(subjects || []).map((s) => ({ value: s.id, label: `${s.name}` }))}
            />
          </Form.Item>
          <Form.Item name="groups" label={t('form.group')} rules={[{ required: true }]}>
            <Select mode="multiple" showSearch options={groupOptions} />
          </Form.Item>
          <Form.Item label={t('teacherMaterials.newFiles')}>
            <Upload
              multiple
              fileList={editFileList}
              beforeUpload={(f) => {
                if (!isAllowedFile(f)) {
                  message.error(t('teacherMaterials.allowedFormats', { formats: allowedExtensionsLabel }));
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
            {t('teacherMaterials.newVersionHint')}
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default TeacherMaterials;
