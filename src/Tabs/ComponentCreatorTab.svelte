<script>
    export let isActive = false;
    import ComponentCreator from "../ComponentCreator.svelte";
</script>

<div class="tab-content" class:active={isActive}>
    <ComponentCreator />
</div>

