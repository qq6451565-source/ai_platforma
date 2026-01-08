export const getDefaultRedirect = (role?: string) => {
  if (role === "admin") return "/app/admin/dashboard";
  if (role === "teacher") return "/app/teacher/dashboard";
  return "/app/student/dashboard";
};
