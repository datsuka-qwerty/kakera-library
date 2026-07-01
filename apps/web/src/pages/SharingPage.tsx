import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { sharingApi } from "../lib/api/misc";

export default function SharingPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const { data: dashShares } = useQuery({ queryKey: ["dashboardShares"], queryFn: sharingApi.listDashboardShares });
  const { data: ratingShares } = useQuery({ queryKey: ["ratingShares"], queryFn: sharingApi.listRatingShares });
  const { data: received } = useQuery({ queryKey: ["receivedShares"], queryFn: sharingApi.listReceivedShares });

  const activeDashShares = dashShares ?? [];
  const activeRatingShares = ratingShares?.filter((s) => s.enabled) ?? [];
  const receivedDash = received?.dashboardOwners ?? [];
  const receivedRating = received?.ratingSharers ?? [];

  return (
    <div className="space-y-8 max-w-md">
      <h2 className="text-xl font-bold">{t("nav.sharing")}</h2>

      <section className="space-y-5">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {t("sharing.outgoingTitle")}
        </h3>

        <div>
          <p className="text-sm font-medium mb-2">{t("sharing.dashboard")}</p>
          {activeDashShares.length === 0 ? (
            <p className="text-sm text-gray-400">{t("sharing.noOutgoing")}</p>
          ) : (
            <div className="space-y-2">
              {activeDashShares.map((s) => (
                <div key={s.userId} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium">{s.username}</span>
                  <button
                    onClick={async () => {
                      await sharingApi.removeDashboardShare(s.userId);
                      qc.invalidateQueries({ queryKey: ["dashboardShares"] });
                    }}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    {t("common.delete")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-medium mb-2">{t("sharing.rating")}</p>
          {activeRatingShares.length === 0 ? (
            <p className="text-sm text-gray-400">{t("sharing.noOutgoing")}</p>
          ) : (
            <div className="space-y-2">
              {activeRatingShares.map((s) => (
                <div key={s.toUserId} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium">{s.toUsername}</span>
                  <button
                    onClick={async () => {
                      await sharingApi.removeRatingShare(s.toUserId);
                      qc.invalidateQueries({ queryKey: ["ratingShares"] });
                    }}
                    className="text-xs text-red-400 hover:text-red-600"
                  >
                    {t("common.delete")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400">{t("sharing.addHint")}</p>
      </section>

      <hr className="border-gray-200 dark:border-gray-700" />

      <section className="space-y-5">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {t("sharing.incomingTitle")}
        </h3>

        <div>
          <p className="text-sm font-medium mb-2">{t("sharing.dashboard")}</p>
          {receivedDash.length === 0 ? (
            <p className="text-sm text-gray-400">{t("sharing.noIncoming")}</p>
          ) : (
            <div className="space-y-2">
              {receivedDash.map((s) => (
                <div key={s.userId} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium">{s.username}</span>
                  <button
                    onClick={() => navigate(`/dashboard/shared/${encodeURIComponent(s.username)}`)}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    {t("sharing.viewDashboard")}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm font-medium mb-2">{t("sharing.rating")}</p>
          {receivedRating.length === 0 ? (
            <p className="text-sm text-gray-400">{t("sharing.noIncoming")}</p>
          ) : (
            <div className="space-y-2">
              {receivedRating.map((s) => (
                <div key={s.userId} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium">{s.username}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
