import { MESSAGE_TEMPLATES } from "./templates.js";
import { hasDoorPasswordGuideAsset } from "../assets/asset-catalog.js";
import type { GuestMessageInput, Language } from "../types.js";

export function createGuestMessage(input: GuestMessageInput): string {
  const lang = requireSupportedLanguage(input.lang);

  if (input.action === "arrival") {
    const message = MESSAGE_TEMPLATES.arrival[lang](
      input.name,
      input.room,
      input.departureDate,
    );
    return hasDoorPasswordGuideAsset(input.branchId)
      ? message
      : removeDoorPasswordGuideText(message, lang);
  }

  const templateGroup = MESSAGE_TEMPLATES[input.type];
  const template = templateGroup[lang];
  return template(input.name, input.room);
}

export class UnsupportedLanguageError extends Error {
  constructor(lang: string) {
    super(`지원하지 않는 언어입니다: ${lang}`);
    this.name = "UnsupportedLanguageError";
  }
}

function requireSupportedLanguage(lang: string): Language {
  if (lang === "KO" || lang === "EN" || lang === "JP" || lang === "CN") {
    return lang;
  }
  throw new UnsupportedLanguageError(lang);
}

function removeDoorPasswordGuideText(message: string, lang: Language): string {
  const removers: Record<Language, (text: string) => string> = {
    KO: (text) =>
      text.replace(
        "\n1층 출입구의 비밀번호 입력 가이드 영상과 함께 안내드립니다.\n",
        "\n",
      ),
    EN: (text) =>
      text.replace(
        "\nWe are also sharing a guide video for entering the password at the 1st floor entrance,\nalong with other important check-in information.\n",
        "\n",
      ),
    JP: (text) =>
      text.replace(
        "\n併せて、1階入口の暗証番号入力ガイド動画とご滞在に関するご案内をお送りいたします。\n",
        "\n",
      ),
    CN: (text) =>
      text.replace(
        "\n现向您提供一楼入口密码输入指南视频以及相关入住说明。\n",
        "\n",
      ),
  };

  return removers[lang](message);
}
