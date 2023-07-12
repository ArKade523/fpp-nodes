<script>
    import { createEventDispatcher } from 'svelte';
    const { ipcRenderer } = window.require('electron');
    
    const dispatch = createEventDispatcher();
    
    let componentName = '';
    let ports = [{ name: '', type: '', direction: '' }];
    
    const addPort = () => {
      ports.push({ name: '', type: '', direction: '' });
    };
    
    const removePort = index => {
      ports.splice(index, 1);
    };
  
    const handleSubmit = () => {
      // Validate form data
      if (!componentName || ports.some(port => !port.name || !port.type || !port.direction)) return;
  
      // Send the new component to the main process
      ipcRenderer.invoke('write-component', { componentName, ports });

      // Clear the form
      componentName = '';
      ports = [{ name: '', type: '', direction: '' }];
    };
</script>
  
<form on:submit|preventDefault={handleSubmit}>
    <label for="componentName">Component Name:</label>
    <input type="text" bind:value={componentName} id="componentName" required />
  
    <p>Ports:</p>
    {#each ports as port, i (i)}
      <div>
        <label for={`portName${i}`}>Port Name:</label>
        <input type="text" bind:value={port.name} id={`portName${i}`} required />
        
        <label for={`portType${i}`}>Socket Type:</label>
        <input type="text" bind:value={port.type} id={`portType${i}`} required />
  
        <label for={`portDirection${i}`}>Direction:</label>
        <select bind:value={port.direction} id={`portDirection${i}`} required>
          <option disabled selected value> -- select a direction -- </option>
          <option>input</option>
          <option>output</option>
        </select>
  
        <button type="button" on:click={() => removePort(i)}>Remove</button>
      </div>
    {/each}
    
    <button type="button" on:click={addPort}>Add Port</button>
    <button type="submit">Create Component</button>
</form>
