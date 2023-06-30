<script>
  import { onMount } from 'svelte';
  import Rete from "rete";
  import ConnectionPlugin from 'rete-connection-plugin';
  import AlightRenderPlugin from 'rete-alight-render-plugin';
  import AreaPlugin from 'rete-area-plugin';
  
  const numSocket = new Rete.Socket('Number value');
  const universalSocket = new Rete.Socket('Universal');
  numSocket.combineWith(universalSocket);
  universalSocket.combineWith(numSocket);
  universalSocket.compatibleWith = s => {
    return true;
  }
  class NumControl extends Rete.Control {
    constructor(emitter, key, readonly) {
        super(key);
        this.render = 'js';
        this.emitter = emitter;
        this.key = key;
        this.template = `<input type="number" :readonly="readonly" :value="value" @input="change($event)"/>`;

        this.scope = {
            value: 0,
            readonly,
            change: this.change.bind(this)
        };
    }

    setValue(val) {
        this.scope.value = val;
    }

    change(e){
        this.setValue(e.target.value);
        this.update();
    }

    update() {
        if (this.key)
            this.putData(this.key, parseFloat(this.scope.value))
    }

    mounted() {
        this.update();
    }

    setValue(val) {
        this.scope.value = val;
        this._alight.scan();
    }
  }

  
  class NumComponent extends Rete.Component {
    constructor(){
      super("Number");
    }

    builder(node) {

      let out1 = new Rete.Output('num', "Number", numSocket);
      let in1 = new Rete.Input('num1', "Number", numSocket);

      const numControl = new NumControl(this.editor, 'num', false);

      return node
        .addControl(numControl)
        .addOutput(out1)
        .addInput(in1)
    }

    worker(node, inputs, outputs) {
      outputs['num'] = node.data.num;
    }
  }
  class TextControl extends Rete.Control {
    constructor(emitter, key, readonly) {
      super(key);
      this.render = 'js';
      this.emitter = emitter;
      this.key = key;
      this.template = `<input type="text" :readonly="readonly" :value="value" @input="change($event)"/>`;

      this.scope = {
        value: "",
        readonly,
        change: this.change.bind(this)
      };
    }

    setValue(val) {
      this.scope.value = val;
    }

    change(e){
      this.setValue(e.target.value);
      this.update();
    }

    update() {
      if (this.key)
        this.putData(this.key, this.scope.value)
    }

    mounted() {
      this.update();
    }

    setValue(val) {
      this.scope.value = val;
      this._alight.scan();
    }
  }

  class TextInputComponent extends Rete.Component {
    constructor(){
      super("TextInput");
    }

    builder(node) {
      let in1 = new Rete.Input('text', "Text", universalSocket);
      const textControl = new TextControl(this.editor, 'text', false);

      return node
        .addControl(textControl)
        .addInput(in1);
    }

    worker(node, inputs, outputs) {
      const text = inputs['text'].length ? inputs['text'][0] : node.data.text;
      console.log(text);
      const control = this.editor.nodes.find(n => n.id == node.id).controls.get('text');
      control.scope.value = text;
      control.update();
    }
  }


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
