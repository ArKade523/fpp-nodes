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

    const n1 = await components[0].createNode({num: 2});
    n1.position = [80, 200];

    const n2 = await components[0].createNode({num: 3});
    n2.position = [180, 300];
    editor.addNode(n2);

    const n3 = await components[0].createNode({num: 4});
    n3.position = [280, 400];
    editor.addNode(n3);

    const text1 = await components[1].createNode({text: "Hello"});
    text1.position = [180, 100];
    editor.addNode(text1);

    editor.addNode(n1);
  });
</script>

<div id="rete"></div>
