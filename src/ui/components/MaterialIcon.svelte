<script lang="ts">
  export let name: string;
  export let size = 20;
  export let filled = false;
</script>

<span
  aria-hidden="true"
  class="material-symbols-outlined material-icon"
  style={`--icon-size: ${size}px; --icon-fill: ${filled ? 1 : 0};`}
>
  {name}
</span>
