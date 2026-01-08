import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, Row, Col, Form, Input, Button, List, message, Empty, Select, Popconfirm, Modal, Tabs } from "antd";
import { useState } from "react";
import {
  fetchFaculties,
  fetchDepartments,
  fetchCampuses,
  createCampus,
  deleteCampus,
  updateCampus,
  createFaculty,
  createDepartment,
  deleteFaculty,
  deleteDepartment,
  fetchDegrees,
  createDegree,
  deleteDegree,
  fetchStudyModes,
  createStudyMode,
  deleteStudyMode,
  updateFaculty,
  updateDepartment,
  updateDegree,
  updateStudyMode,
} from "../../api/admin";

const UniversityPage = () => {
  const qc = useQueryClient();
  const { data: faculties } = useQuery({ queryKey: ["admin-faculties"], queryFn: fetchFaculties });
  const { data: departments } = useQuery({ queryKey: ["admin-departments"], queryFn: fetchDepartments });
  const { data: degrees } = useQuery({ queryKey: ["admin-degrees"], queryFn: fetchDegrees });
  const { data: studyModes } = useQuery({ queryKey: ["admin-study-modes"], queryFn: fetchStudyModes });
  const { data: campuses } = useQuery({ queryKey: ["admin-campuses"], queryFn: fetchCampuses });

  const facultyMap = new Map((faculties || []).map((f) => [f.id, f.name]));

  const [editCampus, setEditCampus] = useState<any>(null);
  const [editFaculty, setEditFaculty] = useState<any>(null);
  const [editDepartment, setEditDepartment] = useState<any>(null);
  const [editDegree, setEditDegree] = useState<any>(null);
  const [editStudyMode, setEditStudyMode] = useState<any>(null);
  const [editForm] = Form.useForm();
  const [editLoading, setEditLoading] = useState(false);

  const refetchAll = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin-campuses"] }),
      qc.invalidateQueries({ queryKey: ["admin-faculties"] }),
      qc.invalidateQueries({ queryKey: ["admin-departments"] }),
      qc.invalidateQueries({ queryKey: ["admin-degrees"] }),
      qc.invalidateQueries({ queryKey: ["admin-study-modes"] }),
    ]);
  };

  const mf = useMutation({
    mutationFn: (name: string) => createFaculty(name),
    onSuccess: async () => {
      message.success("Fakultet qo'shildi");
      await refetchAll();
    },
    onError: () => message.error("Fakultet qo'shishda xato"),
  });

  const mc = useMutation({
    mutationFn: (payload: { name: string; city?: string }) => createCampus(payload),
    onSuccess: async () => {
      message.success("Campus qo'shildi");
      await refetchAll();
    },
    onError: () => message.error("Campus qo'shishda xato"),
  });

  const md = useMutation({
    mutationFn: (payload: { name: string; faculty: number }) => createDepartment(payload),
    onSuccess: async () => {
      message.success("Kafedra qo'shildi");
      await refetchAll();
    },
    onError: () => message.error("Kafedra qo'shishda xato"),
  });

  const mdeg = useMutation({
    mutationFn: (name: string) => createDegree(name),
    onSuccess: async () => {
      message.success("Daraja qo'shildi");
      await refetchAll();
    },
    onError: () => message.error("Daraja qo'shishda xato"),
  });

  const msm = useMutation({
    mutationFn: (name: string) => createStudyMode(name),
    onSuccess: async () => {
      message.success("Ta'lim shakli qo'shildi");
      await refetchAll();
    },
    onError: () => message.error("Ta'lim shakli qo'shishda xato"),
  });

  return (
    <>
      <Card title="Universitet tuzilmasi" style={{ marginBottom: 16 }}>
        <Tabs
          destroyInactiveTabPane
          items={[
            {
              key: "campus",
              label: "Campuslar",
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={10}>
                    <Card title="Yangi campus">
                      <Form layout="vertical" onFinish={(vals) => mc.mutate({ name: vals.name, city: vals.city })}>
                        <Form.Item name="name" label="Nomi" rules={[{ required: true, message: "Nomi" }]}>
                          <Input placeholder="Campus nomi" />
                        </Form.Item>
                        <Form.Item name="city" label="Shahar">
                          <Input placeholder="Shahar" />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" loading={mc.isLoading}>
                          Qo'shish
                        </Button>
                      </Form>
                    </Card>
                  </Col>
                  <Col xs={24} md={14}>
                    <Card title="Campuslar ro'yxati">
                      <List
                        dataSource={campuses || []}
                        locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
                        renderItem={(c) => (
                          <List.Item
                            actions={[
                              <Button
                                type="link"
                                onClick={() => {
                                  setEditCampus(c);
                                  editForm.setFieldsValue({ name: c.name, city: c.city });
                                }}
                              >
                                Tahrirlash
                              </Button>,
                              <Popconfirm title="O'chirish?" onConfirm={() => deleteCampus(c.id).then(refetchAll)}>
                                <Button danger type="link">O'chirish</Button>
                              </Popconfirm>,
                            ]}
                          >
                            {c.name} {c.city ? `(${c.city})` : ""}
                          </List.Item>
                        )}
                      />
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: "faculty",
              label: "Fakultetlar",
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={10}>
                    <Card title="Yangi fakultet">
                      <Form layout="vertical" onFinish={(vals) => mf.mutate(vals.name)}>
                        <Form.Item name="name" label="Nomi" rules={[{ required: true, message: "Nomi" }]}>
                          <Input placeholder="Fakultet nomi" />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" loading={mf.isLoading}>
                          Qo'shish
                        </Button>
                      </Form>
                    </Card>
                  </Col>
                  <Col xs={24} md={14}>
                    <Card title="Fakultetlar ro'yxati">
                      <List
                        dataSource={faculties || []}
                        locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
                        renderItem={(f) => (
                          <List.Item
                            actions={[
                              <Button
                                type="link"
                                onClick={() => {
                                  setEditFaculty(f);
                                  editForm.setFieldsValue({ name: f.name });
                                }}
                              >
                                Tahrirlash
                              </Button>,
                              <Popconfirm title="O'chirish?" onConfirm={() => deleteFaculty(f.id).then(refetchAll)}>
                                <Button danger type="link">O'chirish</Button>
                              </Popconfirm>,
                            ]}
                          >
                            {f.name}
                          </List.Item>
                        )}
                      />
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: "department",
              label: "Kafedralar",
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={10}>
                    <Card title="Yangi kafedra">
                      <Form
                        layout="vertical"
                        onFinish={(vals) => md.mutate({ name: vals.name, faculty: vals.faculty })}
                      >
                        <Form.Item name="name" label="Nomi" rules={[{ required: true }]}>
                          <Input placeholder="Kafedra nomi" />
                        </Form.Item>
                        <Form.Item name="faculty" label="Fakultet" rules={[{ required: true }]}>
                          <Select
                            showSearch
                            placeholder="Fakultet tanlang"
                            options={(faculties || []).map((f) => ({ value: f.id, label: f.name }))}
                          />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" loading={md.isLoading}>
                          Qo'shish
                        </Button>
                      </Form>
                    </Card>
                  </Col>
                  <Col xs={24} md={14}>
                    <Card title="Kafedralar ro'yxati">
                      <List
                        dataSource={departments || []}
                        locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
                        renderItem={(d) => (
                          <List.Item
                            actions={[
                              <Button
                                type="link"
                                onClick={() => {
                                  setEditDepartment(d);
                                  editForm.setFieldsValue({ name: d.name, faculty: d.faculty });
                                }}
                              >
                                Tahrirlash
                              </Button>,
                              <Popconfirm title="O'chirish?" onConfirm={() => deleteDepartment(d.id).then(refetchAll)}>
                                <Button danger type="link">O'chirish</Button>
                              </Popconfirm>,
                            ]}
                          >
                            {d.name} {facultyMap.get(d.faculty) ? `(${facultyMap.get(d.faculty)})` : ""}
                          </List.Item>
                        )}
                      />
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: "degree",
              label: "Darajalar",
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={10}>
                    <Card title="Yangi daraja">
                      <Form layout="vertical" onFinish={(vals) => mdeg.mutate(vals.name)}>
                        <Form.Item name="name" label="Nomi" rules={[{ required: true, message: "Nomi" }]}>
                          <Input placeholder="Daraja nomi" />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" loading={mdeg.isLoading}>
                          Qo'shish
                        </Button>
                      </Form>
                    </Card>
                  </Col>
                  <Col xs={24} md={14}>
                    <Card title="Darajalar ro'yxati">
                      <List
                        dataSource={degrees || []}
                        locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
                        renderItem={(d) => (
                          <List.Item
                            actions={[
                              <Button
                                type="link"
                                onClick={() => {
                                  setEditDegree(d);
                                  editForm.setFieldsValue({ name: d.name });
                                }}
                              >
                                Tahrirlash
                              </Button>,
                              <Popconfirm title="O'chirish?" onConfirm={() => deleteDegree(d.id).then(refetchAll)}>
                                <Button danger type="link">O'chirish</Button>
                              </Popconfirm>,
                            ]}
                          >
                            {d.name}
                          </List.Item>
                        )}
                      />
                    </Card>
                  </Col>
                </Row>
              ),
            },
            {
              key: "study-mode",
              label: "Ta'lim shakli",
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={10}>
                    <Card title="Yangi ta'lim shakli">
                      <Form layout="vertical" onFinish={(vals) => msm.mutate(vals.name)}>
                        <Form.Item name="name" label="Nomi" rules={[{ required: true, message: "Nomi" }]}>
                          <Input placeholder="Ta'lim shakli" />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" loading={msm.isLoading}>
                          Qo'shish
                        </Button>
                      </Form>
                    </Card>
                  </Col>
                  <Col xs={24} md={14}>
                    <Card title="Ta'lim shakllari ro'yxati">
                      <List
                        dataSource={studyModes || []}
                        locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
                        renderItem={(s) => (
                          <List.Item
                            actions={[
                              <Button
                                type="link"
                                onClick={() => {
                                  setEditStudyMode(s);
                                  editForm.setFieldsValue({ name: s.name });
                                }}
                              >
                                Tahrirlash
                              </Button>,
                              <Popconfirm title="O'chirish?" onConfirm={() => deleteStudyMode(s.id).then(refetchAll)}>
                                <Button danger type="link">O'chirish</Button>
                              </Popconfirm>,
                            ]}
                          >
                            {s.name}
                          </List.Item>
                        )}
                      />
                    </Card>
                  </Col>
                </Row>
              ),
            },
          ]}
        />
      </Card>

      {/* Edit modal (shared form) */}
      <Modal
        title="Tahrirlash"
        open={!!editCampus || !!editFaculty || !!editDepartment || !!editDegree || !!editStudyMode}
        onCancel={() => {
          setEditCampus(null);
          setEditFaculty(null);
          setEditDepartment(null);
          setEditDegree(null);
          setEditStudyMode(null);
        }}
        onOk={async () => {
          setEditLoading(true);
          try {
            const vals = await editForm.validateFields();
            if (editCampus) await updateCampus(editCampus.id, vals);
            if (editFaculty) await updateFaculty(editFaculty.id, vals);
            if (editDepartment) await updateDepartment(editDepartment.id, vals);
            if (editDegree) await updateDegree(editDegree.id, vals);
            if (editStudyMode) await updateStudyMode(editStudyMode.id, vals);
            message.success("Yangilandi");
            await refetchAll();
            setEditCampus(null);
            setEditFaculty(null);
            setEditDepartment(null);
            setEditDegree(null);
            setEditStudyMode(null);
        } catch (err: any) {
          if (!err?.errorFields) message.error("Xatolik");
        } finally {
          setEditLoading(false);
        }
      }}
      confirmLoading={editLoading}
    >
      <Form layout="vertical" form={editForm}>
        {(editCampus || editFaculty || editDegree || editStudyMode) && (
          <Form.Item name="name" label="Nomi" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
        )}
        {editCampus && (
          <Form.Item name="city" label="Shahar">
            <Input />
          </Form.Item>
        )}
        {editDepartment && (
          <>
            <Form.Item name="name" label="Nomi" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="faculty" label="Fakultet" rules={[{ required: true }]}>
              <Select
                showSearch
                options={(faculties || []).map((f) => ({ value: f.id, label: f.name }))}
              />
            </Form.Item>
          </>
        )}
      </Form>
      </Modal>
    </>
  );
};

export default UniversityPage;
