import { View, Pressable } from "react-native";
import { Star } from "lucide-react-native";

interface Props {
  value?: number | null;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: number;
}

export default function StarRating({ value, onChange, readonly, size = 20 }: Props) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable key={n} onPress={() => !readonly && onChange?.(n)} disabled={readonly}>
          <Star
            size={size}
            color={n <= (value ?? 0) ? "#FBBF24" : "#D1D5DB"}
            fill={n <= (value ?? 0) ? "#FBBF24" : "transparent"}
          />
        </Pressable>
      ))}
    </View>
  );
}
