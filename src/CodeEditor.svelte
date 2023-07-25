<script context="module">
    import * as monaco from 'monaco-editor/esm/vs/editor/editor.api.js';
</script>

<script>
    import { onMount, onDestroy } from 'svelte';
    import { writable } from 'svelte/store';
    import { activeFile, files } from './stores.js';
    import FileList from './FileList.svelte';
    const { ipcRenderer } = window.require('electron');
    
    let editorContainer;
    let editor;

    onMount(async () => {
        ipcRenderer.on('file-data', (event, data) => {
            if (editorContainer) {
                if (!editor)
                    editor = monaco.editor.create(editorContainer, {
                        value: data,
                        language: "javascript",
                        theme: "vs-dark",
                    });
                else editor.setValue(data);

                editor.getModel().onDidChangeContent(() => {
                    ipcRenderer.send('write-file', $activeFile, editor.getValue());
                });
            }
        });

    });

    onDestroy(() => {
        if (editor)
            editor.dispose();
    });
</script>

<style>
    .editor-container {
        height: 100%;
        width: 80%;
    }
    
    .editor-and-file-list {
        display: flex;
        flex-direction: row;
        height: 100%;
        width: 100%;
    }
</style>

<div class="editor-and-file-list">
    <FileList />
    <div class="editor-container" bind:this={editorContainer}></div>
</div>
