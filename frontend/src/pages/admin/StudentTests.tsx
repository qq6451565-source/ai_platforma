import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Tabs, List, Empty, Popconfirm, Button, message } from "antd";
import { deleteStudentTest, deleteStudentAnswer } from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const AdminStudentTestsPage = () => {
  const qc = useQueryClient();
  const { data: tests, isLoading: testsLoading } = useQuery(adminQueryOptions.studentTests());
  const { data: answers, isLoading: answersLoading } = useQuery(adminQueryOptions.studentAnswers());

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
                              qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.studentTests });
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
                              qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.studentAnswers });
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
