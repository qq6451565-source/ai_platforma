import { useMemo } from "react";
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Space, Switch, Tag, message } from "antd";
import {
  createEnrollmentWindow,
  updateEnrollmentWindow,
} from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const EnrollmentWindowsPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(adminQueryOptions.enrollmentWindows());

  const currentWindow = useMemo(() => (data && data.length ? data[0] : null), [data]);
  const hasMultiple = (data?.length || 0) > 1;

  const createMut = useMutation({
    mutationFn: (is_active: boolean) => createEnrollmentWindow({ is_active }),
    onSuccess: async () => {
      message.success(t('common.saved'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.enrollmentWindows });
    },
    onError: () => message.error(t('common.saveError')),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateEnrollmentWindow(id, { is_active }),
    onSuccess: async () => {
      message.success(t('common.updated'));
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.enrollmentWindows });
    },
    onError: () => message.error(t('common.updateError')),
  });

  const onToggle = (checked: boolean) => {
    if (currentWindow) {
      updateMut.mutate({ id: currentWindow.id, is_active: checked });
    } else {
      createMut.mutate(checked);
    }
  };

  return (
    <Card title={t('adminEnrollment.registration')} loading={isLoading}>
      {hasMultiple ? (
        <Alert
          type="warning"
          showIcon
          message={t('adminEnrollment.multipleRecordsWarning')}
          style={{ marginBottom: 'var(--space-3)' }}
        />
      ) : null}
      <Space size="large">
        <Tag color={currentWindow?.is_active ? "green" : "red"}>
          {currentWindow?.is_active ? t('adminEnrollment.open') : t('adminEnrollment.closed')}
        </Tag>
        <Switch
          checked={!!currentWindow?.is_active}
          onChange={onToggle}
          loading={createMut.isPending || updateMut.isPending}
          checkedChildren={t('adminEnrollment.open')}
          unCheckedChildren={t('adminEnrollment.closed')}
        />
        <Button onClick={() => onToggle(false)} disabled={!currentWindow?.is_active}>
          {t('adminEnrollment.close')}
        </Button>
        <Button type="primary" onClick={() => onToggle(true)} disabled={!!currentWindow?.is_active}>
          {t('adminEnrollment.openAction')}
        </Button>
      </Space>
    </Card>
  );
};

export default EnrollmentWindowsPage;
