import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useMe } from "../../hooks/useMe";
// @ts-ignore JS module requested for this feature
import LiveRoom from "../../components/live-room/LiveRoom";

export default function RoomPage() {
  const { lessonId } = useParams<{ lessonId: string }>();
  const { data: me } = useMe();

  const currentUser = useMemo(() => {
    const isTeacher = me?.role === "teacher" || me?.role === "admin";

    return {
      id: String(me?.id || "guest-user"),
      name:
        [me?.first_name, me?.last_name].filter(Boolean).join(" ") ||
        me?.username ||
        (isTeacher ? "O'qituvchi" : "Talaba"),
      group: me?.group ? `Group-${me.group}` : isTeacher ? "Mentor" : "SE-Group",
      role: isTeacher ? "teacher" : "student",
    };
  }, [me?.first_name, me?.group, me?.id, me?.last_name, me?.role, me?.username]);

  return <LiveRoom lessonId={Number(lessonId || 0)} currentUser={currentUser} />;
}
