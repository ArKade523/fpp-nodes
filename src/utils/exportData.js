export const exportDataToJson = () => {
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

export const exportDataToFpp = async () => {
    const data = editor.toJSON();
    let fppObject = {
      instances: [],
      connections: []
    }

    for (const node of data.nodes) {
      const instance = {
        id: node.id,
        type: node.name,
      }
      for (const input of node.inputs) {
        for (const connection of input.connections) {
          fppObject.connections.push({
            src: connection.node,
            srcPort: connection.output,
            dst: node.id,
            dstPort: node.name
          });
        }
      }
      fppObject.instances.push(instance);
    }

    const components = await ipcRenderer.invoke('read-components');
    const componentMap = new Map();
    for (const component of components) {
      componentMap.set(component.name, component);
    }

    

    const dataStr = "";
}