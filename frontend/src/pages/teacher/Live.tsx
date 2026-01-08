import { Button, Card, Form, InputNumber, List, Skeleton, Typography, message } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { fetchLessons } from "../../api/lessons";
import { createLiveRoom, joinLiveLesson } from "../../api/live";

const TeacherLive = () => {
  const qc = useQueryClient();
  const { data: lessons, isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
  });
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState<number | null>(null);

  const onCreate = async (values: { lesson_id: number }) => {
    setCreating(true);
    try {
      const resp = await createLiveRoom(values.lesson_id);
      const link = resp.jitsi_url || resp.ws_url;
      message.success(
        <span>
          Room yaratildi:{" "}
          <a href={link} target="_blank" rel="noreferrer">
            {link}
          </a>
        </span>
      );
      await qc.invalidateQueries({ queryKey: ["lessons"] });
    } catch (err: any) {
      message.error(err?.response?.data?.error || "Xato");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async (lessonId: number) => {
    setJoining(lessonId);
    try {
      const resp = await joinLiveLesson(lessonId);
      const link = resp.jitsi_url || resp.ws_url;
      window.open(link, "_blank");
    } catch (err: any) {
      message.error(err?.response?.data?.error || "Room topilmadi");
    } finally {
      setJoining(null);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4}>Live darslar (teacher)</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Form layout="inline" onFinish={onCreate}>
          <Form.Item
            label="Lesson ID"
            name="lesson_id"
            rules={[{ required: true, message: "Lesson ID kiriting" }]}
          >
            <InputNumber />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={creating}>
              Yaratish
            </Button>
          </Form.Item>
        </Form>
      </Card>
      <Card>
        {isLoading ? (
          <Skeleton active />
        ) : (
          <List
            dataSource={lessons || []}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    key="join"
                    type="link"
                    onClick={() => handleJoin(item.id)}
                    loading={joining === item.id}
                  >
                    Join
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={`${item.subject_name || ""} | ${item.topic}`}
                  description={`${item.group_name || ""} | ${new Date(item.start_time).toLocaleString()} - ${new Date(
                    item.end_time
                  ).toLocaleTimeString()}`}
                />
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default TeacherLive;
