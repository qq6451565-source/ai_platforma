import { Form, Input, Modal, Select } from "antd";
import type { FormInstance } from "antd/es/form";
import { useTranslation } from 'react-i18next';

import type { AdminGroup, AdminUser, Subject, TeacherSubject } from "../../../api/admin";

type AdminTeacherWorkloadModalProps = {
  availableGroups: AdminGroup[];
  editingAssignment: TeacherSubject | null;
  form: FormInstance;
  loading: boolean;
  open: boolean;
  selectedTeacher: AdminUser | null;
  subjects: Subject[];
  onCancel: () => void;
  onSubmit: (values: {
    subject_id?: number;
    group_ids?: number[];
    subject?: number;
    groups?: number[];
  }) => void;
};

const AdminTeacherWorkloadModal = ({
  availableGroups,
  editingAssignment,
  form,
  loading,
  open,
  selectedTeacher,
  subjects,
  onCancel,
  onSubmit,
}: AdminTeacherWorkloadModalProps) => {
  const { t } = useTranslation();
  return (
  <Modal
    title={editingAssignment ? t('adminTeacherWorkloadModal.editTitle') : t('adminTeacherWorkloadModal.createTitle')}
    open={open}
    onCancel={onCancel}
    onOk={() => form.submit()}
    confirmLoading={loading}
    destroyOnClose
  >
    {selectedTeacher ? (
      <Form layout="vertical" form={form} onFinish={onSubmit}>
        <Form.Item label={t('form.teacher')}>
          <Input
            disabled
            value={`${selectedTeacher.first_name || ""} ${selectedTeacher.last_name || ""}`.trim() || selectedTeacher.username}
          />
        </Form.Item>
        {editingAssignment ? (
          <>
            <Form.Item name="subject" label={t('form.subject')} rules={[{ required: true }]}>
              <Select
                showSearch
                options={subjects.map((subject) => ({
                  value: subject.id,
                  label: subject.name,
                }))}
              />
            </Form.Item>
            <Form.Item name="groups" label={t('form.groups')}>
              <Select
                mode="multiple"
                options={availableGroups.map((group) => ({
                  value: group.id,
                  label: group.name,
                }))}
              />
            </Form.Item>
          </>
        ) : (
          <>
            <Form.Item name="subject_id" label={t('form.subject')} rules={[{ required: true }]}>
              <Select
                showSearch
                options={subjects.map((subject) => ({
                  value: subject.id,
                  label: subject.name,
                }))}
              />
            </Form.Item>
            <Form.Item name="group_ids" label={t('form.groups')}>
              <Select
                mode="multiple"
                options={availableGroups.map((group) => ({
                  value: group.id,
                  label: group.name,
                }))}
              />
            </Form.Item>
          </>
        )}
      </Form>
    ) : null}
  </Modal>
  );
};

export default AdminTeacherWorkloadModal;
