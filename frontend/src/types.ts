export type Anime = {
  id: number; title: { romaji?: string; english?: string; native?: string };
  description?: string; coverImage?: { extraLarge?: string; large?: string };
  bannerImage?: string; genres?: string[]; averageScore?: number; popularity?: number;
  episodes?: number; seasonYear?: number; format?: string; status?: string;
  characters?: { edges: { node: { name: { full: string } } }[] };
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
  script: GeneratedScript; model: string; provider: "gemini" | "openrouter";
  stats: { narrationChars: number; targetChars: number };
  trends: AnimeTrends | null;
};
