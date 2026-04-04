import { Button, Card, Empty, List, Skeleton, Tag, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchMaterials } from "../../api/materials";
import { fetchLessons } from "../../api/lessons";
import type { MaterialResource } from "../../types/material";
import { toAbsoluteUrl } from "../../api/client";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useTranslation } from "react-i18next";

const isVideo = (url?: string | null) => !!url && /\.(mp4|webm|ogg)$/i.test(url);

const renderResources = (resources: MaterialResource[], fallbackFile: string | null | undefined, t: (k: string) => string) => {
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

const StudentMaterials = () => {
  usePageTitle('nav.materials');
  const { t } = useTranslation();
  const { data: materials, isLoading } = useQuery({
    queryKey: ["materials"],
    queryFn: fetchMaterials,
  });
  const { data: lessons } = useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
  });
  const [activeSubject, setActiveSubject] = useState<number | null>(null);

  const subjectCards = useMemo(() => {
    const names = new Map<number, string>();
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
    return Array.from(names.entries())
      .map(([id, name]) => ({ id, name, count: counts.get(id) || 0 }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [materials, lessons]);

  const renderFileLinks = (resources: MaterialResource[]) => {
    const files = resources.filter((r) => r.resource_type === "file" && r.file);
    if (!files.length) return "-";
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 'var(--space-1)' }}>
        {files.map((res) => {
          const fileUrl = toAbsoluteUrl(res.file);
          const name = res.title || fileUrl.split("/").pop() || t('studentMaterials.file');
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
    <div className="page-shell">
      <Typography.Title level={4} className="page-title">{t('nav.materials')}</Typography.Title>
      {isLoading ? (
        <Skeleton active />
      ) : !activeSubject ? (
        subjectCards.length ? (
          <List
            grid={{ gutter: 12, xs: 1, sm: 2, md: 3 }}
            dataSource={subjectCards}
            renderItem={(subject) => (
              <List.Item>
                <Card hoverable onClick={() => setActiveSubject(subject.id)}>
                  <Typography.Text strong>{subject.name}</Typography.Text>
                  <div className="caption" style={{ marginTop: 'var(--space-1-5)' }}>{subject.count} {t('studentMaterials.countSuffix')}</div>
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
            subjectCards.find((s) => s.id === activeSubject)?.name || `Fan #${activeSubject}`;
          const filtered = (materials || []).filter((m) => m.subject === activeSubject);
          return (
            <>
              <div className="page-header-row">
                <Button onClick={() => setActiveSubject(null)}>{t('common.back')}</Button>
                <Typography.Title level={5} style={{ margin: 0 }}>
                  {subjectName}
                </Typography.Title>
              </div>
              {filtered.length ? (
                <List
                  dataSource={filtered}
                  pagination={{ pageSize: 6 }}
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
                              <span>{t('form.title')}</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 'var(--space-2)' }}>
                                <strong>{item.title}</strong>
                              </div>
                              <span>{t('form.subject')}</span>
                              <span>{item.subject_name || `Fan #${item.subject}`}</span>
                              <span>{t('studentMaterials.teacher')}</span>
                              <span>{item.teacher_name || "-"}</span>
                              <span>{t('studentMaterials.groups')}</span>
                              <span>
                                {(item.group_names || []).join(", ") || item.group_name || "-"}
                              </span>
                              <span>{t('studentMaterials.file')}</span>
                              {renderFileLinks(currentResources)}
                            </div>
                          </div>
                        );
                      })()}
                      {item.versions && item.versions.length > 1 ? (
                        <details style={{ marginTop: 'var(--space-2)' }}>
                          <summary>{t('studentMaterials.versions')} ({item.versions.length})</summary>
                          <div style={{ display: "flex", flexDirection: "column", gap: 'var(--space-2)', marginTop: 'var(--space-1-5)' }}>
                            {item.versions.map((ver) => (
                              <div key={ver.version}>
                                <strong>v{ver.version}</strong>
                                {renderResources(ver.resources || [], undefined, t)}
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
    </div>
  );
};

export default StudentMaterials;
