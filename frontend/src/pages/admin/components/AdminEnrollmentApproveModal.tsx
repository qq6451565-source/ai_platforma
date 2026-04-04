import { Alert, Form, Input, InputNumber, Modal, Select } from "antd";

import type { AdminEnrollmentController } from "../hooks/useAdminEnrollmentController";

type Props = {
  controller: AdminEnrollmentController;
};

const AdminEnrollmentApproveModal = ({ controller }: Props) => (
  <Modal
    title="Arizani tasdiqlash"
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
            message="AI avtomatik tasdiqlamadi"
            description="Admin passport va selfie preview asosida qo'lda qaror qabul qilishi kerak."
            style={{ marginBottom: 'var(--space-3)' }}
          />
        ) : (
          <Alert
            type="success"
            showIcon
            message="AI tasdiqladi"
            description="Ariza approve-ready holatda. Endi rol va biriktirishni tanlang."
            style={{ marginBottom: 'var(--space-3)' }}
          />
        )}

        <Form layout="vertical" form={controller.approveForm} onFinish={controller.submitApprove}>
          <Form.Item name="role" label="Rol" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "student", label: "Talaba" },
                { value: "teacher", label: "O'qituvchi" },
              ]}
            />
          </Form.Item>

          {controller.selectedApplicant.ai_summary.manual_review_required ? (
            <Form.Item
              name="manual_override_reason"
              label="Qo'lda tasdiqlash sababi"
              rules={[{ required: true, message: "Tasdiqlash sababini yozing" }]}
              extra="AI avtomatik tasdiqlamagan arizalarda audit uchun sabab majburiy."
            >
              <Input.TextArea
                rows={4}
                placeholder="Masalan: passport va selfie preview qo'lda tekshirildi, shaxs mos deb topildi."
              />
            </Form.Item>
          ) : null}

          <Form.Item shouldUpdate>
            {({ getFieldValue }) => {
              const role = getFieldValue("role") || "student";
              if (role === "student") {
                return (
                  <>
                    <Form.Item name="group_id" label="Guruh" rules={[{ required: true }]}>
                      <Select
                        options={controller.groups.map((group) => ({ value: group.id, label: group.name }))}
                        placeholder="Guruh tanlang"
                      />
                    </Form.Item>
                    <Form.Item name="admission_year" label="Qabul yili">
                      <InputNumber min={2000} max={2100} style={{ width: "100%" }} />
                    </Form.Item>
                  </>
                );
              }

              return (
                <>
                  <Form.Item name="subject_id" label="Fan" rules={[{ required: true }]}>
                    <Select
                      options={controller.subjects.map((subject) => ({ value: subject.id, label: subject.name }))}
                      placeholder="Fan tanlang"
                    />
                  </Form.Item>
                  <Form.Item name="group_ids" label="Guruhlar (ixtiyoriy)">
                    <Select
                      mode="multiple"
                      options={controller.groups.map((group) => ({ value: group.id, label: group.name }))}
                      placeholder="Guruhlarni tanlang"
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

export default AdminEnrollmentApproveModal;
