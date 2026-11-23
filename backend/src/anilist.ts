// Cliente mínimo de AniList GraphQL (API pública, sin clave) con caché en memoria.

const ANILIST = "https://graphql.anilist.co";

export async function queryAniList<T = any>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(ANILIST, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`AniList respondió ${response.status}`);
  const json = (await response.json()) as { data?: T; errors?: unknown[] };
  if (json.errors?.length || !json.data) throw new Error("AniList no pudo completar la consulta.");
  return json.data;
}

// Caché simple con caducidad y tamaño máximo (suficiente para un solo usuario / función serverless)
export function memo<T>(ttlMs: number, max = 200) {
  const store = new Map<string, { at: number; value: T }>();
  return async (key: string, load: () => Promise<T>): Promise<T> => {
    const hit = store.get(key);
    if (hit && Date.now() - hit.at < ttlMs) return hit.value;
    const value = await load();
    if (store.size >= max) store.delete(store.keys().next().value!);
    store.set(key, { at: Date.now(), value });
    return value;
  };
}

const titlesCache = memo<(string | null)[]>(24 * 3_600_000);

// Todos los nombres con los que se conoce un anime (para encontrar sus noticias)
export function getAnimeTitles(id: number) {
  return titlesCache(String(id), async () => {
    const data = await queryAniList<{ Media: { title: Record<string, string | null>; synonyms: string[] } | null }>(
      `query ($id: Int) { Media(id: $id, type: ANIME) { title { romaji english } synonyms } }`, { id }
    );
    if (!data.Media) return [];
    // Solo sinónimos en alfabeto latino (los feeds no usan japonés)
    const latin = (data.Media.synonyms ?? []).filter((s) => /^[\x00-ɏ\s\p{P}]+$/u.test(s)).slice(0, 6);
    return [data.Media.title.english, data.Media.title.romaji, ...latin];
  });
}
