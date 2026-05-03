<script lang="ts">
  export type HomeIconName =
    | "calendar"
    | "chevron-down"
    | "chevron-right"
    | "check"
    | "clipboard"
    | "file-text"
    | "info"
    | "laundry"
    | "log-in"
    | "message"
    | "moon"
    | "plane"
    | "receipt"
    | "rooms"
    | "settings"
    | "sun";

  export let name: HomeIconName;
  export let size = 24;
  export let strokeWidth = 2;

  const paths: Record<HomeIconName, string[]> = {
    calendar: [
      "M8 2v4",
      "M16 2v4",
      "M3 10h18",
      "M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z",
    ],
    "chevron-down": ["m6 9 6 6 6-6"],
    "chevron-right": ["m9 18 6-6-6-6"],
    check: ["m20 6-11 11-5-5"],
    clipboard: [
      "M9 4h6",
      "M9 2h6v4H9z",
      "M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2",
      "M8 12h8",
      "M8 16h8",
    ],
    "file-text": [
      "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z",
      "M14 2v6h6",
      "M8 13h8",
      "M8 17h6",
    ],
    info: ["M12 16v-5", "M12 8h.01", "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"],
    laundry: [
      "M5 3h14v18H5z",
      "M8 6h.01",
      "M11 6h5",
      "M8 15a4 4 0 0 0 8 0 4 4 0 0 0-8 0Z",
      "M8 15c2 1.5 5 1.5 8 0",
    ],
    "log-in": ["M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4", "M10 17l5-5-5-5", "M15 12H3"],
    message: ["M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"],
    moon: ["M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"],
    plane: ["M2 16l20-8-20-8 4 8-4 8Z", "M6 8h16"],
    receipt: ["M4 3v18l3-2 3 2 3-2 3 2 4-2V3Z", "M8 8h8", "M8 12h8", "M8 16h5"],
    rooms: ["M4 4h16v16H4z", "M8 4v16", "M16 4v16", "M4 10h16", "M4 16h16"],
    settings: [
      "M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z",
      "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z",
    ],
    sun: [
      "M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z",
      "M12 2v2",
      "M12 20v2",
      "M4.93 4.93l1.41 1.41",
      "M17.66 17.66l1.41 1.41",
      "M2 12h2",
      "M20 12h2",
      "M6.34 17.66l-1.41 1.41",
      "M19.07 4.93l-1.41 1.41",
    ],
  };
</script>

<svg
  aria-hidden="true"
  class="home-icon-svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
>
  {#each paths[name] as path}
    <path d={path} />
  {/each}
</svg>
