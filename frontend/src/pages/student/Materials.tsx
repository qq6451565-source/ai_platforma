import { Button, Card, Empty, List, Skeleton, Tag, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { fetchMaterials } from "../../api/materials";
import type { MaterialResource } from "../../types/material";

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
const isVideo = (url?: string | null) => !!url && /\.(mp4|webm|ogg)$/i.test(url);

const renderResources = (resources: MaterialResource[], fallbackFile?: string | null) => {
  const items = resources?.length
    ? resources
    : fallbackFile
      ? [{ id: "legacy-file", resource_type: "file", file: fallbackFile } as any]
      : [];
  if (!items.length) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {items.map((res) => {
        const key = res.id ?? `${res.resource_type}-${res.url || res.file}`;
        const label = res.title || res.file || res.resource_type;
        if (res.resource_type === "file" && res.file) {
          const fileUrl = toAbsoluteUrl(res.file);
          return (
            <div key={key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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

const StudentMaterials = () => {
  const { data: materials, isLoading } = useQuery({
    queryKey: ["materials"],
    queryFn: fetchMaterials,
  });
  const [activeSubject, setActiveSubject] = useState<number | null>(null);

  const subjectCards = useMemo(() => {
    const map = new Map<number, { id: number; name: string; count: number }>();
    (materials || []).forEach((m) => {
      if (!m.subject) return;
      const existing = map.get(m.subject);
      if (existing) {
        existing.count += 1;
      } else {
        map.set(m.subject, {
          id: m.subject,
          name: m.subject_name || `Fan #${m.subject}`,
          count: 1,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [materials]);

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

  return (
    <div className="page-shell">
      <Typography.Title level={4} className="page-title">Materiallar</Typography.Title>
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
            subjectCards.find((s) => s.id === activeSubject)?.name || `Fan #${activeSubject}`;
          const filtered = (materials || []).filter((m) => m.subject === activeSubject);
          return (
            <>
              <div className="page-header-row">
                <Button onClick={() => setActiveSubject(null)}>Orqaga</Button>
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
                            <div className="kv-grid" style={{ marginBottom: 10 }}>
                              <span style={{ color: "#94a3b8" }}>Sarlavha</span>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <strong>{item.title}</strong>
                              </div>
                              <span style={{ color: "#94a3b8" }}>Fan</span>
                              <span>{item.subject_name || `Fan #${item.subject}`}</span>
                              <span style={{ color: "#94a3b8" }}>O'qituvchi</span>
                              <span>{item.teacher_name || "-"}</span>
                              <span style={{ color: "#94a3b8" }}>Guruhlar</span>
                              <span>
                                {(item.group_names || []).join(", ") || item.group_name || "-"}
                              </span>
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
                <Empty description="Ma'lumot yo'q" />
              )}
            </>
          );
        })()
      )}
    </div>
  );
};

export default StudentMaterials;
