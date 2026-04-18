import { Button, Card, List, Skeleton, Typography, message } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchLessons } from "../../api/lessons";
import { createLiveRoom } from "../../api/live";
import { usePageTitle } from "../../hooks/usePageTitle";
import { getApiError } from "../../utils/getApiError";
import { useTranslation } from "react-i18next";

const TeacherLive = () => {
  usePageTitle('nav.live');
  const { t } = useTranslation();
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
      message.success(t('teacherLive.roomCreated'));
      await qc.invalidateQueries({ queryKey: ["lessons"] });
      navigate(`/app/live/${lessonId}`);
    } catch (err: unknown) {
      message.error(getApiError(err, t('common.error')));
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
    <div className="page-shell">
      <Typography.Title level={4} className="page-title">{t('teacherLive.pageTitle')}</Typography.Title>
      <Card>
        {isLoading ? (
          <Skeleton active />
        ) : (
          <List
            dataSource={lessons || []}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={`${item.subject_name || ""} | ${item.topic}`}
                  description={`${item.group_name || ""} | ${new Date(item.start_time).toLocaleString()} - ${new Date(
                    item.end_time
                  ).toLocaleTimeString()}`}
                />
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <Button
                    key="start"
                    type="primary"
                    size="small"
                    onClick={() => handleStart(item.id)}
                    loading={creating === item.id}
                  >
                    {t('teacherLive.start')}
                  </Button>
                  <Button
                    key="join"
                    size="small"
                    onClick={() => handleJoin(item.id)}
                    loading={joining === item.id}
                  >
                    {t('teacherLive.join')}
                  </Button>
                </div>
              </List.Item>
            )}
          />
        )}
      </Card>
    </div>
  );
};

export default TeacherLive;
