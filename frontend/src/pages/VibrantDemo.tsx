import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui";

const VibrantDemo: React.FC = () => {
  const { t } = useTranslation();
  const [count, setCount] = useState(0);

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: "3rem",
        background: "var(--color-background)",
        backgroundImage: "var(--gradient-ambient)",
      }}
    >
      <div
        className="bg-aurora"
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          gap: "3rem",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          className="glass-vivid"
          style={{
            padding: "3rem",
            borderRadius: "var(--radius-2xl)",
            textAlign: "center",
            maxWidth: "800px",
          }}
        >
          <h1
            className="gradient-text-rainbow"
            style={{
              fontSize: "4rem",
              marginBottom: "1rem",
              fontWeight: 800,
            }}
          >
            {t("demo.vibrant.title")}
          </h1>
          <p
            className="text-shimmer"
            style={{
              fontSize: "1.5rem",
              marginBottom: "2rem",
            }}
          >
            {t("demo.vibrant.subtitle")}
          </p>
          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <Button variant="primary" size="lg" onClick={() => setCount(count + 1)}>
              {t("demo.vibrant.primaryButton")}
            </Button>
            <Button variant="neon" size="lg">
              {t("demo.vibrant.neonButton")}
            </Button>
            <Button variant="outline" size="lg">
              {t("demo.vibrant.outlineButton")}
            </Button>
          </div>
          <p style={{ marginTop: "2rem", color: "var(--color-text-secondary)" }}>
            {t("demo.vibrant.clicked", { count })}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "2rem",
            width: "100%",
            maxWidth: "1200px",
          }}
        >
          <div className="glass-purple glow-purple" style={{ padding: "2rem", borderRadius: "var(--radius-xl)" }}>
            <h3
              style={{
                fontSize: "1.5rem",
                marginBottom: "1rem",
                background: "var(--gradient-primary)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              {t("demo.vibrant.cards.purple.title")}
            </h3>
            <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              {t("demo.vibrant.cards.purple.description")}
            </p>
          </div>

          <div className="glass-pink glow-pink" style={{ padding: "2rem", borderRadius: "var(--radius-xl)" }}>
            <h3 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "var(--accent-2)" }}>
              {t("demo.vibrant.cards.pink.title")}
            </h3>
            <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              {t("demo.vibrant.cards.pink.description")}
            </p>
          </div>

          <div className="glass-vivid glow-rainbow" style={{ padding: "2rem", borderRadius: "var(--radius-xl)" }}>
            <h3 className="gradient-text-vivid" style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
              {t("demo.vibrant.cards.rainbow.title")}
            </h3>
            <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.6 }}>
              {t("demo.vibrant.cards.rainbow.description")}
            </p>
          </div>
        </div>

        <div
          className="border-neon-rainbow"
          style={{
            padding: "3rem",
            borderRadius: "var(--radius-2xl)",
            background: "var(--bg-elevated-1)",
            backdropFilter: "blur(20px)",
            maxWidth: "800px",
            width: "100%",
          }}
        >
          <h2 className="text-shimmer" style={{ fontSize: "2.5rem", marginBottom: "2rem", textAlign: "center" }}>
            {t("demo.vibrant.neonTitle")}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <Button variant="primary" block>{t("demo.vibrant.primary")}</Button>
            <Button variant="secondary" block>{t("demo.vibrant.secondary")}</Button>
            <Button variant="outline" block>{t("demo.vibrant.outline")}</Button>
            <Button variant="ghost" block>{t("demo.vibrant.ghost")}</Button>
            <Button variant="neon" block>{t("demo.vibrant.neon")}</Button>
            <Button variant="error" block>{t("demo.vibrant.error")}</Button>
          </div>
        </div>

        <div
          className="holographic"
          style={{
            padding: "3rem",
            borderRadius: "var(--radius-2xl)",
            maxWidth: "800px",
            width: "100%",
            textAlign: "center",
          }}
        >
          <h2 style={{ fontSize: "2.5rem", marginBottom: "1rem", color: "var(--color-text-primary)" }}>
            {t("demo.vibrant.holographicTitle")}
          </h2>
          <p style={{ fontSize: "1.2rem", color: "var(--color-text-secondary)", marginBottom: "2rem" }}>
            {t("demo.vibrant.holographicDescription")}
          </p>
          <Button variant="neon" size="lg">
            {t("demo.vibrant.magicButton")}
          </Button>
        </div>

        <div
          className="glass"
          style={{
            padding: "3rem",
            borderRadius: "var(--radius-2xl)",
            maxWidth: "800px",
            width: "100%",
          }}
        >
          <h2 style={{ fontSize: "2rem", marginBottom: "2rem", textAlign: "center", color: "var(--color-text-primary)" }}>
            {t("demo.vibrant.paletteTitle")}
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div className="shadow-purple" style={{ width: "60px", height: "60px", borderRadius: "var(--radius-md)", background: "var(--accent)" }} />
              <div>
                <strong style={{ color: "var(--accent)" }}>{t("demo.vibrant.palette.purple")}</strong>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>{t("demo.vibrant.palette.primaryAccent")}</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div className="shadow-pink" style={{ width: "60px", height: "60px", borderRadius: "var(--radius-md)", background: "var(--accent-2)" }} />
              <div>
                <strong style={{ color: "var(--accent-2)" }}>{t("demo.vibrant.palette.pink")}</strong>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>{t("demo.vibrant.palette.secondaryAccent")}</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div className="shadow-orange" style={{ width: "60px", height: "60px", borderRadius: "var(--radius-md)", background: "var(--accent-3)" }} />
              <div>
                <strong style={{ color: "var(--accent-3)" }}>{t("demo.vibrant.palette.orange")}</strong>
                <p style={{ color: "var(--color-text-muted)", fontSize: "0.9rem" }}>{t("demo.vibrant.palette.tertiaryAccent")}</p>
              </div>
            </div>
          </div>
        </div>

        <div
          className="bg-gradient-animated"
          style={{
            padding: "3rem",
            borderRadius: "var(--radius-2xl)",
            maxWidth: "800px",
            width: "100%",
            textAlign: "center",
            color: "white",
          }}
        >
          <h2 style={{ fontSize: "2.5rem", marginBottom: "1rem", fontWeight: 800 }}>
            {t("demo.vibrant.animatedTitle")}
          </h2>
          <p style={{ fontSize: "1.2rem", opacity: 0.9 }}>
            {t("demo.vibrant.animatedDescription")}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VibrantDemo;
