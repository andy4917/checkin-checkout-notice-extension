<script lang="ts">
  export let name: string;
  export let size = 20;
</script>

<span
  aria-hidden="true"
  class="material-symbols-outlined material-icon"
  style={`--icon-size: ${size}px;`}
>
  {name}
</span>
