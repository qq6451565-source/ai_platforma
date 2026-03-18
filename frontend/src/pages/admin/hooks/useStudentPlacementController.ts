import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Form, message } from "antd";
import { useLocation, useNavigate } from "react-router-dom";

import {
  AdminUser,
  assignStudentPlacement,
  fetchDirections,
  fetchGroupsAdmin,
  fetchStudentProfiles,
  fetchUsers,
} from "../../../api/admin";
import {
  buildDirectionNameMap,
  buildGroupEntityMap,
  buildProfileByUser,
  filterStudentPlacementUsers,
  getStudentPlacementStats,
} from "../utils/adminRegistry";
import {
  buildStudentPlacementFormValues,
  filterGroupsByDirection,
} from "../utils/adminWorkflowForms";
import {
  ADMIN_QUERY_KEYS,
  ADMIN_INVALIDATION_GROUPS,
  getAdminApiErrorMessage,
  invalidateAdminQueries,
} from "../utils/adminWorkflowMutations";
import { clearRequestedUserIdSearch, getRequestedUserId } from "../utils/workflowRouting";

export const useStudentPlacementController = () => {
  const qc = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [form] = Form.useForm();

  const { data: users, isLoading } = useQuery({
    queryKey: ADMIN_QUERY_KEYS.studentPlacementUsers,
    queryFn: () => fetchUsers("student"),
  });
  const { data: studentProfiles } = useQuery({
    queryKey: ADMIN_QUERY_KEYS.studentProfiles,
    queryFn: fetchStudentProfiles,
  });
  const { data: directions } = useQuery({
    queryKey: ADMIN_QUERY_KEYS.directions,
    queryFn: fetchDirections,
  });
  const { data: groups } = useQuery({
    queryKey: ADMIN_QUERY_KEYS.groups,
    queryFn: fetchGroupsAdmin,
  });

  const requestedUserId = useMemo(() => getRequestedUserId(location.search), [location.search]);

  const saveMutation = useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: number;
      payload: {
        direction_id?: number | null;
        group_id?: number | null;
        admission_year?: number;
        status?: "active" | "academic_leave" | "expelled" | "graduated";
      };
    }) => assignStudentPlacement(userId, payload),
    onSuccess: async () => {
      message.success("Talaba placement saqlandi");
      await invalidateAdminQueries(qc, ADMIN_INVALIDATION_GROUPS.studentPlacement);
      navigate(
        { pathname: location.pathname, search: clearRequestedUserIdSearch(location.search) },
        { replace: true },
      );
      setModalOpen(false);
      setSelectedUser(null);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(
        getAdminApiErrorMessage(error, ["group_id", "group"], "Placementni saqlashda xato"),
      );
    },
  });

  const directionMap = useMemo(() => buildDirectionNameMap(directions || []), [directions]);
  const groupMap = useMemo(() => buildGroupEntityMap(groups || []), [groups]);
  const profileByUser = useMemo(() => buildProfileByUser(studentProfiles || []), [studentProfiles]);

  const filteredUsers = useMemo(
    () =>
      filterStudentPlacementUsers({
        directionMap,
        groupMap,
        profileByUser,
        search,
        users: users || [],
      }),
    [directionMap, groupMap, profileByUser, search, users],
  );

  const selectedDirectionId = Form.useWatch("direction_id", form);
  const availableGroups = useMemo(
    () => filterGroupsByDirection(groups || [], selectedDirectionId),
    [groups, selectedDirectionId],
  );

  const stats = useMemo(
    () => getStudentPlacementStats(users || [], profileByUser),
    [profileByUser, users],
  );

  const openPlacement = (user: AdminUser) => {
    const profile = profileByUser.get(user.id);
    setSelectedUser(user);
    form.setFieldsValue(buildStudentPlacementFormValues(profile, groupMap));
    setModalOpen(true);
  };

  const closePlacement = () => {
    navigate(
      { pathname: location.pathname, search: clearRequestedUserIdSearch(location.search) },
      { replace: true },
    );
    setModalOpen(false);
    setSelectedUser(null);
    form.resetFields();
  };

  const submitPlacement = (values: {
    direction_id?: number | null;
    group_id?: number | null;
    admission_year?: number;
    status?: "active" | "academic_leave" | "expelled" | "graduated";
  }) => {
    if (!selectedUser) return;
    saveMutation.mutate({
      userId: selectedUser.id,
      payload: values,
    });
  };

  useEffect(() => {
    if (!requestedUserId || !users?.length || modalOpen) return;
    const matchedUser = users.find((user) => user.id === requestedUserId);
    if (matchedUser) {
      openPlacement(matchedUser);
      return;
    }
    navigate(
      { pathname: location.pathname, search: clearRequestedUserIdSearch(location.search) },
      { replace: true },
    );
  }, [location.pathname, location.search, modalOpen, navigate, requestedUserId, users]);

  return {
    availableGroups,
    closePlacement,
    directionMap,
    directions: directions || [],
    filteredUsers,
    form,
    groupMap,
    isLoading,
    modalOpen,
    openPlacement,
    profileByUser,
    savePending: saveMutation.isPending,
    search,
    selectedUser,
    setSearch,
    stats,
    submitPlacement,
  };
};
