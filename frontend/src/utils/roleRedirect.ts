export const getDefaultRedirect = (role?: string, isPendingStudent?: boolean) => {
  if (role === "admin") return "/app/admin/dashboard";
  if (role === "teacher") return "/app/teacher/dashboard";
  if (role === "student" && isPendingStudent) return "/app/student/profile";
  return "/app/student/dashboard";
};
