import type { Meta, StoryObj } from "@storybook/svelte-vite";
import { expect, fn } from "storybook/test";
import ShellHeader from "../ui/components/ShellHeader.svelte";

const branchOptions = [
  { id: "coex", label: "코엑스", headerLabel: "UH Suite Coex", locationLabel: "서울 강남구 삼성동" },
  { id: "gangnam", label: "강남", headerLabel: "UH Suite Gangnam", locationLabel: "서울 강남구 역삼동" },
  { id: "seolleung", label: "선릉", headerLabel: "UH Suite Seolleung", locationLabel: "서울 강남구 대치동" },
];

const meta = {
  title: "Shell/ShellHeader",
  component: ShellHeader,
  tags: ["autodocs", "test"],
  parameters: {
    layout: "fullscreen",
  },
  args: {
    branchOptions,
    activeMenuIcon: null,
    activeMenuTitle: null,
    navigationLocked: false,
    selectedBranchId: "coex",
    onBranchChange: fn(),
    onGoHome: fn(),
  },
} satisfies Meta<typeof ShellHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HomeHeader: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /UH Suite Coex/ })).toBeEnabled();
  },
};

export const WorkHeader: Story = {
  args: {
    activeMenuIcon: "assignment",
    activeMenuTitle: "입퇴실 안내문",
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("heading", { name: "입퇴실 안내문" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "뒤로가기" })).toBeEnabled();
  },
};

export const NavigationLocked: Story = {
  args: {
    activeMenuIcon: "settings",
    activeMenuTitle: "설정",
    navigationLocked: true,
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: "뒤로가기" })).toBeDisabled();
  },
};
