<script>
  import { onMount } from 'svelte';
  import Rete from "rete";
  import ConnectionPlugin from 'rete-connection-plugin';
  import AlightRenderPlugin from 'rete-alight-render-plugin';
  import AreaPlugin from 'rete-area-plugin';
  import NumComponent from './components/NumComponent.js';
  import TextInputComponent from './components/TextInputComponent.js';
  
  onMount(async () => {
    const container = document.querySelector('#rete');
    const editor = new Rete.NodeEditor('demo@0.1.0', container);
    editor.use(ConnectionPlugin);
    editor.use(AlightRenderPlugin);
    editor.use(AreaPlugin);

    const engine = new Rete.Engine('demo@0.1.0');

    const components = [new NumComponent(), new TextInputComponent()];
    components.forEach(c => {
      editor.register(c);
      engine.register(c);
    });

    // Assuming jsonData contains your JSON from the file
    const response = await fetch('../json/test.json');
    const jsonData = await response.json();

    await editor.fromJSON(jsonData);
  });
</script>

<div id="rete"></div>
