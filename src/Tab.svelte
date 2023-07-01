<script>
    export let tab;
    export let activeTab;
  
    const selectTab = () => {
      activeTab.set(tab.id);
    }
  
    const handleKeyDown = (event) => {
      // Only respond to Enter key
      if (event.key === 'Enter') {
        selectTab();
      }
    }
  </script>
  
  <button 
    class="tab-list-item { $activeTab === tab.id ? 'active' : '' }" 
    on:click={selectTab} 
    on:keydown={handleKeyDown} 
  >
    Tab {tab.id}
  </button>
  