import { Button, List, Typography, Skeleton, Upload, Modal, Input, message } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { fetchAssignments } from "../../api/assignments";
import { fetchMySubmissions, submitAssignment } from "../../api/submissions";

const StudentAssignments = () => {
  const qc = useQueryClient();
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["assignments"],
    queryFn: fetchAssignments,
  });
  const { data: submissions } = useQuery({
    queryKey: ["my-submissions"],
    queryFn: fetchMySubmissions,
  });

  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [file, setFile] = useState<File | undefined>(undefined);

  const handleSubmit = async () => {
    if (!selectedId) return;
    setUploading(true);
    try {
      await submitAssignment({ assignment: selectedId, file, comment });
      message.success("Topshiriq yuborildi");
      setOpen(false);
      setComment("");
      setFile(undefined);
      await qc.invalidateQueries({ queryKey: ["my-submissions"] });
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Yuborishda xato");
    } finally {
      setUploading(false);
    }
  };

  const getSubmission = (assignmentId: number) =>
    (submissions || []).find((s) => s.assignment === assignmentId);

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4}>Topshiriqlar</Typography.Title>
      {isLoading ? (
        <Skeleton active />
      ) : (
        <List
          itemLayout="horizontal"
          dataSource={assignments || []}
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
                      setOpen(true);
                    }}
                  >
                    {sub ? "Qayta yuborish" : "Yuborish"}
                  </Button>,
                ]}
              >
              <List.Item.Meta
                title={item.title}
                description={`Fan: ${item.subject || "-"} | Guruhlar: ${
                  (item as any).group_names?.join(", ") || "-"
                } | Deadline: ${new Date(item.deadline).toLocaleString()}`}
              />
              <div>
                {sub ? (
                  <>
                    Yuborildi ({sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : ""})
                    {sub.grade != null ? ` | Bahosi: ${sub.grade}` : ""}
                  </>
                ) : (
                  "Yuborilmagan"
                )}
              </div>
            </List.Item>
          );
        }}
      />
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
          beforeUpload={(f) => {
            setFile(f);
            return false;
          }}
          maxCount={1}
        >
          <Button>Fayl yuklash</Button>
        </Upload>
        <Input.TextArea
          rows={3}
          placeholder="Izoh (ixtiyoriy)"
          style={{ marginTop: 12 }}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default StudentAssignments;
