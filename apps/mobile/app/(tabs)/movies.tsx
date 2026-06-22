import { useState, useCallback, useEffect, useMemo } from "react";
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  Modal, ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, Search, X, Layers, ChevronRight, List } from "lucide-react-native";
import { moviesApi, mediaTypesApi } from "../../lib/api";
import type { Movie, MovieStatus } from "@kakera/shared";
import { useLanguageStore } from "../../store/languageStore";
import { getMediaTypeName } from "../../lib/mediaTypeLabels";
import StatusBadge from "../../components/ui/StatusBadge";
import StarRating from "../../components/ui/StarRating";
import CoverImage from "../../components/ui/CoverImage";
import { useAccent, useTheme } from "../../lib/theme";

const STATUSES = [
  { value: "", label: "すべて" },
  { value: "unwatched", label: "未視聴" },
  { value: "watched", label: "視聴済み" },
];

export default function MoviesScreen() {
  const accent = useAccent();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Movie | null>(null);
  const [groupBySeries, setGroupBySeries] = useState(true);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState(false);

  const seriesGroups = useMemo(() => {
    const groups = new Map<string, Movie[]>();
    movies.forEach((m) => {
      const key = m.seriesName ?? "__none__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(m);
    });
    groups.forEach((items) => items.sort((a, b) => (a.seriesOrder ?? 0) - (b.seriesOrder ?? 0)));
    return groups;
  }, [movies]);

  const toggleSeries = (key: string) =>
    setExpandedSeries((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await moviesApi.list({ search, status, perPage: 100 });
      setMovies(res.data);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (m: Movie) => { setEditing(m); setModalOpen(true); };
  const onSaved = () => { setModalOpen(false); load(); };

  return (
    <View style={[s.container, { backgroundColor: theme.bg }]}>
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View style={[s.searchRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Search size={16} color={theme.placeholder} />
          <TextInput
            style={[s.searchInput, { color: theme.text }]}
            placeholder="タイトル・監督で検索"
            placeholderTextColor={theme.placeholder}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={load}
            returnKeyType="search"
          />
        </View>
        <Pressable style={[s.iconBtn, { backgroundColor: groupBySeries ? accent : theme.iconBtn }]} onPress={() => setGroupBySeries((v) => !v)}>
          {groupBySeries ? <List size={20} color="#fff" /> : <Layers size={20} color="#fff" />}
        </Pressable>
        <Pressable style={[s.iconBtn, { backgroundColor: accent }]} onPress={openAdd}>
          <Plus size={20} color="#fff" />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {STATUSES.map((st) => (
          <Pressable
            key={st.value}
            style={[s.filterChip, { backgroundColor: status === st.value ? accent : theme.borderLight }]}
            onPress={() => setStatus(st.value)}
          >
            <Text style={[s.filterChipText, { color: status === st.value ? "#fff" : theme.textSub }]}>{st.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loadError && !loading && (
        <View style={[s.errorBanner, { backgroundColor: theme.card, borderColor: "#EF4444" }]}>
          <Text style={[s.errorText, { color: "#EF4444" }]}>サーバーに接続できません</Text>
          <Pressable onPress={load} style={s.retryBtn}>
            <Text style={[s.retryText, { color: accent }]}>再試行</Text>
          </Pressable>
        </View>
      )}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={accent} />
      ) : groupBySeries ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 24 }}>
          {movies.length === 0 && <Text style={[s.empty, { color: theme.textMuted }]}>映画がありません</Text>}
          {Array.from(seriesGroups.entries()).map(([key, items]) => {
            if (key === "__none__") {
              return items.map((item) => (
                <Pressable key={item.id} style={[s.card, { backgroundColor: theme.card }]} onPress={() => openEdit(item)}>
                  <CoverImage src={item.coverImageUrl} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={[s.cardTitle, { color: theme.text }]} numberOfLines={2}>{item.title}</Text>
                    {item.directors?.length > 0 && <Text style={[s.cardSub, { color: theme.textMuted }]}>{item.directors.join(", ")}</Text>}
                    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                      <StatusBadge status={item.status} />
                      {item.rating != null && <StarRating value={item.rating} readonly size={14} />}
                    </View>
                  </View>
                </Pressable>
              ));
            }
            const isExpanded = expandedSeries.has(key);
            return (
              <View key={key}>
                <Pressable
                  style={[s.seriesRow, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => toggleSeries(key)}
                >
                  <CoverImage src={items[0]?.coverImageUrl} width={32} height={44} />
                  <ChevronRight size={14} color={theme.textMuted} style={{ transform: [{ rotate: isExpanded ? "90deg" : "0deg" }] }} />
                  <Text style={[s.seriesTitle, { color: theme.text, flex: 1 }]} numberOfLines={1}>{key}</Text>
                  <Text style={[s.seriesCount, { color: theme.textMuted }]}>{items.length}作品</Text>
                </Pressable>
                {isExpanded && items.map((item) => (
                  <Pressable key={item.id} style={[s.card, { backgroundColor: theme.card, marginTop: 4 }]} onPress={() => openEdit(item)}>
                    <CoverImage src={item.coverImageUrl} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={[s.cardTitle, { color: theme.text }]} numberOfLines={2}>{item.title}</Text>
                      {item.seriesOrder != null && <Text style={[s.cardSub, { color: theme.textMuted }]}>#{item.seriesOrder}</Text>}
                      <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                        <StatusBadge status={item.status} />
                        {item.rating != null && <StarRating value={item.rating} readonly size={14} />}
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Pressable style={[s.card, { backgroundColor: theme.card }]} onPress={() => openEdit(item)}>
              <CoverImage src={item.coverImageUrl} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[s.cardTitle, { color: theme.text }]} numberOfLines={2}>{item.title}</Text>
                {item.directors?.length > 0 && <Text style={[s.cardSub, { color: theme.textMuted }]}>{item.directors.join(", ")}</Text>}
                <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                  <StatusBadge status={item.status} />
                  {item.rating != null && <StarRating value={item.rating} readonly size={14} />}
                </View>
                {item.sharedRatings && item.sharedRatings.length > 0 && (
                  <View style={{ gap: 2 }}>
                    {item.sharedRatings.map((sr) => (
                      <View key={sr.username} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Text style={{ fontSize: 11, color: theme.textMuted }}>{sr.username}</Text>
                        <StarRating value={sr.rating} readonly size={11} />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={[s.empty, { color: theme.textMuted }]}>映画がありません</Text>}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <MovieForm initial={editing} onCancel={() => setModalOpen(false)} onSaved={onSaved} />
      </Modal>
    </View>
  );
}

interface FormProps { initial: Movie | null; onCancel: () => void; onSaved: () => void; }

function MovieForm({ initial, onCancel, onSaved }: FormProps) {
  const accent = useAccent();
  const theme = useTheme();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [seriesName, setSeriesName] = useState(initial?.seriesName ?? "");
  const [seriesOrder, setSeriesOrder] = useState(initial?.seriesOrder?.toString() ?? "");
  const [directors, setDirectors] = useState(initial?.directors?.join(", ") ?? "");
  const [releasedAt, setReleasedAt] = useState(initial?.releasedAt ?? "");
  const [watchedAt, setWatchedAt] = useState(initial?.watchedAt ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(initial?.coverImageUrl ?? "");
  const [status, setStatus] = useState<MovieStatus>(initial?.status ?? "unwatched");
  const [rating, setRating] = useState<number | undefined>(initial?.rating ?? undefined);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [memo, setMemo] = useState(initial?.memo ?? "");
  const [mediaTypes, setMediaTypes] = useState<string[]>(initial?.mediaTypes ?? []);
  const [genres, setGenres] = useState<string[]>(initial?.genres ?? []);
  const [availableMediaTypes, setAvailableMediaTypes] = useState<{ id: string; name: string; key?: string }[]>([]);
  const [metaResults, setMetaResults] = useState<{ tmdbId: number; title: string; coverImageUrl?: string; releasedAt?: string; genres?: string[] }[]>([]);
  const { language } = useLanguageStore();
  const [metaSearch, setMetaSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    mediaTypesApi.list().then((all) =>
      setAvailableMediaTypes(all.filter((m) => m.category === "movie"))
    ).catch(() => {});
  }, []);

  const searchMeta = async () => {
    if (!metaSearch.trim()) return;
    setSearching(true);
    try {
      const res = await moviesApi.searchMeta(metaSearch);
      setMetaResults(res);
    } catch {
      Alert.alert("エラー", "検索に失敗しました");
    } finally {
      setSearching(false);
    }
  };

  const applyMeta = (m: typeof metaResults[0]) => {
    setTitle(m.title);
    if (m.coverImageUrl) setCoverImageUrl(m.coverImageUrl);
    if (m.releasedAt) setReleasedAt(m.releasedAt);
    if (m.genres?.length) setGenres(m.genres);
    setMetaResults([]);
    setMetaSearch("");
  };

  const addTag = () => {
    const v = tagInput.trim();
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setTagInput("");
  };

  const toggleMediaType = (name: string) =>
    setMediaTypes((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );

  const save = async () => {
    if (!title.trim()) { Alert.alert("エラー", "タイトルは必須です"); return; }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        seriesName: seriesName.trim() || undefined,
        seriesOrder: seriesOrder ? parseInt(seriesOrder, 10) : undefined,
        directors: directors.split(",").map((d) => d.trim()).filter(Boolean),
        releasedAt: releasedAt.trim() || undefined,
        watchedAt: watchedAt.trim() || undefined,
        coverImageUrl: coverImageUrl.trim() || undefined,
        status,
        mediaTypes,
        genres,
        rating,
        tags,
        memo: memo.trim() || undefined,
      };
      if (initial) {
        await moviesApi.update(initial.id, payload);
      } else {
        await moviesApi.create(payload);
      }
      onSaved();
    } catch {
      Alert.alert("エラー", "保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const del = () => {
    Alert.alert("削除確認", "この映画を削除しますか？", [
      { text: "キャンセル", style: "cancel" },
      { text: "削除", style: "destructive", onPress: async () => { await moviesApi.delete(initial!.id); onSaved(); } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[f.header, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <Pressable onPress={onCancel}><X size={22} color={theme.textSub} /></Pressable>
        <Text style={[f.headerTitle, { color: theme.text }]}>{initial ? "映画を編集" : "映画を追加"}</Text>
        <Pressable onPress={save} disabled={saving}>
          <Text style={[f.saveText, { color: accent }]}>{saving ? "保存中..." : "保存"}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Text style={[f.sectionTitle, { color: theme.textMuted }]}>TMDBで検索</Text>
        <View style={f.metaRow}>
          <TextInput style={[f.input, { flex: 1, backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
            placeholder="タイトルで検索"
            placeholderTextColor={theme.placeholder} value={metaSearch} onChangeText={setMetaSearch} />
          <Pressable style={[f.actionBtn, { backgroundColor: accent }]} onPress={searchMeta}>
            {searching ? <ActivityIndicator color="#fff" size="small" /> : <Search size={16} color="#fff" />}
          </Pressable>
        </View>

        {metaResults.length > 0 && (
          <View style={[f.metaList, { borderColor: theme.border }]}>
            {metaResults.slice(0, 5).map((m) => (
              <Pressable key={m.tmdbId} style={[f.metaItem, { backgroundColor: theme.card, borderBottomColor: theme.borderLight }]} onPress={() => applyMeta(m)}>
                <CoverImage src={m.coverImageUrl} width={36} height={48} />
                <View style={{ flex: 1 }}>
                  <Text style={[f.metaTitle, { color: theme.text }]} numberOfLines={2}>{m.title}</Text>
                  {m.releasedAt && <Text style={[f.metaSub, { color: theme.textMuted }]}>{m.releasedAt}</Text>}
                </View>
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[f.label, { color: theme.textMuted }]}>タイトル *</Text>
        <TextInput style={[f.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} value={title} onChangeText={setTitle} />

        <Text style={[f.label, { color: theme.textMuted }]}>シリーズ名</Text>
        <TextInput style={[f.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} value={seriesName} onChangeText={setSeriesName} />

        <Text style={[f.label, { color: theme.textMuted }]}>シリーズ順</Text>
        <TextInput style={[f.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} value={seriesOrder} onChangeText={setSeriesOrder} keyboardType="number-pad" />

        <Text style={[f.label, { color: theme.textMuted }]}>監督（カンマ区切り）</Text>
        <TextInput style={[f.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} value={directors} onChangeText={setDirectors} />

        <Text style={[f.label, { color: theme.textMuted }]}>公開日（YYYY-MM-DD）</Text>
        <TextInput style={[f.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} value={releasedAt} onChangeText={setReleasedAt}
          placeholder="2024-01-01" placeholderTextColor={theme.placeholder} />

        <Text style={[f.label, { color: theme.textMuted }]}>視聴日（YYYY-MM-DD）</Text>
        <TextInput style={[f.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} value={watchedAt} onChangeText={setWatchedAt}
          placeholder="2024-01-01" placeholderTextColor={theme.placeholder} />

        <Text style={[f.label, { color: theme.textMuted }]}>カバー画像URL</Text>
        <TextInput style={[f.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} value={coverImageUrl} onChangeText={setCoverImageUrl} autoCapitalize="none" />

        <Text style={[f.label, { color: theme.textMuted }]}>ステータス</Text>
        <View style={f.chipRow}>
          {STATUSES.filter((st) => st.value).map((st) => (
            <Pressable
              key={st.value}
              style={[f.chip, { backgroundColor: status === st.value ? accent : theme.borderLight }]}
              onPress={() => setStatus(st.value as MovieStatus)}
            >
              <Text style={[f.chipText, { color: status === st.value ? "#fff" : theme.textSub }]}>{st.label}</Text>
            </Pressable>
          ))}
        </View>

        {availableMediaTypes.length > 0 && (
          <>
            <Text style={[f.label, { color: theme.textMuted }]}>メディア種別</Text>
            <View style={f.chipRow}>
              {availableMediaTypes.map((m) => (
                <Pressable
                  key={m.id}
                  style={[f.chip, { backgroundColor: mediaTypes.includes(m.name) ? accent : theme.borderLight }]}
                  onPress={() => toggleMediaType(m.name)}
                >
                  <Text style={[f.chipText, { color: mediaTypes.includes(m.name) ? "#fff" : theme.textSub }]}>{getMediaTypeName(m, language)}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {genres.length > 0 && (
          <>
            <Text style={[f.label, { color: theme.textMuted }]}>ジャンル</Text>
            <View style={f.chipRow}>
              {genres.map((g) => (
                <View key={g} style={[f.chip, { backgroundColor: "#22c55e22" }]}>
                  <Text style={[f.chipText, { color: "#16a34a" }]}>{g}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={[f.label, { color: theme.textMuted }]}>評価</Text>
        <StarRating value={rating} onChange={setRating} size={28} />

        <Text style={[f.label, { color: theme.textMuted }]}>タグ</Text>
        <View style={f.metaRow}>
          <TextInput style={[f.input, { flex: 1, backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} value={tagInput} onChangeText={setTagInput}
            placeholder="タグを入力" placeholderTextColor={theme.placeholder}
            onSubmitEditing={addTag} returnKeyType="done" />
          <Pressable style={[f.actionBtn, { backgroundColor: accent }]} onPress={addTag}>
            <Plus size={16} color="#fff" />
          </Pressable>
        </View>
        {tags.length > 0 && (
          <View style={f.chipRow}>
            {tags.map((tag) => (
              <Pressable key={tag} style={[f.tagChip, { backgroundColor: theme.borderLight }]} onPress={() => setTags(tags.filter((t) => t !== tag))}>
                <Text style={[f.tagText, { color: theme.textSub }]}>{tag}</Text>
                <X size={12} color={theme.textSub} />
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[f.label, { color: theme.textMuted }]}>メモ</Text>
        <TextInput style={[f.input, { height: 80, backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} value={memo} onChangeText={setMemo} multiline
          textAlignVertical="top" />

        {initial && (
          <Pressable style={[f.deleteBtn, { backgroundColor: theme.destructive + "20" }]} onPress={del}>
            <Text style={[f.deleteBtnText, { color: theme.destructive }]}>削除</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", paddingHorizontal: 12, paddingBottom: 8, gap: 8, alignItems: "center" },
  searchRow: { flex: 1, flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, gap: 6 },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 14 },
  iconBtn: { borderRadius: 10, padding: 10 },
  filterRow: { flexGrow: 0, marginBottom: 4 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  filterChipText: { fontSize: 13 },
  card: { flexDirection: "row", gap: 12, borderRadius: 12, padding: 12, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 14, fontWeight: "600" },
  cardSub: { fontSize: 12 },
  empty: { textAlign: "center", marginTop: 40 },
  seriesRow: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, padding: 12, borderWidth: 1 },
  seriesTitle: { fontSize: 14, fontWeight: "600" },
  seriesCount: { fontSize: 12 },
  errorBanner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 12, marginBottom: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  errorText: { fontSize: 13 },
  retryBtn: { paddingHorizontal: 8, paddingVertical: 2 },
  retryText: { fontSize: 13, fontWeight: "600" },
});

const f = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, paddingTop: 20, borderBottomWidth: 1 },
  headerTitle: { fontSize: 16, fontWeight: "600" },
  saveText: { fontWeight: "600", fontSize: 15 },
  sectionTitle: { fontSize: 13, fontWeight: "600" },
  label: { fontSize: 13, marginBottom: -8 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14 },
  metaRow: { flexDirection: "row", gap: 8 },
  actionBtn: { borderRadius: 10, padding: 12, alignItems: "center", justifyContent: "center" },
  metaList: { borderRadius: 10, overflow: "hidden", borderWidth: 1 },
  metaItem: { flexDirection: "row", gap: 10, padding: 10, borderBottomWidth: 1 },
  metaTitle: { fontSize: 13, fontWeight: "500" },
  metaSub: { fontSize: 12 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontSize: 13 },
  tagChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  tagText: { fontSize: 12 },
  deleteBtn: { marginTop: 8, borderRadius: 10, padding: 14, alignItems: "center" },
  deleteBtnText: { fontWeight: "600" },
});
