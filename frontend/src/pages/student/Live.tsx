import { Button, Card, List, Skeleton, Typography, message } from "antd";
import { useQuery } from "@tanstack/react-query";
import { joinLiveLesson } from "../../api/live";
import { fetchLessons } from "../../api/lessons";
import { useState } from "react";

const StudentLive = () => {
  const { data: lessons, isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
  });
  const [joining, setJoining] = useState<number | null>(null);

  const handleJoin = async (lessonId: number) => {
    setJoining(lessonId);
    try {
      const resp = await joinLiveLesson(lessonId);
      const link = resp.jitsi_url || resp.ws_url;
      message.success(
        <span>
          Live link:{" "}
          <a href={link} target="_blank" rel="noreferrer">
            {link}
          </a>
        </span>
      );
      window.open(link, "_blank");
    } catch (err: any) {
      message.error(err?.response?.data?.error || "Room topilmadi");
    } finally {
      setJoining(null);
    }
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

export default StudentLive;
