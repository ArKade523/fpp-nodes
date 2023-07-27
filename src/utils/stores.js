import { writable } from 'svelte/store';

// NodeEditor stores
export let currentTopology = null;
export let editor = null;
export let componentClasses = [];
export let components = writable([]);

export let activeFile = writable('');
export let files = writable();

// A store to hold the open state for each directory
export let openStates = writable({});

export const newFileName = writable(null);
export const selectedDirectory = writable(null);