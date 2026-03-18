import { Form, Input, Modal, Select } from "antd";
import type { FormInstance } from "antd/es/form";

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
}: AdminTeacherWorkloadModalProps) => (
  <Modal
    title={editingAssignment ? "Workloadni tahrirlash" : "Teacher Workload yaratish"}
    open={open}
    onCancel={onCancel}
    onOk={() => form.submit()}
    confirmLoading={loading}
    destroyOnClose
  >
    {selectedTeacher ? (
      <Form layout="vertical" form={form} onFinish={onSubmit}>
        <Form.Item label="O'qituvchi">
          <Input
            disabled
            value={`${selectedTeacher.first_name || ""} ${selectedTeacher.last_name || ""}`.trim() || selectedTeacher.username}
          />
        </Form.Item>
        {editingAssignment ? (
          <>
            <Form.Item name="subject" label="Fan" rules={[{ required: true }]}>
              <Select
                showSearch
                options={subjects.map((subject) => ({
                  value: subject.id,
                  label: subject.name,
                }))}
              />
            </Form.Item>
            <Form.Item name="groups" label="Guruhlar">
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
            <Form.Item name="subject_id" label="Fan" rules={[{ required: true }]}>
              <Select
                showSearch
                options={subjects.map((subject) => ({
                  value: subject.id,
                  label: subject.name,
                }))}
              />
            </Form.Item>
            <Form.Item name="group_ids" label="Guruhlar">
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

export default AdminTeacherWorkloadModal;
