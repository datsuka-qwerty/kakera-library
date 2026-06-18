import { useTranslation } from "react-i18next";

export default function MoviesPage() {
  const { t } = useTranslation();
  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{t("nav.movies")}</h2>
      <p className="text-gray-500 text-sm">Coming soon</p>
    </div>
  );
}
