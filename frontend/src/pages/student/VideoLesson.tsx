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
import { toAbsoluteUrl } from "../../api/client";

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
    // Agar asosiy material file bo'sh bo'lsa yoki video bo'lmasa, resurslardan qidiramiz
    if (!videoUrl || !videoUrl.match(/\.(mp4|webm|mov|avi|m4v)$/i)) {
        if (material?.resources?.length) {
            const vidRes = material.resources.find(r =>
                r.resource_type === 'video' ||
                (r.file && r.file.match(/\.(mp4|webm|mov|avi|m4v)$/i))
            );
            if (vidRes?.file) {
                videoUrl = vidRes.file;
            }
        }
    }

    const absoluteVideoUrl = videoUrl ? toAbsoluteUrl(videoUrl) : null;

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

                {absoluteVideoUrl ? (
                    <div>
                        <video
                            ref={videoRef}
                            src={absoluteVideoUrl}
                            controls
                            onTimeUpdate={handleTimeUpdate}
                            onSeeking={handleSeeking}
                            onError={(e) => {
                                console.error("Video error:", e);
                                message.error("Video ijro etishda xatolik! Fayl formati brauzerga mos kelmasligi mumkin.");
                            }}
                            controlsList="nodownload noplaybackrate"
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

                        <div style={{ marginTop: 'var(--space-4)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1, marginRight: '16px' }}>
                                <Text strong>Darsni ko'zdan kechirish jarayoni (To'liq bal uchun kamida 90% ko'rish talab qilinadi)</Text>
                                <Progress percent={progress} status={completed ? "success" : "active"} />
                            </div>
                            <Button href={absoluteVideoUrl} download target="_blank" type="default" size="small">
                                Videoni yuklab olish
                            </Button>
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
