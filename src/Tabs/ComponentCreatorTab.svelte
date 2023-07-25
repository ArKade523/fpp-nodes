<script>
    export let isActive = false
    import CodeEditor from "../CodeEditor.svelte";
</script>

<div class="tab-content" class:active={isActive}>
    {#if isActive}
        <CodeEditor />
    {/if}
</div>

