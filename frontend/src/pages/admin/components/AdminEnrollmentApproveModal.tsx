import { Alert, Form, Input, InputNumber, Modal, Select } from "antd";
import { useTranslation } from 'react-i18next';

import type { AdminEnrollmentController } from "../hooks/useAdminEnrollmentController";

type Props = {
  controller: AdminEnrollmentController;
};

const AdminEnrollmentApproveModal = ({ controller }: Props) => {
  const { t } = useTranslation();
  return (
  <Modal
    title={t('adminApproveModal.pageTitle')}
    open={controller.approveOpen}
    onCancel={controller.closeApprove}
    onOk={() => controller.approveForm.submit()}
    confirmLoading={controller.approving}
    destroyOnClose
  >
    {controller.selectedApplicant ? (
      <>
        {controller.selectedApplicant.ai_summary.manual_review_required ? (
          <Alert
            type="warning"
            showIcon
            message={t('adminApproveModal.aiNotApproved')}
            description={t('adminApproveModal.manualDecision')}
            style={{ marginBottom: 'var(--space-3)' }}
          />
        ) : (
          <Alert
            type="success"
            showIcon
            message={t('adminApproveModal.aiApproved')}
            description={t('adminApproveModal.approveReady')}
            style={{ marginBottom: 'var(--space-3)' }}
          />
        )}

        <Form layout="vertical" form={controller.approveForm} onFinish={controller.submitApprove}>
          <Form.Item name="role" label={t('form.role')} rules={[{ required: true }]}>
            <Select
              options={[
                { value: "student", label: t('form.student') },
                { value: "teacher", label: t('form.teacher') },
              ]}
            />
          </Form.Item>

          {controller.selectedApplicant.ai_summary.manual_review_required ? (
            <Form.Item
              name="manual_override_reason"
              label={t('adminApproveModal.overrideReason')}
              rules={[{ required: true, message: t('adminApproveModal.overridePlaceholder') }]}
              extra={t('adminApproveModal.overrideRequired')}
            >
              <Input.TextArea
                rows={4}
                placeholder={t('adminApproveModal.overrideExample')}
              />
            </Form.Item>
          ) : null}

          <Form.Item shouldUpdate>
            {({ getFieldValue }) => {
              const role = getFieldValue("role") || "student";
              if (role === "student") {
                return (
                  <>
                    <Form.Item name="group_id" label={t('form.group')} rules={[{ required: true }]}>
                      <Select
                        options={controller.groups.map((group) => ({ value: group.id, label: group.name }))}
                        placeholder={t('adminApproveModal.selectGroup')}
                      />
                    </Form.Item>
                    <Form.Item name="admission_year" label={t('form.admissionYear')}>
                      <InputNumber min={2000} max={2100} style={{ width: "100%" }} />
                    </Form.Item>
                  </>
                );
              }

              return (
                <>
                  <Form.Item name="subject_id" label={t('form.subject')} rules={[{ required: true }]}>
                    <Select
                      options={controller.subjects.map((subject) => ({ value: subject.id, label: subject.name }))}
                      placeholder={t('adminApproveModal.selectSubject')}
                    />
                  </Form.Item>
                  <Form.Item name="group_ids" label={t('adminApproveModal.groupsOptional')}>
                    <Select
                      mode="multiple"
                      options={controller.groups.map((group) => ({ value: group.id, label: group.name }))}
                      placeholder={t('adminApproveModal.selectGroups')}
                    />
                  </Form.Item>
                </>
              );
            }}
          </Form.Item>
        </Form>
      </>
    ) : null}
  </Modal>
  );
};

export default AdminEnrollmentApproveModal;
