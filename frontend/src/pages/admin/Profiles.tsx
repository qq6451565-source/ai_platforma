import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, Form, Select, Input, InputNumber, Button, List, Empty, Popconfirm, Modal, Tabs, message } from "antd";
import {
  fetchStudentProfiles,
  createStudentProfile,
  updateStudentProfile,
  deleteStudentProfile,
  fetchTeacherProfiles,
  createTeacherProfile,
  updateTeacherProfile,
  deleteTeacherProfile,
  fetchDirections,
  fetchGroupsAdmin,
  fetchDepartments,
  fetchUsers,
} from "../../api/admin";

const AdminProfilesPage = () => {
  const qc = useQueryClient();
  const { data: studentProfiles } = useQuery({ queryKey: ["admin-student-profiles"], queryFn: fetchStudentProfiles });
  const { data: teacherProfiles } = useQuery({ queryKey: ["admin-teacher-profiles"], queryFn: fetchTeacherProfiles });
  const { data: directions } = useQuery({ queryKey: ["admin-directions"], queryFn: fetchDirections });
  const { data: groups } = useQuery({ queryKey: ["admin-groups"], queryFn: fetchGroupsAdmin });
  const { data: departments } = useQuery({ queryKey: ["admin-departments"], queryFn: fetchDepartments });
  const { data: students } = useQuery({ queryKey: ["admin-students"], queryFn: () => fetchUsers("student") });
  const { data: teachers } = useQuery({ queryKey: ["admin-teachers"], queryFn: () => fetchUsers("teacher") });

  const [editStudent, setEditStudent] = useState<any>(null);
  const [editTeacher, setEditTeacher] = useState<any>(null);
  const [studentForm] = Form.useForm();
  const [teacherForm] = Form.useForm();
  const [loadingStudent, setLoadingStudent] = useState(false);
  const [loadingTeacher, setLoadingTeacher] = useState(false);

  const directionMap = new Map((directions || []).map((d) => [d.id, d.name]));
  const groupMap = new Map((groups || []).map((g) => [g.id, g.name]));
  const departmentMap = new Map((departments || []).map((d) => [d.id, d.name]));
  const studentMap = new Map((students || []).map((s) => [s.id, `${s.first_name} ${s.last_name}`.trim() || s.username]));
  const teacherMap = new Map((teachers || []).map((t) => [t.id, `${t.first_name} ${t.last_name}`.trim() || t.username]));

  const createStudentMut = useMutation({
    mutationFn: (vals: any) => createStudentProfile(vals),
    onSuccess: async () => {
      message.success("Student profili qo'shildi");
      await qc.invalidateQueries({ queryKey: ["admin-student-profiles"] });
    },
    onError: () => message.error("Xatolik"),
  });

  const createTeacherMut = useMutation({
    mutationFn: (vals: any) => createTeacherProfile(vals),
    onSuccess: async () => {
      message.success("O'qituvchi profili qo'shildi");
      await qc.invalidateQueries({ queryKey: ["admin-teacher-profiles"] });
    },
    onError: () => message.error("Xatolik"),
  });

  return (
    <Card title="Profil boshqaruvi" style={{ marginBottom: 16 }}>
      <Tabs
        items={[
          {
            key: "student",
            label: "Talaba profillari",
            children: (
              <>
                <Form layout="vertical" onFinish={createStudentMut.mutate} style={{ marginBottom: 12 }}>
                  <Form.Item name="user" label="Talaba" rules={[{ required: true }]}>
                    <Select
                      showSearch
                      options={(students || []).map((s) => ({
                        value: s.id,
                        label: `${s.first_name} ${s.last_name}`.trim() || s.username,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item name="direction" label="Yo'nalish" rules={[{ required: true }]}>
                    <Select
                      showSearch
                      options={(directions || []).map((d) => ({ value: d.id, label: d.name }))}
                    />
                  </Form.Item>
                  <Form.Item name="group" label="Guruh">
                    <Select
                      showSearch
                      options={(groups || []).map((g) => ({ value: g.id, label: g.name }))}
                    />
                  </Form.Item>
                  <Form.Item name="admission_year" label="Qabul yili" rules={[{ required: true }]}>
                    <InputNumber min={2000} max={2100} style={{ width: "100%" }} />
                  </Form.Item>
                  <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                    <Select
                      options={[
                        { value: "active", label: "Active" },
                        { value: "academic_leave", label: "Academic leave" },
                        { value: "expelled", label: "Expelled" },
                        { value: "graduated", label: "Graduated" },
                      ]}
                    />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={createStudentMut.isLoading}>
                    Qo'shish
                  </Button>
                </Form>

                <List
                  dataSource={studentProfiles || []}
                  locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
                  renderItem={(p) => (
                    <List.Item
                      actions={[
                        <Button
                          type="link"
                          onClick={() => {
                            setEditStudent(p);
                            studentForm.setFieldsValue({
                              user: p.user,
                              direction: p.direction,
                              group: p.group,
                              admission_year: p.admission_year,
                              status: p.status,
                            });
                          }}
                        >
                          Tahrirlash
                        </Button>,
                        <Popconfirm title="O'chirish?" onConfirm={() => deleteStudentProfile(p.id).then(() => qc.invalidateQueries({ queryKey: ["admin-student-profiles"] }))}>
                          <Button danger type="link">O'chirish</Button>
                        </Popconfirm>,
                      ]}
                    >
                      {studentMap.get(p.user) || `Student #${p.user}`} | {directionMap.get(p.direction) || `Yo'nalish #${p.direction}`}{" "}
                      {p.group ? `| ${groupMap.get(p.group) || `Guruh #${p.group}`}` : ""} | {p.status}
                    </List.Item>
                  )}
                />
              </>
            ),
          },
          {
            key: "teacher",
            label: "O'qituvchi profillari",
            children: (
              <>
                <Form layout="vertical" onFinish={createTeacherMut.mutate} style={{ marginBottom: 12 }}>
                  <Form.Item name="user" label="O'qituvchi" rules={[{ required: true }]}>
                    <Select
                      showSearch
                      options={(teachers || []).map((t) => ({
                        value: t.id,
                        label: `${t.first_name} ${t.last_name}`.trim() || t.username,
                      }))}
                    />
                  </Form.Item>
                  <Form.Item name="department" label="Kafedra" rules={[{ required: true }]}>
                    <Select
                      showSearch
                      options={(departments || []).map((d) => ({ value: d.id, label: d.name }))}
                    />
                  </Form.Item>
                  <Form.Item name="position" label="Lavozim">
                    <Input />
                  </Form.Item>
                  <Form.Item name="workload" label="Stavka">
                    <InputNumber min={0} max={1000} style={{ width: "100%" }} />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={createTeacherMut.isLoading}>
                    Qo'shish
                  </Button>
                </Form>

                <List
                  dataSource={teacherProfiles || []}
                  locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
                  renderItem={(p) => (
                    <List.Item
                      actions={[
                        <Button
                          type="link"
                          onClick={() => {
                            setEditTeacher(p);
                            teacherForm.setFieldsValue({
                              user: p.user,
                              department: p.department,
                              position: p.position,
                              workload: p.workload,
                            });
                          }}
                        >
                          Tahrirlash
                        </Button>,
                        <Popconfirm title="O'chirish?" onConfirm={() => deleteTeacherProfile(p.id).then(() => qc.invalidateQueries({ queryKey: ["admin-teacher-profiles"] }))}>
                          <Button danger type="link">O'chirish</Button>
                        </Popconfirm>,
                      ]}
                    >
                      {teacherMap.get(p.user) || `Teacher #${p.user}`} | {departmentMap.get(p.department) || `Kafedra #${p.department}`}{" "}
                      {p.position ? `| ${p.position}` : ""} {p.workload ? `| ${p.workload}` : ""}
                    </List.Item>
                  )}
                />
              </>
            ),
          },
        ]}
      />

      <Modal
        title="Talaba profilini tahrirlash"
        open={!!editStudent}
        onCancel={() => setEditStudent(null)}
        onOk={async () => {
          if (!editStudent) return;
          setLoadingStudent(true);
          try {
            const vals = await studentForm.validateFields();
            await updateStudentProfile(editStudent.id, vals);
            message.success("Yangilandi");
            setEditStudent(null);
            await qc.invalidateQueries({ queryKey: ["admin-student-profiles"] });
          } catch (err: any) {
            if (!err?.errorFields) message.error("Xatolik");
          } finally {
            setLoadingStudent(false);
          }
        }}
        confirmLoading={loadingStudent}
      >
        <Form layout="vertical" form={studentForm}>
          <Form.Item name="user" label="Talaba" rules={[{ required: true }]}>
            <Select
              options={(students || []).map((s) => ({
                value: s.id,
                label: `${s.first_name} ${s.last_name}`.trim() || s.username,
              }))}
            />
          </Form.Item>
          <Form.Item name="direction" label="Yo'nalish" rules={[{ required: true }]}>
            <Select options={(directions || []).map((d) => ({ value: d.id, label: d.name }))} />
          </Form.Item>
          <Form.Item name="group" label="Guruh">
            <Select options={(groups || []).map((g) => ({ value: g.id, label: g.name }))} />
          </Form.Item>
          <Form.Item name="admission_year" label="Qabul yili" rules={[{ required: true }]}>
            <InputNumber min={2000} max={2100} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "active", label: "Active" },
                { value: "academic_leave", label: "Academic leave" },
                { value: "expelled", label: "Expelled" },
                { value: "graduated", label: "Graduated" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="O'qituvchi profilini tahrirlash"
        open={!!editTeacher}
        onCancel={() => setEditTeacher(null)}
        onOk={async () => {
          if (!editTeacher) return;
          setLoadingTeacher(true);
          try {
            const vals = await teacherForm.validateFields();
            await updateTeacherProfile(editTeacher.id, vals);
            message.success("Yangilandi");
            setEditTeacher(null);
            await qc.invalidateQueries({ queryKey: ["admin-teacher-profiles"] });
          } catch (err: any) {
            if (!err?.errorFields) message.error("Xatolik");
          } finally {
            setLoadingTeacher(false);
          }
        }}
        confirmLoading={loadingTeacher}
      >
        <Form layout="vertical" form={teacherForm}>
          <Form.Item name="user" label="O'qituvchi" rules={[{ required: true }]}>
            <Select
              options={(teachers || []).map((t) => ({
                value: t.id,
                label: `${t.first_name} ${t.last_name}`.trim() || t.username,
              }))}
            />
          </Form.Item>
          <Form.Item name="department" label="Kafedra" rules={[{ required: true }]}>
            <Select options={(departments || []).map((d) => ({ value: d.id, label: d.name }))} />
          </Form.Item>
          <Form.Item name="position" label="Lavozim">
            <Input />
          </Form.Item>
          <Form.Item name="workload" label="Stavka">
            <InputNumber min={0} max={1000} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default AdminProfilesPage;
