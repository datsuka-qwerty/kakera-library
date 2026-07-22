import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Alert, ActivityIndicator, ScrollView } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { X, CheckCircle, ArrowRight, Trash2 } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { booksApi } from "../lib/api";
import { useBarcodeStore } from "../store/barcodeStore";
import { useAccent } from "../lib/theme";

export default function BarcodeScreen() {
  const { t } = useTranslation();
  const accent = useAccent();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [pendingIsbns, setPendingIsbns] = useState<Set<string>>(new Set());
  const { scannedBooks, addBook, removeBook, clear } = useBarcodeStore();

  useEffect(() => {
    clear();
  }, []);

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    const isbn = data.trim();
    if (!/^97[89]\d{10}$/.test(isbn)) return;
    if (
      scanning ||
      pendingIsbns.has(isbn) ||
      scannedBooks.some((b) => b.isbn === isbn)
    ) return;

    setPendingIsbns((prev) => new Set(prev).add(isbn));
    try {
      const meta = await booksApi.lookupISBN(isbn);
      addBook({
        isbn,
        title: meta.title,
        authors: meta.authors ?? [],
        coverImageUrl: meta.coverImageUrl,
        publisher: meta.publisher,
        googleBooksId: meta.googleBooksId,
        status: "want_to_read",
        rating: undefined,
        memo: "",
        tags: [],
        mediaTypes: [],
      });
    } catch {
      addBook({
        isbn,
        title: `ISBN: ${isbn}`,
        authors: [],
        status: "want_to_read",
        rating: undefined,
        memo: "",
        tags: [],
        mediaTypes: [],
      });
    } finally {
      setPendingIsbns((prev) => {
        const next = new Set(prev);
        next.delete(isbn);
        return next;
      });
    }
  };

  const goToRegister = () => {
    if (scannedBooks.length === 0) {
      Alert.alert(t("barcode.noBooks"), t("barcode.noBooksHint"));
      return;
    }
    router.push("/barcode-batch");
  };

  if (!permission) {
    return <View style={s.container}><ActivityIndicator color="#fff" /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={s.container}>
        <Text style={s.permText}>{t("barcode.permText")}</Text>
        <Pressable style={[s.btn, { backgroundColor: accent }]} onPress={requestPermission}>
          <Text style={s.btnText}>{t("barcode.allow")}</Text>
        </Pressable>
      </View>
    );
  }

  const totalPending = pendingIsbns.size;

  return (
    <View style={{ flex: 1 }}>
      <CameraView
        style={{ flex: 1 }}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8"] }}
        onBarcodeScanned={handleBarCodeScanned}
      />

      <View style={s.overlay} pointerEvents="box-none">
        <View style={s.topBar}>
          <Pressable style={s.closeBtn} onPress={() => { clear(); router.back(); }}>
            <X size={24} color="#fff" />
          </Pressable>
          <Text style={s.scanLabel}>{t("barcode.scanLabel")}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={s.frameArea}>
          <View style={s.frame} />
          <Text style={s.hint}>{t("barcode.hint")}</Text>
          {totalPending > 0 && (
            <View style={s.fetchingBadge}>
              <ActivityIndicator color="#fff" size="small" />
              <Text style={s.fetchingText}>{t("barcode.fetching")}</Text>
            </View>
          )}
        </View>

        <View style={s.bottomPanel} pointerEvents="box-none">
          {scannedBooks.length > 0 && (
            <ScrollView style={s.scannedList} keyboardShouldPersistTaps="handled">
              {scannedBooks.map((book) => (
                <View key={book.isbn} style={s.scannedItem}>
                  <CheckCircle size={16} color="#4ADE80" />
                  <Text style={s.scannedTitle} numberOfLines={1}>{book.title}</Text>
                  <Pressable onPress={() => removeBook(book.isbn)}>
                    <Trash2 size={16} color="#F87171" />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}

          <View style={s.bottomActions}>
            <Text style={s.countText}>
              {t("barcode.scanned", { n: scannedBooks.length })}
            </Text>
            <Pressable
              style={[s.registerBtn, { backgroundColor: accent }, scannedBooks.length === 0 && s.registerBtnDisabled]}
              onPress={goToRegister}
            >
              <Text style={s.registerBtnText}>{t("barcode.proceed")}</Text>
              <ArrowRight size={18} color="#fff" />
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  permText: { color: "#fff", marginBottom: 16, fontSize: 15 },
  btn: { borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 },
  btnText: { color: "#fff", fontWeight: "600" },
  overlay: { ...StyleSheet.absoluteFillObject, flexDirection: "column" },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 60, paddingHorizontal: 20, paddingBottom: 12 },
  closeBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  scanLabel: { color: "#fff", fontSize: 16, fontWeight: "600" },
  frameArea: { flex: 1, alignItems: "center", justifyContent: "center" },
  frame: { width: 260, height: 120, borderWidth: 2, borderColor: "#fff", borderRadius: 12 },
  hint: { color: "#fff", marginTop: 16, fontSize: 13, opacity: 0.9 },
  fetchingBadge: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  fetchingText: { color: "#fff", fontSize: 12 },
  bottomPanel: { backgroundColor: "rgba(0,0,0,0.75)", paddingBottom: 32 },
  scannedList: { maxHeight: 160, paddingHorizontal: 16, paddingTop: 12 },
  scannedItem: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(255,255,255,0.1)" },
  scannedTitle: { flex: 1, color: "#fff", fontSize: 13 },
  bottomActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 12 },
  countText: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  registerBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  registerBtnDisabled: { opacity: 0.4 },
  registerBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
