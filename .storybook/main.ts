import type { StorybookConfig } from "@storybook/svelte-vite";

const config: StorybookConfig = {
  stories: [
    "../src/**/*.stories.@(js|ts|svelte)",
  ],
  addons: [
    "@storybook/addon-svelte-csf",
    "@chromatic-com/storybook",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
  ],
  framework: "@storybook/svelte-vite",
  viteFinal: async (config) => ({
    ...config,
    build: {
      ...config.build,
      chunkSizeWarningLimit: 1200,
    },
  }),
};
export default config;
