import { Button, Card, Descriptions, Drawer, Popconfirm, Space, Tag } from "antd";

import type {
  AdminUser,
  PassportData,
  StudentProfile,
  TeacherSubject,
} from "../../../api/admin";
import type { AdminHubTab } from "../utils/workflowRouting";

type AdminUserProfileDrawerProps = {
  directionMap: Map<number, string>;
  groupMap: Map<number, string>;
  onClose: () => void;
  onDeletePassport: () => void | Promise<void>;
  onEditUser: () => void;
  onOpenPassportEditor: () => void;
  onOpenWorkflow: (tab: Extract<AdminHubTab, "student-placement" | "teacher-workload">, userId: number) => void;
  open: boolean;
  passport: PassportData | null;
  studentProfile: StudentProfile | null;
  subjectMap: Map<number, string>;
  teacherAssignments: TeacherSubject[];
  user: AdminUser | null;
};

const AdminUserProfileDrawer = ({
  directionMap,
  groupMap,
  onClose,
  onDeletePassport,
  onEditUser,
  onOpenPassportEditor,
  onOpenWorkflow,
  open,
  passport,
  studentProfile,
  subjectMap,
  teacherAssignments,
  user,
}: AdminUserProfileDrawerProps) => (
  <Drawer title="Foydalanuvchi profili" open={open} onClose={onClose} width={460}>
    {user ? (
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Space wrap>
          <Button size="small" onClick={onEditUser}>
            Asosiy ma'lumotlarni tahrirlash
          </Button>
          {user.role === "student" ? (
            <Button
              size="small"
              type="primary"
              onClick={() => onOpenWorkflow("student-placement", user.id)}
            >
              Placementni ochish
            </Button>
          ) : null}
          {user.role === "teacher" ? (
            <Button
              size="small"
              type="primary"
              onClick={() => onOpenWorkflow("teacher-workload", user.id)}
            >
              Workloadni ochish
            </Button>
          ) : null}
        </Space>

        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label="Login">{user.username}</Descriptions.Item>
          <Descriptions.Item label="Ism">{user.first_name || "-"}</Descriptions.Item>
          <Descriptions.Item label="Familiya">{user.last_name || "-"}</Descriptions.Item>
          <Descriptions.Item label="Email">{user.email || "-"}</Descriptions.Item>
          <Descriptions.Item label="Telefon">{user.phone || "-"}</Descriptions.Item>
          <Descriptions.Item label="Guruh">
            {user.group ? groupMap.get(user.group) || "-" : "-"}
          </Descriptions.Item>
          <Descriptions.Item label="Rol">
            {user.role === "student"
              ? "Talaba"
              : user.role === "teacher"
                ? "O'qituvchi"
                : "Admin"}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            {user.is_active ? "Faol" : "Bloklangan"}
          </Descriptions.Item>
        </Descriptions>

        {user.role === "student" ? (
          <Card
            size="small"
            title="Student Placement"
            extra={
              <Button
                size="small"
                type="primary"
                onClick={() => onOpenWorkflow("student-placement", user.id)}
              >
                Workflowga o'tish
              </Button>
            }
          >
            {studentProfile ? (
              <Descriptions size="small" column={1} bordered>
                <Descriptions.Item label="Yo'nalish">
                  {studentProfile.direction ? directionMap.get(studentProfile.direction) || "-" : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Guruh">
                  {studentProfile.group ? groupMap.get(studentProfile.group) || "-" : "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Qabul yili">
                  {studentProfile.admission_year || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Status">{studentProfile.status || "-"}</Descriptions.Item>
              </Descriptions>
            ) : (
              <div>Student profile hali yaratilmagan yoki placement berilmagan.</div>
            )}
          </Card>
        ) : null}

        {user.role === "teacher" ? (
          <Card
            size="small"
            title="Teacher Workload"
            extra={
              <Button
                size="small"
                type="primary"
                onClick={() => onOpenWorkflow("teacher-workload", user.id)}
              >
                Workflowga o'tish
              </Button>
            }
          >
            {teacherAssignments.length ? (
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                {teacherAssignments.map((assignment) => (
                  <Descriptions key={assignment.id} size="small" column={1} bordered>
                    <Descriptions.Item label="Fan">
                      {subjectMap.get(assignment.subject) || `Fan #${assignment.subject}`}
                    </Descriptions.Item>
                    <Descriptions.Item label="Guruhlar">
                      {assignment.groups?.length ? (
                        <Space wrap>
                          {assignment.groups.map((groupId) => (
                            <Tag key={groupId}>{groupMap.get(groupId) || `#${groupId}`}</Tag>
                          ))}
                        </Space>
                      ) : (
                        "-"
                      )}
                    </Descriptions.Item>
                  </Descriptions>
                ))}
              </Space>
            ) : (
              <div>Teacher uchun hali workload biriktirilmagan.</div>
            )}
          </Card>
        ) : null}

        <Card
          size="small"
          title="Passport ma'lumotlari"
          extra={
            <Space>
              <Button size="small" onClick={onOpenPassportEditor}>
                {passport ? "Tahrirlash" : "Yaratish"}
              </Button>
              {passport ? (
                <Popconfirm
                  title="Passport ma'lumotlarini o'chirishni tasdiqlaysizmi?"
                  onConfirm={onDeletePassport}
                >
                  <Button size="small" danger>
                    O'chirish
                  </Button>
                </Popconfirm>
              ) : null}
            </Space>
          }
        >
          {passport ? (
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label="Seriya">{passport.passport_series}</Descriptions.Item>
              <Descriptions.Item label="Raqam">{passport.passport_number}</Descriptions.Item>
              <Descriptions.Item label="Tug'ilgan sana">
                {passport.birth_date || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="OCR ism-familiya">
                {passport.extracted_fullname || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Old tomoni">
                {passport.front_image ? (
                  <a href={passport.front_image} target="_blank" rel="noreferrer">
                    Ko'rish
                  </a>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Orqa tomoni">
                {passport.back_image ? (
                  <a href={passport.back_image} target="_blank" rel="noreferrer">
                    Ko'rish
                  </a>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Selfi">
                {passport.selfie_image ? (
                  <a href={passport.selfie_image} target="_blank" rel="noreferrer">
                    Ko'rish
                  </a>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <div>Passport ma'lumotlari yo'q.</div>
          )}
        </Card>
      </Space>
    ) : null}
  </Drawer>
);

export default AdminUserProfileDrawer;
