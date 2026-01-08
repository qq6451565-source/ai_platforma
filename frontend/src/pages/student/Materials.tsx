import { List, Typography, Skeleton } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchMaterials } from "../../api/materials";

const StudentMaterials = () => {
  const { data: materials, isLoading } = useQuery({
    queryKey: ["materials"],
    queryFn: fetchMaterials,
  });

  return (
    <div style={{ padding: 24 }}>
      <Typography.Title level={4}>Materiallar</Typography.Title>
      {isLoading ? (
        <Skeleton active />
      ) : (
        <List
          dataSource={materials || []}
          renderItem={(item) => (
            <List.Item
              actions={
                item.file
                  ? [
                      <a key="download" href={item.file} target="_blank" rel="noreferrer">
                        Yuklab olish
                      </a>,
                    ]
                  : []
              }
            >
              <List.Item.Meta
                title={item.title}
                description={`${item.material_type || ""} | Fan: ${
                  item.subject_name || item.subject
                } | Guruh: ${item.group_name || ""}`}
              />
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default StudentMaterials;
