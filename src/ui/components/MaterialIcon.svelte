<script lang="ts">
  export let name: string;
  export let size = 20;

  type IconPath = {
    d: string;
  };

  const iconPaths: Readonly<Record<string, IconPath[]>> = {
    add_notes: [{ d: "M5 4h10l4 4v12H5z" }, { d: "M14 4v5h5" }, { d: "M8 13h8" }, { d: "M8 17h6" }],
    airport_shuttle: [
      { d: "M4 15V7a2 2 0 0 1 2-2h9l5 5v5" },
      { d: "M4 15h16" },
      { d: "M7 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" },
      { d: "M17 18a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" },
      { d: "M15 5v5h5" },
      { d: "M7 9h5" },
    ],
    arrow_back: [{ d: "M19 12H5" }, { d: "m12 5-7 7 7 7" }],
    arrow_downward: [{ d: "M12 4v16" }, { d: "m5 13 7 7 7-7" }],
    assignment: [{ d: "M7 5h10" }, { d: "M6 7h12v13H6z" }, { d: "M9 11h6" }, { d: "M9 15h6" }],
    bedroom_parent: [
      { d: "M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" },
      { d: "M4 11h16v7" },
      { d: "M4 18v-7" },
      { d: "M7 9h4" },
      { d: "M13 9h4" },
    ],
    bolt: [{ d: "M13 2 4 14h7l-1 8 10-13h-7l1-7Z" }],
    calendar_today: [{ d: "M7 3v4" }, { d: "M17 3v4" }, { d: "M5 7h14" }, { d: "M5 5h14v16H5z" }],
    chat_bubble: [{ d: "M5 5h14v10H8l-3 4z" }],
    check: [{ d: "m5 12 4 4 10-10" }],
    check_circle: [{ d: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" }, { d: "m8 12 3 3 5-6" }],
    chevron_right: [{ d: "m9 6 6 6-6 6" }],
    call: [{ d: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7l.4 2.6a2 2 0 0 1-.5 1.7L7.8 9.2a16 16 0 0 0 7 7l1.2-1.2a2 2 0 0 1 1.7-.5l2.6.4a2 2 0 0 1 1.7 2Z" }],
    content_copy: [{ d: "M8 8h10v12H8z" }, { d: "M6 16H4V4h10v2" }],
    content_paste_search: [
      { d: "M8 4h8" },
      { d: "M7 6H5v14h14V6h-2" },
      { d: "M10 13a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z" },
      { d: "m15 16 2 2" },
    ],
    credit_card: [{ d: "M3 6h18v12H3z" }, { d: "M3 10h18" }, { d: "M7 15h5" }],
    delete_forever: [{ d: "M5 7h14" }, { d: "M9 7V5h6v2" }, { d: "M8 7l1 13h6l1-13" }, { d: "m10 11 4 4" }, { d: "m14 11-4 4" }],
    description: [{ d: "M6 3h9l3 3v15H6z" }, { d: "M14 3v4h4" }, { d: "M9 12h6" }, { d: "M9 16h6" }],
    design_services: [{ d: "M4 20h4l11-11-4-4L4 16z" }, { d: "m13 7 4 4" }, { d: "M14 4 16 2l4 4-2 2" }],
    door_front: [{ d: "M7 21V3h10v18" }, { d: "M10 12h.01" }, { d: "M5 21h14" }],
    drag_indicator: [{ d: "M9 5h.01" }, { d: "M15 5h.01" }, { d: "M9 12h.01" }, { d: "M15 12h.01" }, { d: "M9 19h.01" }, { d: "M15 19h.01" }],
    edit_note: [{ d: "M4 7h10" }, { d: "M4 12h8" }, { d: "M4 17h6" }, { d: "m14 17 5-5 2 2-5 5h-2z" }],
    event_note: [{ d: "M5 5h14v16H5z" }, { d: "M8 3v4" }, { d: "M16 3v4" }, { d: "M5 9h14" }, { d: "M8 13h4" }, { d: "M8 17h6" }],
    expand_more: [{ d: "m6 9 6 6 6-6" }],
    flight: [{ d: "M10 21 12 13 3 9V7l9 2 4-7 2 1-2 8 5 3v2l-6-1-3 6z" }],
    forum: [{ d: "M4 5h12v8H7l-3 3z" }, { d: "M9 15h8l3 3V8h-2" }],
    hotel_class: [{ d: "m12 3 2.4 5 5.6.8-4 3.9.9 5.5-4.9-2.6L7.1 20l.9-5.5-4-3.9 5.6-.8z" }],
    hourglass_empty: [{ d: "M7 3h10" }, { d: "M7 21h10" }, { d: "M8 3c0 5 8 5 8 10s-8 5-8 10" }, { d: "M16 3c0 5-8 5-8 10s8 5 8 10" }],
    info: [{ d: "M12 17v-6" }, { d: "M12 7h.01" }, { d: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" }],
    inventory_2: [{ d: "M4 7h16v13H4z" }, { d: "M4 7l2-4h12l2 4" }, { d: "M9 12h6" }],
    key: [{ d: "M14 14a5 5 0 1 1 2-4l5-5" }, { d: "M18 7l2 2" }, { d: "M16 9l2 2" }],
    keyboard_return: [{ d: "M20 7v6H6" }, { d: "m10 9-4 4 4 4" }],
    local_laundry_service: [{ d: "M6 3h12v18H6z" }, { d: "M9 7h.01" }, { d: "M13 7h2" }, { d: "M9 14a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z" }, { d: "M9.5 13.5c1.5 1 3.5-1 5 0" }],
    local_parking: [{ d: "M7 20V4h6a4 4 0 0 1 0 8H7" }, { d: "M7 12h6" }],
    login: [{ d: "M14 8l4 4-4 4" }, { d: "M4 12h14" }, { d: "M20 4v16" }],
    luggage: [{ d: "M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }, { d: "M6 7h12v14H6z" }, { d: "M9 21v-2" }, { d: "M15 21v-2" }],
    manage_search: [{ d: "M4 6h9" }, { d: "M4 11h6" }, { d: "M4 16h5" }, { d: "M13 14a4 4 0 1 0 8 0 4 4 0 0 0-8 0Z" }, { d: "m20 17 2 2" }],
    meeting_room: [{ d: "M5 21h14" }, { d: "M7 21V4l9-1v18" }, { d: "M11 12h.01" }],
    menu_book: [{ d: "M4 5h7a3 3 0 0 1 3 3v11a3 3 0 0 0-3-3H4z" }, { d: "M20 5h-7a3 3 0 0 0-3 3" }, { d: "M20 5v11h-7a3 3 0 0 0-3 3" }],
    mode_fan: [{ d: "M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0" }, { d: "M12 10c1-5 6-5 7-2 1 3-3 5-5 4" }, { d: "M14 13c4 3 2 8-1 8-3 0-4-5-2-7" }, { d: "M10 13c-5 2-8-2-6-5 2-3 7-1 7 2" }],
    more_horiz: [{ d: "M5 12h.01" }, { d: "M12 12h.01" }, { d: "M19 12h.01" }],
    payments: [{ d: "M3 7h18v10H3z" }, { d: "M7 10h10" }, { d: "M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" }],
    person: [{ d: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" }, { d: "M4 21a8 8 0 0 1 16 0" }],
    recycling: [{ d: "m7 7 2-4 3 4" }, { d: "m17 7 4 1-2 4" }, { d: "m10 19-4-1 2-4" }, { d: "M9 7h5" }, { d: "M18 12l-3 5" }, { d: "M8 15l3 4" }],
    restart_alt: [{ d: "M5 12a7 7 0 1 0 2-5" }, { d: "M5 4v5h5" }],
    room_service: [{ d: "M4 18h16" }, { d: "M6 18a6 6 0 0 1 12 0" }, { d: "M12 7V5" }, { d: "M9 5h6" }],
    schedule: [{ d: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" }, { d: "M12 7v5l3 2" }],
    settings: [{ d: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" }, { d: "M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.4 1a7 7 0 0 0-1.7-1L14.5 3h-5l-.4 3.1a7 7 0 0 0-1.7 1L5 6.1l-2 3.4L5 11a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a7 7 0 0 0 1.7 1l.4 3.1h5l.4-3.1a7 7 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z" }],
    summarize: [{ d: "M5 4h14v16H5z" }, { d: "M8 8h8" }, { d: "M8 12h8" }, { d: "M8 16h5" }],
    swap_vert: [{ d: "M8 4v14" }, { d: "m4 14 4 4 4-4" }, { d: "M16 20V6" }, { d: "m12 10 4-4 4 4" }],
    sync: [{ d: "M4 12a8 8 0 0 1 13-6" }, { d: "M17 3v5h-5" }, { d: "M20 12a8 8 0 0 1-13 6" }, { d: "M7 21v-5h5" }],
    travel_explore: [{ d: "M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z" }, { d: "M3 12h18" }, { d: "M12 3a14 14 0 0 1 0 18" }, { d: "M12 3a14 14 0 0 0 0 18" }, { d: "m15 15 4 4" }],
    vpn_key: [{ d: "M7 14a4 4 0 1 1 3.5-6H22v3h-3v3h-3v-3h-5.5A4 4 0 0 1 7 14Z" }, { d: "M7 10h.01" }],
  };

  $: paths = iconPaths[name] ?? [];
</script>

<svg
  aria-hidden="true"
  class="material-icon"
  style={`--icon-size: ${size}px;`}
  viewBox="0 0 24 24"
  fill="none"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
  focusable="false"
>
  {#if paths.length > 0}
    {#each paths as path}
      <path d={path.d} />
    {/each}
  {/if}
</svg>
