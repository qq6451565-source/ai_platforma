import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, Button, Typography, message, Spin, Progress } from "antd";
import { ArrowLeftOutlined } from "@ant-design/icons";
import { fetchLessonById } from "../../api/lessons";
import { fetchMaterialById } from "../../api/materials";
import { trackMaterialViewed, trackLessonOpen } from "../../api/attendance";
import { usePageTitle } from "../../hooks/usePageTitle";
import { useMe } from "../../hooks/useMe";

const { Title, Text } = Typography;

const StudentVideoLesson = () => {
    usePageTitle('Videodars');
    const { lessonId } = useParams();
    const navigate = useNavigate();
    const { data: user } = useMe();
    const videoRef = useRef<HTMLVideoElement>(null);

    const [maxTimeWatched, setMaxTimeWatched] = useState(0);
    const [completed, setCompleted] = useState(false);
    const [progress, setProgress] = useState(0);

    const { data: lesson, isLoading: lessonLoading } = useQuery({
        queryKey: ["lesson", lessonId],
        queryFn: () => fetchLessonById(Number(lessonId)),
        enabled: !!lessonId,
    });

    const { data: material, isLoading: materialLoading } = useQuery({
        queryKey: ["material", lesson?.video_material],
        queryFn: () => fetchMaterialById(Number(lesson?.video_material)),
        enabled: !!lesson?.video_material,
    });

    useEffect(() => {
        if (lesson?.id && user?.role === 'student') {
            trackLessonOpen(lesson.id).catch(() => { });
        }
    }, [lesson?.id, user?.role]);

    const handleTimeUpdate = () => {
        if (!videoRef.current) return;
        const currentTime = videoRef.current.currentTime;
        const duration = videoRef.current.duration;

        if (!videoRef.current.seeking && currentTime > maxTimeWatched) {
            setMaxTimeWatched(currentTime);
            const percent = Math.floor((currentTime / duration) * 100);
            setProgress(percent);

            // Talaba videoning 90% qismini ko'rgach ball beriladi
            if (percent >= 90 && !completed) {
                setCompleted(true);
                if (lessonId && user?.role === 'student') {
                    trackMaterialViewed(Number(lessonId)).then(() => {
                        message.success("Siz videoni yakunladingiz! Faollik balingiz (50 ball) hisoblandi.");
                    }).catch(() => { });
                }
            }
        }
    };

    const handleSeeking = () => {
        if (!videoRef.current) return;
        // Bloklash (g'irromlikni oldini olish)
        // Ruxsat: faqat ko'rilgan joygacha siljitish mumkin
        if (videoRef.current.currentTime > maxTimeWatched + 2) {
            videoRef.current.currentTime = maxTimeWatched;
            message.warning("Videoni oldinga o'tkazish taqiqlanadi!");
        }
    };

    if (lessonLoading || materialLoading) {
        return <div className="flex-center h-screen"><Spin size="large" /></div>;
    }

    // Materialdagi faylni qidiramiz
    let videoUrl = material?.file;
    if (!videoUrl && material?.resources?.length) {
        const vidRes = material.resources.find(r => r.resource_type === 'video' || (r.file && r.file.match(/\.(mp4|webm)$/)));
        if (vidRes?.file) {
            videoUrl = vidRes.file;
        }
    }

    return (
        <div className="page-shell page-container animate-fade-in">
            <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/app/student/schedule')}
                style={{ marginBottom: 'var(--space-4)' }}
            >
                Orqaga qaytish
            </Button>

            <Card>
                <Title level={4}>{lesson?.topic || "Videodars"}</Title>
                <div style={{ marginBottom: 'var(--space-4)' }}>
                    <Text type="secondary">{lesson?.subject_name} - {lesson?.group_name}</Text>
                </div>

                {videoUrl ? (
                    <div>
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            controls
                            onTimeUpdate={handleTimeUpdate}
                            onSeeking={handleSeeking}
                            controlsList="nodownload noplaybackrate" // try to disable some controls
                            disablePictureInPicture
                            style={{
                                width: "100%",
                                maxHeight: "70vh",
                                borderRadius: "8px",
                                background: "#000",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                outline: "none"
                            }}
                        />

                        <div style={{ marginTop: 'var(--space-4)' }}>
                            <Text strong>Darsni ko'zdan kechirish jarayoni (To'liq bal uchun kamida 90% ko'rish talab qilinadi)</Text>
                            <Progress percent={progress} status={completed ? "success" : "active"} />
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: "center", padding: "40px" }}>
                        <Text type="warning">Ushbu dars uchun video biriktirilmagan yoki noto'g'ri format!</Text>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default StudentVideoLesson;
