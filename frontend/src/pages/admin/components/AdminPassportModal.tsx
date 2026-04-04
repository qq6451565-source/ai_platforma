import { Button, Form, Input, Modal, Upload } from "antd";
import type { FormInstance } from "antd/es/form";
import { UploadOutlined } from "@ant-design/icons";

import type { PassportData } from "../../../api/admin";

type AdminPassportModalProps = {
  form: FormInstance;
  open: boolean;
  passport: PassportData | null;
  onCancel: () => void;
  onSave: () => void;
  onFrontFileChange: (file: File | null) => void;
  onBackFileChange: (file: File | null) => void;
  onSelfieFileChange: (file: File | null) => void;
};

const AdminPassportModal = ({
  form,
  open,
  passport,
  onCancel,
  onSave,
  onFrontFileChange,
  onBackFileChange,
  onSelfieFileChange,
}: AdminPassportModalProps) => (
  <Modal
    title="Passport ma'lumotlarini tahrirlash"
    open={open}
    onCancel={onCancel}
    onOk={onSave}
    destroyOnClose
  >
    <Form layout="vertical" form={form}>
      <Form.Item name="passport_series" label="Seriya" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="passport_number" label="Raqam" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="birth_date" label="Tug'ilgan sana">
        <Input type="date" />
      </Form.Item>
      <Form.Item name="extracted_fullname" label="OCR ism-familiya">
        <Input />
      </Form.Item>
      <Form.Item label="Passport old tomoni">
        <Upload
          beforeUpload={() => false}
          maxCount={1}
          onChange={(info) => {
            const file = info.fileList[0]?.originFileObj as File | undefined;
            onFrontFileChange(file || null);
          }}
        >
          <Button icon={<UploadOutlined />}>Yangi rasm tanlash</Button>
        </Upload>
        {passport?.front_image ? (
          <div style={{ marginTop: 'var(--space-2)' }}>
            <a href={passport.front_image} target="_blank" rel="noreferrer">
              Hozirgi rasm
            </a>
          </div>
        ) : null}
      </Form.Item>
      <Form.Item label="Passport orqa tomoni">
        <Upload
          beforeUpload={() => false}
          maxCount={1}
          onChange={(info) => {
            const file = info.fileList[0]?.originFileObj as File | undefined;
            onBackFileChange(file || null);
          }}
        >
          <Button icon={<UploadOutlined />}>Yangi rasm tanlash</Button>
        </Upload>
        {passport?.back_image ? (
          <div style={{ marginTop: 'var(--space-2)' }}>
            <a href={passport.back_image} target="_blank" rel="noreferrer">
              Hozirgi rasm
            </a>
          </div>
        ) : null}
      </Form.Item>
      <Form.Item label="Selfi">
        <Upload
          beforeUpload={() => false}
          maxCount={1}
          onChange={(info) => {
            const file = info.fileList[0]?.originFileObj as File | undefined;
            onSelfieFileChange(file || null);
          }}
        >
          <Button icon={<UploadOutlined />}>Yangi rasm tanlash</Button>
        </Upload>
        {passport?.selfie_image ? (
          <div style={{ marginTop: 'var(--space-2)' }}>
            <a href={passport.selfie_image} target="_blank" rel="noreferrer">
              Hozirgi rasm
            </a>
          </div>
        ) : null}
      </Form.Item>
    </Form>
  </Modal>
);

export default AdminPassportModal;
