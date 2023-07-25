import Rete from "rete";
import { sockets, createSocketType, universalSocket } from "./sockets";

let componentClassCache = new Map();

export function createComponentClass(component) {
    if(componentClassCache.has(component.name)){
        return componentClassCache.get(component.name);
    } 

    let newClass = class extends Rete.Component {
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

    componentClassCache.set(component.name, newClass);
    return newClass;
}
