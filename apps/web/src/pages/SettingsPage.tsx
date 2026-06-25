import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Camera } from "lucide-react";
import { authApi } from "../lib/api/auth";
import { mediaTypesApi, sharingApi, backupApi, usersApi, exportImportApi, serverSettingsApi } from "../lib/api/misc";
import type { ImportResult } from "../lib/api/misc";
import { getMediaTypeName } from "../lib/mediaTypeLabels";
import { useAuthStore } from "../store/authStore";
import Modal from "../components/ui/Modal";
import clsx from "clsx";

type Tab = "profile" | "security" | "sharing" | "mediaTypes" | "data" | "backup" | "users" | "server";

const CATEGORIES = ["book", "movie", "drama"] as const;
const LANGUAGES: { code: string; label: string; sublabel: string }[] = [
  { code: "ja", label: "日本語", sublabel: "Japanese" },
  { code: "en", label: "English", sublabel: "英語" },
];

export default function SettingsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>("profile");

  const tabs: { key: Tab; label: string; adminOnly?: boolean }[] = [
    { key: "profile", label: t("settings.profile") },
    { key: "security", label: t("settings.security") },
    { key: "sharing", label: t("settings.sharing") },
    { key: "mediaTypes", label: t("settings.mediaTypes") },
    { key: "data", label: t("settings.data") },
    { key: "backup", label: t("settings.backup"), adminOnly: true },
    { key: "users", label: t("settings.users"), adminOnly: true },
    { key: "server", label: t("settings.server"), adminOnly: true },
  ].filter((tb) => !tb.adminOnly || user?.role === "admin") as { key: Tab; label: string; adminOnly?: boolean }[];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t("nav.settings")}</h2>
      <div className="flex gap-6">
        <nav className="w-44 flex-shrink-0 space-y-0.5">
          {tabs.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              className={clsx(
                "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                tab === tb.key
                  ? "bg-gray-200 dark:bg-gray-700 font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              {tb.label}
            </button>
          ))}
        </nav>

        <div className="flex-1 min-w-0">
          {tab === "profile" && <ProfileTab user={user} />}
          {tab === "security" && <SecurityTab />}
          {tab === "sharing" && <SharingTab />}
          {tab === "mediaTypes" && <MediaTypesTab qc={qc} />}
          {tab === "data" && <DataTab />}
          {tab === "backup" && <BackupTab />}
          {tab === "users" && <UsersTab qc={qc} />}
          {tab === "server" && <ServerSettingsTab qc={qc} />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ user }: { user: { id: string; username: string; role: string } | null }) {
  const { t, i18n } = useTranslation();
  const { updateUser } = useAuthStore();
  const [password, setPassword] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarUrl = useAuthStore((s) => s.user?.avatarUrl);

  const updateMutation = useMutation({
    mutationFn: () => usersApi.update(user!.id, { password: password || undefined }),
    onSuccess: () => { setPassword(""); alert(t("profile.savedOk")); },
  });

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const size = 128;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d")!;
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        try {
          await usersApi.update(user.id, { avatarUrl: dataUrl });
          updateUser({ avatarUrl: dataUrl });
        } catch { alert(t("profile.uploadFailed")); }
        finally { setAvatarUploading(false); }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-5 max-w-sm">
      <h3 className="font-semibold">{t("profile.title")}</h3>

      <div>
        <label className="form-label">{t("profile.avatar")}</label>
        <div className="flex items-center gap-4 mt-1">
          <div className="relative group">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-gray-500 dark:text-gray-300 select-none">
                  {user?.username?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none transition-opacity">
              <Camera size={20} className="text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarUploading}
              className="btn-secondary text-sm"
            >
              {avatarUploading ? t("profile.uploading") : t("profile.changeImage")}
            </button>
            {avatarUrl && (
              <button
                onClick={async () => {
                  await usersApi.update(user!.id, { avatarUrl: "" });
                  updateUser({ avatarUrl: null });
                }}
                className="block text-xs text-red-400 hover:text-red-600"
              >
                {t("common.delete")}
              </button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
        </div>
      </div>

      <div>
        <label className="form-label">{t("profile.username")}</label>
        <input value={user?.username ?? ""} disabled className="input opacity-60" />
      </div>
      <div>
        <label className="form-label">{t("profile.newPassword")}</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
      </div>
      <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="btn-primary">
        {t("common.save")}
      </button>

      <hr className="border-gray-200 dark:border-gray-700" />

      <LanguageSection i18n={i18n} />
    </div>
  );
}

function LanguageSection({ i18n }: { i18n: ReturnType<typeof useTranslation>["i18n"] }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(i18n.language);
  const [saved, setSaved] = useState(false);

  const apply = () => {
    i18n.changeLanguage(selected);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <h4 className="text-sm font-semibold mb-3">{t("profile.languageTitle")}</h4>
      <div className="flex gap-2 items-center">
        <select
          value={selected}
          onChange={(e) => { setSelected(e.target.value); setSaved(false); }}
          className="input flex-1 text-sm"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label} ({l.sublabel})</option>
          ))}
        </select>
        <button
          onClick={apply}
          disabled={selected === i18n.language}
          className="btn-primary text-sm px-4 disabled:opacity-40"
        >
          {t("profile.apply")}
        </button>
      </div>
      {saved && <p className="text-xs text-green-600 dark:text-green-400 mt-2">{t("profile.languageChanged")}</p>}
    </div>
  );
}

function SecurityTab() {
  const { t } = useTranslation();
  const [qrUrl, setQrUrl] = useState("");
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"idle" | "setup" | "done">("idle");

  const setupMutation = useMutation({
    mutationFn: authApi.setupTOTP,
    onSuccess: (data) => { setQrUrl(data.qrCodeUrl); setPhase("setup"); },
  });

  const verifyMutation = useMutation({
    mutationFn: () => authApi.verifyTOTP(code),
    onSuccess: () => { setPhase("done"); },
  });

  const disableMutation = useMutation({ mutationFn: authApi.disableTOTP });

  return (
    <div className="space-y-4 max-w-sm">
      <h3 className="font-semibold">{t("security.title")}</h3>
      {phase === "idle" && (
        <button onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending} className="btn-primary">
          {t("security.setupBtn")}
        </button>
      )}
      {phase === "setup" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{t("security.scanQR")}</p>
          {qrUrl && <img src={qrUrl} alt="TOTP QR" className="w-48 h-48 border rounded" />}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t("security.enterCode")}
            maxLength={6}
            inputMode="numeric"
            className="input"
          />
          <button onClick={() => verifyMutation.mutate()} disabled={verifyMutation.isPending || code.length !== 6} className="btn-primary">
            {t("security.verifyBtn")}
          </button>
        </div>
      )}
      {phase === "done" && <p className="text-sm text-green-600">{t("security.totpEnabled")}</p>}
      <hr className="border-gray-200 dark:border-gray-700" />
      <div>
        <p className="text-sm text-gray-500 mb-2">{t("security.disableHint")}</p>
        <button onClick={() => disableMutation.mutate()} disabled={disableMutation.isPending} className="btn-danger">
          {t("security.disableBtn")}
        </button>
      </div>
    </div>
  );
}

function SharingTab() {
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
      <section className="space-y-5">
        <h3 className="font-semibold">{t("sharing.outgoingTitle")}</h3>

        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t("sharing.dashboard")}</p>
          <p className="text-xs text-gray-400 mb-2">{t("sharing.addHint")}</p>
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
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t("sharing.rating")}</p>
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
      </section>

      <hr className="border-gray-200 dark:border-gray-700" />

      <section className="space-y-5">
        <h3 className="font-semibold">{t("sharing.incomingTitle")}</h3>

        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t("sharing.dashboard")}</p>
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
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">{t("sharing.rating")}</p>
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

function MediaTypesTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const { t, i18n } = useTranslation();
  const { data: types } = useQuery({ queryKey: ["mediaTypes"], queryFn: mediaTypesApi.list });
  const [newName, setNewName] = useState("");
  const [category, setCategory] = useState<"book" | "movie" | "drama">("book");

  const createMutation = useMutation({
    mutationFn: () => mediaTypesApi.create(category, newName.trim()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["mediaTypes"] }); setNewName(""); },
  });

  const deleteMutation = useMutation({
    mutationFn: mediaTypesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mediaTypes"] }),
  });

  return (
    <div className="space-y-4 max-w-md">
      <h3 className="font-semibold">{t("mediaTypes.title")}</h3>
      <div className="flex gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="input w-auto text-sm">
          {CATEGORIES.map((c) => <option key={c} value={c}>{t(`mediaTypes.${c}`)}</option>)}
        </select>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={t("mediaTypes.placeholder")} className="input flex-1 text-sm" />
        <button onClick={() => createMutation.mutate()} disabled={!newName.trim()} className="btn-primary px-3 text-sm">{t("common.add")}</button>
      </div>

      {CATEGORIES.map((cat) => {
        const catTypes = types?.filter((tp) => tp.category === cat) ?? [];
        return (
          <div key={cat}>
            <p className="text-xs font-medium text-gray-500 mb-1">{t(`mediaTypes.${cat}`)}</p>
            <div className="flex flex-wrap gap-2">
              {catTypes.map((tp) => (
                <span key={tp.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-gray-200 dark:border-gray-700">
                  {getMediaTypeName(tp, i18n.language)}
                  {!tp.isDefault && (
                    <button onClick={() => deleteMutation.mutate(tp.id)} className="text-gray-400 hover:text-red-500 ml-0.5">×</button>
                  )}
                  {tp.isDefault && <span className="text-gray-300 ml-0.5">🔒</span>}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DataTab() {
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<{ ok: true; data: ImportResult } | { ok: false; msg: string } | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [modeModalOpen, setModeModalOpen] = useState(false);
  type ImportMode = "merge-skip" | "merge-overwrite" | "replace";
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportImportApi.exportData();
    } catch {
      alert(t("data.exportFailed"));
    } finally {
      setExporting(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPendingFile(file);
    setModeModalOpen(true);
  };

  const runImport = async (mode: ImportMode) => {
    if (!pendingFile) return;
    setModeModalOpen(false);
    setImporting(true);
    setImportResult(null);
    try {
      const res = await exportImportApi.importData(pendingFile, mode);
      setImportResult({ ok: true, data: res.data });
    } catch {
      setImportResult({ ok: false, msg: t("data.importFailed") });
    } finally {
      setImporting(false);
      setPendingFile(null);
    }
  };

  const dataLabels: Record<string, string> = {
    books: t("data.books"),
    movies: t("data.movies"),
    dramas: t("data.dramas"),
  };

  return (
    <div className="space-y-6 max-w-md">
      {modeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl p-6 w-full max-w-sm mx-4 space-y-4">
            <h3 className="font-semibold text-base">{t("data.modeTitle")}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ファイル: <span className="font-medium text-gray-700 dark:text-gray-200">{pendingFile?.name}</span>
            </p>
            <div className="space-y-2">
              <button
                onClick={() => runImport("merge-skip")}
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <p className="font-medium text-sm">{t("data.mergeSkipTitle")}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t("data.mergeSkipDesc")}</p>
              </button>
              <button
                onClick={() => runImport("merge-overwrite")}
                className="w-full text-left px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <p className="font-medium text-sm">{t("data.mergeOverwriteTitle")}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t("data.mergeOverwriteDesc")}</p>
              </button>
              <button
                onClick={() => runImport("replace")}
                className="w-full text-left px-4 py-3 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <p className="font-medium text-sm text-red-600 dark:text-red-400">{t("data.replaceTitle")}</p>
                <p className="text-xs text-gray-400 mt-0.5">{t("data.replaceDesc")}</p>
              </button>
            </div>
            <button
              onClick={() => { setModeModalOpen(false); setPendingFile(null); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors pt-1"
            >
              {t("common.cancel")}
            </button>
          </div>
        </div>
      )}

      <div>
        <h3 className="font-semibold mb-1">{t("data.exportTitle")}</h3>
        <p className="text-xs text-gray-400 mb-3">{t("data.exportDesc")}</p>
        <button onClick={handleExport} disabled={exporting} className="btn-primary">
          {exporting ? t("data.exporting") : t("data.exportBtn")}
        </button>
      </div>
      <hr className="border-gray-200 dark:border-gray-700" />
      <div>
        <h3 className="font-semibold mb-1">{t("data.importTitle")}</h3>
        <p className="text-xs text-gray-400 mb-3">{t("data.importDesc")}</p>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={onFileChange} />
        <button onClick={() => fileRef.current?.click()} disabled={importing} className="btn-secondary">
          {importing ? t("data.importing") : t("data.importBtn")}
        </button>
        {importResult && !importResult.ok && (
          <p className="text-sm mt-2 text-red-500">{importResult.msg}</p>
        )}
        {importResult?.ok && (
          <div className="mt-3 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20 p-3 text-sm space-y-1">
            <p className="font-medium text-green-700 dark:text-green-400">{t("data.importDone")}</p>
            {(["books", "movies", "dramas"] as const).map((key) => {
              const s = importResult.data[key];
              const parts = [];
              if (s.added > 0) parts.push(t("data.added", { n: s.added }));
              if (s.updated > 0) parts.push(t("data.updated", { n: s.updated }));
              if (s.skipped > 0) parts.push(t("data.skipped", { n: s.skipped }));
              if (parts.length === 0) parts.push(t("data.noChange"));
              return (
                <p key={key} className="text-gray-600 dark:text-gray-400">
                  {dataLabels[key]}: {parts.join(" / ")}
                </p>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function BackupTab() {
  const { t } = useTranslation();
  const { data: config, refetch: refetchConfig } = useQuery({ queryKey: ["backupConfig"], queryFn: backupApi.getConfig });
  const { data: backupList, refetch: refetchList } = useQuery({ queryKey: ["backupList"], queryFn: backupApi.list });
  const [cfg, setCfg] = useState<typeof config>(undefined);
  const currentCfg = cfg ?? config;

  const updateMutation = useMutation({
    mutationFn: () => backupApi.updateConfig(currentCfg!),
    onSuccess: () => { refetchConfig(); alert(t("backup.savedOk")); },
  });

  const runMutation = useMutation({
    mutationFn: backupApi.run,
    onSuccess: () => { refetchList(); alert(t("backup.createdOk")); },
  });

  const restoreMutation = useMutation({
    mutationFn: backupApi.restore,
    onSuccess: () => alert(t("backup.restoredOk")),
  });

  if (!currentCfg) return <p className="text-sm text-gray-400">{t("common.loading")}</p>;

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h3 className="font-semibold mb-3">{t("backup.configTitle")}</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={currentCfg.enabled}
              onChange={(e) => setCfg({ ...currentCfg, enabled: e.target.checked })} />
            {t("backup.enableAuto")}
          </label>
          <div>
            <label className="form-label">{t("backup.intervalLabel")}</label>
            <input type="number" min={1} value={currentCfg.intervalDays}
              onChange={(e) => setCfg({ ...currentCfg, intervalDays: parseInt(e.target.value) })} className="input" />
          </div>
          <div>
            <label className="form-label">{t("backup.maxLabel")}</label>
            <input type="number" min={1} value={currentCfg.maxBackups}
              onChange={(e) => setCfg({ ...currentCfg, maxBackups: parseInt(e.target.value) })} className="input" />
          </div>
          <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="btn-primary">{t("backup.saveSettings")}</button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">{t("backup.listTitle")}</h3>
          <button onClick={() => runMutation.mutate()} disabled={runMutation.isPending} className="btn-secondary text-sm">
            {t("backup.runNow")}
          </button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {(backupList ?? []).map((filename) => (
            <div key={filename} className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
              <span className="font-mono text-xs">{filename}</span>
              <button
                onClick={() => { if (confirm(t("backup.restoreConfirm"))) restoreMutation.mutate(filename); }}
                className="text-xs text-red-500 hover:text-red-700"
              >
                {t("backup.restoreBtn")}
              </button>
            </div>
          ))}
          {(backupList ?? []).length === 0 && <p className="text-sm text-gray-400">{t("backup.noBackups")}</p>}
        </div>
      </div>
    </div>
  );
}

function ServerSettingsTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ["server-settings"],
    queryFn: serverSettingsApi.get,
  });

  const mutation = useMutation({
    mutationFn: (enabled: boolean) => serverSettingsApi.update({ registrationEnabled: enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["server-settings"] }),
  });

  if (isLoading) return <p className="text-sm text-gray-400">{t("common.loading")}</p>;

  return (
    <div className="space-y-6 max-w-md">
      <h3 className="font-semibold">{t("server.title")}</h3>
      <div className="flex items-center justify-between px-4 py-4 rounded-lg border border-gray-200 dark:border-gray-700">
        <div>
          <p className="text-sm font-medium">{t("server.registrationLabel")}</p>
          <p className="text-xs text-gray-400 mt-0.5">{t("server.registrationDesc")}</p>
        </div>
        <button
          onClick={() => mutation.mutate(!data?.registrationEnabled)}
          disabled={mutation.isPending}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
            data?.registrationEnabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              data?.registrationEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      <p className="text-xs text-gray-400">{t("server.registrationNote")}</p>
    </div>
  );
}

function UsersTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const { t } = useTranslation();
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: usersApi.list });
  const [modalOpen, setModalOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("member");

  const createMutation = useMutation({
    mutationFn: () => usersApi.create({ username, password, role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setModalOpen(false); setUsername(""); setPassword(""); },
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  return (
    <div className="space-y-4 max-w-md">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t("users.title")}</h3>
        <button onClick={() => setModalOpen(true)} className="btn-primary text-sm">{t("users.addBtn")}</button>
      </div>
      <div className="space-y-2">
        {(users ?? []).map((u) => (
          <div key={u.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium">{u.username}</p>
              <p className="text-xs text-gray-400">{u.role}</p>
            </div>
            <button onClick={() => { if (confirm(t("users.deleteConfirm", { name: u.username }))) deleteMutation.mutate(u.id); }}
              className="text-xs text-red-400 hover:text-red-600">{t("common.delete")}</button>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={t("users.modalTitle")} size="sm">
        <div className="space-y-3">
          <div><label className="form-label">{t("login.username")}</label><input value={username} onChange={(e) => setUsername(e.target.value)} className="input" /></div>
          <div><label className="form-label">{t("users.password")}</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" /></div>
          <div>
            <label className="form-label">{t("users.role")}</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">{t("common.cancel")}</button>
            <button onClick={() => createMutation.mutate()} disabled={!username || !password} className="btn-primary">{t("common.add")}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
