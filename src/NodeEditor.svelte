<script defer>
  import { onMount, onDestroy } from 'svelte';
  import Rete from "rete";
  import ConnectionPlugin from 'rete-connection-plugin';
  import AlightRenderPlugin from 'rete-alight-render-plugin';
  import AreaPlugin from 'rete-area-plugin';
  import { createComponentClass } from './createComponentClasses.js'
  import { writable } from 'svelte/store';
  import { currentTopology } from './stores.js'
  
  const { ipcRenderer } = window.require('electron');

  let editor;
  let file;
  let nodeCount = 1;
  let selectedNodeType = writable(''); // will hold the selected node type

  // this is an array of component classes now
  let componentClasses = [];
  export let components = writable(componentClasses.map(ComponentClass => new ComponentClass()));

  const loadComponents = async () => {
    return new Promise(async (resolve, reject) => {
        try {
            const loadedComponents = await ipcRenderer.invoke('read-components');
            // Update your application state with the loaded components
            loadedComponents.forEach(comp => {
                // Create a new component class using the new control class
                const NewComponentClass = createComponentClass(comp);
                // Add the new component to the list
                addComponent(NewComponentClass);
            });
            resolve(); // Resolve the promise when done
        } catch (error) {
            reject(error); // Reject the promise on error
        }
    });
  };


  const addNode = async () => {
    let componentArray;
    components.subscribe(data => componentArray = data);
    const component = componentArray.find(c => c.name === selectedNodeType);
    if (!component) {
      console.error(`Component ${selectedNodeType} not found`);
      return;
    }
    
    const node = await component.createNode({ num: nodeCount++ });
    node.position = [80 * nodeCount, 200];
    editor.addNode(node);
  };

  const addComponent = ComponentClass => {
    // Check if a component with the same name already exists
    let componentArray;
    components.subscribe(data => componentArray = data);
    if (componentArray.some(c => c.name === ComponentClass.name)) return;

    // Add the new component to the list
    componentClasses.push(ComponentClass);
    const newComponent = new ComponentClass();
    components.update(arr => [...arr, newComponent]);
    // editor.register(newComponent);
  };

  const onFileChange = event => {
    file = event.target.files[0];

    // console.log(file.path);

    loadFile();
  };

  const loadFile = async () => {
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = async (event) => {
      const jsonData = JSON.parse(event.target.result);
      nodeEditorGlobals.currentTopology = jsonData;
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
    
    let componentArray;
    components.subscribe(data => componentArray = data);
    for (const c of componentArray) {
      editor.register(c);
      engine.register(c);
    }
    
    // load the topology from the global variable
    if (currentTopology) {
        await editor.fromJSON(currentTopology);
    }
    
    ipcRenderer.on('component-dir-changed', (event, eventType, filename) => {
      console.log(`Event: ${eventType}, File: ${filename}`);
      loadComponents();
    });

  });

  onDestroy(() => {
    ipcRenderer.removeAllListeners('component-dir-changed');
  });

</script>
<div id="node-editor">
  <div id="toolbar">
    <label for="file-import" id="file-import-label">Import.json</label>
    <input id="file-import" type="file" on:change={onFileChange} accept=".json" />
    <select bind:value={selectedNodeType}>
      <option disabled selected value> -- select a node type -- </option>
      {#each $components as component}
        <option>{component.name}</option>
      {/each}
    </select>
    <button on:click={addNode}>Add Node</button>
    <button on:click={exportData}>Export</button>
  </div>
  <div id="rete"></div>
</div>
