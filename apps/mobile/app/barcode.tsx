import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { X } from "lucide-react-native";
import { booksApi } from "../lib/api";

export default function BarcodeScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);
    try {
      const meta = await booksApi.lookupISBN(data);
      router.back();
      router.setParams({ isbn: data, title: meta.title, authors: meta.authors?.join(", ") ?? "" });
    } catch {
      Alert.alert("見つかりません", `ISBN: ${data}\nこの書籍の情報が見つかりませんでした`, [
        { text: "再スキャン", onPress: () => setScanned(false) },
        { text: "戻る", onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return <View style={s.container}><ActivityIndicator /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={s.container}>
        <Text style={s.permText}>カメラへのアクセスが必要です</Text>
        <Pressable style={s.btn} onPress={requestPermission}>
          <Text style={s.btnText}>許可する</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "isbn13"] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      <View style={s.overlay}>
        <Pressable style={s.closeBtn} onPress={() => router.back()}>
          <X size={24} color="#fff" />
        </Pressable>
        <View style={s.frame} />
        <Text style={s.hint}>バーコードをフレームに合わせてください</Text>
        {loading && <ActivityIndicator color="#fff" size="large" style={{ marginTop: 16 }} />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" },
  permText: { color: "#fff", marginBottom: 16 },
  btn: { backgroundColor: "#2563EB", borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  btnText: { color: "#fff", fontWeight: "600" },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  closeBtn: { position: "absolute", top: 56, right: 20, padding: 8 },
  frame: { width: 260, height: 120, borderWidth: 2, borderColor: "#fff", borderRadius: 12 },
  hint: { color: "#fff", marginTop: 20, fontSize: 14 },
});
