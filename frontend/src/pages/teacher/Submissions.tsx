import { Button, Card, Empty, Input, InputNumber, List, Modal, Skeleton, Typography, message } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { fetchAllSubmissions, gradeSubmission } from "../../api/submissions";
import { fetchTeacherSubjects } from "../../api/teacherSubjects";
import { fetchSubjects } from "../../api/subjects";
import { fetchGroups } from "../../api/groups";

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

const TeacherSubmissions = () => {
  const qc = useQueryClient();
  const { data: subs, isLoading } = useQuery({
    queryKey: ["submissions"],
    queryFn: fetchAllSubmissions,
  });
  const { data: teacherSubjects } = useQuery({
    queryKey: ["teacher-subjects"],
    queryFn: fetchTeacherSubjects,
  });
  const { data: subjects } = useQuery({ queryKey: ["subjects"], queryFn: fetchSubjects });
  const { data: groups } = useQuery({ queryKey: ["groups"], queryFn: fetchGroups });
  const [selectedSubject, setSelectedSubject] = useState<{ id: number; name: string } | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const subjectCards = useMemo(() => {
    const subjectNameById = new Map((subjects || []).map((s) => [s.id, s.name]));
    const counts = new Map<string, number>();
    (subs || []).forEach((s) => {
      const subject = s.subject_name;
      if (!subject) return;
      counts.set(subject, (counts.get(subject) || 0) + 1);
    });
    const subjectIds = new Set((teacherSubjects || []).map((ts) => ts.subject));
    const cards = subjectIds.size
      ? Array.from(subjectIds).map((id) => {
          const name = subjectNameById.get(id) || `Fan #${id}`;
          return { id, name, count: counts.get(name) || 0 };
        })
      : Array.from(counts.entries()).map(([name, count]) => ({
          id: subjectNameById.size
            ? Array.from(subjectNameById.entries()).find(([, n]) => n === name)?.[0] || 0
            : 0,
          name,
          count,
        }));
    return cards.sort((a, b) => a.name.localeCompare(b.name));
  }, [subs, teacherSubjects, subjects]);

  const filteredSubs = useMemo(() => {
    if (!selectedSubject) return [];
    return (subs || []).filter((s) => s.subject_name === selectedSubject.name);
  }, [subs, selectedSubject]);

  const groupCards = useMemo(() => {
    if (!selectedSubject) return [];
    const groupNameById = new Map((groups || []).map((g) => [g.id, g.name]));
    const counts = new Map<string, number>();
    filteredSubs.forEach((s) => {
      const group = s.group_name || s.student_group_name || "Guruh";
      counts.set(group, (counts.get(group) || 0) + 1);
    });
    const groupIds = new Set<number>();
    const subjectLinks = (teacherSubjects || []).filter((ts) => ts.subject === selectedSubject.id);
    subjectLinks.forEach((ts) => {
      (ts.groups || []).forEach((gid) => groupIds.add(gid));
    });
    if (!groupIds.size) {
      counts.forEach((_, name) => {
        const match = (groups || []).find((g) => g.name === name);
        if (match) groupIds.add(match.id);
      });
    }
    return Array.from(groupIds)
      .map((gid) => {
        const name = groupNameById.get(gid) || `Guruh #${gid}`;
        return { id: gid, name, count: counts.get(name) || 0 };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredSubs, selectedSubject, teacherSubjects, groups]);

  const filteredByGroup = useMemo(() => {
    if (!selectedGroupId) return filteredSubs;
    const groupName = (groups || []).find((g) => g.id === selectedGroupId)?.name;
    if (!groupName) return filteredSubs;
    return filteredSubs.filter((s) => {
      const group = s.group_name || s.student_group_name || "Guruh";
      return group === groupName;
    });
  }, [filteredSubs, selectedGroupId, groups]);

  const onGrade = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      await gradeSubmission(selectedId, { grade: grade ?? undefined, teacher_comment: comment });
      message.success("Baholandi");
      setOpen(false);
      setGrade(null);
      setComment("");
      await qc.invalidateQueries({ queryKey: ["submissions"] });
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Xatolik");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <Typography.Title level={4} className="page-title">Yuborilgan topshiriqlar</Typography.Title>
      {!selectedSubject ? (
        isLoading ? (
          <Skeleton active />
        ) : !subjectCards.length ? (
          <Typography.Text>Hali yuborilgan topshiriqlar yo'q.</Typography.Text>
        ) : (
          <div className="card-grid">
            {subjectCards.map((card) => (
              <Card
                key={card.id}
                hoverable
                onClick={() => {
                  setSelectedSubject({ id: card.id, name: card.name });
                  setSelectedGroupId(null);
                }}
              >
                <div style={{ fontWeight: 600 }}>{card.name}</div>
                <div style={{ opacity: 0.7, marginTop: 6 }}>{card.count} ta yuborilgan</div>
              </Card>
            ))}
          </div>
        )
      ) : (
        <>
          <div className="page-header-row">
            <Button
              onClick={() => {
                if (selectedGroupId) {
                  setSelectedGroupId(null);
                } else {
                  setSelectedSubject(null);
                }
              }}
            >
              Orqaga
            </Button>
            <Typography.Text strong>{selectedSubject?.name}</Typography.Text>
            {selectedGroupId ? (
              <Typography.Text type="secondary">
                / {(groups || []).find((g) => g.id === selectedGroupId)?.name || "Guruh"}
              </Typography.Text>
            ) : null}
          </div>

          {isLoading ? (
            <Skeleton active />
          ) : !selectedGroupId ? (
            !groupCards.length ? (
              <Empty description="Guruhlar topilmadi" />
            ) : (
              <div className="card-grid">
                {groupCards.map((card) => (
                  <Card key={card.id} hoverable onClick={() => setSelectedGroupId(card.id)}>
                    <div style={{ fontWeight: 600 }}>{card.name}</div>
                    <div style={{ opacity: 0.7, marginTop: 6 }}>{card.count} ta yuborilgan</div>
                  </Card>
                ))}
              </div>
            )
          ) : (
            <List
              dataSource={filteredByGroup}
              renderItem={(item) => {
                return (
                  <List.Item
                    actions={[
                      <Button
                        key="grade"
                        type="link"
                        onClick={() => {
                          setSelectedId(item.id);
                          setOpen(true);
                        }}
                      >
                        Baholash
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={`${item.assignment_title || "Topshiriq"} | ${
                        item.student_name || item.student_username || `Student #${item.student}`
                      }`}
                      description={`Fan: ${item.subject_name || "-"} | Dars: ${item.lesson_topic || "-"} | Guruh: ${
                        item.group_name || item.student_group_name || "-"
                      } | Yuborildi: ${
                        item.submitted_at ? dayjs(item.submitted_at).format("DD.MM.YYYY HH:mm") : "-"
                      }`}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {item.file ? (
                        <a href={toAbsoluteUrl(item.file)} target="_blank" rel="noreferrer">
                          Fayl
                        </a>
                      ) : (
                        <span>-</span>
                      )}
                      <span>{item.grade != null ? `Bahosi: ${item.grade}` : "Baholanmagan"}</span>
                    </div>
                  </List.Item>
                );
              }}
            />
          )}
        </>
      )}

      <Modal
        title="Baholash"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onGrade}
        confirmLoading={loading}
        okText="Saqlash"
      >
        <InputNumber
          style={{ width: "100%", marginBottom: 12 }}
          placeholder="Baho (0-100)"
          value={grade === null ? undefined : grade}
          onChange={(v) => setGrade(v ?? null)}
        />
        <Input.TextArea
          rows={3}
          placeholder="Izoh"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default TeacherSubmissions;
