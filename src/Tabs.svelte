<script>
    import { writable } from 'svelte/store';
    import Tab from './Tab.svelte';
    import NodeEditor from './NodeEditor.svelte';
  
    let tabs = writable([{id: 1, content: NodeEditor}]);
    let activeTab = writable(1);
  
    const addTab = () => {
      let id = Math.max(...$tabs.map(t => t.id)) + 1;
      tabs.update(t => [...t, {id, content: NodeEditor}]);
      activeTab.set(id);
    }
</script>
  
<div id="app">
    <button id="add-tab-button" on:click={addTab}>Add Tab</button>
    <div class="tabs">
      <ul class="tab-list">
        {#each $tabs as tab (tab.id)}
          <Tab {tab} {activeTab} />
        {/each}
      </ul>
      <div class="tab-content">
        <svelte:component this={$tabs.find(t => t.id === $activeTab).content} />
      </div>
    </div>
</div>
  