import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Space, Switch, Tag, message } from "antd";
import {
  createEnrollmentWindow,
  updateEnrollmentWindow,
} from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const EnrollmentWindowsPage = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(adminQueryOptions.enrollmentWindows());

  const currentWindow = useMemo(() => (data && data.length ? data[0] : null), [data]);
  const hasMultiple = (data?.length || 0) > 1;

  const createMut = useMutation({
    mutationFn: (is_active: boolean) => createEnrollmentWindow({ is_active }),
    onSuccess: async () => {
      message.success("Saqlandi");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.enrollmentWindows });
    },
    onError: () => message.error("Saqlashda xato"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      updateEnrollmentWindow(id, { is_active }),
    onSuccess: async () => {
      message.success("Yangilandi");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.enrollmentWindows });
    },
    onError: () => message.error("Yangilashda xato"),
  });

  const onToggle = (checked: boolean) => {
    if (currentWindow) {
      updateMut.mutate({ id: currentWindow.id, is_active: checked });
    } else {
      createMut.mutate(checked);
    }
  };

  return (
    <Card title="Ro'yxatdan o'tish" loading={isLoading}>
      {hasMultiple ? (
        <Alert
          type="warning"
          showIcon
          message="Bir nechta yozuv topildi. Birinchi yozuv asosiy holat sifatida ishlatiladi."
          style={{ marginBottom: 'var(--space-3)' }}
        />
      ) : null}
      <Space size="large">
        <Tag color={currentWindow?.is_active ? "green" : "red"}>
          {currentWindow?.is_active ? "Ochiq" : "Yopiq"}
        </Tag>
        <Switch
          checked={!!currentWindow?.is_active}
          onChange={onToggle}
          loading={createMut.isPending || updateMut.isPending}
          checkedChildren="Ochiq"
          unCheckedChildren="Yopiq"
        />
        <Button onClick={() => onToggle(false)} disabled={!currentWindow?.is_active}>
          Yopish
        </Button>
        <Button type="primary" onClick={() => onToggle(true)} disabled={!!currentWindow?.is_active}>
          Ochish
        </Button>
      </Space>
    </Card>
  );
};

export default EnrollmentWindowsPage;
