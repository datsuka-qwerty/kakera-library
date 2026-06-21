import { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, LogOut, Camera } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/authStore";
import { authApi } from "../lib/api/auth";
import { usersApi } from "../lib/api/misc";

interface Props {
  onClose: () => void;
}

export default function ProfilePopover({ onClose }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, refreshToken, clearAuth, updateUser } = useAuthStore();
  const popoverRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const handleLogout = async () => {
    if (refreshToken) {
      try { await authApi.logout(refreshToken); } catch { /* ignore */ }
    }
    qc.clear();
    clearAuth();
    navigate("/login");
    onClose();
  };

  const handleSettings = () => {
    navigate("/settings");
    onClose();
  };

  const handleAvatarSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

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
        } catch { /* ignore */ }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div
      ref={popoverRef}
      className="absolute bottom-full left-2 right-2 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
    >
      {/* Avatar + user info */}
      <div className="flex flex-col items-center pt-5 pb-4 px-4 gap-2">
        <div className="relative group">
          <button
            onClick={() => fileRef.current?.click()}
            className="w-16 h-16 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center ring-2 ring-offset-2 ring-transparent group-hover:ring-gray-400 transition-all"
            title="アイコンを変更"
          >
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-gray-500 dark:text-gray-300 select-none">
                {user?.username?.[0]?.toUpperCase()}
              </span>
            )}
          </button>
          <div className="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none transition-opacity">
            <Camera size={18} className="text-white" />
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
        <div className="text-center">
          <p className="font-semibold text-sm">{user?.username}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            {user?.role}
          </span>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleSettings}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <Settings size={15} />
          設定
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <LogOut size={15} />
          ログアウト
        </button>
      </div>
    </div>
  );
}
