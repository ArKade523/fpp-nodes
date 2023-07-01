import Rete from "rete";
import { universalSocket } from "../sockets";"../sockets.js";

export class TextControl extends Rete.Control {
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

export default class TextInputComponent extends Rete.Component {
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