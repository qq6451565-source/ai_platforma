import { Button, Descriptions, Drawer, Empty, List, Popconfirm, Space, Tag } from "antd";

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
}: AdminTeacherWorkloadDrawerProps) => (
  <Drawer
    title="Teacher Workload"
    open={open}
    width={520}
    onClose={onClose}
    extra={
      selectedTeacher ? (
        <Button type="primary" onClick={() => onCreate(selectedTeacher)}>
          Fan biriktirish
        </Button>
      ) : null
    }
  >
    {selectedTeacher ? (
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Descriptions size="small" bordered column={1}>
          <Descriptions.Item label="O'qituvchi">
            {`${selectedTeacher.first_name || ""} ${selectedTeacher.last_name || ""}`.trim() || selectedTeacher.username}
          </Descriptions.Item>
          <Descriptions.Item label="Login">{selectedTeacher.username}</Descriptions.Item>
          <Descriptions.Item label="Telefon">{selectedTeacher.phone || "-"}</Descriptions.Item>
          <Descriptions.Item label="Email">{selectedTeacher.email || "-"}</Descriptions.Item>
        </Descriptions>

        <List
          dataSource={assignments}
          locale={{ emptyText: <Empty description="Workload biriktirilmagan" /> }}
          renderItem={(assignment) => (
            <List.Item
              actions={[
                <Button size="small" onClick={() => onEdit(selectedTeacher, assignment)}>
                  Tahrirlash
                </Button>,
                <Popconfirm
                  title="Biriktirishni o'chirishni tasdiqlaysizmi?"
                  onConfirm={() => onDelete(assignment.id)}
                >
                  <Button size="small" danger loading={deleteLoading}>
                    O'chirish
                  </Button>
                </Popconfirm>,
              ]}
            >
              <Descriptions size="small" column={1} bordered style={{ width: "100%" }}>
                <Descriptions.Item label="Fan">
                  {subjectMap.get(assignment.subject)?.name || `Fan #${assignment.subject}`}
                </Descriptions.Item>
                <Descriptions.Item label="Guruhlar">
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

export default AdminTeacherWorkloadDrawer;
