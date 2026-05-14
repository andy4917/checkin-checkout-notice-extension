import type { Meta, StoryObj } from "@storybook/svelte-vite";
import { expect } from "storybook/test";
import MaterialIcon from "../ui/components/MaterialIcon.svelte";

const meta = {
  title: "UI/MaterialIcon",
  component: MaterialIcon,
  tags: ["autodocs", "test"],
  argTypes: {
    name: {
      control: "select",
      options: ["meeting_room", "hotel_class", "airport_shuttle", "local_laundry_service", "settings"],
    },
    size: {
      control: { type: "range", min: 12, max: 40, step: 2 },
    },
  },
  args: {
    name: "meeting_room",
    size: 24,
  },
} satisfies Meta<typeof MaterialIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector(".material-icon")).not.toBeNull();
  },
};

export const LargeShuttle: Story = {
  args: {
    name: "airport_shuttle",
    size: 32,
  },
};
