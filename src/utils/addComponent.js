import { components, componentClasses } from '../stores.js';

export const addComponent = ComponentClass => {
    // Check if a component with the same name already exists
    let componentArray;
    components.subscribe(data => componentArray = data);
    if (componentArray.some(c => c.name === ComponentClass.name)) return;

    // Add the new component to the list
    componentClasses.push(ComponentClass);
    const newComponent = new ComponentClass();
    components.update(arr => [...arr, newComponent]);
    // editor.register(newComponent);
};