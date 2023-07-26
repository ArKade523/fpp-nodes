<script>
    export let isActive = false;
    let NodeEditor;

    if (isActive) {
        import("../NodeEditor.svelte").then(Module => {
            NodeEditor = Module.default;
        });
    }
</script>

<div class="tab-content" class:active={isActive}>
    {#if isActive && NodeEditor}
        <svelte:component this={NodeEditor} />
    {:else if isActive && !NodeEditor}
        <div class="loading">
            <div class="spinner">Loading...</div>
        </div>
    {/if}
</div>
