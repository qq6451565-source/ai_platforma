import { Form, Input, InputNumber, Modal, Select } from "antd";
import type { FormInstance } from "antd/es/form";
import { useTranslation } from 'react-i18next';

import type { AdminGroup, AdminUser, Direction } from "../../../api/admin";

type AdminStudentPlacementModalProps = {
  availableGroups: AdminGroup[];
  directions: Direction[];
  form: FormInstance;
  loading: boolean;
  open: boolean;
  selectedUser: AdminUser | null;
  onCancel: () => void;
  onSubmit: (values: {
    direction_id?: number | null;
    group_id?: number | null;
    admission_year?: number;
    status?: "active" | "academic_leave" | "expelled" | "graduated";
  }) => void;
};

const AdminStudentPlacementModal = ({
  availableGroups,
  directions,
  form,
  loading,
  open,
  selectedUser,
  onCancel,
  onSubmit,
}: AdminStudentPlacementModalProps) => {
  const { t } = useTranslation();
  return (
  <Modal
    title={t('adminStudentPlacement.title')}
    open={open}
    onCancel={onCancel}
    onOk={() => form.submit()}
    confirmLoading={loading}
    destroyOnClose
  >
    {selectedUser ? (
      <Form layout="vertical" form={form} onFinish={onSubmit}>
        <Form.Item label={t('form.student')}>
          <Input
            disabled
            value={`${selectedUser.first_name || ""} ${selectedUser.last_name || ""}`.trim() || selectedUser.username}
          />
        </Form.Item>
        <Form.Item name="direction_id" label={t('form.direction')} rules={[{ required: true }]}>
          <Select
            showSearch
            options={directions.map((direction) => ({
              value: direction.id,
              label: direction.name,
            }))}
          />
        </Form.Item>
        <Form.Item name="group_id" label={t('form.group')} rules={[{ required: true }]}>
          <Select
            showSearch
            options={availableGroups.map((group) => ({
              value: group.id,
              label: group.name,
            }))}
          />
        </Form.Item>
        <Form.Item name="admission_year" label={t('form.admissionYear')} rules={[{ required: true }]}>
          <InputNumber min={2000} max={2100} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="status" label={t('form.status')} rules={[{ required: true }]}>
          <Select
            options={[
              { value: "active", label: "Active" },
              { value: "academic_leave", label: "Academic leave" },
              { value: "expelled", label: "Expelled" },
              { value: "graduated", label: "Graduated" },
            ]}
          />
        </Form.Item>
      </Form>
    ) : null}
  </Modal>
  );
};

export default AdminStudentPlacementModal;
