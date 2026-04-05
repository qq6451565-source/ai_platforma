import { Button, Card, Input, InputNumber, List, Modal, Skeleton, Typography, message } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { gradeSubmission } from "../../api/submissions";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";
import { toAbsoluteUrl } from "../../api/client";
import { getApiError } from "../../utils/getApiError";
import { useTranslation } from 'react-i18next';

const AdminSubmissionsPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: subs, isLoading } = useQuery(adminQueryOptions.submissions());
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [grade, setGrade] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  const subjectCards = useMemo(() => {
    const counts = new Map<string, number>();
    (subs || []).forEach((s) => {
      const subject = s.subject_name;
      if (!subject) return;
      counts.set(subject, (counts.get(subject) || 0) + 1);
    });
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }, [subs]);

  const filteredSubs = useMemo(() => {
    if (!selectedSubject) return [];
    return (subs || []).filter((s) => s.subject_name === selectedSubject);
  }, [subs, selectedSubject]);

  const onGrade = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      await gradeSubmission(selectedId, { grade: grade ?? undefined, teacher_comment: comment });
      message.success(t('adminSubmissions.graded'));
      setOpen(false);
      setGrade(null);
      setComment("");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.submissions });
    } catch (err: unknown) {
      message.error(getApiError(err, t('common.error')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <Typography.Title level={4}>{t('adminSubmissions.pageTitle')}</Typography.Title>
      {!selectedSubject ? (
        isLoading ? (
          <Skeleton active />
        ) : !subjectCards.length ? (
          <Typography.Text>{t('adminSubmissions.noSubmissions')}</Typography.Text>
        ) : (
          <div style={{ display: "grid", gap: 'var(--space-3)', gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {subjectCards.map((card) => (
              <Card key={card.name} hoverable onClick={() => setSelectedSubject(card.name)}>
                <div style={{ fontWeight: 'var(--font-weight-semibold)' }}>{card.name}</div>
                <div style={{ opacity: 0.7, marginTop: 'var(--space-1-5)' }}>{t('adminSubmissions.submittedCount', { count: card.count })}</div>
              </Card>
            ))}
          </div>
        )
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
            <Button onClick={() => setSelectedSubject(null)}>{t('common.back')}</Button>
            <Typography.Text strong>{selectedSubject}</Typography.Text>
          </div>

          {isLoading ? (
            <Skeleton active />
          ) : (
            <List
              dataSource={filteredSubs}
              renderItem={(item) => {
                return (
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
                        {t('adminSubmissions.gradeBtn')}
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={`${item.assignment_title || "Topshiriq"} | ${
                        item.student_name || item.student_username || `Student #${item.student}`
                      }`}
                      description={`${t('adminSubmissions.subjectLabel')}: ${item.subject_name || "-"} | ${t('adminSubmissions.lessonLabel')}: ${item.lesson_topic || "-"} | ${t('adminSubmissions.groupLabel')}: ${
                        item.group_name || item.student_group_name || "-"
                      } | ${t('adminSubmissions.teacherLabel')}: ${item.teacher_name || "-"} | ${t('adminSubmissions.submittedAt')}: ${
                        item.submitted_at ? dayjs(item.submitted_at).format("DD.MM.YYYY HH:mm") : "-"
                      }`}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: 'var(--space-1-5)' }}>
                      {item.file ? (
                        <a href={toAbsoluteUrl(item.file)} target="_blank" rel="noreferrer">
                          {t('adminSubmissions.fileLink')}
                        </a>
                      ) : (
                        <span>-</span>
                      )}
                      <span>{item.grade != null ? t('adminSubmissions.gradeLabel', { grade: item.grade }) : t('adminSubmissions.notGraded')}</span>
                    </div>
                  </List.Item>
                );
              }}
            />
          )}
        </>
      )}

      <Modal
        title={t('adminSubmissions.gradeTitle')}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={onGrade}
        confirmLoading={loading}
        okText={t('common.save')}
      >
        <InputNumber
          style={{ width: "100%", marginBottom: 'var(--space-3)' }}
          placeholder={t('adminSubmissions.gradePlaceholder')}
          value={grade === null ? undefined : grade}
          onChange={(v) => setGrade(v ?? null)}
        />
        <Input.TextArea
          rows={3}
          placeholder={t('adminSubmissions.commentPlaceholder')}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default AdminSubmissionsPage;
