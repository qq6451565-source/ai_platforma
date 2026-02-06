import { List, Skeleton, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchLessons } from "../../api/lessons";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button } from "../../components/ui";

const StudentLive = () => {
  const navigate = useNavigate();
  const { data: lessons, isLoading } = useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
  });
  const [joining, setJoining] = useState<number | null>(null);

  const handleJoin = async (lessonId: number) => {
    setJoining(lessonId);
    navigate(`/app/live/${lessonId}`);
    setJoining(null);
  };

  return (
    <div className="page-shell">
      <Typography.Title level={4} className="page-title">Live darslar</Typography.Title>
      <Card hasBeam>
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
                    variant="neon"
                    size="sm"
                    onClick={() => handleJoin(item.id)}
                    isLoading={joining === item.id}
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

export default StudentLive;
