import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { authApi } from "../lib/api/auth";
import { mediaTypesApi, sharingApi, backupApi, usersApi, exportImportApi } from "../lib/api/misc";
import { useAuthStore } from "../store/authStore";
import Modal from "../components/ui/Modal";
import clsx from "clsx";

type Tab = "profile" | "security" | "sharing" | "mediaTypes" | "data" | "backup" | "users";

const CATEGORIES = ["book", "movie", "drama"] as const;
const CATEGORY_LABELS = { book: "本", movie: "映画", drama: "ドラマ" };

export default function SettingsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { user, clearAuth } = useAuthStore();
  const [tab, setTab] = useState<Tab>("profile");

  const tabs: { key: Tab; label: string; adminOnly?: boolean }[] = [
    { key: "profile", label: "プロフィール" },
    { key: "security", label: "セキュリティ" },
    { key: "sharing", label: "共有" },
    { key: "mediaTypes", label: "メディアタイプ" },
    { key: "data", label: "データ" },
    { key: "backup", label: "バックアップ", adminOnly: true },
    { key: "users", label: "ユーザー管理", adminOnly: true },
  ].filter((t) => !t.adminOnly || user?.role === "admin");

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">{t("nav.settings")}</h2>
      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="w-44 flex-shrink-0 space-y-0.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={clsx(
                "w-full text-left px-3 py-2 text-sm rounded-lg transition-colors",
                tab === t.key
                  ? "bg-gray-200 dark:bg-gray-700 font-medium"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {tab === "profile" && <ProfileTab user={user} clearAuth={clearAuth} />}
          {tab === "security" && <SecurityTab />}
          {tab === "sharing" && <SharingTab />}
          {tab === "mediaTypes" && <MediaTypesTab qc={qc} />}
          {tab === "data" && <DataTab />}
          {tab === "backup" && <BackupTab />}
          {tab === "users" && <UsersTab qc={qc} />}
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ user, clearAuth }: { user: ReturnType<typeof useAuthStore>["user"]; clearAuth: () => void }) {
  const [email, setEmail] = useState(user?.email ?? "");
  const [password, setPassword] = useState("");
  const updateMutation = useMutation({
    mutationFn: () => usersApi.update(user!.id, { email: email || undefined, password: password || undefined }),
    onSuccess: () => { setPassword(""); alert("保存しました"); },
  });

  return (
    <div className="space-y-4 max-w-sm">
      <h3 className="font-semibold">プロフィール</h3>
      <div>
        <label className="form-label">ユーザー名</label>
        <input value={user?.username ?? ""} disabled className="input opacity-60" />
      </div>
      <div>
        <label className="form-label">メールアドレス</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
      </div>
      <div>
        <label className="form-label">新しいパスワード（変更する場合のみ）</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="btn-primary">
          保存
        </button>
        <button onClick={clearAuth} className="btn-danger">ログアウト</button>
      </div>
    </div>
  );
}

function SecurityTab() {
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
      <h3 className="font-semibold">2要素認証（Google Authenticator）</h3>
      {phase === "idle" && (
        <button onClick={() => setupMutation.mutate()} disabled={setupMutation.isPending} className="btn-primary">
          TOTPを設定する
        </button>
      )}
      {phase === "setup" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">Google AuthenticatorでQRコードをスキャンしてください</p>
          {qrUrl && <img src={qrUrl} alt="TOTP QR" className="w-48 h-48 border rounded" />}
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="6桁のコードを入力"
            maxLength={6}
            inputMode="numeric"
            className="input"
          />
          <button onClick={() => verifyMutation.mutate()} disabled={verifyMutation.isPending || code.length !== 6} className="btn-primary">
            確認して有効化
          </button>
        </div>
      )}
      {phase === "done" && <p className="text-sm text-green-600">TOTPが有効になりました</p>}
      <hr className="border-gray-200 dark:border-gray-700" />
      <div>
        <p className="text-sm text-gray-500 mb-2">TOTPを無効にする場合</p>
        <button onClick={() => disableMutation.mutate()} disabled={disableMutation.isPending} className="btn-danger">
          TOTP無効化
        </button>
      </div>
    </div>
  );
}

function SharingTab() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { data: allUsers } = useQuery({ queryKey: ["users"], queryFn: usersApi.list });
  const { data: dashShares } = useQuery({ queryKey: ["dashboardShares"], queryFn: sharingApi.listDashboardShares });
  const { data: ratingShares } = useQuery({ queryKey: ["ratingShares"], queryFn: sharingApi.listRatingShares });

  const others = allUsers?.filter((u) => u.id !== user?.id) ?? [];

  const toggleDashShare = async (targetId: string, enabled: boolean) => {
    if (enabled) await sharingApi.setDashboardShare(targetId);
    else await sharingApi.removeDashboardShare(targetId);
    qc.invalidateQueries({ queryKey: ["dashboardShares"] });
  };

  const toggleRatingShare = async (targetId: string, enabled: boolean) => {
    await sharingApi.setRatingShare(targetId, enabled);
    qc.invalidateQueries({ queryKey: ["ratingShares"] });
  };

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h3 className="font-semibold mb-1">ダッシュボード共有</h3>
        <p className="text-xs text-gray-400 mb-3">ONにしたユーザーはあなたのダッシュボードを閲覧できます</p>
        <div className="space-y-2">
          {others.map((u) => {
            const shared = dashShares?.some((s) => s.userId === u.id) ?? false;
            return (
              <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={shared} onChange={(e) => toggleDashShare(u.id, e.target.checked)} className="w-4 h-4" />
                    {u.username}
                  </label>
                </div>
                <button
                  onClick={() => navigate(`/dashboard/shared/${u.id}`)}
                  className="text-xs text-blue-500 hover:underline"
                >
                  ダッシュボードを見る →
                </button>
              </div>
            );
          })}
          {others.length === 0 && <p className="text-sm text-gray-400">他のユーザーがいません</p>}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-1">評価の共有</h3>
        <p className="text-xs text-gray-400 mb-3">ONにしたユーザーはあなたの評価を閲覧できます（一方向）</p>
        <div className="space-y-2">
          {others.map((u) => {
            const share = ratingShares?.find((s) => s.toUserId === u.id);
            const enabled = share?.enabled ?? false;
            return (
              <label key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer">
                <span className="text-sm">{u.username}</span>
                <input type="checkbox" checked={enabled} onChange={(e) => toggleRatingShare(u.id, e.target.checked)} className="w-4 h-4" />
              </label>
            );
          })}
          {others.length === 0 && <p className="text-sm text-gray-400">他のユーザーがいません</p>}
        </div>
      </div>
    </div>
  );
}

function MediaTypesTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
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
      <h3 className="font-semibold">メディアタイプ管理</h3>
      <div className="flex gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="input w-auto text-sm">
          {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
        </select>
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="新しいメディアタイプ" className="input flex-1 text-sm" />
        <button onClick={() => createMutation.mutate()} disabled={!newName.trim()} className="btn-primary px-3 text-sm">追加</button>
      </div>

      {CATEGORIES.map((cat) => {
        const catTypes = types?.filter((t) => t.category === cat) ?? [];
        return (
          <div key={cat}>
            <p className="text-xs font-medium text-gray-500 mb-1">{CATEGORY_LABELS[cat]}</p>
            <div className="flex flex-wrap gap-2">
              {catTypes.map((t) => (
                <span key={t.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-gray-200 dark:border-gray-700">
                  {t.name}
                  {!t.isDefault && (
                    <button onClick={() => deleteMutation.mutate(t.id)} className="text-gray-400 hover:text-red-500 ml-0.5">×</button>
                  )}
                  {t.isDefault && <span className="text-gray-300 ml-0.5">🔒</span>}
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
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportImportApi.exportData();
    } catch {
      alert("エクスポートに失敗しました");
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("現在のデータにインポートしますか？既存データと重複するIDはスキップされます。")) {
      e.target.value = "";
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      await exportImportApi.importData(file);
      setImportResult("インポートが完了しました");
    } catch {
      setImportResult("インポートに失敗しました");
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h3 className="font-semibold mb-1">データのエクスポート</h3>
        <p className="text-xs text-gray-400 mb-3">書籍・映画・ドラマのデータをJSONファイルとしてダウンロードします</p>
        <button onClick={handleExport} disabled={exporting} className="btn-primary">
          {exporting ? "エクスポート中..." : "JSONでエクスポート"}
        </button>
      </div>
      <hr className="border-gray-200 dark:border-gray-700" />
      <div>
        <h3 className="font-semibold mb-1">データのインポート</h3>
        <p className="text-xs text-gray-400 mb-3">エクスポートしたJSONファイルからデータを復元します</p>
        <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
        <button onClick={() => fileRef.current?.click()} disabled={importing} className="btn-secondary">
          {importing ? "インポート中..." : "JSONファイルを選択"}
        </button>
        {importResult && (
          <p className={`text-sm mt-2 ${importResult.includes("失敗") ? "text-red-500" : "text-green-600"}`}>
            {importResult}
          </p>
        )}
      </div>
    </div>
  );
}

function BackupTab() {
  const { data: config, refetch: refetchConfig } = useQuery({ queryKey: ["backupConfig"], queryFn: backupApi.getConfig });
  const { data: backupList, refetch: refetchList } = useQuery({ queryKey: ["backupList"], queryFn: backupApi.list });
  const [cfg, setCfg] = useState<typeof config>(undefined);
  const currentCfg = cfg ?? config;

  const updateMutation = useMutation({
    mutationFn: () => backupApi.updateConfig(currentCfg!),
    onSuccess: () => { refetchConfig(); alert("設定を保存しました"); },
  });

  const runMutation = useMutation({
    mutationFn: backupApi.run,
    onSuccess: () => { refetchList(); alert("バックアップを作成しました"); },
  });

  const restoreMutation = useMutation({
    mutationFn: backupApi.restore,
    onSuccess: () => alert("リストアが完了しました"),
  });

  if (!currentCfg) return <p className="text-sm text-gray-400">読み込み中...</p>;

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h3 className="font-semibold mb-3">バックアップ設定</h3>
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={currentCfg.enabled}
              onChange={(e) => setCfg({ ...currentCfg, enabled: e.target.checked })} className="w-4 h-4" />
            自動バックアップを有効にする
          </label>
          <div>
            <label className="form-label">バックアップ間隔（日）</label>
            <input type="number" min={1} value={currentCfg.intervalDays}
              onChange={(e) => setCfg({ ...currentCfg, intervalDays: parseInt(e.target.value) })} className="input" />
          </div>
          <div>
            <label className="form-label">保存するバックアップ数</label>
            <input type="number" min={1} value={currentCfg.maxBackups}
              onChange={(e) => setCfg({ ...currentCfg, maxBackups: parseInt(e.target.value) })} className="input" />
          </div>
          <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} className="btn-primary">設定を保存</button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold">バックアップ一覧</h3>
          <button onClick={() => runMutation.mutate()} disabled={runMutation.isPending} className="btn-secondary text-sm">
            今すぐバックアップ
          </button>
        </div>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {(backupList ?? []).map((filename) => (
            <div key={filename} className="flex items-center justify-between px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm">
              <span className="font-mono text-xs">{filename}</span>
              <button
                onClick={() => { if (confirm("このバックアップからリストアしますか？現在のデータは上書きされます。")) restoreMutation.mutate(filename); }}
                className="text-xs text-red-500 hover:text-red-700"
              >
                リストア
              </button>
            </div>
          ))}
          {(backupList ?? []).length === 0 && <p className="text-sm text-gray-400">バックアップがありません</p>}
        </div>
      </div>
    </div>
  );
}

function UsersTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const { data: users } = useQuery({ queryKey: ["users"], queryFn: usersApi.list });
  const [modalOpen, setModalOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("member");

  const createMutation = useMutation({
    mutationFn: () => usersApi.create({ username, email, password, role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["users"] }); setModalOpen(false); setUsername(""); setEmail(""); setPassword(""); },
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });

  return (
    <div className="space-y-4 max-w-md">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">ユーザー管理</h3>
        <button onClick={() => setModalOpen(true)} className="btn-primary text-sm">ユーザー追加</button>
      </div>
      <div className="space-y-2">
        {(users ?? []).map((u) => (
          <div key={u.id} className="flex items-center justify-between px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium">{u.username}</p>
              <p className="text-xs text-gray-400">{u.email} · {u.role}</p>
            </div>
            <button onClick={() => { if (confirm(`「${u.username}」を削除しますか？`)) deleteMutation.mutate(u.id); }}
              className="text-xs text-red-400 hover:text-red-600">削除</button>
          </div>
        ))}
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="ユーザーを追加" size="sm">
        <div className="space-y-3">
          <div><label className="form-label">ユーザー名</label><input value={username} onChange={(e) => setUsername(e.target.value)} className="input" /></div>
          <div><label className="form-label">メールアドレス</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" /></div>
          <div><label className="form-label">パスワード</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" /></div>
          <div>
            <label className="form-label">ロール</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="input">
              <option value="member">member</option>
              <option value="admin">admin</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setModalOpen(false)} className="btn-secondary">キャンセル</button>
            <button onClick={() => createMutation.mutate()} disabled={!username || !email || !password} className="btn-primary">追加</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
