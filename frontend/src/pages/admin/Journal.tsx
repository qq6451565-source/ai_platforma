import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from 'react-i18next';
import {
  Card,
  Form,
  Select,
  Input,
  InputNumber,
  Button,
  List,
  Empty,
  Popconfirm,
  Modal,
  message,
} from "antd";
import {
  createJournalRecord,
  updateJournalRecord,
  deleteJournalRecord,
} from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const AdminJournalPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: records, isLoading } = useQuery(adminQueryOptions.journalRecords());
  const { data: lessons } = useQuery(adminQueryOptions.lessons());
  const { data: groups } = useQuery(adminQueryOptions.groups());
  const { data: students } = useQuery(adminQueryOptions.students());

  const lessonMap = new Map((lessons || []).map((l) => [l.id, l.topic || `${t('form.lesson')} #${l.id}`]));
  const groupMap = new Map((groups || []).map((g) => [g.id, g.name]));
  const studentMap = new Map((students || []).map((s) => [s.id, `${s.first_name} ${s.last_name}`.trim() || s.username]));

  const [editItem, setEditItem] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);

  const createMut = useMutation({
    mutationFn: (vals: any) => createJournalRecord(vals),
    onSuccess: async () => {
      message.success(t('common.saved'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.journalRecords });
    },
    onError: () => message.error(t('common.error')),
  });

  return (
    <Card title={t('adminJournal.pageTitle')} style={{ marginBottom: 'var(--space-4)' }}>
      <Form layout="vertical" onFinish={createMut.mutate} style={{ marginBottom: 'var(--space-3)' }}>
        <Form.Item name="lesson" label={t('form.lesson')} rules={[{ required: true }]}>
          <Select
            showSearch
            options={(lessons || []).map((l) => ({ value: l.id, label: l.topic || `${t('form.lesson')} #${l.id}` }))}
          />
        </Form.Item>
        <Form.Item name="group" label={t('form.group')} rules={[{ required: true }]}>
          <Select
            showSearch
            options={(groups || []).map((g) => ({ value: g.id, label: g.name }))}
          />
        </Form.Item>
        <Form.Item name="student" label={t('roles.student')} rules={[{ required: true }]}>
          <Select
            showSearch
            options={(students || []).map((s) => ({
              value: s.id,
              label: `${s.first_name} ${s.last_name}`.trim() || s.username,
            }))}
          />
        </Form.Item>
        <Form.Item name="attendance" label={t('common.status')} rules={[{ required: true }]}>
          <Select
            options={[
              { value: "present", label: t('adminAttendance.present') },
              { value: "absent", label: t('adminAttendance.absent') },
            ]}
          />
        </Form.Item>
        <Form.Item name="grade" label={t('studentAssignments.grade')}>
          <InputNumber min={0} max={100} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="comment" label={t('form.comment')}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={createMut.isPending}>
          {t('common.add')}
        </Button>
      </Form>

      <List
        loading={isLoading}
        dataSource={records || []}
        locale={{ emptyText: <Empty description={t('common.noData')} /> }}
        renderItem={(r) => (
          <List.Item
            actions={[
              <Button
                type="link"
                onClick={() => {
                  setEditItem(r);
                  editForm.setFieldsValue({
                    lesson: r.lesson,
                    group: r.group,
                    student: r.student,
                    attendance: r.attendance === "absent" ? "absent" : "present",
                    grade: r.grade,
                    comment: r.comment,
                  });
                }}
              >
                {t('common.edit')}
              </Button>,
              <Popconfirm title={t('common.confirmDelete')} onConfirm={() => deleteJournalRecord(r.id).then(() => qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.journalRecords }))}>
                <Button danger type="link">{t('common.delete')}</Button>
              </Popconfirm>,
            ]}
          >
            {lessonMap.get(r.lesson) || `${t('form.lesson')} #${r.lesson}`} | {studentMap.get(r.student) || `Student #${r.student}`} |{" "}
            {groupMap.get(r.group) || `${t('form.group')} #${r.group}`} | {r.attendance === "absent" ? t('adminAttendance.absent') : t('adminAttendance.present')}
          </List.Item>
        )}
      />

      <Modal
        title={t('adminJournal.editTitle')}
        open={!!editItem}
        onCancel={() => setEditItem(null)}
        onOk={async () => {
          if (!editItem) return;
          setEditLoading(true);
          try {
            const vals = await editForm.validateFields();
            await updateJournalRecord(editItem.id, vals);
            message.success(t('common.updated'));
            setEditItem(null);
            await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.journalRecords });
          } catch (err: unknown) {
            if (!(typeof err === 'object' && err !== null && 'errorFields' in err)) message.error(t('common.error'));
          } finally {
            setEditLoading(false);
          }
        }}
        confirmLoading={editLoading}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="lesson" label={t('form.lesson')} rules={[{ required: true }]}>
            <Select options={(lessons || []).map((l) => ({ value: l.id, label: l.topic || `${t('form.lesson')} #${l.id}` }))} />
          </Form.Item>
          <Form.Item name="group" label={t('form.group')} rules={[{ required: true }]}>
            <Select options={(groups || []).map((g) => ({ value: g.id, label: g.name }))} />
          </Form.Item>
          <Form.Item name="student" label={t('roles.student')} rules={[{ required: true }]}>
            <Select
              options={(students || []).map((s) => ({
                value: s.id,
                label: `${s.first_name} ${s.last_name}`.trim() || s.username,
              }))}
            />
          </Form.Item>
          <Form.Item name="attendance" label={t('common.status')} rules={[{ required: true }]}>
            <Select
              options={[
                { value: "present", label: t('adminAttendance.present') },
                { value: "absent", label: t('adminAttendance.absent') },
              ]}
            />
          </Form.Item>
          <Form.Item name="grade" label={t('studentAssignments.grade')}>
            <InputNumber min={0} max={100} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="comment" label={t('form.comment')}>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AdminJournalPage;
