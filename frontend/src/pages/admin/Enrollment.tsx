import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, List, Avatar, Button, Space, Tag, message, Empty, Select } from "antd";
import { useState } from "react";
import { fetchEnrollment, approveEnrollment, rejectEnrollment, EnrollmentItem, fetchGroupsAdmin } from "../../api/admin";

const EnrollmentPage = () => {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-enrollment"],
    queryFn: fetchEnrollment,
  });
  const { data: groups } = useQuery({
    queryKey: ["admin-groups"],
    queryFn: fetchGroupsAdmin,
  });
  const [groupByApplicant, setGroupByApplicant] = useState<Record<number, number | undefined>>({});

  const { mutateAsync: approve, isLoading: approving } = useMutation({
    mutationFn: (payload: { id: number; group_id: number }) =>
      approveEnrollment(payload.id, { group_id: payload.group_id }),
    onSuccess: async () => {
      message.success("Tasdiqlandi");
      await qc.invalidateQueries({ queryKey: ["admin-enrollment"] });
    },
    onError: () => message.error("Tasdiqlashda xato"),
  });

  const { mutateAsync: reject, isLoading: rejecting } = useMutation({
    mutationFn: (id: number) => rejectEnrollment(id),
    onSuccess: async () => {
      message.success("Rad etildi");
      await qc.invalidateQueries({ queryKey: ["admin-enrollment"] });
    },
    onError: () => message.error("Rad etishda xato"),
  });

  return (
    <Card title="Ro'yxatdan o'tish arizalari" style={{ marginBottom: 16 }}>
      <List
        loading={isLoading}
        dataSource={data || []}
        locale={{ emptyText: <Empty description="Arizalar yo'q" /> }}
        renderItem={(item: EnrollmentItem) => (
          <List.Item
            actions={[
              <Button
                type="primary"
                loading={approving}
                key="approve"
                onClick={() => {
                  const groupId = groupByApplicant[item.id];
                  if (!groupId) {
                    message.warning("Guruh tanlang");
                    return;
                  }
                  approve({ id: item.id, group_id: groupId });
                }}
              >
                Tasdiqlash
              </Button>,
              <Button danger loading={rejecting} key="reject" onClick={() => reject(item.id)}>
                Rad etish
              </Button>,
            ]}
          >
            <List.Item.Meta
              avatar={<Avatar src={item.documents?.face_image} />}
              title={item.full_name || `Ariza #${item.id}`}
              description={
                <Space wrap>
                  <Tag color={item.status === "approved" ? "green" : item.status === "rejected" ? "red" : "default"}>
                    {item.status || "pending"}
                  </Tag>
                  {item.documents?.passport_front ? (
                    <a href={item.documents.passport_front} target="_blank" rel="noreferrer">
                      Passport (front)
                    </a>
                  ) : null}
                  {item.documents?.passport_back ? (
                    <a href={item.documents.passport_back} target="_blank" rel="noreferrer">
                      Passport (back)
                    </a>
                  ) : null}
                  {item.documents?.face_image ? (
                    <a href={item.documents.face_image} target="_blank" rel="noreferrer">
                      Selfie
                    </a>
                  ) : null}
                  {item.verifications && item.verifications.length ? (
                    <Tag color={item.verifications.some((v) => v.verified) ? "green" : "red"}>
                      Verified:{" "}
                      {item.verifications.some((v) => v.verified) ? "Ha" : "Yo'q"}
                    </Tag>
                  ) : null}
                  <Select
                    placeholder="Guruh tanlang"
                    style={{ minWidth: 180 }}
                    value={groupByApplicant[item.id]}
                    onChange={(v) =>
                      setGroupByApplicant((prev) => ({
                        ...prev,
                        [item.id]: v,
                      }))
                    }
                    options={(groups || []).map((g) => ({ value: g.id, label: g.name }))}
                  />
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
};

export default EnrollmentPage;
