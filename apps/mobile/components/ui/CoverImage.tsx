import { View, Image } from "react-native";
import { ImageOff } from "lucide-react-native";

interface Props {
  src?: string | null;
  alt?: string;
  width?: number;
  height?: number;
}

export default function CoverImage({ src, width = 48, height = 64 }: Props) {
  if (!src) {
    return (
      <View style={{ width, height, borderRadius: 6, backgroundColor: "#E5E7EB", alignItems: "center", justifyContent: "center" }}>
        <ImageOff size={16} color="#9CA3AF" />
      </View>
    );
  }
  return (
    <Image source={{ uri: src }} style={{ width, height, borderRadius: 6, resizeMode: "cover" }} />
  );
}
