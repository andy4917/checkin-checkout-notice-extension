<script lang="ts">
  import type { TransitionConfig } from "svelte/transition";
  import type { NavigationDirection } from "../side-panel-controller.svelte.js";

  export let direction: NavigationDirection = "replace";
  export let label = "";
  export let routeKey: number | string;

  type RoutePushParams = {
    direction: NavigationDirection;
  };

  const ROUTE_DURATION_FALLBACK_MS = 280;
  const REPLACE_DURATION_FALLBACK_MS = 120;

  function routePush(
    node: Element,
    params: RoutePushParams,
    options: { direction: "in" | "out" | "both" },
  ): TransitionConfig {
    const isForward = params.direction === "forward";
    const isReplace = params.direction === "replace";
    const distanceRatio = isForward ? 1 : -1;

    return {
      duration: isReplace
        ? readMotionDuration(node, "--sidepanel-motion-duration-fast", REPLACE_DURATION_FALLBACK_MS)
        : readMotionDuration(node, "--sidepanel-motion-duration", ROUTE_DURATION_FALLBACK_MS),
      easing: easeOutQuart,
      css: (time, inverseTime) => {
        if (isReplace) {
          return "transform: translateX(0);";
        }

        const offsetRatio =
          options.direction === "out"
            ? -distanceRatio * inverseTime
            : distanceRatio * inverseTime;

        return `transform: translateX(calc(${offsetRatio} * var(--route-motion-distance)));`;
      },
    };
  }

  function readMotionDuration(node: Element, propertyName: string, fallbackMs: number): number {
    const view = node.ownerDocument.defaultView;
    if (!view) return fallbackMs;
    const value = view.getComputedStyle(node).getPropertyValue(propertyName).trim();
    if (!value) return fallbackMs;
    if (value.endsWith("ms")) return Number.parseFloat(value) || fallbackMs;
    if (value.endsWith("s")) return (Number.parseFloat(value) || fallbackMs / 1000) * 1000;
    return fallbackMs;
  }

  function easeOutQuart(time: number): number {
    return 1 - Math.pow(1 - time, 4);
  }
</script>

<div class="route-motion-viewport" data-direction={direction}>
  {#key routeKey}
    <section
      class="route-motion-layer"
      data-direction={direction}
      aria-label={label}
      transition:routePush={{ direction }}
    >
      <slot />
    </section>
  {/key}
</div>
