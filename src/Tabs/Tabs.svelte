<script>
    import ComponentCreatorTab from './ComponentCreatorTab.svelte';
    import EditorTab from './EditorTab.svelte';
  
    let activeTab = 'tab2';
</script>
  
<div id="tabs">
    <button on:click={() => activeTab = 'tab1'} class:active={activeTab === 'tab1'}>Component Creator</button>
    <button on:click={() => activeTab = 'tab2'} class:active={activeTab === 'tab2'}>Topology Editor</button>
    <img id="logo" src="../public/icons/fprime.png" alt="fprime">
</div>
  
<ComponentCreatorTab isActive={activeTab === 'tab1'} />
<EditorTab isActive={activeTab === 'tab2'} />
 