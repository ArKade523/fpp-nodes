<script>
    export let isActive = false;
    import NodeEditor from "../NodeEditor.svelte";
</script>

<div class="tab-content" class:active={isActive}>
    <NodeEditor />
</div>
