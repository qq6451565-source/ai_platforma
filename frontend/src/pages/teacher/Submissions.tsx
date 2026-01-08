import { Button, Input, InputNumber, List, Modal, Skeleton, Typography, message } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { fetchAllSubmissions, gradeSubmission } from "../../api/submissions";

const TeacherSubmissions = () => {
  const qc = useQueryClient();
  const { data: subs, isLoading } = useQuery({
    queryKey: ["submissions"],
    queryFn: fetchAllSubmissions,
  });

  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div style={{ padding: 24 }}>
      <Typography.Title level={4}>Yuborilgan topshiriqlar</Typography.Title>
      {isLoading ? (
        <Skeleton active />
      ) : (
        <List
          dataSource={subs || []}
          renderItem={(item) => (
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
                title={`${item.assignment_title || item.assignment} | Student #${item.student}`}
                description={`Yuborildi: ${item.submitted_at ? new Date(item.submitted_at).toLocaleString() : ""} ${
                  item.file ? "| fayl bor" : ""
                }`}
              />
              <div>{item.grade != null ? `Bahosi: ${item.grade}` : "Baholanmagan"}</div>
            </List.Item>
          )}
        />
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
