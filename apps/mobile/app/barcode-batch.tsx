import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  TextInput, Alert, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { X, ChevronDown, ChevronUp, Plus } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { booksApi, mediaTypesApi } from "../lib/api";
import type { BookStatus } from "@kakera/shared";
import CoverImage from "../components/ui/CoverImage";
import StarRating from "../components/ui/StarRating";
import { useBarcodeStore } from "../store/barcodeStore";
import { useAccent } from "../lib/theme";

const BOOK_STATUS_VALUES: BookStatus[] = ["want_to_read", "reading", "completed", "on_hold"];

export default function BarcodeBatchScreen() {
  const { t } = useTranslation();
  const accent = useAccent();
  const insets = useSafeAreaInsets();
  const { scannedBooks, updateBook, removeBook, clear } = useBarcodeStore();
  const [expandedIsbn, setExpandedIsbn] = useState<string | null>(
    scannedBooks.length > 0 ? scannedBooks[0].isbn : null
  );
  const [saving, setSaving] = useState(false);
  const [availableMediaTypes, setAvailableMediaTypes] = useState<{ id: string; name: string }[]>([]);
  const [tagInputs, setTagInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    mediaTypesApi.list().then((all) =>
      setAvailableMediaTypes(all.filter((m) => m.category === "book"))
    ).catch(() => {});
  }, []);

  const saveAll = async () => {
    if (scannedBooks.length === 0) return;
    setSaving(true);
    const errors: string[] = [];
    for (const book of scannedBooks) {
      try {
        await booksApi.create({
          title: book.title,
          authors: book.authors,
          isbn: book.isbn,
          publisher: book.publisher,
          coverImageUrl: book.coverImageUrl,
          googleBooksId: book.googleBooksId,
          status: book.status,
          rating: book.rating,
          memo: book.memo || undefined,
          tags: book.tags,
          mediaTypes: book.mediaTypes,
        });
      } catch {
        errors.push(book.title);
      }
    }
    setSaving(false);
    if (errors.length > 0) {
      Alert.alert(t("barcode.partialFail"), t("barcode.partialFailMsg", { books: errors.join("\n") }));
    } else {
      Alert.alert(t("barcode.completed"), t("barcode.completedMsg", { n: scannedBooks.length }), [
        { text: "OK", onPress: () => { clear(); router.back(); router.back(); } },
      ]);
    }
  };

  const addTag = (isbn: string) => {
    const v = (tagInputs[isbn] ?? "").trim();
    if (!v) return;
    const book = scannedBooks.find((b) => b.isbn === isbn);
    if (!book) return;
    if (!book.tags.includes(v)) updateBook(isbn, { tags: [...book.tags, v] });
    setTagInputs((prev) => ({ ...prev, [isbn]: "" }));
  };

  const removeTag = (isbn: string, tag: string) => {
    const book = scannedBooks.find((b) => b.isbn === isbn);
    if (!book) return;
    updateBook(isbn, { tags: book.tags.filter((tg) => tg !== tag) });
  };

  const toggleMediaType = (isbn: string, name: string) => {
    const book = scannedBooks.find((b) => b.isbn === isbn);
    if (!book) return;
    updateBook(isbn, {
      mediaTypes: book.mediaTypes.includes(name)
        ? book.mediaTypes.filter((x) => x !== name)
        : [...book.mediaTypes, name],
    });
  };

  if (scannedBooks.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F5F0E8", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: "#6B7280" }}>{t("barcode.noScanned")}</Text>
        <Pressable style={[s.doneBtn, { backgroundColor: accent, marginTop: 16 }]} onPress={() => router.back()}>
          <Text style={s.doneBtnText}>{t("barcode.back")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F0E8" }}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()}><X size={22} color="#374151" /></Pressable>
        <Text style={s.headerTitle}>{t("barcode.batchTitle", { n: scannedBooks.length })}</Text>
        <Pressable onPress={saveAll} disabled={saving}>
          <Text style={[s.saveText, { color: accent }]}>
            {saving ? t("barcode.registering") : t("barcode.registerAll")}
          </Text>
        </Pressable>
      </View>

      {saving && (
        <View style={s.savingOverlay}>
          <ActivityIndicator color={accent} size="large" />
          <Text style={s.savingText}>{t("barcode.registering")}</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}>
        {scannedBooks.map((book) => {
          const expanded = expandedIsbn === book.isbn;
          return (
            <View key={book.isbn} style={s.card}>
              <Pressable style={s.cardHeader} onPress={() => setExpandedIsbn(expanded ? null : book.isbn)}>
                <CoverImage src={book.coverImageUrl} width={44} height={60} />
                <View style={{ flex: 1 }}>
                  <Text style={s.bookTitle} numberOfLines={2}>{book.title}</Text>
                  {book.authors.length > 0 && (
                    <Text style={s.bookSub} numberOfLines={1}>{book.authors.join(", ")}</Text>
                  )}
                  <Text style={[s.statusLabel, { color: accent }]}>
                    {t(`status.${book.status}`, { defaultValue: book.status })}
                    {book.rating != null ? `  ★${book.rating}` : ""}
                  </Text>
                </View>
                <View style={{ flexDirection: "column", alignItems: "center", gap: 4 }}>
                  {expanded ? <ChevronUp size={18} color="#6B7280" /> : <ChevronDown size={18} color="#6B7280" />}
                  <Pressable onPress={() => removeBook(book.isbn)}>
                    <X size={16} color="#B91C1C" />
                  </Pressable>
                </View>
              </Pressable>

              {expanded && (
                <View style={s.expandedForm}>
                  <Text style={f.label}>{t("content.fieldStatus")}</Text>
                  <View style={f.chipRow}>
                    {BOOK_STATUS_VALUES.map((sv) => (
                      <Pressable
                        key={sv}
                        style={[f.chip, book.status === sv && { backgroundColor: accent }]}
                        onPress={() => updateBook(book.isbn, { status: sv })}
                      >
                        <Text style={[f.chipText, book.status === sv && { color: "#fff" }]}>
                          {t(`status.${sv}`)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {availableMediaTypes.length > 0 && (
                    <>
                      <Text style={f.label}>{t("content.fieldMediaTypes")}</Text>
                      <View style={f.chipRow}>
                        {availableMediaTypes.map((m) => (
                          <Pressable
                            key={m.id}
                            style={[f.chip, book.mediaTypes.includes(m.name) && { backgroundColor: accent }]}
                            onPress={() => toggleMediaType(book.isbn, m.name)}
                          >
                            <Text style={[f.chipText, book.mediaTypes.includes(m.name) && { color: "#fff" }]}>{m.name}</Text>
                          </Pressable>
                        ))}
                      </View>
                    </>
                  )}

                  <Text style={f.label}>{t("content.fieldRating")}</Text>
                  <StarRating
                    value={book.rating}
                    onChange={(v) => updateBook(book.isbn, { rating: v })}
                    size={26}
                  />

                  <Text style={f.label}>{t("content.fieldTags")}</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput
                      style={[f.input, { flex: 1 }]}
                      value={tagInputs[book.isbn] ?? ""}
                      onChangeText={(v) => setTagInputs((prev) => ({ ...prev, [book.isbn]: v }))}
                      placeholder={t("content.tagPlaceholder")}
                      placeholderTextColor="#9CA3AF"
                      onSubmitEditing={() => addTag(book.isbn)}
                      returnKeyType="done"
                    />
                    <Pressable style={[f.iconBtn, { backgroundColor: accent }]} onPress={() => addTag(book.isbn)}>
                      <Plus size={16} color="#fff" />
                    </Pressable>
                  </View>
                  {book.tags.length > 0 && (
                    <View style={f.chipRow}>
                      {book.tags.map((tag) => (
                        <Pressable key={tag} style={f.tagChip} onPress={() => removeTag(book.isbn, tag)}>
                          <Text style={f.tagText}>{tag}</Text>
                          <X size={11} color="#374151" />
                        </Pressable>
                      ))}
                    </View>
                  )}

                  <Text style={f.label}>{t("content.fieldMemo")}</Text>
                  <TextInput
                    style={[f.input, { height: 64 }]}
                    value={book.memo}
                    onChangeText={(v) => updateBook(book.isbn, { memo: v })}
                    multiline
                    textAlignVertical="top"
                    placeholder={t("content.memoPlaceholder")}
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
              )}
            </View>
          );
        })}

        <Pressable style={[s.doneBtn, { backgroundColor: accent }]} onPress={saveAll} disabled={saving}>
          <Text style={s.doneBtnText}>
            {saving ? t("barcode.registering") : t("barcode.registerBtn", { n: scannedBooks.length })}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#F5F0E8" },
  headerTitle: { fontSize: 15, fontWeight: "600", color: "#111827" },
  saveText: { fontWeight: "600", fontSize: 14 },
  savingOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(245,240,232,0.85)", zIndex: 10, alignItems: "center", justifyContent: "center", gap: 12 },
  savingText: { fontSize: 14, color: "#374151" },
  card: { backgroundColor: "#fff", borderRadius: 14, overflow: "hidden", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardHeader: { flexDirection: "row", gap: 12, padding: 12, alignItems: "flex-start" },
  bookTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  bookSub: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  statusLabel: { fontSize: 12, fontWeight: "500", marginTop: 4 },
  expandedForm: { padding: 12, paddingTop: 0, gap: 12, borderTopWidth: 1, borderTopColor: "#F3F4F6" },
  doneBtn: { borderRadius: 12, padding: 16, alignItems: "center" },
  doneBtnText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});

const f = StyleSheet.create({
  label: { fontSize: 12, color: "#6B7280" },
  input: { backgroundColor: "#F9F9F9", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 8, padding: 10, fontSize: 14, color: "#111827" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: "#E5E7EB" },
  chipText: { fontSize: 12, color: "#374151" },
  tagChip: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "#E5E7EB" },
  tagText: { fontSize: 11, color: "#374151" },
  iconBtn: { borderRadius: 8, padding: 10, alignItems: "center", justifyContent: "center" },
});
