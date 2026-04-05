import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Form, Button, List, message, Empty, Select, Popconfirm, Modal } from "antd";
import { useState } from "react";
import { useTranslation } from 'react-i18next';
import {
  createTeacherSubject,
  deleteTeacherSubject,
  updateTeacherSubject,
} from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const TeacherSubjectsPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: items, isLoading } = useQuery(adminQueryOptions.teacherSubjects());
  const { data: teachers } = useQuery(adminQueryOptions.teachers());
  const { data: subjects } = useQuery(adminQueryOptions.subjects());
  const { data: groups } = useQuery(adminQueryOptions.groups());
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);

  const teacherMap = new Map((teachers || []).map((t) => [t.id, t.username]));
  const subjectMap = new Map((subjects || []).map((s) => [s.id, s.name]));
  const groupMap = new Map((groups || []).map((g) => [g.id, g.name]));

  const createMut = useMutation({
    mutationFn: (vals: any) => createTeacherSubject(vals),
    onSuccess: async () => {
      message.success(t('adminTeacherSubjects.added'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.teacherSubjects });
    },
    onError: () => message.error(t('common.error')),
  });

  return (
    <Card title={t('adminTeacherSubjects.pageTitle')} style={{ marginBottom: 'var(--space-4)' }}>
      <Form layout="vertical" onFinish={createMut.mutate} style={{ marginBottom: 'var(--space-3)' }}>
        <Form.Item name="teacher" label={t('adminTeacherSubjects.teacher')} rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder={t('adminTeacherSubjects.teacherPlaceholder')}
            options={(teachers || []).map((t) => ({ value: t.id, label: t.username }))}
          />
        </Form.Item>
        <Form.Item name="subject" label={t('form.subject')} rules={[{ required: true }]}>
          <Select
            showSearch
            placeholder={t('form.subject')}
            options={(subjects || []).map((s) => ({ value: s.id, label: s.name }))}
          />
        </Form.Item>
        <Form.Item name="groups" label={t('adminTeacherSubjects.groups')}>
          <Select
            mode="multiple"
            allowClear
            placeholder={t('adminTeacherSubjects.groupsPlaceholder')}
            options={(groups || []).map((g) => ({ value: g.id, label: g.name }))}
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={createMut.isPending}>
          {t('common.add')}
        </Button>
      </Form>

      <List
        loading={isLoading}
        dataSource={items || []}
        locale={{ emptyText: <Empty description={t('common.noData')} /> }}
        renderItem={(it) => (
          <List.Item
            actions={[
              <Button
                type="link"
                onClick={() => {
                  setEditItem(it);
                  editForm.setFieldsValue({
                    teacher: it.teacher,
                    subject: it.subject,
                    groups: it.groups,
                  });
                  setEditOpen(true);
                }}
              >
                {t('common.edit')}
              </Button>,
              <Popconfirm
                title={t('common.confirmDelete')}
                onConfirm={() =>
                  deleteTeacherSubject(it.id)
                    .then(() => qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.teacherSubjects }))
                    .catch(() => message.error(t('common.deleteError')))
                }
              >
                <Button danger type="link">
                  {t('common.delete')}
                </Button>
              </Popconfirm>,
            ]}
          >
            {teacherMap.get(it.teacher) || `Teacher #${it.teacher}`} |{" "}
            {subjectMap.get(it.subject) || `${t('form.subject')} #${it.subject}`} | {t('adminTeacherSubjects.groups')}:{" "}
            {(it.groups || [])
              .map((gid) => groupMap.get(gid) || `#${gid}`)
              .join(", ")}
          </List.Item>
        )}
      />

      <Modal
        title={t('adminTeacherSubjects.editTitle')}
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={async () => {
          if (!editItem) return;
          setEditLoading(true);
          try {
            const vals = await editForm.validateFields();
            await updateTeacherSubject(editItem.id, vals);
            message.success(t('common.updated'));
            setEditOpen(false);
            await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.teacherSubjects });
          } catch (err: unknown) {
            if (!(typeof err === 'object' && err !== null && 'errorFields' in err)) message.error(t('common.error'));
          } finally {
            setEditLoading(false);
          }
        }}
        confirmLoading={editLoading}
      >
        <Form layout="vertical" form={editForm}>
          <Form.Item name="teacher" label={t('adminTeacherSubjects.teacher')} rules={[{ required: true }]}>
            <Select
              showSearch
              options={(teachers || []).map((t) => ({ value: t.id, label: t.username }))}
            />
          </Form.Item>
          <Form.Item name="subject" label={t('form.subject')} rules={[{ required: true }]}>
            <Select
              showSearch
              options={(subjects || []).map((s) => ({ value: s.id, label: s.name }))}
            />
          </Form.Item>
          <Form.Item name="groups" label={t('adminTeacherSubjects.groups')}>
            <Select
              mode="multiple"
              allowClear
              options={(groups || []).map((g) => ({ value: g.id, label: g.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default TeacherSubjectsPage;
