<script lang="ts">
  import logoUrl from "../../assets/logo.png";

  export let label = "로딩 중";
  export let compact = false;
</script>

<span
  class:compact
  class="loading-image"
  role="status"
  aria-label={label}
>
  <img src={logoUrl} alt="" aria-hidden="true" />
</span>
