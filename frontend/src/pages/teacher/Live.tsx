import { Button, Card, List, Skeleton, Typography, message } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchLessons } from "../../api/lessons";
import { createLiveRoom } from "../../api/live";

const TeacherLive = () => {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: lessons, isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
  });
  const [creating, setCreating] = useState<number | null>(null);
  const [joining, setJoining] = useState<number | null>(null);

  const handleStart = async (lessonId: number) => {
    setCreating(lessonId);
    try {
      await createLiveRoom(lessonId);
      message.success("Live xona yaratildi");
      await qc.invalidateQueries({ queryKey: ["lessons"] });
      navigate(`/app/live/${lessonId}`);
    } catch (err: any) {
      message.error(err?.response?.data?.error || "Xato");
    } finally {
      setCreating(null);
    }
  };

  const handleJoin = async (lessonId: number) => {
    setJoining(lessonId);
    navigate(`/app/live/${lessonId}`);
    setJoining(null);
  };

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4}>Live darslar</Typography.Title>
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
                    key="start"
                    type="link"
                    onClick={() => handleStart(item.id)}
                    loading={creating === item.id}
                  >
                    Boshlash
                  </Button>,
                  <Button
                    key="join"
                    type="link"
                    onClick={() => handleJoin(item.id)}
                    loading={joining === item.id}
                  >
                    Kirish
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
