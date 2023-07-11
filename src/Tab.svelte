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

<li 
  class="tab-list-item { $activeTab === tab.id ? 'active' : '' }" 
  on:click={selectTab} 
  on:keydown={handleKeyDown} 
  tabindex="0"
>
  Tab {tab.id}
</li>