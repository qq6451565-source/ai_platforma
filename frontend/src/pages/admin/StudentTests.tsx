import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Tabs, List, Empty, Popconfirm, Button, message } from "antd";
import { fetchStudentTests, fetchStudentAnswers, deleteStudentTest, deleteStudentAnswer } from "../../api/admin";

const AdminStudentTestsPage = () => {
  const qc = useQueryClient();
  const { data: tests, isLoading: testsLoading } = useQuery({
    queryKey: ["admin-student-tests"],
    queryFn: fetchStudentTests,
  });
  const { data: answers, isLoading: answersLoading } = useQuery({
    queryKey: ["admin-student-answers"],
    queryFn: fetchStudentAnswers,
  });

  return (
    <Card title="Student testlari" style={{ marginBottom: 16 }}>
      <Tabs
        items={[
          {
            key: "tests",
            label: "Test natijalari",
            children: (
              <List
                loading={testsLoading}
                dataSource={tests || []}
                locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
                renderItem={(t) => (
                  <List.Item
                    actions={[
                      <Popconfirm
                        title="O'chirish?"
                        onConfirm={() =>
                          deleteStudentTest(t.id)
                            .then(() => {
                              message.success("O'chirildi");
                              qc.invalidateQueries({ queryKey: ["admin-student-tests"] });
                            })
                            .catch(() => message.error("Xatolik"))
                        }
                      >
                        <Button danger type="link">O'chirish</Button>
                      </Popconfirm>,
                    ]}
                  >
                    Student #{t.student} | Test #{t.test} | Score: {t.score_percent ?? 0} | Finished: {String(t.is_finished)}
                  </List.Item>
                )}
              />
            ),
          },
          {
            key: "answers",
            label: "Javoblar",
            children: (
              <List
                loading={answersLoading}
                dataSource={answers || []}
                locale={{ emptyText: <Empty description="Ma'lumot yo'q" /> }}
                renderItem={(a) => (
                  <List.Item
                    actions={[
                      <Popconfirm
                        title="O'chirish?"
                        onConfirm={() =>
                          deleteStudentAnswer(a.id)
                            .then(() => {
                              message.success("O'chirildi");
                              qc.invalidateQueries({ queryKey: ["admin-student-answers"] });
                            })
                            .catch(() => message.error("Xatolik"))
                        }
                      >
                        <Button danger type="link">O'chirish</Button>
                      </Popconfirm>,
                    ]}
                  >
                    Test #{a.student_test} | Question #{a.question} | Option #{a.selected_option ?? "-"} | Correct: {String(a.is_correct)}
                  </List.Item>
                )}
              />
            ),
          },
        ]}
      />
    </Card>
  );
};

export default AdminStudentTestsPage;
