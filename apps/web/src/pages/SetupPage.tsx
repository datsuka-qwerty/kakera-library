import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { apiClient } from "../lib/apiClient";

export default function SetupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError(t("setup.errorTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("setup.errorMismatch"));
      return;
    }
    setLoading(true);
    try {
      await apiClient.post("/setup", { username, password });
      const res = await apiClient.post("/auth/login", { username, password });
      setAuth(res.data.accessToken, res.data.refreshToken, res.data.user);
      navigate("/dashboard");
    } catch {
      setError(t("setup.errorGeneral"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark">
      <div className="w-full max-w-sm bg-surface-elevated-light dark:bg-surface-elevated-dark rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-center">Kakera Library</h1>
        <p className="text-sm text-gray-500 text-center mt-1 mb-6">{t("setup.subtitle")}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t("login.username")}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("setup.password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t("setup.passwordConfirm")}</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? t("setup.creating") : t("setup.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}
