import type { Meta, StoryObj } from "@storybook/svelte-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { homeBottomNavigationItems, homeNavigationGroups } from "../catalog/menu-routing.js";
import HomeView from "../ui/components/HomeView.svelte";

const meta = {
  title: "Shell/HomeView",
  component: HomeView,
  tags: ["autodocs", "test"],
  parameters: {
    layout: "fullscreen",
  },
  args: {
    bottomItems: homeBottomNavigationItems,
    groups: homeNavigationGroups,
    onOpenMenu: fn(),
  },
} satisfies Meta<typeof HomeView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const RootNavigation: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("navigation", { name: "업무 그룹" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "고객 안내문 메뉴 열기" })).toBeEnabled();
    await expect(canvas.getByRole("navigation", { name: "하단 업무 메뉴" })).toBeInTheDocument();
  },
};

export const DrillDownNavigation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "고객 안내문 메뉴 열기" }));
    await expect(canvas.getByRole("button", { name: "체크인 안내문" })).toBeEnabled();
    await expect(canvas.getByRole("button", { name: "체크아웃 안내문" })).toBeEnabled();
  },
};
