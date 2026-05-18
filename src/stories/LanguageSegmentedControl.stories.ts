import type { Meta, StoryObj } from "@storybook/svelte-vite";
import { expect, fn } from "storybook/test";
import type { Language } from "../types";
import LanguageSegmentedControl from "../ui/components/LanguageSegmentedControl.svelte";

const languages: Array<{ id: Language; label: string }> = [
  { id: "KO", label: "한국어" },
  { id: "EN", label: "English" },
  { id: "JP", label: "日本語" },
  { id: "CN", label: "中文" },
];

const meta = {
  title: "UI/LanguageSegmentedControl",
  component: LanguageSegmentedControl,
  tags: ["autodocs", "test"],
  args: {
    languages,
    selectedLanguage: "KO",
    isLanguageDisabled: () => false,
    onSelectLanguage: fn(),
  },
} satisfies Meta<typeof LanguageSegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

export const KoreanSelected: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "한국어" })).toHaveAttribute("aria-pressed", "true");
  },
};

export const LimitedLanguages: Story = {
  args: {
    selectedLanguage: "EN",
    isLanguageDisabled: (language: Language) => language === "JP" || language === "CN",
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "English" })).toHaveAttribute("aria-pressed", "true");
    await expect(canvas.getByRole("button", { name: "日本語" })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: "中文" })).toBeDisabled();
  },
};
