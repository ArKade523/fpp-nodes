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
    let isResizing = false;
    let fileList;
    let parentContainer;

    const initDrag = event => {
        isResizing = true;
        document.body.style.userSelect = 'none'; // Prevent text selection during dragging
        document.body.style.cursor = 'col-resize'; // Change cursor to col-resize during dragging
        window.addEventListener('mousemove', doDrag);
        window.addEventListener('mouseup', stopDrag);
    }

    const doDrag = event => {
        if (!isResizing) return;
        const newWidth = event.clientX - parentContainer.getBoundingClientRect().left;
        fileList.style.width = newWidth + 'px';
        editorContainer.style.width = `calc(100% - ${newWidth}px)`;
        editor.layout();
    }


    const stopDrag = event => {
        if (!isResizing) return;
        isResizing = false;
        document.body.style.userSelect = ''; // Enable text selection again
        document.body.style.cursor = ''; // Reset cursor
        window.removeEventListener('mousemove', doDrag);
        window.removeEventListener('mouseup', stopDrag);
    }

    onMount(async () => {
        editor = monaco.editor.create(editorContainer, {
            value: "Select a file from the File Explorer", // Default value
            language: "javascript",
            theme: "vs-dark",
            automaticLayout: true,
        });

        fileList = document.querySelector('.file-list');
        parentContainer = document.querySelector('.editor-and-file-list');

        // Bind Ctrl/Cmd + S to the write-file command
        window.addEventListener('keydown', e => {
            if (e.key == 's' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                ipcRenderer.send('write-file', $activeFile, editor.getValue());
            }
        }, false);

        ipcRenderer.on('file-data', (event, data) => {
            editor.setValue(data);
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
        flex: 1;  /* The Monaco editor should take up the remaining space */
    }
    
    .editor-and-file-list {
        display: flex;
        height: 100%;
        width: 100%;
    }

    .resizer {
        background: #888;
        width: 5px;
        height: 100%;
        cursor: col-resize;
    }

    .resizer::after {
        content: "";
        position: absolute;
        width: 20px; /* Adjust this to your needs */
        height: 100%;
        left: -10px; /* Half the width, to center the pseudo-element */
        z-index: 2; /* Ensure it's above other elements */
    }
</style>

<div class="editor-and-file-list">
    <FileList />
    <div class="resizer" on:mousedown={initDrag}></div>
    <div class="editor-container" bind:this={editorContainer}></div>
</div>
