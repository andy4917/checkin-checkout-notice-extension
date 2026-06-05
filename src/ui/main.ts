import { mount } from "svelte";
import App from "./App.svelte";

const target = document.getElementById("app");

if (!target) {
  throw new Error("Missing Svelte mount target: #app");
}

const panelRoot: HTMLElement = target;

function finitePositiveHeight(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function resolveRuntimePanelHeight() {
  const viewportHeights = [
    window.visualViewport?.height,
    window.innerHeight,
    document.documentElement.clientHeight,
  ].filter(finitePositiveHeight);
  return viewportHeights[0] ?? 0;
}

function syncRuntimePanelHeight() {
  const runtimeHeight = Math.round(resolveRuntimePanelHeight());
  if (!finitePositiveHeight(runtimeHeight)) return;
  document.body.style.setProperty("--runtime-panel-height", `${runtimeHeight}px`);
  document.body.dataset.runtimePanelHeight = String(runtimeHeight);
}

function scheduleRuntimePanelHeightSync() {
  window.requestAnimationFrame(syncRuntimePanelHeight);
}

function observeRuntimeViewport() {
  const observer = new ResizeObserver(scheduleRuntimePanelHeightSync);
  observer.observe(document.documentElement);
  return observer;
}

let runtimePanelObserver: ResizeObserver | null = null;

function startRuntimePanelObserver() {
  if (runtimePanelObserver) return;
  runtimePanelObserver = observeRuntimeViewport();
}

function stopRuntimePanelObserver() {
  runtimePanelObserver?.disconnect();
  runtimePanelObserver = null;
}

function resumeRuntimePanelHeightSync() {
  startRuntimePanelObserver();
  scheduleRuntimePanelHeightSync();
}

function handleRuntimePanelVisibilityChange() {
  if (document.visibilityState === "hidden") {
    stopRuntimePanelObserver();
    return;
  }
  resumeRuntimePanelHeightSync();
}

startRuntimePanelObserver();
syncRuntimePanelHeight();
window.addEventListener("resize", scheduleRuntimePanelHeightSync, { passive: true });
window.visualViewport?.addEventListener("resize", scheduleRuntimePanelHeightSync, { passive: true });
window.addEventListener("pageshow", resumeRuntimePanelHeightSync, { passive: true });
document.addEventListener("visibilitychange", handleRuntimePanelVisibilityChange);
window.addEventListener("pagehide", stopRuntimePanelObserver);

mount(App, { target: panelRoot });
scheduleRuntimePanelHeightSync();
