export type Anime = {
  id: number; title: { romaji?: string; english?: string; native?: string };
  description?: string; coverImage?: { extraLarge?: string; large?: string };
  bannerImage?: string; genres?: string[]; averageScore?: number; popularity?: number;
  episodes?: number; seasonYear?: number; format?: string; status?: string;
  characters?: { edges: { node: { name: { full: string }; image?: { large?: string } } }[] };
};
export type GeneratedScript = {
  title: string; hook: string; narration: string;
  scenes: { time: string; visual: string; voiceover: string; onScreenText: string }[];
  cta: string; caption: string; hashtags: string[];
  seoKeywords?: string[]; postingTip?: string;
};
export type AnimeTrends = {
  trendingScore: number; popularity: number; popularityGrowth7d: number | null;
  globalTrendingRank: number | null; status: string | null;
  nextEpisode: { episode: number; airsInHours: number } | null;
  officialHashtag: string | null; topTags: string[]; trendingNow: string[];
  momentum: "explosivo" | "en alza" | "estable" | "en baja";
};
export type GenerateResponse = {
  script: GeneratedScript; model: string; provider: ProviderId;
  stats: { narrationChars: number; targetChars: number };
  trends: AnimeTrends | null;
  newsUsed?: number;
};
export type NewsItem = {
  id: string; title: string; summary: string; link: string; image: string | null;
  date: string; source: string; lang: "es" | "en";
};
export type BrowseFilters = {
  q?: string; genre?: string; year?: number; season?: "WINTER" | "SPRING" | "SUMMER" | "FALL";
  format?: "TV" | "TV_SHORT" | "MOVIE" | "OVA" | "ONA" | "SPECIAL";
  status?: "RELEASING" | "FINISHED" | "NOT_YET_RELEASED";
  sort?: "TRENDING_DESC" | "POPULARITY_DESC" | "SCORE_DESC" | "START_DATE_DESC" | "SEARCH_MATCH";
};
export type SakugaClip = { id: number; video: string; preview: string; sizeMB: number; vertical: boolean; tags: string[]; source: string };
export type EpisodeThumb = { title: string; thumbnail: string; url: string; site: string };
export type SceneVideo = { id: string; title: string; channel: string; date: string; thumbnail: string | null; duration: number | null };
export type VideoProvider = "youtube" | "dailymotion";
export type TraceResult = {
  anilist: { id: number; title: { romaji?: string; english?: string | null; native?: string }; isAdult: boolean };
  episode: number | string | null; from: number; to: number; similarity: number; video: string; image: string;
};

export type ProviderId = "gemini" | "nemotron" | "gemma" | "openrouter";
export type AiProviderInfo = { id: ProviderId; label: string; configured: boolean; models: string[]; pausedUntil: number | null; lastError: string | null; lastMs: number | null };
