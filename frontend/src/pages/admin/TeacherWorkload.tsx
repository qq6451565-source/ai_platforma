import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  message,
} from "antd";
import { useLocation, useNavigate } from "react-router-dom";

import {
  AdminUser,
  TeacherSubject,
  assignTeacherWorkload,
  deleteTeacherSubject,
  fetchGroupsAdmin,
  fetchSubjectsAdmin,
  fetchTeacherSubjects,
  fetchUsers,
  updateTeacherSubject,
} from "../../api/admin";
import {
  buildAssignmentsByTeacher,
  buildGroupEntityMap,
  buildSubjectEntityMap,
  filterTeachersByWorkload,
  getTeacherWorkloadStats,
} from "./utils/adminRegistry";
import { clearRequestedUserIdSearch, getRequestedUserId } from "./utils/workflowRouting";

const TeacherWorkloadPage = () => {
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<AdminUser | null>(null);
  const [editingAssignment, setEditingAssignment] = useState<TeacherSubject | null>(null);
  const [form] = Form.useForm();

  const { data: teachers, isLoading } = useQuery({
    queryKey: ["admin-users", "teacher-workload"],
    queryFn: () => fetchUsers("teacher"),
  });
  const { data: teacherSubjects } = useQuery({
    queryKey: ["admin-teacher-subjects"],
    queryFn: fetchTeacherSubjects,
  });
  const { data: subjects } = useQuery({
    queryKey: ["admin-subjects"],
    queryFn: fetchSubjectsAdmin,
  });
  const { data: groups } = useQuery({
    queryKey: ["admin-groups"],
    queryFn: fetchGroupsAdmin,
  });

  const requestedUserId = useMemo(() => getRequestedUserId(location.search), [location.search]);

  const saveMutation = useMutation({
    mutationFn: ({
      userId,
      payload,
      assignmentId,
    }: {
      userId: number;
      payload: {
        subject_id?: number;
        group_ids?: number[];
        subject?: number;
        groups?: number[];
      };
      assignmentId?: number | null;
    }) => {
      if (assignmentId) {
        return updateTeacherSubject(assignmentId, {
          teacher: userId,
          subject: payload.subject,
          groups: payload.groups || [],
        });
      }
      return assignTeacherWorkload(userId, {
        subject_id: payload.subject_id as number,
        group_ids: payload.group_ids || [],
      });
    },
    onSuccess: async () => {
      message.success("Teacher workload saqlandi");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin-teacher-subjects"] }),
        qc.invalidateQueries({ queryKey: ["admin-users", "teacher-workload"] }),
      ]);
      setModalOpen(false);
      setEditingAssignment(null);
      form.resetFields();
    },
    onError: (error: any) => {
      const detail =
        error?.response?.data?.groups?.[0] ||
        error?.response?.data?.group_ids?.[0] ||
        error?.response?.data?.non_field_errors?.[0] ||
        error?.response?.data?.detail ||
        "Teacher workloadni saqlashda xato";
      message.error(detail);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTeacherSubject(id),
    onSuccess: async () => {
      message.success("Biriktirish o'chirildi");
      await qc.invalidateQueries({ queryKey: ["admin-teacher-subjects"] });
    },
    onError: () => message.error("Biriktirishni o'chirishda xato"),
  });

  const subjectMap = useMemo(() => buildSubjectEntityMap(subjects || []), [subjects]);
  const groupMap = useMemo(() => buildGroupEntityMap(groups || []), [groups]);
  const assignmentsByTeacher = useMemo(
    () => buildAssignmentsByTeacher(teacherSubjects || []),
    [teacherSubjects],
  );

  const filteredTeachers = useMemo(
    () =>
      filterTeachersByWorkload({
        assignmentsByTeacher,
        groupMap,
        search,
        subjectMap,
        teachers: teachers || [],
      }),
    [assignmentsByTeacher, groupMap, search, subjectMap, teachers],
  );

  const stats = useMemo(
    () => getTeacherWorkloadStats(teachers || [], assignmentsByTeacher, teacherSubjects || []),
    [assignmentsByTeacher, teacherSubjects, teachers],
  );

  const openDrawer = (teacher: AdminUser) => {
    setSelectedTeacher(teacher);
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (!requestedUserId || !teachers?.length || drawerOpen) return;
    const matchedTeacher = teachers.find((teacher) => teacher.id === requestedUserId);
    if (matchedTeacher) {
      openDrawer(matchedTeacher);
      return;
    }
    navigate(
      { pathname: location.pathname, search: clearRequestedUserIdSearch(location.search) },
      { replace: true },
    );
  }, [drawerOpen, location.pathname, location.search, navigate, requestedUserId, teachers]);

  const openCreateModal = (teacher: AdminUser) => {
    setSelectedTeacher(teacher);
    setEditingAssignment(null);
    form.resetFields();
    setModalOpen(true);
  };

  const openEditModal = (teacher: AdminUser, assignment: TeacherSubject) => {
    setSelectedTeacher(teacher);
    setEditingAssignment(assignment);
    form.setFieldsValue({
      subject: assignment.subject,
      groups: assignment.groups || [],
      subject_id: assignment.subject,
      group_ids: assignment.groups || [],
    });
    setModalOpen(true);
  };

  const selectedSubjectId = Form.useWatch(editingAssignment ? "subject" : "subject_id", form);
  const availableGroups = useMemo(() => {
    if (!selectedSubjectId) return groups || [];
    const subject = subjectMap.get(selectedSubjectId);
    if (!subject) return groups || [];
    return (groups || []).filter((group) => subject.directions.includes(group.direction || 0));
  }, [groups, selectedSubjectId, subjectMap]);

  const columns = [
    {
      title: "O'qituvchi",
      key: "teacher",
      render: (_: unknown, teacher: AdminUser) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 600 }}>
            {`${teacher.first_name || ""} ${teacher.last_name || ""}`.trim() || teacher.username}
          </span>
          <span style={{ color: "#64748b" }}>{teacher.username}</span>
        </Space>
      ),
    },
    {
      title: "Workload",
      key: "workload",
      render: (_: unknown, teacher: AdminUser) => {
        const items = assignmentsByTeacher.get(teacher.id) || [];
        if (!items.length) {
          return <Tag color="gold">Fan biriktirilmagan</Tag>;
        }
        return (
          <Space wrap>
            {items.map((item) => (
              <Tag key={item.id} color="blue">
                {subjectMap.get(item.subject)?.name || `Fan #${item.subject}`}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: "Amal",
      key: "actions",
      render: (_: unknown, teacher: AdminUser) => (
        <Space>
          <Button size="small" onClick={() => openDrawer(teacher)}>
            Ko'rish
          </Button>
          <Button size="small" type="primary" onClick={() => openCreateModal(teacher)}>
            Fan biriktirish
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card title="Teacher Workload">
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Space size="large" wrap>
          <Statistic title="O'qituvchilar" value={stats.total} />
          <Statistic title="Workload bor" value={stats.withWorkload} />
          <Statistic title="Workload yo'q" value={stats.withoutWorkload} />
          <Statistic title="Jami mapping" value={stats.mappings} />
        </Space>

        <Input
          placeholder="O'qituvchi yoki fan bo'yicha qidirish"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ maxWidth: 320 }}
        />

        {filteredTeachers.length ? (
          <Table
            rowKey="id"
            loading={isLoading}
            columns={columns}
            dataSource={filteredTeachers}
            pagination={{ pageSize: 10 }}
          />
        ) : (
          <Empty description="O'qituvchilar topilmadi" />
        )}
      </Space>

      <Drawer
        title="Teacher Workload"
        open={drawerOpen}
        width={520}
        onClose={() => {
          navigate(
            { pathname: location.pathname, search: clearRequestedUserIdSearch(location.search) },
            { replace: true },
          );
          setDrawerOpen(false);
          setSelectedTeacher(null);
        }}
        extra={
          selectedTeacher ? (
            <Button type="primary" onClick={() => openCreateModal(selectedTeacher)}>
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
              dataSource={assignmentsByTeacher.get(selectedTeacher.id) || []}
              locale={{ emptyText: <Empty description="Workload biriktirilmagan" /> }}
              renderItem={(assignment) => (
                <List.Item
                  actions={[
                    <Button size="small" onClick={() => openEditModal(selectedTeacher, assignment)}>
                      Tahrirlash
                    </Button>,
                    <Popconfirm
                      title="Biriktirishni o'chirishni tasdiqlaysizmi?"
                      onConfirm={() => deleteMutation.mutate(assignment.id)}
                    >
                      <Button size="small" danger loading={deleteMutation.isPending}>
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

      <Modal
        title={editingAssignment ? "Workloadni tahrirlash" : "Teacher Workload yaratish"}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingAssignment(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={saveMutation.isPending}
        destroyOnClose
      >
        {selectedTeacher ? (
          <Form
            layout="vertical"
            form={form}
            onFinish={(values) => {
              if (editingAssignment) {
                saveMutation.mutate({
                  userId: selectedTeacher.id,
                  assignmentId: editingAssignment.id,
                  payload: values,
                });
                return;
              }
              saveMutation.mutate({
                userId: selectedTeacher.id,
                payload: values,
              });
            }}
          >
            <Form.Item label="O'qituvchi">
              <Input
                disabled
                value={`${selectedTeacher.first_name || ""} ${selectedTeacher.last_name || ""}`.trim() || selectedTeacher.username}
              />
            </Form.Item>
            {editingAssignment ? (
              <>
                <Form.Item name="subject" label="Fan" rules={[{ required: true }]}>
                  <Select
                    showSearch
                    options={(subjects || []).map((subject) => ({
                      value: subject.id,
                      label: subject.name,
                    }))}
                  />
                </Form.Item>
                <Form.Item name="groups" label="Guruhlar">
                  <Select
                    mode="multiple"
                    options={availableGroups.map((group) => ({
                      value: group.id,
                      label: group.name,
                    }))}
                  />
                </Form.Item>
              </>
            ) : (
              <>
                <Form.Item name="subject_id" label="Fan" rules={[{ required: true }]}>
                  <Select
                    showSearch
                    options={(subjects || []).map((subject) => ({
                      value: subject.id,
                      label: subject.name,
                    }))}
                  />
                </Form.Item>
                <Form.Item name="group_ids" label="Guruhlar">
                  <Select
                    mode="multiple"
                    options={availableGroups.map((group) => ({
                      value: group.id,
                      label: group.name,
                    }))}
                  />
                </Form.Item>
              </>
            )}
          </Form>
        ) : null}
      </Modal>
    </Card>
  );
};

export default TeacherWorkloadPage;
