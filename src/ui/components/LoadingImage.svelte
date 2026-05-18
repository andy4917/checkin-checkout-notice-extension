<script lang="ts">
  import { getHeaderLogoUrl } from "../../assets/asset-catalog.js";

  export let label = "로딩 중";
  export let compact = false;

  const logoUrl = getHeaderLogoUrl("");
</script>

<span
  class:compact
  class="loading-image"
  role="status"
  aria-label={label}
>
  <img src={logoUrl} alt="" aria-hidden="true" />
</span>
