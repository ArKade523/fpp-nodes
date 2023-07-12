<script>
    import Tab1 from './Tab1.svelte';
    import EditorTab from './EditorTab.svelte';
  
    let activeTab = 'tab2';
</script>
  
<div id="tabs">
    <button on:click={() => activeTab = 'tab1'} class:active={activeTab === 'tab1'}>Component Creator</button>
    <button on:click={() => activeTab = 'tab2'} class:active={activeTab === 'tab2'}>Topology Editor</button>
</div>
  
<Tab1 isActive={activeTab === 'tab1'} />
<EditorTab isActive={activeTab === 'tab2'} />
 