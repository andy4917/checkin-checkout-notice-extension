<script lang="ts">
  import type { MenuGroup, MenuId, MenuItem } from "../../catalog/menu-routing.js";
  import * as HomeIconModule from "./HomeIcon.svelte";
  import type { HomeIconName } from "./HomeIcon.svelte";

  const HomeIcon = HomeIconModule.default;

  export let groups: readonly MenuGroup[];
  export let settingsMenu: MenuItem;
  export let onOpenMenu: (menuId: MenuId) => void;

  type HomeMenuEntry = {
    id: MenuId;
    title: string;
    description: string;
    icon: HomeIconName;
    tone?: "primary";
  };

  const homeLabels: Partial<Record<MenuId, Omit<HomeMenuEntry, "id">>> = {
    CUSTOMER_NOTICE: {
      title: "Guidance",
      description: "Essential information for guests",
      icon: "info",
      tone: "primary",
    },
    QUICK_REPLY: {
      title: "Inquiry",
      description: "24/7 guest support center",
      icon: "message",
    },
    ROOM_REMARK_MEMO: {
      title: "Room Info",
      description: "객실 정보 메모",
      icon: "rooms",
    },
    LAUNDRY_MANAGEMENT: {
      title: "Laundry",
      description: "세탁물 관리",
      icon: "laundry",
    },
    OTA_RESERVATION_INPUT: {
      title: "Airport Van",
      description: "OTA 예약 입력",
      icon: "plane",
    },
    SALES_MANAGEMENT: {
      title: "Expenditure",
      description: "매지출 관리",
      icon: "receipt",
    },
    WORK_REPORT: {
      title: "Work Report",
      description: "업무보고 생성",
      icon: "clipboard",
    },
  };

  const priorityIds: readonly MenuId[] = ["CUSTOMER_NOTICE", "QUICK_REPLY"];
  const serviceRecordIds: readonly MenuId[] = [
    "ROOM_REMARK_MEMO",
    "LAUNDRY_MANAGEMENT",
    "OTA_RESERVATION_INPUT",
  ];
  const workFormIds: readonly MenuId[] = ["SALES_MANAGEMENT", "WORK_REPORT"];

  $: menuItems = groups.flatMap((group) => group.items);
  $: priorityEntries = getEntries(priorityIds);
  $: serviceRecordEntries = getEntries(serviceRecordIds);
  $: workFormEntries = getEntries(workFormIds);

  function getEntries(ids: readonly MenuId[]): HomeMenuEntry[] {
    return ids.flatMap((id) => {
      const menu = menuItems.find((item) => item.id === id);
      const label = homeLabels[id];
      return menu && label ? [{ id, ...label }] : [];
    });
  }
</script>

<nav class="home-surface" aria-label="홈 메뉴">
  <section class="priority-menu" aria-label="주요 메뉴">
    {#each priorityEntries as menu}
      <button
        class:primary={menu.tone === "primary"}
        class="priority-card"
        type="button"
        onclick={() => onOpenMenu(menu.id)}
      >
        <span class="priority-icon" aria-hidden="true">
          <HomeIcon name={menu.icon} size={32} strokeWidth={2.35} />
        </span>
        <span class="menu-text">
          <strong>{menu.title}</strong>
          <small>{menu.description}</small>
        </span>
        <span class="menu-arrow" aria-hidden="true">
          <HomeIcon name="chevron-right" size={24} strokeWidth={2.6} />
        </span>
      </button>
    {/each}
  </section>

  <section class="home-menu-section" aria-label="서비스 기록">
    <h2>Service Records</h2>
    <div class="home-list-card">
      {#each serviceRecordEntries as menu}
        <button type="button" onclick={() => onOpenMenu(menu.id)}>
          <span class="list-icon" aria-hidden="true">
            <HomeIcon name={menu.icon} size={22} strokeWidth={2} />
          </span>
          <span>{menu.title}</span>
          <b aria-hidden="true">
            <HomeIcon name="chevron-right" size={20} strokeWidth={2.6} />
          </b>
        </button>
      {/each}
    </div>
  </section>

  <section class="home-menu-section" aria-label="업무 양식">
    <h2>Work Forms</h2>
    <div class="home-list-card">
      {#each workFormEntries as menu}
        <button type="button" onclick={() => onOpenMenu(menu.id)}>
          <span class="list-icon" aria-hidden="true">
            <HomeIcon name={menu.icon} size={22} strokeWidth={2} />
          </span>
          <span>{menu.title}</span>
          <b aria-hidden="true">
            <HomeIcon name="chevron-right" size={20} strokeWidth={2.6} />
          </b>
        </button>
      {/each}
    </div>
  </section>

  <section class="home-menu-section" aria-label="사용자 설정">
    <h2>User Settings</h2>
    <div class="home-list-card">
      <button type="button" onclick={() => onOpenMenu(settingsMenu.id)}>
        <span class="list-icon" aria-hidden="true">
          <HomeIcon name="settings" size={22} strokeWidth={1.9} />
        </span>
        <span>Template Edit</span>
        <b aria-hidden="true">
          <HomeIcon name="chevron-right" size={20} strokeWidth={2.6} />
        </b>
      </button>
    </div>
  </section>
</nav>

<nav class="home-bottom-bar" aria-label="빠른 실행">
  <button type="button">
    <span aria-hidden="true"><HomeIcon name="log-in" size={24} strokeWidth={2.25} /></span>
    <strong>WINGS LOGIN</strong>
  </button>
  <button type="button">
    <span aria-hidden="true"><HomeIcon name="sun" size={24} strokeWidth={2.1} /></span>
    <strong>LIGHT</strong>
  </button>
  <button type="button">
    <span aria-hidden="true"><HomeIcon name="moon" size={24} strokeWidth={2.1} /></span>
    <strong>DARK</strong>
  </button>
  <button type="button" onclick={() => onOpenMenu("CUSTOMER_NOTICE")}>
    <span aria-hidden="true"><HomeIcon name="rooms" size={24} strokeWidth={2.1} /></span>
    <strong>객실 선택</strong>
  </button>
</nav>
