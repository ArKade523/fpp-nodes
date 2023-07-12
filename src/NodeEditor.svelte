<script>
  import { onMount } from 'svelte';
  import Rete from "rete";
  import ConnectionPlugin from 'rete-connection-plugin';
  import AlightRenderPlugin from 'rete-alight-render-plugin';
  import AreaPlugin from 'rete-area-plugin';
  import { createControlClass, createComponentClass, serializeComponentClass } from './createComponentClasses.js'
  import NumComponent from './components/NumComponent.js';
  import TextInputComponent from './components/TextInputComponent.js';
  
  const { ipcRenderer } = window.require('electron');

  let componentDir = './components'
  let editor;
  let file;
  let nodeCount = 1;
  let selectedNodeType = ''; // will hold the selected node type

  // this is an array of component classes now
  let componentClasses = [NumComponent, TextInputComponent];
  let components = componentClasses.map(ComponentClass => new ComponentClass());

  let newComponentName = '';
  let newComponentSocketType = '';

  const createComponent = async () => {
    if (!newComponentName || !newComponentSocketType) return;
    
    // Create a new control class
    const NewControlClass = createControlClass(newComponentName, newComponentSocketType, false);

    // Create a new component class using the new control class
    const NewComponentClass = createComponentClass(newComponentName, NewControlClass);

    // Add the new component to the editor
    addComponent(NewComponentClass);

    // Reset the input fields
    newComponentName = '';
    newComponentSocketType = '';

    // Save the new component class as a JSON file
    const newComponent = {
      name: newComponentName,
      socketType: newComponentSocketType
    };
    await ipcRenderer.invoke('write-component', newComponent);

    // Load the components from the file system
    loadComponents();
  };

  const loadComponents = async () => {
    const loadedComponents = await ipcRenderer.invoke('read-components');

    // Update your application state with the loaded components
    loadedComponents.forEach(comp => {
      // Create a new control class
      const NewControlClass = createControlClass(comp.name, comp.socketType, false);

      // Create a new component class using the new control class
      const NewComponentClass = createComponentClass(comp.name, NewControlClass);

      // Add the new component to the list
      addComponent(NewComponentClass);
    });
  };


  const addNode = async () => {
    const component = components.find(c => c.name === selectedNodeType);
    if (!component) return;

    const node = await component.createNode({ num: nodeCount++ });
    node.position = [80 * nodeCount, 200];
    editor.addNode(node);
  };

  const addComponent = ComponentClass => {
    componentClasses.push(ComponentClass);
    const newComponent = new ComponentClass();
    components.push(newComponent);
    editor.register(newComponent);
  };

  const onFileChange = event => {
    file = event.target.files[0];

    loadFile();
  };

  const loadFile = async () => {
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = async (event) => {
      const jsonData = JSON.parse(event.target.result);
      await editor.fromJSON(jsonData);
    };
    fileReader.readAsText(file);
  };

  const exportData = () => {
    const data = editor.toJSON();
    const dataStr = JSON.stringify(data, null, 2); // indented with 2 spaces
    console.log(dataStr);

    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Create a link and click it to start download
    const link = document.createElement('a');
    link.href = url;
    link.download = 'data.json';
    link.click();

    // Remove the link after triggering download
    link.remove();
  };

  onMount(async () => {
    const container = document.querySelector('#rete');
    editor = new Rete.NodeEditor('demo@0.1.0', container);
    editor.use(ConnectionPlugin);
    editor.use(AlightRenderPlugin);
    editor.use(AreaPlugin);

    // load the components from the file system
    await loadComponents(); 

    const engine = new Rete.Engine('demo@0.1.0');

    components.forEach(c => {
      editor.register(c);
      engine.register(c);
    });

  });

</script>
<div id="node-editor">
  <div id="toolbar">
    <label for="file-import" id="file-import-label">Import.json</label>
    <input id="file-import" type="file" on:change={onFileChange} accept=".json" />
    <select bind:value={selectedNodeType}>
      <option disabled selected value> -- select a node type -- </option>
      {#each components as component (component.name)}
        <option>{component.name}</option>
      {/each}
    </select>
    <button on:click={addNode}>Add Node</button>
    <button on:click={exportData}>Export</button>
  </div>
  <div id="rete"></div>
</div>
