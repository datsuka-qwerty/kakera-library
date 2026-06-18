import { useState, useCallback } from "react";
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  Modal, ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { Plus, Search, X, Camera } from "lucide-react-native";
import { router } from "expo-router";
import { booksApi } from "../../lib/api";
import type { Book, BookStatus } from "@kakera/shared";
import StatusBadge from "../../components/ui/StatusBadge";
import StarRating from "../../components/ui/StarRating";
import CoverImage from "../../components/ui/CoverImage";

const STATUSES = [
  { value: "", label: "すべて" },
  { value: "want_to_read", label: "読みたい" },
  { value: "reading", label: "読書中" },
  { value: "completed", label: "読了" },
  { value: "on_hold", label: "積読" },
];

export default function BooksScreen() {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await booksApi.list({ search, status, perPage: 100 });
      setBooks(res.data);
    } catch {
      Alert.alert("エラー", "読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (b: Book) => { setEditing(b); setModalOpen(true); };
  const onSaved = () => { setModalOpen(false); load(); };

  return (
    <View style={s.container}>
      <View style={s.toolbar}>
        <View style={s.searchRow}>
          <Search size={16} color="#9CA3AF" style={{ position: "absolute", left: 10, zIndex: 1 }} />
          <TextInput
            style={s.searchInput}
            placeholder="タイトル・著者で検索"
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={load}
            returnKeyType="search"
          />
        </View>
        <Pressable style={s.addBtn} onPress={openAdd}>
          <Plus size={20} color="#fff" />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {STATUSES.map((st) => (
          <Pressable
            key={st.value}
            style={[s.filterChip, status === st.value && s.filterChipActive]}
            onPress={() => { setStatus(st.value); }}
          >
            <Text style={[s.filterChipText, status === st.value && s.filterChipTextActive]}>{st.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={books}
          keyExtractor={(b) => b.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <Pressable style={s.card} onPress={() => openEdit(item)}>
              <CoverImage src={item.coverImageUrl} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={s.cardTitle} numberOfLines={2}>{item.title}</Text>
                {item.authors?.length > 0 && <Text style={s.cardSub}>{item.authors.join(", ")}</Text>}
                <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                  <StatusBadge status={item.status} />
                  {item.rating != null && <StarRating value={item.rating} readonly size={14} />}
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={s.empty}>書籍がありません</Text>}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <BookForm
          initial={editing}
          onCancel={() => setModalOpen(false)}
          onSaved={onSaved}
        />
      </Modal>
    </View>
  );
}

interface FormProps { initial: Book | null; onCancel: () => void; onSaved: () => void; }

function BookForm({ initial, onCancel, onSaved }: FormProps) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [authors, setAuthors] = useState(initial?.authors?.join(", ") ?? "");
  const [status, setStatus] = useState(initial?.status ?? "want_to_read");
  const [rating, setRating] = useState(initial?.rating ?? undefined);
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [isbn, setIsbn] = useState(initial?.isbn ?? "");
  const [metaResults, setMetaResults] = useState<{ googleBooksId: string; title: string; authors: string[]; isbn?: string; coverImageUrl?: string }[]>([]);
  const [metaSearch, setMetaSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const searchMeta = async () => {
    if (!metaSearch.trim()) return;
    setSearching(true);
    try {
      const res = await booksApi.searchMeta(metaSearch);
      setMetaResults(res);
    } catch {
      Alert.alert("エラー", "メタデータ検索に失敗しました");
    } finally {
      setSearching(false);
    }
  };

  const applyMeta = (m: typeof metaResults[0]) => {
    setTitle(m.title);
    setAuthors(m.authors.join(", "));
    if (m.isbn) setIsbn(m.isbn);
    setMetaResults([]);
    setMetaSearch("");
  };

  const save = async () => {
    if (!title.trim()) { Alert.alert("エラー", "タイトルは必須です"); return; }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        authors: authors.split(",").map((a) => a.trim()).filter(Boolean),
        status,
        rating: rating ?? undefined,
        memo: memo.trim() || undefined,
        isbn: isbn.trim() || undefined,
      };
      if (initial) {
        await booksApi.update(initial.id, payload);
      } else {
        await booksApi.create(payload as Parameters<typeof booksApi.create>[0]);
      }
      onSaved();
    } catch {
      Alert.alert("エラー", "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const del = async () => {
    Alert.alert("削除確認", "この書籍を削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除", style: "destructive", onPress: async () => {
          await booksApi.delete(initial!.id);
          onSaved();
        },
      },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F5F0E8" }}>
      <View style={f.header}>
        <Pressable onPress={onCancel}><X size={22} color="#374151" /></Pressable>
        <Text style={f.headerTitle}>{initial ? "書籍を編集" : "書籍を追加"}</Text>
        <Pressable onPress={save} disabled={saving}>
          <Text style={f.saveText}>{saving ? "保存中..." : "保存"}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Text style={f.sectionTitle}>Google Booksで検索</Text>
        <View style={f.metaRow}>
          <TextInput
            style={[f.input, { flex: 1 }]}
            placeholder="タイトルや著者名で検索"
            value={metaSearch}
            onChangeText={setMetaSearch}
          />
          <Pressable style={f.searchBtn} onPress={searchMeta}>
            {searching ? <ActivityIndicator color="#fff" size="small" /> : <Search size={16} color="#fff" />}
          </Pressable>
          <Pressable style={f.cameraBtn} onPress={() => router.push("/barcode")}>
            <Camera size={16} color="#fff" />
          </Pressable>
        </View>

        {metaResults.length > 0 && (
          <View style={f.metaList}>
            {metaResults.slice(0, 5).map((m) => (
              <Pressable key={m.googleBooksId} style={f.metaItem} onPress={() => applyMeta(m)}>
                <CoverImage src={m.coverImageUrl} width={36} height={48} />
                <View style={{ flex: 1 }}>
                  <Text style={f.metaTitle} numberOfLines={2}>{m.title}</Text>
                  <Text style={f.metaSub}>{m.authors.join(", ")}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={f.label}>タイトル *</Text>
        <TextInput style={f.input} value={title} onChangeText={setTitle} />
        <Text style={f.label}>著者（カンマ区切り）</Text>
        <TextInput style={f.input} value={authors} onChangeText={setAuthors} />
        <Text style={f.label}>ISBN</Text>
        <TextInput style={f.input} value={isbn} onChangeText={setIsbn} keyboardType="number-pad" />
        <Text style={f.label}>ステータス</Text>
        <View style={f.statusRow}>
          {STATUSES.filter((st) => st.value).map((st) => (
            <Pressable
              key={st.value}
              style={[f.statusChip, status === st.value && f.statusChipActive]}
              onPress={() => setStatus(st.value as BookStatus)}
            >
              <Text style={[f.statusChipText, status === st.value && f.statusChipTextActive]}>{st.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={f.label}>評価</Text>
        <StarRating value={rating} onChange={setRating} size={28} />
        <Text style={f.label}>メモ</Text>
        <TextInput style={[f.input, { height: 80 }]} value={memo} onChangeText={setMemo} multiline />

        {initial && (
          <Pressable style={f.deleteBtn} onPress={del}>
            <Text style={f.deleteBtnText}>削除</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F0E8" },
  toolbar: { flexDirection: "row", padding: 12, gap: 8, alignItems: "center" },
  searchRow: { flex: 1, position: "relative" },
  searchInput: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, paddingLeft: 32, paddingRight: 12, paddingVertical: 8, fontSize: 14 },
  addBtn: { backgroundColor: "#111827", borderRadius: 10, padding: 10 },
  filterRow: { flexGrow: 0, marginBottom: 4 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "#E5E7EB" },
  filterChipActive: { backgroundColor: "#111827" },
  filterChipText: { fontSize: 13, color: "#374151" },
  filterChipTextActive: { color: "#fff" },
  card: { flexDirection: "row", gap: 12, backgroundColor: "#fff", borderRadius: 12, padding: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  cardTitle: { fontSize: 14, fontWeight: "600", color: "#111827" },
  cardSub: { fontSize: 12, color: "#6B7280" },
  empty: { textAlign: "center", color: "#9CA3AF", marginTop: 40 },
});

const f = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "#E5E7EB", backgroundColor: "#fff" },
  headerTitle: { fontSize: 16, fontWeight: "600" },
  saveText: { color: "#2563EB", fontWeight: "600", fontSize: 15 },
  sectionTitle: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  label: { fontSize: 13, color: "#6B7280" },
  input: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10, padding: 12, fontSize: 14 },
  metaRow: { flexDirection: "row", gap: 8 },
  searchBtn: { backgroundColor: "#2563EB", borderRadius: 10, padding: 12, alignItems: "center", justifyContent: "center" },
  cameraBtn: { backgroundColor: "#4B5563", borderRadius: 10, padding: 12, alignItems: "center", justifyContent: "center" },
  metaList: { borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: "#E5E7EB" },
  metaItem: { flexDirection: "row", gap: 10, padding: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#F3F4F6" },
  metaTitle: { fontSize: 13, fontWeight: "500" },
  metaSub: { fontSize: 12, color: "#6B7280" },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statusChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: "#E5E7EB" },
  statusChipActive: { backgroundColor: "#111827" },
  statusChipText: { fontSize: 13, color: "#374151" },
  statusChipTextActive: { color: "#fff" },
  deleteBtn: { marginTop: 8, backgroundColor: "#FEE2E2", borderRadius: 10, padding: 12, alignItems: "center" },
  deleteBtnText: { color: "#B91C1C", fontWeight: "600" },
});
