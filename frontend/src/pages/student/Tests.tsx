import { Button, List, Typography, Skeleton, Modal, Radio, message } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { fetchTests } from "../../api/tests";
import { startTest, answerTest, finishTest, StartTestResponse } from "../../api/studentTests";

const StudentTests = () => {
  const { data: tests, isLoading } = useQuery({
    queryKey: ["tests"],
    queryFn: fetchTests,
  });

  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<StartTestResponse | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [studentTestId, setStudentTestId] = useState<number | null>(null);
  const [sending, setSending] = useState(false);

  const loadNext = async (resp: StartTestResponse) => {
    setCurrent(resp);
    setSelectedOption(null);
  };

  const handleStart = async (testId: number) => {
    try {
      const resp = await startTest(testId);
      setStudentTestId(resp.student_test_id);
      await loadNext(resp);
      setOpen(true);
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Boshlashda xato");
    }
  };

  const handleAnswer = async () => {
    if (!studentTestId || !current?.question || !selectedOption) return;
    setSending(true);
    try {
      const resp = await answerTest({
        student_test_id: studentTestId,
        question_id: current.question.id,
        option_id: selectedOption,
      });
      if (resp.detail && resp.detail.includes("Savollar tugadi")) {
        message.info("Savollar tugadi, finish bosing");
        setCurrent({ ...resp, question: undefined });
      } else {
        await loadNext(resp);
      }
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Javob yuborishda xato");
    } finally {
      setSending(false);
    }
  };

  const handleFinish = async () => {
    if (!studentTestId) return;
    setSending(true);
    try {
      const resp = await finishTest(studentTestId);
      message.success(`Test yakunlandi: ${resp.score_percent ?? "-"}%`);
      setOpen(false);
      setCurrent(null);
      setStudentTestId(null);
    } catch (err: any) {
      message.error(err?.response?.data?.detail || "Finish xato");
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4}>Test / Imtihonlar</Typography.Title>
      {isLoading ? (
        <Skeleton active />
      ) : (
        <List
          dataSource={tests || []}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button
                  type="link"
                  key="start"
                  disabled={!item.is_active}
                  onClick={() => handleStart(item.id)}
                >
                  Boshlash
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={item.title}
                description={`Fan: ${item.subject_name || item.subject || "-"} | Guruh: ${
                  item.group_name || item.group || "-"
                } | Pass: ${item.pass_score ?? "-"} | Vaqt: ${item.time_limit_minutes ?? "-"} min`}
              />
              <div>{item.is_active ? "Active" : "Inactive"}</div>
            </List.Item>
          )}
        />
      )}

      <Modal
        title="Test"
        open={open}
        onCancel={() => setOpen(false)}
        footer={[
          <Button key="finish" onClick={handleFinish} disabled={!studentTestId} loading={sending}>
            Yakunlash
          </Button>,
          <Button key="answer" type="primary" onClick={handleAnswer} disabled={!selectedOption} loading={sending}>
            Javob yuborish
          </Button>,
        ]}
      >
        {current?.question ? (
          <>
            <Typography.Title level={5}>{current.question.text}</Typography.Title>
            <Radio.Group
              onChange={(e) => setSelectedOption(e.target.value)}
              value={selectedOption || undefined}
              style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}
            >
              {current.question.options.map((opt) => (
                <Radio key={opt.id} value={opt.id}>
                  {opt.text}
                </Radio>
              ))}
            </Radio.Group>
          </>
        ) : (
          <Typography.Text>Savollar tugagan, yakunlash tugmasini bosing.</Typography.Text>
        )}
      </Modal>
    </div>
  );
};

export default StudentTests;
