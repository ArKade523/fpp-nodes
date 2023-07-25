import { writable } from 'svelte/store';

export let nodeEditorGlobals = {
    currentTopology: null,
}

export let activeFile = writable('');
export let files = writable();

// A store to hold the open state for each directory
export let openStates = writable({});