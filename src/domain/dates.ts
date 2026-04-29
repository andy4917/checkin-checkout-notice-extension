import type { Language } from "../types.js";

export function getBusinessDateParts(now = new Date()) {
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return {
    apiDate: `${year}${month}${day}`,
    displayDate: `${year} / ${month} / ${day}`,
  };
}

export function formatDateForLang(dateStr: string, lang: Language | string): string {
  if (!dateStr || dateStr.length !== 8) return dateStr;

  const year = dateStr.substring(0, 4);
  const month = Number.parseInt(dateStr.substring(4, 6), 10);
  const day = Number.parseInt(dateStr.substring(6, 8), 10);

  if (lang === "KO") return `${year}년 ${month}월 ${day}일`;
  if (lang === "EN") {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return `${months[month - 1]} ${day}, ${year}`;
  }

  return `${year}/${month}/${day}`;
}
