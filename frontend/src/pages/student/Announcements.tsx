import { List, Typography, Skeleton } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchAnnouncements } from "../../api/announcements";

const StudentAnnouncements = () => {
  const { data: items, isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: fetchAnnouncements,
  });

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4}>E’lonlar</Typography.Title>
      {isLoading ? (
        <Skeleton active />
      ) : (
        <List
          dataSource={items || []}
          renderItem={(item) => (
            <List.Item>
              <List.Item.Meta
                title={item.title}
                description={`${item.group_name || ""} ${
                  item.subject_name ? " | Fan: " + item.subject_name : ""
                } | ${item.creator_name || ""} | ${item.created_at ? new Date(item.created_at).toLocaleString() : ""}`}
              />
              <div>{item.message}</div>
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default StudentAnnouncements;
