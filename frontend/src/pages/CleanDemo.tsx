import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button, Card, Badge, Avatar, Progress, Input } from "../components/ui";

const CleanDemo: React.FC = () => {
  const { t } = useTranslation();
  const [text, setText] = useState("");

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "3rem",
        background: "var(--color-background)",
        maxWidth: "1200px",
        margin: "0 auto",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "4rem" }}>
        <h1 style={{ fontSize: "3rem", marginBottom: "1rem", color: "var(--color-text-primary)", fontWeight: 700 }}>
          {t("demo.clean.title")}
        </h1>
        <p style={{ fontSize: "1.25rem", color: "var(--color-text-secondary)", marginBottom: "2rem" }}>
          {t("demo.clean.subtitle")}
        </p>
      </div>

      <Card style={{ marginBottom: "2rem", padding: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem", color: "var(--color-text-primary)" }}>
          {t("demo.clean.sections.buttons")}
        </h2>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Button variant="primary">{t("demo.clean.buttons.primary")}</Button>
          <Button variant="secondary">{t("demo.clean.buttons.secondary")}</Button>
          <Button variant="outline">{t("demo.clean.buttons.outline")}</Button>
          <Button variant="ghost">{t("demo.clean.buttons.ghost")}</Button>
          <Button variant="neon">{t("demo.clean.buttons.accent")}</Button>
          <Button variant="error">{t("demo.clean.buttons.delete")}</Button>
        </div>
      </Card>

      <Card style={{ marginBottom: "2rem", padding: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem", color: "var(--color-text-primary)" }}>
          {t("demo.clean.sections.form")}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "400px" }}>
          <Input
            placeholder={t("demo.clean.form.name")}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Input placeholder={t("demo.clean.form.email")} type="email" />
          <Input placeholder={t("demo.clean.form.password")} type="password" />
        </div>
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "2rem",
          marginBottom: "2rem",
        }}
      >
        <Card style={{ padding: "2rem" }}>
          <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: "var(--color-text-primary)" }}>
            {t("demo.clean.sections.badges")}
          </h3>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <Badge variant="default">{t("demo.clean.badges.default")}</Badge>
            <Badge variant="primary">{t("demo.clean.badges.primary")}</Badge>
            <Badge variant="success">{t("demo.clean.badges.success")}</Badge>
            <Badge variant="warning">{t("demo.clean.badges.warning")}</Badge>
            <Badge variant="error">{t("demo.clean.badges.error")}</Badge>
            <Badge variant="info">{t("demo.clean.badges.info")}</Badge>
          </div>
        </Card>

        <Card style={{ padding: "2rem" }}>
          <h3 style={{ fontSize: "1.25rem", marginBottom: "1rem", color: "var(--color-text-primary)" }}>
            {t("demo.clean.sections.avatars")}
          </h3>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <Avatar name="John Doe" size="sm" />
            <Avatar name="Jane Smith" size="md" status="online" />
            <Avatar name="Bob Wilson" size="lg" />
          </div>
        </Card>
      </div>

      <Card style={{ marginBottom: "2rem", padding: "2rem" }}>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "1.5rem", color: "var(--color-text-primary)" }}>
          {t("demo.clean.sections.progress")}
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <Progress value={25} showLabel label={t("demo.clean.progress.inProgress")} />
          <Progress value={60} variant="success" showLabel label={t("demo.clean.progress.completed")} />
          <Progress value={85} variant="warning" showLabel label={t("demo.clean.progress.almostDone")} />
        </div>
      </Card>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1.5rem",
        }}
      >
        <Card hoverable style={{ padding: "2rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "var(--radius-md)", background: "var(--accent-10)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem", fontSize: "1.5rem" }}>
            A
          </div>
          <h3 style={{ fontSize: "1.125rem", marginBottom: "0.5rem", color: "var(--color-text-primary)" }}>
            {t("demo.clean.cards.analytics.title")}
          </h3>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            {t("demo.clean.cards.analytics.description")}
          </p>
        </Card>

        <Card hoverable style={{ padding: "2rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "var(--radius-md)", background: "var(--color-success-subtle)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem", fontSize: "1.5rem" }}>
            T
          </div>
          <h3 style={{ fontSize: "1.125rem", marginBottom: "0.5rem", color: "var(--color-text-primary)" }}>
            {t("demo.clean.cards.tasks.title")}
          </h3>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            {t("demo.clean.cards.tasks.description")}
          </p>
        </Card>

        <Card hoverable style={{ padding: "2rem" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "var(--radius-md)", background: "var(--color-warning-subtle)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1rem", fontSize: "1.5rem" }}>
            N
          </div>
          <h3 style={{ fontSize: "1.125rem", marginBottom: "0.5rem", color: "var(--color-text-primary)" }}>
            {t("demo.clean.cards.notifications.title")}
          </h3>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
            {t("demo.clean.cards.notifications.description")}
          </p>
        </Card>
      </div>
    </div>
  );
};

export default CleanDemo;
