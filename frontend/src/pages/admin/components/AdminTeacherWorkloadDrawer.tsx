import { Button, Descriptions, Drawer, Empty, List, Popconfirm, Space, Tag } from "antd";
import { useTranslation } from 'react-i18next';

import type { AdminGroup, AdminUser, Subject, TeacherSubject } from "../../../api/admin";

type AdminTeacherWorkloadDrawerProps = {
  assignments: TeacherSubject[];
  deleteLoading: boolean;
  groupMap: Map<number, AdminGroup>;
  open: boolean;
  selectedTeacher: AdminUser | null;
  subjectMap: Map<number, Subject>;
  onClose: () => void;
  onCreate: (teacher: AdminUser) => void;
  onDelete: (assignmentId: number) => void;
  onEdit: (teacher: AdminUser, assignment: TeacherSubject) => void;
};

const AdminTeacherWorkloadDrawer = ({
  assignments,
  deleteLoading,
  groupMap,
  open,
  selectedTeacher,
  subjectMap,
  onClose,
  onCreate,
  onDelete,
  onEdit,
}: AdminTeacherWorkloadDrawerProps) => {
  const { t } = useTranslation();
  return (
  <Drawer
    title={t('adminTeacherWorkloadDrawer.title')}
    open={open}
    width={520}
    onClose={onClose}
    extra={
      selectedTeacher ? (
        <Button type="primary" onClick={() => onCreate(selectedTeacher)}>
          {t('adminTeacherWorkloadDrawer.assignSubject')}
        </Button>
      ) : null
    }
  >
    {selectedTeacher ? (
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Descriptions size="small" bordered column={1}>
          <Descriptions.Item label={t('form.teacher')}>
            {`${selectedTeacher.first_name || ""} ${selectedTeacher.last_name || ""}`.trim() || selectedTeacher.username}
          </Descriptions.Item>
          <Descriptions.Item label={t('form.login')}>{selectedTeacher.username}</Descriptions.Item>
          <Descriptions.Item label={t('form.phone')}>{selectedTeacher.phone || "-"}</Descriptions.Item>
          <Descriptions.Item label={t('form.email')}>{selectedTeacher.email || "-"}</Descriptions.Item>
        </Descriptions>

        <List
          dataSource={assignments}
          locale={{ emptyText: <Empty description={t('adminTeacherWorkloadDrawer.noWorkload')} /> }}
          renderItem={(assignment) => (
            <List.Item
              actions={[
                <Button size="small" onClick={() => onEdit(selectedTeacher, assignment)}>
                  {t('common.edit')}
                </Button>,
                <Popconfirm
                  title={t('adminTeacherWorkloadDrawer.confirmDelete')}
                  onConfirm={() => onDelete(assignment.id)}
                >
                  <Button size="small" danger loading={deleteLoading}>
                    {t('common.delete')}
                  </Button>
                </Popconfirm>,
              ]}
            >
              <Descriptions size="small" column={1} bordered style={{ width: "100%" }}>
                <Descriptions.Item label={t('form.subject')}>
                  {subjectMap.get(assignment.subject)?.name || `${t('form.subject')} #${assignment.subject}`}
                </Descriptions.Item>
                <Descriptions.Item label={t('form.groups')}>
                  {assignment.groups?.length ? (
                    <Space wrap>
                      {assignment.groups.map((groupId) => (
                        <Tag key={groupId}>{groupMap.get(groupId)?.name || `#${groupId}`}</Tag>
                      ))}
                    </Space>
                  ) : (
                    "-"
                  )}
                </Descriptions.Item>
              </Descriptions>
            </List.Item>
          )}
        />
      </Space>
    ) : null}
  </Drawer>
  );
};

export default AdminTeacherWorkloadDrawer;
