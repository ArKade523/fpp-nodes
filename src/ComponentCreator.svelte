<script>
    import { createEventDispatcher } from 'svelte';
    const { ipcRenderer } = window.require('electron');
    
    let component = {
        name: '',
        ports: [{ name: '', type: '', direction: '' }]
    };

    const addPort = () => {
        component.ports.push({ name: '', type: '', direction: '' });
    };
    
    const removePort = index => {
        component.ports.splice(index, 1);
    };
  
    const handleSubmit = () => {
        // Validate form data
        if (!component.name || component.ports.some(port => !port.name || !port.type || !port.direction)) return;
    
        // Send the new component to the main process
        ipcRenderer.invoke('write-component', component);

        // Clear the form
        component = {
            name: '',
            ports: [{ name: '', type: '', direction: '' }]
        };
    };
</script>
  
<div id="component-creator">
    <form id="component-creator-form" on:submit|preventDefault={handleSubmit}>
        <input type="text" bind:value={component.name} id="componentName" placeholder="Component Name" required />
    
        <label for="portName1">Ports</label>
        {#each component.ports as port, i (i)}
        <div>
            <input type="text" bind:value={port.name} id={`portName${i}`} placeholder="Port Name" required />:
            <input type="text" bind:value={port.type} id={`portType${i}`} placeholder="Type" required />
            <label for={`portDirection${i}`}>Direction:</label>
            <select bind:value={port.direction} id={`portDirection${i}`} required>
                <option disabled selected value> -- select a direction -- </option>
                <option>input</option>
                <option>output</option>
            </select>
            {#if i > 1}
                <button type="button" on:click={() => removePort(i)}>Remove</button>
            {/if}
        </div>
        {/each}
        
        <button type="button" on:click={addPort}>Add Port</button>
        <button type="submit">Create Component</button>
    </form>
</div>