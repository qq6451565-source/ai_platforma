import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

i18next
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    fallbackLng: "uz",
    resources: {
      uz: {
        translation: {
          nav: {
            student: "O'quvchi",
            dashboard: "Boshqaruv paneli",
            schedule: "Dars jadvali",
            materials: "O'quv materiallari",
            assignments: "Topshiriqlar",
            tests: "Testlar",
            grades: "Baholar",
            attendance: "Davomat",
            profile: "Profil",
            teacher: "O'qituvchi",
            lessons: "Darslar",
            submissions: "Topshirilgan ishlar",
            main: "Asosiy",
            academic: "Akademik",
            users: "Foydalanuvchilar",
            university: "Universitet",
            learning: "O'quv jarayoni",
            enrollment: "Qabul",
            system: "Tizim",
            aiSettings: "AI Sozlamalari",
          },
          roles: {
            admin: "Adminstrator",
            teacher: "O'qituvchi",
            student: "O'quvchi",
          },
        },
      },
      en: {
        translation: {
          nav: {
            student: "Student",
            dashboard: "Dashboard",
            schedule: "Schedule",
            materials: "Materials",
            assignments: "Assignments",
            tests: "Tests",
            grades: "Grades",
            attendance: "Attendance",
            profile: "Profile",
            teacher: "Teacher",
            lessons: "Lessons",
            submissions: "Submissions",
            main: "Main",
            academic: "Academic",
            users: "Users",
            university: "University",
            learning: "Learning Process",
            enrollment: "Enrollment",
            system: "System",
            aiSettings: "AI Settings",
          },
          roles: {
            admin: "Administrator",
            teacher: "Teacher",
            student: "Student",
          },
        },
      },
      ru: {
        translation: {
          nav: {
            student: "Студент",
            dashboard: "Панель управления",
            schedule: "Расписание",
            materials: "Учебные материалы",
            assignments: "Задания",
            tests: "Тесты",
            grades: "Оценки",
            attendance: "Посещаемость",
            profile: "Профиль",
            teacher: "Преподаватель",
            lessons: "Уроки",
            submissions: "Представления",
            main: "Главное",
            academic: "Академический",
            users: "Пользователи",
            university: "Университет",
            learning: "Учебный процесс",
            enrollment: "Зачисление",
            system: "Система",
            aiSettings: "Настройки ИИ",
          },
          roles: {
            admin: "Администратор",
            teacher: "Преподаватель",
            student: "Студент",
          },
        },
      },
    },
  });

export default i18next;
