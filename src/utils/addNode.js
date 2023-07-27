import { editor, components } from 'stores.js';

export const addNode = async () => {
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