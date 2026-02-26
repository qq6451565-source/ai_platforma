import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  Badge,
  Avatar,
  Progress,
  Tabs,
  Dropdown,
  Chart,
  StatCard,
  NotificationPanel,
  BottomSheet,
  useToast,
} from "../components/ui";
import { ThemeToggle } from "../components/ThemeToggle";
import { useTranslation } from "react-i18next";

const UIShowcase: React.FC = () => {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  const chartData = [
    { label: "Mon", value: 65, color: "var(--accent)" },
    { label: "Tue", value: 78, color: "var(--accent)" },
    { label: "Wed", value: 90, color: "var(--accent)" },
    { label: "Thu", value: 45, color: "var(--accent)" },
    { label: "Fri", value: 88, color: "var(--accent)" },
  ];

  const donutData = [
    { label: t("demo.showcase.completed"), value: 45, color: "var(--color-success)" },
    { label: t("demo.showcase.inProgress"), value: 30, color: "var(--accent)" },
    { label: t("demo.showcase.pending"), value: 25, color: "var(--color-warning)" },
  ];

  const notifications = useMemo(
    () => [
      {
        id: "1",
        title: t("demo.showcase.notifications.assignmentTitle"),
        message: t("demo.showcase.notifications.assignmentMessage"),
        time: t("demo.showcase.notifications.time5m"),
        unread: true,
        type: "info" as const,
        icon: "A",
      },
      {
        id: "2",
        title: t("demo.showcase.notifications.resultTitle"),
        message: t("demo.showcase.notifications.resultMessage"),
        time: t("demo.showcase.notifications.time1h"),
        unread: true,
        type: "success" as const,
        icon: "R",
      },
    ],
    [t]
  );

  const dropdownItems = [
    { key: "1", label: t("demo.showcase.menu.profile"), icon: "P", onClick: () => showToast(t("demo.showcase.toast.profile"), "info") },
    { key: "2", label: t("demo.showcase.menu.settings"), icon: "S", onClick: () => showToast(t("demo.showcase.toast.settings"), "info") },
    { key: "divider", label: "", divider: true },
    { key: "3", label: t("demo.showcase.menu.logout"), icon: "L", danger: true, onClick: () => showToast(t("demo.showcase.toast.logout"), "error") },
  ];

  const tabs = [
    {
      key: "components",
      label: t("demo.showcase.tabs.components"),
      icon: "C",
      children: (
        <div className="stagger-children" style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          <section>
            <h3 className="h3 mb-4">{t("demo.showcase.sections.buttons")}</h3>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
              <Button variant="primary">{t("demo.showcase.buttons.primary")}</Button>
              <Button variant="secondary">{t("demo.showcase.buttons.secondary")}</Button>
              <Button variant="outline">{t("demo.showcase.buttons.outline")}</Button>
              <Button variant="ghost">{t("demo.showcase.buttons.ghost")}</Button>
              <Button variant="neon">{t("demo.showcase.buttons.neon")}</Button>
              <Button variant="error">{t("demo.showcase.buttons.error")}</Button>
              <Button size="sm">{t("demo.showcase.buttons.small")}</Button>
              <Button size="lg">{t("demo.showcase.buttons.large")}</Button>
              <Button isLoading>{t("demo.showcase.buttons.loading")}</Button>
            </div>
          </section>

          <section>
            <h3 className="h3 mb-4">{t("demo.showcase.sections.badges")}</h3>
            <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
              <Badge variant="default">{t("demo.showcase.badges.default")}</Badge>
              <Badge variant="primary">{t("demo.showcase.badges.primary")}</Badge>
              <Badge variant="success">{t("demo.showcase.badges.success")}</Badge>
              <Badge variant="warning">{t("demo.showcase.badges.warning")}</Badge>
              <Badge variant="error">{t("demo.showcase.badges.error")}</Badge>
              <Badge variant="info">{t("demo.showcase.badges.info")}</Badge>
              <Badge variant="primary" dot pulse>{t("demo.showcase.badges.live")}</Badge>
            </div>
          </section>

          <section>
            <h3 className="h3 mb-4">{t("demo.showcase.sections.avatars")}</h3>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
              <Avatar name="John Doe" size="xs" />
              <Avatar name="Jane Smith" size="sm" status="online" />
              <Avatar name="Bob Wilson" size="md" status="away" />
              <Avatar name="Alice Brown" size="lg" status="busy" />
              <Avatar name="Charlie Davis" size="xl" />
            </div>
          </section>

          <section>
            <h3 className="h3 mb-4">{t("demo.showcase.sections.progress")}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Progress value={45} showLabel label={t("demo.showcase.progress.completion")} />
              <Progress value={75} variant="success" showLabel />
              <Progress value={90} variant="warning" striped animated />
              <Progress value={30} variant="error" size="lg" showLabel />
            </div>
          </section>

          <section>
            <h3 className="h3 mb-4">{t("demo.showcase.sections.dropdown")}</h3>
            <Dropdown items={dropdownItems}>
              <Button variant="outline">{t("demo.showcase.openMenu")}</Button>
            </Dropdown>
          </section>
        </div>
      ),
    },
    {
      key: "charts",
      label: t("demo.showcase.tabs.charts"),
      icon: "H",
      children: (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
          <Card>
            <Chart data={chartData} type="bar" title={t("demo.showcase.weeklyActivity")} />
          </Card>
          <Card>
            <Chart data={donutData} type="donut" title={t("demo.showcase.taskDistribution")} />
          </Card>
        </div>
      ),
    },
    {
      key: "stats",
      label: t("demo.showcase.tabs.stats"),
      icon: "S",
      children: (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
          <StatCard title={t("demo.showcase.stats.totalStudents")} value="2,543" icon="TS" color="primary" trend={{ value: 12, isPositive: true }} />
          <StatCard title={t("demo.showcase.stats.activeCourses")} value="42" icon="AC" color="success" trend={{ value: 5, isPositive: true }} />
          <StatCard title={t("demo.showcase.stats.pendingTasks")} value="18" icon="PT" color="warning" trend={{ value: 3, isPositive: false }} />
          <StatCard title={t("demo.showcase.stats.completionRate")} value="94%" icon="CR" color="success" trend={{ value: 8, isPositive: true }} />
        </div>
      ),
    },
    {
      key: "notifications",
      label: t("demo.showcase.tabs.notifications"),
      icon: "N",
      children: (
        <div style={{ maxWidth: "400px", margin: "0 auto" }}>
          <NotificationPanel
            notifications={notifications}
            onNotificationClick={(id) => showToast(t("demo.showcase.toast.notification", { id }), "info")}
            onMarkAllRead={() => showToast(t("demo.showcase.toast.markAllRead"), "success")}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="page-container animate-fade-in" style={{ padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1 className="neon-text-gradient">{t("demo.showcase.title")}</h1>
        <ThemeToggle />
      </div>

      <div style={{ marginBottom: "2rem", display: "flex", gap: "1rem", flexWrap: "wrap" }}>
        <Button onClick={() => showToast(t("demo.showcase.toast.success"), "success")}>
          {t("demo.showcase.actions.success")}
        </Button>
        <Button variant="error" onClick={() => showToast(t("demo.showcase.toast.error"), "error")}>
          {t("demo.showcase.actions.error")}
        </Button>
        <Button variant="outline" onClick={() => showToast(t("demo.showcase.toast.warning"), "warning")}>
          {t("demo.showcase.actions.warning")}
        </Button>
        <Button variant="secondary" onClick={() => setBottomSheetOpen(true)}>
          {t("demo.showcase.actions.openSheet")}
        </Button>
      </div>

      <Tabs tabs={tabs} defaultActiveKey="components" variant="card" />

      <BottomSheet
        isOpen={bottomSheetOpen}
        onClose={() => setBottomSheetOpen(false)}
        title={t("demo.showcase.sheet.title")}
      >
        <div style={{ padding: "1rem" }}>
          <h4>{t("demo.showcase.sheet.subtitle")}</h4>
          <p>{t("demo.showcase.sheet.description")}</p>
          <Button onClick={() => setBottomSheetOpen(false)} block>
            {t("common.close")}
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
};

export default UIShowcase;
