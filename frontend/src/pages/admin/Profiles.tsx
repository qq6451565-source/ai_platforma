import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, Form, Select, InputNumber, Button, List, Empty, Popconfirm, Modal, message } from "antd";
import {
  createStudentProfile,
  updateStudentProfile,
  deleteStudentProfile,
} from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const AdminProfilesPage = () => {
  const qc = useQueryClient();
  const { data: studentProfiles } = useQuery(adminQueryOptions.studentProfiles());
  const { data: directions } = useQuery(adminQueryOptions.directions());
  const { data: groups } = useQuery(adminQueryOptions.groups());
  const { data: students } = useQuery(adminQueryOptions.students());

  const [editStudent, setEditStudent] = useState<any>(null);
  const [studentForm] = Form.useForm();
  const [loadingStudent, setLoadingStudent] = useState(false);

  const directionMap = new Map((directions || []).map((d) => [d.id, d.name]));
  const groupMap = new Map((groups || []).map((g) => [g.id, g.name]));
  const studentMap = new Map(
    (students || []).map((s) => [s.id, `${s.first_name} ${s.last_name}`.trim() || s.username])
  );

  const createStudentMut = useMutation({
    mutationFn: (vals: any) => createStudentProfile(vals),
    onSuccess: async () => {
      message.success("Talaba profili qo'shildi");
      await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.studentProfiles });
    },
    onError: () => message.error("Xatolik"),
  });

  return (
    <Card title="Talaba profillari" style={{ marginBottom: 'var(--space-4)' }}>
      <Form layout="vertical" onFinish={createStudentMut.mutate} style={{ marginBottom: 'var(--space-3)' }}>
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
          <Select showSearch options={(directions || []).map((d) => ({ value: d.id, label: d.name }))} />
        </Form.Item>
        <Form.Item name="group" label="Guruh">
          <Select showSearch options={(groups || []).map((g) => ({ value: g.id, label: g.name }))} />
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
        <Button type="primary" htmlType="submit" loading={createStudentMut.isPending}>
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
              <Popconfirm
                title="O'chirish?"
                onConfirm={() =>
                  deleteStudentProfile(p.id).then(() =>
                    qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.studentProfiles })
                  )
                }
              >
                <Button danger type="link">
                  O'chirish
                </Button>
              </Popconfirm>,
            ]}
          >
            {studentMap.get(p.user) || `Student #${p.user}`} |{" "}
            {p.direction ? directionMap.get(p.direction) || `Yo'nalish #${p.direction}` : "-"}{" "}
            {p.group ? `| ${groupMap.get(p.group) || `Guruh #${p.group}`}` : ""} | {p.status}
          </List.Item>
        )}
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
            await qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.studentProfiles });
          } catch (err: unknown) {
            if (!(typeof err === 'object' && err !== null && 'errorFields' in err)) message.error("Xatolik");
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
    </Card>
  );
};

export default AdminProfilesPage;
