import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../store/authStore";
import { apiClient } from "../lib/apiClient";
import { serverSettingsApi } from "../lib/api/misc";

const LANGUAGES: { code: string; label: string }[] = [
  { code: "ja", label: "日本語" },
  { code: "en", label: "English" },
];

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needTotp, setNeedTotp] = useState(false);
  const [error, setError] = useState("");
  const [registrationEnabled, setRegistrationEnabled] = useState(false);

  useEffect(() => {
    serverSettingsApi.get().then((s) => setRegistrationEnabled(s.registrationEnabled)).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const setupRes = await apiClient.get<{ needsSetup: boolean }>("/setup");
      if (setupRes.data.needsSetup) {
        navigate("/setup");
        return;
      }
      const res = await apiClient.post("/auth/login", {
        username,
        password,
        ...(needTotp && totpCode ? { totpCode } : {}),
      });
      setAuth(res.data.accessToken, res.data.refreshToken, res.data.user);
      navigate("/dashboard");
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "response" in err &&
        (err as { response?: { status?: number } }).response?.status === 428
      ) {
        setNeedTotp(true);
      } else {
        setError(t("login.error"));
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-light dark:bg-surface-dark">
      <div className="w-full max-w-sm bg-surface-elevated-light dark:bg-surface-elevated-dark rounded-xl shadow-sm p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Kakera Library</h1>
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
            <label className="block text-sm font-medium mb-1">{t("login.password")}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              required
            />
          </div>
          {needTotp && (
            <div>
              <label className="block text-sm font-medium mb-1">{t("login.totpCode")}</label>
              <input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value)}
                inputMode="numeric"
                maxLength={6}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
              />
            </div>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full py-2 px-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            {t("login.submit")}
          </button>
        </form>

        {registrationEnabled && (
          <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
            {t("login.noAccount")}{" "}
            <Link to="/register" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
              {t("login.signUp")}
            </Link>
          </p>
        )}

        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-center gap-2">
          <label className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{t("login.language")}</label>
          <select
            value={i18n.language}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
