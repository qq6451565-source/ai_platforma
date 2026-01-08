import { Button, Card, Input, List, Skeleton, Upload, Typography, message } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { fetchChatHistory, sendChatMessage } from "../../api/chat";
import { useMe } from "../../hooks/useMe";

const StudentChat = () => {
  const qc = useQueryClient();
  const { data: user } = useMe();
  const groupId = user?.group;

  const { data: messages, isLoading } = useQuery({
    queryKey: ["chat", groupId],
    queryFn: () => fetchChatHistory(groupId as number),
    enabled: !!groupId,
  });

  const [text, setText] = useState("");
  const [file, setFile] = useState<File | undefined>();
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const onSend = async () => {
    if (!groupId || (!text.trim() && !file)) return;
    setSending(true);
    try {
      await sendChatMessage({ group: groupId, text, file });
      setText("");
      setFile(undefined);
      await qc.invalidateQueries({ queryKey: ["chat", groupId] });
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Xatolik");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ padding: 24, height: "100%" }}>
      <Typography.Title level={4}>Guruh chat</Typography.Title>
      <Card style={{ height: "70vh", display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto" }} ref={listRef}>
          {isLoading ? (
            <Skeleton active />
          ) : (
            <List
              dataSource={messages || []}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={`${item.sender_name || item.sender} | ${item.created_at ? new Date(item.created_at).toLocaleString() : ""}`}
                    description={item.text}
                  />
                  {item.file ? (
                    <a href={item.file} target="_blank" rel="noreferrer">
                      Fayl
                    </a>
                  ) : null}
                </List.Item>
              )}
            />
          )}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Input.TextArea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            placeholder="Xabar..."
          />
          <Upload
            beforeUpload={(f) => {
              setFile(f);
              return false;
            }}
            maxCount={1}
          >
            <Button>Fayl</Button>
          </Upload>
          <Button type="primary" onClick={onSend} loading={sending}>
            Yuborish
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default StudentChat;
