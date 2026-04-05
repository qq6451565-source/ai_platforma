import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { Card, Tabs, List, Empty, Popconfirm, Button, message } from "antd";
import { deleteStudentTest, deleteStudentAnswer } from "../../api/admin";
import { adminQueryOptions } from "./utils/adminQueryOptions";
import { ADMIN_QUERY_KEYS } from "./utils/adminWorkflowMutations";

const AdminStudentTestsPage = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: tests, isLoading: testsLoading } = useQuery(adminQueryOptions.studentTests());
  const { data: answers, isLoading: answersLoading } = useQuery(adminQueryOptions.studentAnswers());

  return (
    <Card title={t('studentTests.title')} style={{ marginBottom: 'var(--space-4)' }}>
      <Tabs
        items={[
          {
            key: "tests",
            label: "Test natijalari",
            children: (
              <List
                loading={testsLoading}
                dataSource={tests || []}
                locale={{ emptyText: <Empty description={t('common.noData')} /> }}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Popconfirm
                        title={t('common.confirmDelete')}
                        onConfirm={() =>
                          deleteStudentTest(item.id)
                            .then(() => {
                              message.success(t('common.deleted'));
                              qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.studentTests });
                            })
                            .catch(() => message.error(t('common.error')))
                        }
                      >
                        <Button danger type="link">{t('common.delete')}</Button>
                      </Popconfirm>,
                    ]}
                  >
                    Student #{item.student} | Test #{item.test} | Score: {item.score_percent ?? 0} | Finished: {String(item.is_finished)}
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
                locale={{ emptyText: <Empty description={t('common.noData')} /> }}
                renderItem={(a) => (
                  <List.Item
                    actions={[
                      <Popconfirm
                        title={t('common.confirmDelete')}
                        onConfirm={() =>
                          deleteStudentAnswer(a.id)
                            .then(() => {
                              message.success(t('common.deleted'));
                              qc.invalidateQueries({ queryKey: ADMIN_QUERY_KEYS.studentAnswers });
                            })
                            .catch(() => message.error(t('common.error')))
                        }
                      >
                        <Button danger type="link">{t('common.delete')}</Button>
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
