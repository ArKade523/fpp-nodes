import Rete from "rete";
import { numSocket, universalSocket } from "./sockets.js";

// Control class factory function
export function createControlClass(controlName, socketType, isReadonly) {
    return class extends Rete.Control {
        constructor(emitter, key) {
            super(key);
            this.render = 'js';
            this.emitter = emitter;
            this.key = key;
            this.template = `<input type="${socketType === numSocket ? 'number' : 'text'}" :readonly="readonly" :value="value" @input="change($event)"/>`;

            this.scope = {
                value: 0,
                readonly: isReadonly,
                change: this.change.bind(this)
            };
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
    };
}

// Component class factory function
export function createComponentClass(componentName, controlName, socketType, isReadonly) {
    const ControlClass = createControlClass(controlName, socketType, isReadonly);

    return class extends Rete.Component {
        constructor(){
            super(componentName);
        }

        builder(node) {
            let out1 = new Rete.Output('num', "Number", socketType);
            let in1 = new Rete.Input('num1', "Number", socketType);

            const control = new ControlClass(this.editor, 'num', false);

            return node
            .addControl(control)
            .addOutput(out1)
            .addInput(in1)
        }

        worker(node, inputs, outputs) {
            outputs['num'] = node.data.num;
        }
    };
}
