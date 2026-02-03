import { Button, Card, List, Typography, Skeleton, Upload, Modal, message, Empty } from "antd";
import type { UploadFile } from "antd/es/upload/interface";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { fetchAssignments } from "../../api/assignments";
import { fetchLessons } from "../../api/lessons";
import { fetchMySubmissions, submitAssignment } from "../../api/submissions";

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

const extractFile = (list: UploadFile[]) => {
  const item = list[0];
  if (!item) return undefined;
  return (item.originFileObj ?? (item as unknown as File)) as File | undefined;
};

const StudentAssignments = () => {
  const qc = useQueryClient();
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["assignments"],
    queryFn: fetchAssignments,
  });
  const { data: lessons } = useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
  });
  const { data: submissions } = useQuery({
    queryKey: ["my-submissions"],
    queryFn: fetchMySubmissions,
  });

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const subjectCards = useMemo(() => {
    const lessonSubjects = new Set<string>();
    (lessons || []).forEach((l) => {
      if (l.subject_name) lessonSubjects.add(l.subject_name);
    });
    const counts = new Map<string, number>();
    (assignments || []).forEach((a) => {
      if (a.subject) counts.set(a.subject, (counts.get(a.subject) || 0) + 1);
    });
    return Array.from(lessonSubjects).map((name) => ({ name, count: counts.get(name) || 0 }));
  }, [assignments, lessons]);

  const filteredAssignments = useMemo(() => {
    if (!selectedSubject) return [];
    return (assignments || []).filter((a) => a.subject === selectedSubject);
  }, [assignments, selectedSubject]);

  const getSubmission = (assignmentId: number) =>
    (submissions || []).find((s) => s.assignment === assignmentId);

  const handleSubmit = async () => {
    if (!selectedId) return;
    const file = extractFile(fileList);
    if (!file) {
      message.warning("Fayl majburiy.");
      return;
    }
    setUploading(true);
    try {
      await submitAssignment({ assignment: selectedId, file });
      message.success("Topshiriq yuborildi");
      setOpen(false);
      setFileList([]);
      await qc.invalidateQueries({ queryKey: ["my-submissions"] });
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Yuborishda xato");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-shell">
      <Typography.Title level={4} className="page-title">Topshiriqlar</Typography.Title>
      {!selectedSubject ? (
        isLoading ? (
          <Skeleton active />
        ) : !subjectCards.length ? (
          <Empty description="Topshiriqlar yo'q" />
        ) : (
          <div className="card-grid">
            {subjectCards.map((card) => (
              <Card key={card.name} hoverable onClick={() => setSelectedSubject(card.name)}>
                <div style={{ fontWeight: 600 }}>{card.name}</div>
                <div style={{ opacity: 0.7, marginTop: 6 }}>{card.count} ta topshiriq</div>
              </Card>
            ))}
          </div>
        )
      ) : (
        <>
          <div className="page-header-row">
            <Button onClick={() => setSelectedSubject(null)}>Orqaga</Button>
            <Typography.Text strong>{selectedSubject}</Typography.Text>
          </div>

          {isLoading ? (
            <Skeleton active />
          ) : !filteredAssignments.length ? (
            <Empty description="Topshiriqlar yo'q" />
          ) : (
            <List
              itemLayout="horizontal"
              dataSource={filteredAssignments}
              renderItem={(item) => {
                const sub = getSubmission(item.id);
                return (
                  <List.Item
                    actions={[
                      <Button
                        type="link"
                        key="submit"
                        onClick={() => {
                          setSelectedId(item.id);
                          setFileList([]);
                          setOpen(true);
                        }}
                      >
                        {sub ? "Qayta yuborish" : "Yuborish"}
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={item.title}
                      description={`Dars: ${item.lesson_topic || "-"} | Topshirish: ${dayjs(item.deadline).format(
                        "DD.MM.YYYY HH:mm"
                      )}`}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {item.file ? (
                        <a href={toAbsoluteUrl(item.file)} target="_blank" rel="noreferrer">
                          Topshiriq fayli
                        </a>
                      ) : (
                        <span>-</span>
                      )}
                      <span>
                        {sub ? (
                          <>
                            Yuborildi ({sub.submitted_at ? dayjs(sub.submitted_at).format("DD.MM.YYYY HH:mm") : ""})
                            {sub.grade != null ? ` | Bahosi: ${sub.grade}` : ""}
                          </>
                        ) : (
                          "Yuborilmagan"
                        )}
                      </span>
                    </div>
                  </List.Item>
                );
              }}
            />
          )}
        </>
      )}

      <Modal
        title="Topshiriqni yuborish"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSubmit}
        okText="Yuborish"
        confirmLoading={uploading}
      >
        <Upload
          maxCount={1}
          fileList={fileList}
          beforeUpload={() => false}
          onChange={({ fileList: next }) => setFileList(next)}
        >
          <Button>Fayl yuklash</Button>
        </Upload>
      </Modal>
    </div>
  );
};

export default StudentAssignments;
