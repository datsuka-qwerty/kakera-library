import { View, Image } from "react-native";
import { ImageOff } from "lucide-react-native";
import { useAuthStore } from "../../store/authStore";

interface Props {
  src?: string | null;
  alt?: string;
  width?: number;
  height?: number;
}

export default function CoverImage({ src, width = 48, height = 64 }: Props) {
  const serverUrl = useAuthStore((s) => s.serverUrl);

  // Resolve server-relative URLs (e.g. /api/v1/images/...) to absolute URLs
  // so React Native's Image component can fetch them.
  const resolvedSrc = src?.startsWith("/")
    ? `${serverUrl.replace(/\/$/, "")}${src}`
    : src;

  if (!resolvedSrc) {
    return (
      <View style={{ width, height, borderRadius: 6, backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center" }}>
        <ImageOff size={16} color="#9CA3AF" />
      </View>
    );
  }
  return (
    <Image source={{ uri: resolvedSrc }} style={{ width, height, borderRadius: 6, resizeMode: "cover" }} />
  );
}
