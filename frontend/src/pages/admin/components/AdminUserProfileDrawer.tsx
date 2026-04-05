import { Button, Card, Descriptions, Drawer, Popconfirm, Space, Tag } from "antd";
import { useTranslation } from 'react-i18next';

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
}: AdminUserProfileDrawerProps) => {
  const { t } = useTranslation();
  return (
  <Drawer title={t('adminUserProfile.title')} open={open} onClose={onClose} width={460}>
    {user ? (
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Space wrap>
          <Button size="small" onClick={onEditUser}>
            {t('adminUserProfile.editBasicInfo')}
          </Button>
        </Space>

        <Descriptions size="small" column={1} bordered>
          <Descriptions.Item label={t('form.login')}>{user.username}</Descriptions.Item>
          <Descriptions.Item label={t('form.firstName')}>{user.first_name || "-"}</Descriptions.Item>
          <Descriptions.Item label={t('form.lastName')}>{user.last_name || "-"}</Descriptions.Item>
          <Descriptions.Item label={t('form.email')}>{user.email || "-"}</Descriptions.Item>
          <Descriptions.Item label={t('form.phone')}>{user.phone || "-"}</Descriptions.Item>
          <Descriptions.Item label={t('form.group')}>
            {user.group ? groupMap.get(user.group) || "-" : "-"}
          </Descriptions.Item>
          <Descriptions.Item label={t('form.role')}>
            {user.role === "student"
              ? t('form.student')
              : user.role === "teacher"
                ? t('form.teacher')
                : t('form.admin')}
          </Descriptions.Item>
          <Descriptions.Item label={t('form.status')}>
            {user.is_active ? t('adminUserProfile.active') : t('adminUserProfile.blocked')}
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
                {t('common.edit')}
              </Button>
            }
          >
            {studentProfile ? (
              <Descriptions size="small" column={1} bordered>
                <Descriptions.Item label={t('form.direction')}>
                  {studentProfile.direction ? directionMap.get(studentProfile.direction) || "-" : "-"}
                </Descriptions.Item>
                <Descriptions.Item label={t('form.group')}>
                  {studentProfile.group ? groupMap.get(studentProfile.group) || "-" : "-"}
                </Descriptions.Item>
                <Descriptions.Item label={t('form.admissionYear')}>
                  {studentProfile.admission_year || "-"}
                </Descriptions.Item>
                <Descriptions.Item label="Status">{studentProfile.status || "-"}</Descriptions.Item>
              </Descriptions>
            ) : (
              <div>{t('adminUserProfile.noStudentProfile')}</div>
            )}
          </Card>
        ) : null}

        {user.role === "teacher" ? (
          <Card
            size="small"
            title={t('adminUserProfile.teacherWorkload')}
            extra={
              <Button
                size="small"
                type="primary"
                onClick={() => onOpenWorkflow("teacher-workload", user.id)}
              >
                {t('common.edit')}
              </Button>
            }
          >
            {teacherAssignments.length ? (
              <Space direction="vertical" size="small" style={{ width: "100%" }}>
                {teacherAssignments.map((assignment) => (
                  <Descriptions key={assignment.id} size="small" column={1} bordered>
                    <Descriptions.Item label={t('form.subject')}>
                      {subjectMap.get(assignment.subject) || `${t('form.subject')} #${assignment.subject}`}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('form.groups')}>
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
              <div>{t('adminUserProfile.noTeacherWorkload')}</div>
            )}
          </Card>
        ) : null}

        <Card
          size="small"
          title={t('adminUserProfile.passportData')}
          extra={
            <Space>
              <Button size="small" onClick={onOpenPassportEditor}>
                {passport ? t('common.edit') : t('adminUserProfile.create')}
              </Button>
              {passport ? (
                <Popconfirm
                  title={t('adminUserProfile.confirmDeletePassport')}
                  onConfirm={onDeletePassport}
                >
                  <Button size="small" danger>
                    {t('common.delete')}
                  </Button>
                </Popconfirm>
              ) : null}
            </Space>
          }
        >
          {passport ? (
            <Descriptions size="small" column={1} bordered>
              <Descriptions.Item label={t('adminPassport.series')}>{passport.passport_series}</Descriptions.Item>
              <Descriptions.Item label={t('adminPassport.number')}>{passport.passport_number}</Descriptions.Item>
              <Descriptions.Item label={t('adminPassport.birthDate')}>
                {passport.birth_date || "-"}
              </Descriptions.Item>
              <Descriptions.Item label={t('adminPassport.ocrFullname')}>
                {passport.extracted_fullname || "-"}
              </Descriptions.Item>
              <Descriptions.Item label={t('adminPassport.frontSide')}>
                {passport.front_image ? (
                  <a href={passport.front_image} target="_blank" rel="noreferrer">
                    {t('common.view')}
                  </a>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t('adminPassport.backSide')}>
                {passport.back_image ? (
                  <a href={passport.back_image} target="_blank" rel="noreferrer">
                    {t('common.view')}
                  </a>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
              <Descriptions.Item label={t('adminPassport.selfie')}>
                {passport.selfie_image ? (
                  <a href={passport.selfie_image} target="_blank" rel="noreferrer">
                    {t('common.view')}
                  </a>
                ) : (
                  "-"
                )}
              </Descriptions.Item>
            </Descriptions>
          ) : (
            <div>{t('adminUserProfile.noPassportData')}</div>
          )}
        </Card>
      </Space>
    ) : null}
  </Drawer>
  );
};

export default AdminUserProfileDrawer;
