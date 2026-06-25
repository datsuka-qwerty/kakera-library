import { useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { apiClient } from "./lib/apiClient";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import SetupPage from "./pages/SetupPage";
import DashboardPage from "./pages/DashboardPage";
import BooksPage from "./pages/BooksPage";
import MoviesPage from "./pages/MoviesPage";
import DramasPage from "./pages/DramasPage";
import SettingsPage from "./pages/SettingsPage";
import SharingPage from "./pages/SharingPage";
import SharedDashboardPage from "./pages/SharedDashboardPage";

function SetupGuard() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/setup") return;
    apiClient.get<{ needsSetup: boolean }>("/setup").then((res) => {
      if (res.data.needsSetup) navigate("/setup", { replace: true });
    });
  }, []);

  return null;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.accessToken);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <>
      <SetupGuard />
      <Routes>
        <Route path="/setup" element={<SetupPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="dashboard/shared/:username" element={<SharedDashboardPage />} />
          <Route path="books" element={<BooksPage />} />
          <Route path="movies" element={<MoviesPage />} />
          <Route path="dramas" element={<DramasPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="sharing" element={<SharingPage />} />
        </Route>
      </Routes>
    </>
  );
}
