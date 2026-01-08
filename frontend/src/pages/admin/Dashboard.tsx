import { Button, Card, Col, Row, Skeleton, Space, Statistic } from "antd";
import { useQueries } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  fetchUsers,
  fetchGroupsAdmin,
  fetchFaculties,
  fetchDepartments,
  fetchDirections,
  fetchAnnouncementsAdmin,
  fetchSubjectsAdmin,
  fetchLessonsAdmin,
} from "../../api/admin";
import { fetchMaterials } from "../../api/materials";
import { fetchAssignments } from "../../api/assignments";
import { fetchTests } from "../../api/tests";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const results = useQueries({
    queries: [
      { queryKey: ["admin-users"], queryFn: fetchUsers },
      { queryKey: ["admin-groups"], queryFn: fetchGroupsAdmin },
      { queryKey: ["admin-faculties"], queryFn: fetchFaculties },
      { queryKey: ["admin-departments"], queryFn: fetchDepartments },
      { queryKey: ["admin-directions"], queryFn: fetchDirections },
      { queryKey: ["admin-announcements"], queryFn: fetchAnnouncementsAdmin },
      { queryKey: ["admin-subjects"], queryFn: fetchSubjectsAdmin },
      { queryKey: ["admin-lessons"], queryFn: fetchLessonsAdmin },
      { queryKey: ["admin-materials"], queryFn: fetchMaterials },
      { queryKey: ["admin-assignments"], queryFn: fetchAssignments },
      { queryKey: ["admin-tests"], queryFn: fetchTests },
    ],
  });

  const loading = results.some((r) => r.isLoading);
  const [
    users,
    groups,
    faculties,
    departments,
    directions,
    announcements,
    subjects,
    lessons,
    materials,
    assignments,
    tests,
  ] = results.map((r) => r.data || []);

  return (
    <div style={{ padding: 24 }}>
      {loading ? (
        <Skeleton active />
      ) : (
        <>
          <Card title="Tezkor amallar" style={{ marginBottom: 16 }}>
            <Space wrap>
              <Button onClick={() => navigate("/app/admin/enrollment?tab=windows")}>
                Ro'yxat oynasi yaratish
              </Button>
              <Button onClick={() => navigate("/app/admin/university?section=groups")}>Guruh yaratish</Button>
              <Button onClick={() => navigate("/app/admin/learning?section=schedule")}>Jadval tuzish</Button>
              <Button onClick={() => navigate("/app/admin/assessment?section=tests&tab=tests")}>Test yaratish</Button>
              <Button onClick={() => navigate("/app/admin/assessment?section=exams")}>Imtihon yaratish</Button>
            </Space>
          </Card>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Jami foydalanuvchilar"
                  value={Array.isArray(users) ? users.length : 0}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Guruhlar"
                  value={Array.isArray(groups) ? groups.length : 0}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="E'lonlar"
                  value={Array.isArray(announcements) ? announcements.length : 0}
                />
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Fakultetlar"
                  value={Array.isArray(faculties) ? faculties.length : 0}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Kafedralar"
                  value={Array.isArray(departments) ? departments.length : 0}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Yo'nalishlar"
                  value={Array.isArray(directions) ? directions.length : 0}
                />
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Fanlar"
                  value={Array.isArray(subjects) ? subjects.length : 0}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Darslar"
                  value={Array.isArray(lessons) ? lessons.length : 0}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Materiallar"
                  value={Array.isArray(materials) ? materials.length : 0}
                />
              </Card>
            </Col>
          </Row>
          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Topshiriqlar"
                  value={Array.isArray(assignments) ? assignments.length : 0}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <Card>
                <Statistic
                  title="Testlar"
                  value={Array.isArray(tests) ? tests.length : 0}
                />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
