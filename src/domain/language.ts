import type { Language } from "../types.js";

const JAPANESE_NATIONALITIES = new Set(["JP", "JPN", "JAPAN", "일본", "일본국"]);
const CHINESE_NATIONALITIES = new Set([
  "CN",
  "CHN",
  "CHINA",
  "중국",
  "중국국",
  "TW",
  "TWN",
  "TAIWAN",
  "대만",
  "HK",
  "HKG",
  "HONG KONG",
  "홍콩",
]);
const KOREAN_NATIONALITIES = new Set(["KR", "KOR", "KOREA", "SOUTH KOREA", "한국", "대한민국"]);
const ENGLISH_NATIONALITIES = new Set([
  "US",
  "USA",
  "UNITED STATES",
  "AMERICA",
  "미국",
  "GB",
  "UK",
  "UNITED KINGDOM",
  "영국",
  "CA",
  "CANADA",
  "캐나다",
  "AU",
  "AUSTRALIA",
  "호주",
  "NZ",
  "NEW ZEALAND",
  "뉴질랜드",
  "SG",
  "SINGAPORE",
  "싱가포르",
]);

export function resolveLanguageFromNationality(nationality: string | null | undefined): Language | null {
  const normalized = String(nationality || "").trim().toUpperCase();
  if (!normalized) return null;
  if (KOREAN_NATIONALITIES.has(normalized)) return "KO";
  if (ENGLISH_NATIONALITIES.has(normalized)) return "EN";
  if (JAPANESE_NATIONALITIES.has(normalized)) return "JP";
  if (CHINESE_NATIONALITIES.has(normalized)) return "CN";
  return null;
}
