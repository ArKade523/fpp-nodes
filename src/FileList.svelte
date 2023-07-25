<script>
    import { onMount, onDestroy } from 'svelte';
    import { writable } from 'svelte/store';
    import { activeFile, files, openStates } from './stores.js';
    const { ipcRenderer } = window.require('electron');
    
    let directoryPath = '/Users/kangell/Documents/repos/fpp-nodes/fpp'; // To hold the directory of the file directory

    const openFile = (path) => {  // Function to open files
        activeFile.set(path);
        ipcRenderer.send('read-file', path);
    }
    
    // A helper function to toggle the open state of a directory
    const toggleDirectory = path => {
        $openStates[path] = !$openStates[path];
        openStates.set($openStates);
    }
    
    onMount(async () => {
        ipcRenderer.send('get-file-list', directoryPath);
        
        ipcRenderer.on('file-list', (event, fileList) => {
            files.set(fileList);
        });
    });
</script>

<style>
    .file-list {
        display: flex;
        flex-direction: column;
        width: 20%;
        height: 100%;
        color: #d4d4d4;
        overflow: auto;
        font-family: Menlo, Monaco, "Courier New", monospace;
        font-size: 12px;
        padding: 0.5rem;
    }

    .subdir-list {
        padding-inline-start: 20px;
    }

    .subdir-name, .file-list-item {
        cursor: pointer;
    }

    .file-list-item {
        cursor: pointer;
        padding: 0.1rem;
        padding-left: 0;
        list-style-type: none;
    }

    .file-list-item.active {
        background-color: #555;
    }

    .file-list-item:hover, .subdir-name:hover {
        background-color: #444;
    }
</style>

<ul class="file-list">
    {#if $files}
        {#each $files.directories as directory (directory.path)}
            <div>
                <div 
                class="subdir-name"
                tabindex="-1" 
                on:click={() => toggleDirectory(directory.path)} 
                on:keydown={(event) => event.key === 'Enter' && toggleDirectory(directory.path)}>
                    <strong>
                        <span>
                            {#if $openStates[directory.path]}
                                <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512"><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><style>svg{fill:#d4d4d4}</style><path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"/></svg>
                            {:else}
                                <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 320 512"><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><style>svg{fill:#d4d4d4}</style><path d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"/></svg>
                            {/if}
                            {directory.path.replace(directoryPath + '/', '')}/
                        </span>
                    </strong>
                </div>
                {#if $openStates[directory.path]}
                    <ul class="subdir-list">
                        {#each directory.files as file (file)}
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <li 
                            class="file-list-item { $activeFile === (directory.path + '/' + file) ? 'active' : '' }" 
                            on:click={() => openFile(directory.path + '/' + file)}>
                                {file}
                            </li>
                        {/each}
                    </ul>
                {/if}
            </div>
        {/each}
        {#each $files.files as file (file)}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <li 
                class="file-list-item { $activeFile === (directoryPath + '/' + file) ? 'active' : '' }" 
                on:click={() => openFile(directoryPath + '/' + file)}>
                {file}
            </li>
        {/each}
    {/if}
</ul>