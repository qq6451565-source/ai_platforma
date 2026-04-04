import { Card, Empty, List, Skeleton, Tag, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchAttendance } from "../../api/attendance";
import { fetchLessons } from "../../api/lessons";
import { useMe } from "../../hooks/useMe";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useTranslation } from "react-i18next";

const StudentAttendance = () => {
  usePageTitle('nav.attendance');
  const { t } = useTranslation();
  const { data: me } = useMe();
  const { data: attendance, isLoading } = useQuery({
    queryKey: ["attendance", me?.id],
    queryFn: () => fetchAttendance(me!.id),
    enabled: !!me?.id,
  });
  const { data: lessons } = useQuery({
    queryKey: ["lessons"],
    queryFn: fetchLessons,
  });

  const lessonMap = new Map(
    (lessons || []).map((lesson: any) => [
      lesson.id,
      {
        topic: lesson.topic || `${t('form.lesson')} #${lesson.id}`,
        subject: lesson.subject_name || lesson.subject || "-",
        group: lesson.group_name || lesson.group || "-",
        start: lesson.start_time,
      },
    ])
  );

  const items = (attendance || [])
    .slice()
    .sort((a, b) => {
      const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return bTime - aTime;
    });

  return (
    <div className="page-shell">
      <Typography.Title level={4} className="page-title">{t('access.attendance')}</Typography.Title>
      {isLoading ? (
        <Skeleton active />
      ) : !items.length ? (
        <Empty description={t('studentAttendance.noRecords')} />
      ) : (
        <Card>
          <List
            dataSource={items}
            renderItem={(record) => {
              const lesson = lessonMap.get(record.lesson);
              const statusLabel = record.status === "present" ? t('access.present') : t('access.absent');
              return (
                <List.Item>
                  <div style={{ width: "100%" }}>
                    <div className="kv-grid">
                      <span>{t('form.lesson')}</span>
                      <strong>{lesson?.topic || `${t('form.lesson')} #${record.lesson}`}</strong>
                      <span>{t('form.subject')}</span>
                      <span>{lesson?.subject || "-"}</span>
                      <span>{t('form.group')}</span>
                      <span>{lesson?.group || "-"}</span>
                      <span>{t('common.status')}</span>
                      <Tag color={record.status === "present" ? "green" : "red"}>{statusLabel}</Tag>
                      <span>{t('studentAttendance.time')}</span>
                      <span>{lesson?.start ? new Date(lesson.start).toLocaleString() : "-"}</span>
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />
        </Card>
      )}
    </div>
  );
};

export default StudentAttendance;
