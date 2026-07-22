import { useState, useCallback, useEffect, useMemo } from "react";
import {
  View, Text, FlatList, TextInput, Pressable, StyleSheet,
  Modal, ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus, Search, X, Layers, ChevronRight, List } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { moviesApi, mediaTypesApi } from "../../lib/api";
import type { Movie, MovieStatus } from "@kakera/shared";
import { useLanguageStore } from "../../store/languageStore";
import { getMediaTypeName } from "../../lib/mediaTypeLabels";
import StatusBadge from "../../components/ui/StatusBadge";
import StarRating from "../../components/ui/StarRating";
import CoverImage from "../../components/ui/CoverImage";
import { useAccent, useTheme } from "../../lib/theme";

const MOVIE_FILTER_VALUES = ["", "unwatched", "watched"];
const MOVIE_FORM_STATUS: MovieStatus[] = ["unwatched", "watched"];
const MOVIE_SORT_OPTIONS = [
  { value: "created_at", label: "sort.createdAt" },
  { value: "released_at", label: "sort.releasedAt" },
  { value: "title", label: "sort.title" },
  { value: "rating", label: "sort.rating" },
] as const;

export default function MoviesScreen() {
  const { t } = useTranslation();
  const accent = useAccent();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [genre, setGenre] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Movie | null>(null);
  const [groupBySeries, setGroupBySeries] = useState(true);
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState(false);
  const [director, setDirector] = useState("");
  const [studio, setStudio] = useState("");
  const [distributor, setDistributor] = useState("");
  const [sort, setSort] = useState("created_at");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [filterOptions, setFilterOptions] = useState<{ genres: string[]; tags: string[]; directors: string[]; studios: string[]; distributors: string[] }>({ genres: [], tags: [], directors: [], studios: [], distributors: [] });

  useEffect(() => {
    moviesApi.getOptions().then(setFilterOptions).catch(() => {});
  }, []);

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
      const res = await moviesApi.list({
        search, status, perPage: 100,
        genre: genre || undefined,
        tag: filterTag || undefined,
        director: director || undefined,
        studio: studio || undefined,
        distributor: distributor || undefined,
        rating: minRating > 0 ? minRating : undefined,
        sort,
        order,
      });
      setMovies(res.data);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [search, status, genre, filterTag, director, studio, distributor, minRating, sort, order]);

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
            placeholder={t("content.searchMovies")}
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

      <View style={s.sortBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}
          contentContainerStyle={{ gap: 6, paddingLeft: 16 }}>
          {MOVIE_SORT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.value}
              style={[s.sortPill, {
                backgroundColor: sort === opt.value ? accent : "transparent",
                borderColor: sort === opt.value ? accent : theme.border,
              }]}
              onPress={() => setSort(opt.value)}
            >
              <Text style={[s.sortPillText, { color: sort === opt.value ? "#fff" : theme.textSub }]}>
                {t(opt.label)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Pressable
          style={[s.orderToggle, { borderColor: theme.border }]}
          onPress={() => setOrder(o => o === "desc" ? "asc" : "desc")}
        >
          <Text style={[s.orderToggleText, { color: theme.textSub }]}>
            {order === "desc" ? "↓" : "↑"} {t(`sort.${order}`)}
          </Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {MOVIE_FILTER_VALUES.map((sv) => (
          <Pressable
            key={sv}
            style={[s.filterChip, { backgroundColor: status === sv ? accent : theme.borderLight }]}
            onPress={() => setStatus(sv)}
          >
            <Text style={[s.filterChipText, { color: status === sv ? "#fff" : theme.textSub }]}>
              {sv ? t(`status.${sv}`) : t("status.all")}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      {filterOptions.genres.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          <Pressable style={[s.filterChip, { backgroundColor: genre === "" ? accent : theme.borderLight }]} onPress={() => setGenre("")}>
            <Text style={[s.filterChipText, { color: genre === "" ? "#fff" : theme.textSub }]}>{t("content.allGenres")}</Text>
          </Pressable>
          {filterOptions.genres.map((g) => (
            <Pressable key={g} style={[s.filterChip, { backgroundColor: genre === g ? accent : theme.borderLight }]} onPress={() => setGenre(genre === g ? "" : g)}>
              <Text style={[s.filterChipText, { color: genre === g ? "#fff" : theme.textSub }]}>{g}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {filterOptions.tags.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          <Pressable style={[s.filterChip, { backgroundColor: filterTag === "" ? accent : theme.borderLight }]} onPress={() => setFilterTag("")}>
            <Text style={[s.filterChipText, { color: filterTag === "" ? "#fff" : theme.textSub }]}>{t("content.allTags")}</Text>
          </Pressable>
          {filterOptions.tags.map((tag) => (
            <Pressable key={tag} style={[s.filterChip, { backgroundColor: filterTag === tag ? accent : theme.borderLight }]} onPress={() => setFilterTag(filterTag === tag ? "" : tag)}>
              <Text style={[s.filterChipText, { color: filterTag === tag ? "#fff" : theme.textSub }]}>{tag}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {filterOptions.directors.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          <Pressable style={[s.filterChip, { backgroundColor: director === "" ? accent : theme.borderLight }]} onPress={() => setDirector("")}>
            <Text style={[s.filterChipText, { color: director === "" ? "#fff" : theme.textSub }]}>{t("content.allDirectors")}</Text>
          </Pressable>
          {filterOptions.directors.map((d) => (
            <Pressable key={d} style={[s.filterChip, { backgroundColor: director === d ? accent : theme.borderLight }]} onPress={() => setDirector(director === d ? "" : d)}>
              <Text style={[s.filterChipText, { color: director === d ? "#fff" : theme.textSub }]}>{d}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {filterOptions.studios.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          <Pressable style={[s.filterChip, { backgroundColor: studio === "" ? accent : theme.borderLight }]} onPress={() => setStudio("")}>
            <Text style={[s.filterChipText, { color: studio === "" ? "#fff" : theme.textSub }]}>{t("content.allStudios")}</Text>
          </Pressable>
          {filterOptions.studios.map((st) => (
            <Pressable key={st} style={[s.filterChip, { backgroundColor: studio === st ? accent : theme.borderLight }]} onPress={() => setStudio(studio === st ? "" : st)}>
              <Text style={[s.filterChipText, { color: studio === st ? "#fff" : theme.textSub }]}>{st}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      {filterOptions.distributors.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterRow} contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
          <Pressable style={[s.filterChip, { backgroundColor: distributor === "" ? accent : theme.borderLight }]} onPress={() => setDistributor("")}>
            <Text style={[s.filterChipText, { color: distributor === "" ? "#fff" : theme.textSub }]}>{t("content.allDistributors")}</Text>
          </Pressable>
          {filterOptions.distributors.map((d) => (
            <Pressable key={d} style={[s.filterChip, { backgroundColor: distributor === d ? accent : theme.borderLight }]} onPress={() => setDistributor(distributor === d ? "" : d)}>
              <Text style={[s.filterChipText, { color: distributor === d ? "#fff" : theme.textSub }]}>{d}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[s.filterRow, { marginBottom: 4 }]}
        contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}>
        {[0, 1, 2, 3, 4, 5].map((r) => (
          <Pressable key={r} style={[s.filterChip, { backgroundColor: minRating === r ? accent : theme.borderLight }]} onPress={() => setMinRating(r === minRating ? 0 : r)}>
            <Text style={[s.filterChipText, { color: minRating === r ? "#fff" : theme.textSub }]}>{r === 0 ? t("content.filterMinRating") : `${r}+`}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {loadError && !loading && (
        <View style={[s.errorBanner, { backgroundColor: theme.card, borderColor: "#EF4444" }]}>
          <Text style={[s.errorText, { color: "#EF4444" }]}>{t("content.serverError")}</Text>
          <Pressable onPress={load} style={s.retryBtn}>
            <Text style={[s.retryText, { color: accent }]}>{t("content.retry")}</Text>
          </Pressable>
        </View>
      )}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={accent} />
      ) : groupBySeries ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 24 }}>
          {movies.length === 0 && <Text style={[s.empty, { color: theme.textMuted }]}>{t("content.noMovies")}</Text>}
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
                  <Text style={[s.seriesCount, { color: theme.textMuted }]}>{t("content.works", { n: items.length })}</Text>
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
          ListEmptyComponent={<Text style={[s.empty, { color: theme.textMuted }]}>{t("content.noMovies")}</Text>}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalOpen(false)}>
        <MovieForm initial={editing} onCancel={() => setModalOpen(false)} onSaved={onSaved} />
      </Modal>
    </View>
  );
}

interface FormProps { initial: Movie | null; onCancel: () => void; onSaved: () => void; }

function MovieForm({ initial, onCancel, onSaved }: FormProps) {
  const { t } = useTranslation();
  const accent = useAccent();
  const theme = useTheme();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [seriesName, setSeriesName] = useState(initial?.seriesName ?? "");
  const [directors, setDirectors] = useState(initial?.directors?.join(", ") ?? "");
  const [distributors, setDistributors] = useState(initial?.distributors?.join(", ") ?? "");
  const [studios, setStudios] = useState<string[]>(initial?.studios ?? []);
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
  const [tmdbId, setTmdbId] = useState(initial?.tmdbId?.toString() ?? "");
  const [availableMediaTypes, setAvailableMediaTypes] = useState<{ id: string; name: string; key?: string }[]>([]);
  const [metaResults, setMetaResults] = useState<{ tmdbId: number; title: string; coverImageUrl?: string; releasedAt?: string; genres?: string[]; studios?: string[]; directors?: string[]; seriesName?: string; distributors?: string[] }[]>([]);
  const { language } = useLanguageStore();
  const [metaSearch, setMetaSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [metaPage, setMetaPage] = useState(1);
  const [hasMoreMeta, setHasMoreMeta] = useState(false);

  useEffect(() => {
    mediaTypesApi.list().then((all) =>
      setAvailableMediaTypes(all.filter((m) => m.category === "movie"))
    ).catch(() => {});
  }, []);

  const doSearchMeta = async (page: number, append: boolean) => {
    if (!metaSearch.trim()) return;
    setSearching(true);
    try {
      const res = await moviesApi.searchMeta(metaSearch, page);
      const items = res ?? [];
      setMetaResults(append ? (prev) => [...prev, ...items] : items);
      setMetaPage(page);
      setHasMoreMeta(items.length >= 20);
    } catch {
      Alert.alert(t("common.error"), t("content.errorSearchFailed"));
    } finally {
      setSearching(false);
    }
  };
  const searchMeta = () => doSearchMeta(1, false);
  const loadMoreMeta = () => doSearchMeta(metaPage + 1, true);

  const applyMeta = (m: typeof metaResults[0]) => {
    setTitle(m.title);
    if (m.coverImageUrl) setCoverImageUrl(m.coverImageUrl);
    if (m.releasedAt) setReleasedAt(m.releasedAt);
    if (m.genres?.length) setGenres(m.genres);
    if (m.studios?.length) setStudios(m.studios);
    if (m.directors?.length) setDirectors(m.directors.join(", "));
    if (m.seriesName) setSeriesName(m.seriesName);
    if (m.distributors?.length) setDistributors(m.distributors.join(", "));
    setTmdbId(m.tmdbId.toString());
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
    if (!title.trim()) { Alert.alert(t("common.error"), t("content.errorTitleRequired")); return; }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        seriesName: seriesName.trim() || undefined,
        directors: directors.split(",").map((d) => d.trim()).filter(Boolean),
        distributors: distributors.split(",").map((d) => d.trim()).filter(Boolean),
        studios,
        releasedAt: releasedAt.trim() || undefined,
        watchedAt: watchedAt.trim() || undefined,
        coverImageUrl: coverImageUrl.trim() || undefined,
        status,
        mediaTypes,
        genres,
        rating,
        tags,
        memo: memo.trim() || undefined,
        tmdbId: tmdbId ? parseInt(tmdbId, 10) : undefined,
      };
      if (initial) {
        await moviesApi.update(initial.id, payload);
      } else {
        await moviesApi.create(payload);
      }
      onSaved();
    } catch {
      Alert.alert(t("common.error"), t("content.errorSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const del = () => {
    Alert.alert(t("content.confirmDelete"), t("content.deleteMovie"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: async () => { await moviesApi.delete(initial!.id); onSaved(); } },
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={[f.header, { backgroundColor: theme.bg, borderBottomColor: theme.border }]}>
        <Pressable onPress={onCancel}><X size={22} color={theme.textSub} /></Pressable>
        <Text style={[f.headerTitle, { color: theme.text }]}>{initial ? t("content.editMovie") : t("content.addMovie")}</Text>
        <Pressable onPress={save} disabled={saving}>
          <Text style={[f.saveText, { color: accent }]}>{saving ? t("common.saving") : t("common.save")}</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, gap: 14 }} keyboardShouldPersistTaps="handled">
        <Text style={[f.sectionTitle, { color: theme.textMuted }]}>{t("content.tmdbSearch")}</Text>
        <View style={f.metaRow}>
          <TextInput style={[f.input, { flex: 1, backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]}
            placeholder={t("content.searchTitlePlaceholder")}
            placeholderTextColor={theme.placeholder} value={metaSearch} onChangeText={setMetaSearch} />
          <Pressable style={[f.actionBtn, { backgroundColor: accent }]} onPress={searchMeta}>
            {searching ? <ActivityIndicator color="#fff" size="small" /> : <Search size={16} color="#fff" />}
          </Pressable>
        </View>

        {metaResults.length > 0 && (
          <View style={[f.metaList, { borderColor: theme.border }]}>
            <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 240 }}>
              {metaResults.map((m) => (
                <Pressable key={m.tmdbId} style={[f.metaItem, { backgroundColor: theme.card, borderBottomColor: theme.borderLight }]} onPress={() => applyMeta(m)}>
                  <CoverImage src={m.coverImageUrl} width={36} height={48} />
                  <View style={{ flex: 1 }}>
                    <Text style={[f.metaTitle, { color: theme.text }]} numberOfLines={2}>{m.title}</Text>
                    {m.releasedAt && <Text style={[f.metaSub, { color: theme.textMuted }]}>{m.releasedAt}</Text>}
                  </View>
                </Pressable>
              ))}
              {hasMoreMeta && (
                <Pressable style={[f.loadMoreBtn, { borderTopColor: theme.border }]} onPress={loadMoreMeta} disabled={searching}>
                  <Text style={[f.loadMoreText, { color: accent }]}>
                    {searching ? t("common.loading") : t("common.loadMore")}
                  </Text>
                </Pressable>
              )}
            </ScrollView>
          </View>
        )}

        <Text style={[f.label, { color: theme.textMuted }]}>{t("content.fieldTitle")}</Text>
        <TextInput style={[f.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} value={title} onChangeText={setTitle} />

        <Text style={[f.label, { color: theme.textMuted }]}>{t("content.fieldSeriesName")}</Text>
        <TextInput style={[f.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} value={seriesName} onChangeText={setSeriesName} />

        <Text style={[f.label, { color: theme.textMuted }]}>{t("content.fieldDirectors")}</Text>
        <TextInput style={[f.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} value={directors} onChangeText={setDirectors}
          placeholder={t("content.commaPlaceholder")} placeholderTextColor={theme.placeholder} />

        <Text style={[f.label, { color: theme.textMuted }]}>{t("content.fieldDistributors")}</Text>
        <TextInput style={[f.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} value={distributors} onChangeText={setDistributors}
          placeholder={t("content.commaPlaceholder")} placeholderTextColor={theme.placeholder} />

        <Text style={[f.label, { color: theme.textMuted }]}>{t("content.fieldReleasedAt")}</Text>
        <TextInput style={[f.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} value={releasedAt} onChangeText={setReleasedAt}
          placeholder="2024-01-01" placeholderTextColor={theme.placeholder} />

        <Text style={[f.label, { color: theme.textMuted }]}>{t("content.fieldWatchedAt")}</Text>
        <TextInput style={[f.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} value={watchedAt} onChangeText={setWatchedAt}
          placeholder="2024-01-01" placeholderTextColor={theme.placeholder} />

        <Text style={[f.label, { color: theme.textMuted }]}>{t("content.fieldCoverImageUrl")}</Text>
        <TextInput style={[f.input, { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} value={coverImageUrl} onChangeText={setCoverImageUrl} autoCapitalize="none" />

        <Text style={[f.label, { color: theme.textMuted }]}>{t("content.fieldStatus")}</Text>
        <View style={f.chipRow}>
          {MOVIE_FORM_STATUS.map((sv) => (
            <Pressable
              key={sv}
              style={[f.chip, { backgroundColor: status === sv ? accent : theme.borderLight }]}
              onPress={() => setStatus(sv)}
            >
              <Text style={[f.chipText, { color: status === sv ? "#fff" : theme.textSub }]}>{t(`status.${sv}`)}</Text>
            </Pressable>
          ))}
        </View>

        {availableMediaTypes.length > 0 && (
          <>
            <Text style={[f.label, { color: theme.textMuted }]}>{t("content.fieldMediaTypes")}</Text>
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
            <Text style={[f.label, { color: theme.textMuted }]}>{t("content.fieldGenre")}</Text>
            <View style={f.chipRow}>
              {genres.map((g) => (
                <View key={g} style={[f.chip, { backgroundColor: "#22c55e22" }]}>
                  <Text style={[f.chipText, { color: "#16a34a" }]}>{g}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {studios.length > 0 && (
          <>
            <Text style={[f.label, { color: theme.textMuted }]}>{t("content.fieldStudios")}</Text>
            <View style={f.chipRow}>
              {studios.map((s) => (
                <View key={s} style={[f.chip, { backgroundColor: "#7c3aed22" }]}>
                  <Text style={[f.chipText, { color: "#7c3aed" }]}>{s}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={[f.label, { color: theme.textMuted }]}>{t("content.fieldRating")}</Text>
        <StarRating value={rating} onChange={setRating} size={28} />

        <Text style={[f.label, { color: theme.textMuted }]}>{t("content.fieldTags")}</Text>
        <View style={f.metaRow}>
          <TextInput style={[f.input, { flex: 1, backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} value={tagInput} onChangeText={setTagInput}
            placeholder={t("content.tagPlaceholder")} placeholderTextColor={theme.placeholder}
            onSubmitEditing={addTag} returnKeyType="done" />
          <Pressable style={[f.actionBtn, { backgroundColor: accent }]} onPress={addTag}>
            <Plus size={16} color="#fff" />
          </Pressable>
        </View>
        {tags.length > 0 && (
          <View style={f.chipRow}>
            {tags.map((tag) => (
              <Pressable key={tag} style={[f.tagChip, { backgroundColor: theme.borderLight }]} onPress={() => setTags(tags.filter((tg) => tg !== tag))}>
                <Text style={[f.tagText, { color: theme.textSub }]}>{tag}</Text>
                <X size={12} color={theme.textSub} />
              </Pressable>
            ))}
          </View>
        )}

        <Text style={[f.label, { color: theme.textMuted }]}>{t("content.fieldMemo")}</Text>
        <TextInput style={[f.input, { height: 80, backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text }]} value={memo} onChangeText={setMemo} multiline
          textAlignVertical="top" />

        {initial && (
          <Pressable style={[f.deleteBtn, { backgroundColor: theme.destructive + "20" }]} onPress={del}>
            <Text style={[f.deleteBtnText, { color: theme.destructive }]}>{t("common.delete")}</Text>
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
  sortBar: { flexDirection: "row", alignItems: "center", marginBottom: 4, paddingRight: 12 },
  sortPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1 },
  sortPillText: { fontSize: 12 },
  orderToggle: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, borderWidth: 1, marginLeft: 6 },
  orderToggleText: { fontSize: 12 },
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
  loadMoreBtn: { padding: 10, alignItems: "center", borderTopWidth: 1 },
  loadMoreText: { fontSize: 13, fontWeight: "500" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
  chipText: { fontSize: 13 },
  tagChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  tagText: { fontSize: 12 },
  deleteBtn: { marginTop: 8, borderRadius: 10, padding: 14, alignItems: "center" },
  deleteBtnText: { fontWeight: "600" },
});
