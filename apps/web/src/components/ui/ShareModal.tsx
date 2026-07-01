import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../store/authStore";
import { usersApi, sharingApi } from "../../lib/api/misc";
import Modal from "./Modal";

interface Props {
  type: "dashboard" | "rating";
  onClose: () => void;
}

export default function ShareModal({ type, onClose }: Props) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: allUsers } = useQuery({ queryKey: ["users"], queryFn: usersApi.list });
  const { data: dashShares } = useQuery({
    queryKey: ["dashboardShares"],
    queryFn: sharingApi.listDashboardShares,
    enabled: type === "dashboard",
  });
  const { data: ratingShares } = useQuery({
    queryKey: ["ratingShares"],
    queryFn: sharingApi.listRatingShares,
    enabled: type === "rating",
  });

  const others = allUsers?.filter((u) => u.id !== user?.id) ?? [];
  const filtered = search.trim()
    ? others.filter((u) => u.username.toLowerCase().includes(search.toLowerCase()))
    : [];

  const isShared = (userId: string): boolean => {
    if (type === "dashboard") return dashShares?.some((s) => s.userId === userId) ?? false;
    return ratingShares?.some((s) => s.toUserId === userId && s.enabled) ?? false;
  };

  const toggle = async (userId: string, currentlyShared: boolean) => {
    if (type === "dashboard") {
      if (currentlyShared) await sharingApi.removeDashboardShare(userId);
      else await sharingApi.setDashboardShare(userId);
      qc.invalidateQueries({ queryKey: ["dashboardShares"] });
    } else {
      if (currentlyShared) await sharingApi.removeRatingShare(userId);
      else await sharingApi.setRatingShare(userId, true);
      qc.invalidateQueries({ queryKey: ["ratingShares"] });
    }
  };

  const title = type === "dashboard" ? t("shareModal.dashboardTitle") : t("shareModal.ratingTitle");
  const desc = type === "dashboard" ? t("shareModal.dashboardDesc") : t("shareModal.ratingDesc");

  return (
    <Modal open onClose={onClose} title={title} size="sm">
      <p className="text-xs text-gray-500 mb-4">{desc}</p>
      <div className="relative mb-3">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("shareModal.searchPlaceholder")}
          className="input pl-8 w-full text-sm"
        />
      </div>
      {!search.trim() ? (
        <p className="text-sm text-gray-400 text-center py-4">{t("shareModal.searchHint")}</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">{t("shareModal.noUser")}</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const shared = isShared(u.id);
            return (
              <div
                key={u.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <span className="text-sm font-medium">{u.username}</span>
                <button
                  onClick={() => toggle(u.id, shared)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    shared
                      ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 hover:opacity-80"
                      : "border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {shared ? t("shareModal.sharing") : t("shareModal.share")}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
