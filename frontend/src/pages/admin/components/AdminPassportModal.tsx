import { Button, Form, Input, Modal, Upload } from "antd";
import type { FormInstance } from "antd/es/form";
import { UploadOutlined } from "@ant-design/icons";
import { useTranslation } from 'react-i18next';

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
}: AdminPassportModalProps) => {
  const { t } = useTranslation();
  return (
  <Modal
    title={t('adminPassport.editTitle')}
    open={open}
    onCancel={onCancel}
    onOk={onSave}
    destroyOnClose
  >
    <Form layout="vertical" form={form}>
      <Form.Item name="passport_series" label={t('adminPassport.series')} rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="passport_number" label={t('adminPassport.number')} rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item name="birth_date" label={t('adminPassport.birthDate')}>
        <Input type="date" />
      </Form.Item>
      <Form.Item name="extracted_fullname" label={t('adminPassport.ocrFullname')}>
        <Input />
      </Form.Item>
      <Form.Item label={t('adminPassport.frontSide')}>
        <Upload
          beforeUpload={() => false}
          maxCount={1}
          onChange={(info) => {
            const file = info.fileList[0]?.originFileObj as File | undefined;
            onFrontFileChange(file || null);
          }}
        >
          <Button icon={<UploadOutlined />}>{t('adminPassport.selectNewImage')}</Button>
        </Upload>
        {passport?.front_image ? (
          <div style={{ marginTop: 'var(--space-2)' }}>
            <a href={passport.front_image} target="_blank" rel="noreferrer">
              {t('adminPassport.currentImage')}
            </a>
          </div>
        ) : null}
      </Form.Item>
      <Form.Item label={t('adminPassport.backSide')}>
        <Upload
          beforeUpload={() => false}
          maxCount={1}
          onChange={(info) => {
            const file = info.fileList[0]?.originFileObj as File | undefined;
            onBackFileChange(file || null);
          }}
        >
          <Button icon={<UploadOutlined />}>{t('adminPassport.selectNewImage')}</Button>
        </Upload>
        {passport?.back_image ? (
          <div style={{ marginTop: 'var(--space-2)' }}>
            <a href={passport.back_image} target="_blank" rel="noreferrer">
              {t('adminPassport.currentImage')}
            </a>
          </div>
        ) : null}
      </Form.Item>
      <Form.Item label={t('adminPassport.selfie')}>
        <Upload
          beforeUpload={() => false}
          maxCount={1}
          onChange={(info) => {
            const file = info.fileList[0]?.originFileObj as File | undefined;
            onSelfieFileChange(file || null);
          }}
        >
          <Button icon={<UploadOutlined />}>{t('adminPassport.selectNewImage')}</Button>
        </Upload>
        {passport?.selfie_image ? (
          <div style={{ marginTop: 'var(--space-2)' }}>
            <a href={passport.selfie_image} target="_blank" rel="noreferrer">
              {t('adminPassport.currentImage')}
            </a>
          </div>
        ) : null}
      </Form.Item>
    </Form>
  </Modal>
  );
};

export default AdminPassportModal;
