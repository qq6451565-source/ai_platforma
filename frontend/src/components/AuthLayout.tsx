import { Card, Typography } from "antd";
import React from "react";

type Props = {
  title: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
};

const AuthLayout: React.FC<Props> = ({ title, extra, children }) => {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f0f4ff 0%, #f8fbff 100%)",
        padding: 24,
      }}
    >
      <Card
        title={<Typography.Title level={3} style={{ margin: 0 }}>{title}</Typography.Title>}
        extra={extra}
        style={{ width: 420, maxWidth: "100%" }}
      >
        {children}
      </Card>
    </div>
  );
};

export default AuthLayout;
