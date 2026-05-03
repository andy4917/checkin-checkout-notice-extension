<script lang="ts">
  import type { MenuGroup, MenuId, MenuItem } from "../../catalog/menu-routing.js";

  export let groups: readonly MenuGroup[];
  export let settingsMenu: MenuItem;
  export let onOpenMenu: (menuId: MenuId) => void;

  type HomeMenuEntry = {
    id: MenuId;
    title: string;
    description: string;
    icon: string;
    tone?: "primary";
  };

  const homeLabels: Partial<Record<MenuId, Omit<HomeMenuEntry, "id">>> = {
    CUSTOMER_NOTICE: {
      title: "Guidance",
      description: "Essential information for guests",
      icon: "i",
      tone: "primary",
    },
    QUICK_REPLY: {
      title: "Inquiry",
      description: "24/7 guest support center",
      icon: "□",
    },
    ROOM_REMARK_MEMO: {
      title: "Room Info",
      description: "객실 정보 메모",
      icon: "▤",
    },
    LAUNDRY_MANAGEMENT: {
      title: "Laundry",
      description: "세탁물 관리",
      icon: "◫",
    },
    OTA_RESERVATION_INPUT: {
      title: "Airport Van",
      description: "OTA 예약 입력",
      icon: "▱",
    },
    SALES_MANAGEMENT: {
      title: "Expenditure",
      description: "매지출 관리",
      icon: "▣",
    },
    WORK_REPORT: {
      title: "Work Report",
      description: "업무보고 생성",
      icon: "▧",
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
        <span class="priority-icon" aria-hidden="true">{menu.icon}</span>
        <span class="menu-text">
          <strong>{menu.title}</strong>
          <small>{menu.description}</small>
        </span>
        <span class="menu-arrow" aria-hidden="true">›</span>
      </button>
    {/each}
  </section>

  <section class="home-menu-section" aria-label="서비스 기록">
    <h2>Service Records</h2>
    <div class="home-list-card">
      {#each serviceRecordEntries as menu}
        <button type="button" onclick={() => onOpenMenu(menu.id)}>
          <span class="list-icon" aria-hidden="true">{menu.icon}</span>
          <span>{menu.title}</span>
          <b aria-hidden="true">›</b>
        </button>
      {/each}
    </div>
  </section>

  <section class="home-menu-section" aria-label="업무 양식">
    <h2>Work Forms</h2>
    <div class="home-list-card">
      {#each workFormEntries as menu}
        <button type="button" onclick={() => onOpenMenu(menu.id)}>
          <span class="list-icon" aria-hidden="true">{menu.icon}</span>
          <span>{menu.title}</span>
          <b aria-hidden="true">›</b>
        </button>
      {/each}
    </div>
  </section>

  <section class="home-menu-section" aria-label="사용자 설정">
    <h2>User Settings</h2>
    <div class="home-list-card">
      <button type="button" onclick={() => onOpenMenu(settingsMenu.id)}>
        <span class="list-icon" aria-hidden="true">⌘</span>
        <span>Template Edit</span>
        <b aria-hidden="true">›</b>
      </button>
    </div>
  </section>
</nav>

<nav class="home-bottom-bar" aria-label="빠른 실행">
  <button type="button">
    <span aria-hidden="true">↪</span>
    <strong>WINGS LOGIN</strong>
  </button>
  <button type="button">
    <span aria-hidden="true">☼</span>
    <strong>LIGHT</strong>
  </button>
  <button type="button">
    <span aria-hidden="true">☾</span>
    <strong>DARK</strong>
  </button>
  <button type="button" onclick={() => onOpenMenu("CUSTOMER_NOTICE")}>
    <span aria-hidden="true">▤</span>
    <strong>객실 선택</strong>
  </button>
</nav>
