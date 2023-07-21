import Rete from "rete";
import { sockets, createSocketType, universalSocket } from "./sockets";

// Component class factory function
export function createComponentClass(component) {
    return class extends Rete.Component {
        constructor(){
            super(component.name);
        }

        builder(node) {
            for (const port of component.ports) {
                let portTitle = port.name;
                if (port.type) {
                    portTitle += ` : ${port.type}`;
                }

                if (port.kind === 'AsyncInput' || port.kind === 'SyncInput') {
                    node.addInput(new Rete.Input(port.name, portTitle, universalSocket));
                } else if (port.kind === 'Output') {
                    node.addOutput(new Rete.Output(port.name, portTitle, universalSocket));
                }
            }

            return node;
        }

    };
}
