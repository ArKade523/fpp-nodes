<script>
    export let isActive = false;
    let CodeEditor;

    if (isActive) {
        import("../CodeEditor.svelte").then(Module => {
            CodeEditor = Module.default;
        });
    }
</script>

<div class="tab-content" class:active={isActive}>
    {#if isActive && CodeEditor}
        <svelte:component this={CodeEditor} />
    {:else if isActive && !CodeEditor}
        <div class="loading">
            <div class="spinner">Loading...</div>
        </div>
    {/if}
</div>
