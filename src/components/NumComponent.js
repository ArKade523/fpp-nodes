import Rete from "rete";
import { numSocket } from "../sockets.js";

export class NumControl extends Rete.Control {
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

export default class NumComponent extends Rete.Component {
    constructor(){
        super("Number");
    }

    builder(node) {

        let out1 = new Rete.Output('num', "Number", numSocket);
        let out2 = new Rete.Output('num2', "Number2", numSocket); // Added second output

        let in1 = new Rete.Input('num1', "Number", numSocket);
        let in2 = new Rete.Input('num2', "Number2", numSocket); // Added second input

        const numControl = new NumControl(this.editor, 'num', false);

        return node
        // .addControl(numControl)
        .addOutput(out1)
        .addOutput(out2) // Add second output to the node
        .addInput(in1)
        .addInput(in2) // Add second input to the node
    }

    worker(node, inputs, outputs) {
        outputs['num'] = node.data.num;
        outputs['num2'] = node.data.num; // Set data for second output
    }
}
