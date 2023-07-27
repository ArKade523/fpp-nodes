<script>
    import { onMount, onDestroy } from 'svelte';
    import { writable } from 'svelte/store';
    import { activeFile, files, openStates, newFileName, selectedDirectory } from './stores.js';
    const { ipcRenderer } = window.require('electron');
    
    let directoryPath = '/Users/kangell/Documents/repos/fpp-nodes/fpp'; // To hold the directory of the file directory
    let creatingNewFile = false;
    let creatingNewFolder = false;
    let inputElement;

    const openFile = (path) => {  // Function to open files
        activeFile.set(path);
        ipcRenderer.send('read-file', path);
    }
    
    // A helper function to toggle the open state of a directory
    const toggleDirectory = path => {
        $openStates[path] = !$openStates[path];
        openStates.set($openStates);
        selectedDirectory.set(path);
    }

    const createNewFile = () => {
        newFileName.set('');
        creatingNewFile = true;
    }

    const createNewFolder = () => {
        newFileName.set('');
        creatingNewFolder = true;
    }

    const handleKeypress = (event) => {
        if (event.key === 'Enter' && creatingNewFile) {
            if ($newFileName === '') {
                newFileName.set(null);
                creatingNewFile = false;
                return;
            }
            ipcRenderer.send('create-new-file', directoryPath, $newFileName);
            newFileName.set(null);
            creatingNewFile = false;
        } else if (event.key === 'Enter' && creatingNewFolder) {
            if ($newFileName === '') {
                newFileName.set(null);
                creatingNewFolder = false;
                return;
            }
            ipcRenderer.send('create-new-folder', directoryPath, $newFileName);
            newFileName.set(null);
            creatingNewFolder = false;
        } else if (event.key === 'Escape') {
            newFileName.set(null);
            creatingNewFile = false;
            creatingNewFolder = false;
        }
    }

    // Whenever newFileName changes, this will run
    $: if (newFileName !== null && inputElement) {
        inputElement.focus();
    }
    
    onMount(async () => {
        ipcRenderer.send('get-file-list', directoryPath);
        
        ipcRenderer.on('file-list', (event, fileList) => {
            files.set(fileList);
        });
    });

    onDestroy(() => {
        ipcRenderer.removeAllListeners('file-list');
    });
</script>

<style>
    .file-list {
        display: flex;
        flex-direction: column;
        width: 20%;
        height: 100%;
        color: #d4d4d4;
        overflow: hidden;
        font-family: Menlo, Monaco, "Courier New", monospace;
        font-size: 12px;
        padding: 0.5rem;
    }

    .file-list > .subdirs, .file-list > li {
        padding-left: 20px;
    }

    .file-header {
        margin-bottom: 0.25rem;
    }

    .icon {
        float: right;
        margin-left: 0.5rem;
        cursor: pointer;
        padding: 1px 3px 0px;
    }

    .icon:hover {
        background: #444;
        border-radius: 3px;
    }

    .subdir-list {
        padding-inline-start: 20px;
    }

    .subdir-name, .file-list-item {
        cursor: pointer;
    }

    .subdir-name.active {
        background-color: #555;
    }

    .file-list-item {
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

    #new-file-input {
        background-color: #444;
        border: none;
        outline: none;
        color: #d4d4d4;
        width: 100%;
        padding: 0.25rem;
        font-family: Menlo, Monaco, "Courier New", monospace;
        font-size: 12px;
    }

    #new-file-input:focus {
        outline: none;
    }
</style>

<ul class="file-list">
    <div class="file-header">
        <strong><span>{directoryPath.split('/').slice(-1)}:</span></strong>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <span class="icon refresh" title="refresh" on:click={() => ipcRenderer.send('get-file-list', directoryPath)}><svg xmlns="http://www.w3.org/2000/svg" height="0.8em" viewBox="0 0 512 512"><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><style>svg{fill:#d4d4d4}</style><path d="M142.9 142.9c62.2-62.2 162.7-62.5 225.3-1L327 183c-6.9 6.9-8.9 17.2-5.2 26.2s12.5 14.8 22.2 14.8H463.5c0 0 0 0 0 0H472c13.3 0 24-10.7 24-24V72c0-9.7-5.8-18.5-14.8-22.2s-19.3-1.7-26.2 5.2L413.4 96.6c-87.6-86.5-228.7-86.2-315.8 1C73.2 122 55.6 150.7 44.8 181.4c-5.9 16.7 2.9 34.9 19.5 40.8s34.9-2.9 40.8-19.5c7.7-21.8 20.2-42.3 37.8-59.8zM16 312v7.6 .7V440c0 9.7 5.8 18.5 14.8 22.2s19.3 1.7 26.2-5.2l41.6-41.6c87.6 86.5 228.7 86.2 315.8-1c24.4-24.4 42.1-53.1 52.9-83.7c5.9-16.7-2.9-34.9-19.5-40.8s-34.9 2.9-40.8 19.5c-7.7 21.8-20.2 42.3-37.8 59.8c-62.2 62.2-162.7 62.5-225.3 1L185 329c6.9-6.9 8.9-17.2 5.2-26.2s-12.5-14.8-22.2-14.8H48.4h-.7H40c-13.3 0-24 10.7-24 24z"/></svg></span>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <span class="icon file" title="create a new file" on:click={createNewFile}><svg xmlns="http://www.w3.org/2000/svg" height="0.8em" viewBox="0 0 576 512"><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><style>svg{fill:#d4d4d4}</style><path d="M0 64C0 28.7 28.7 0 64 0H224V128c0 17.7 14.3 32 32 32H384v38.6C310.1 219.5 256 287.4 256 368c0 59.1 29.1 111.3 73.7 143.3c-3.2 .5-6.4 .7-9.7 .7H64c-35.3 0-64-28.7-64-64V64zm384 64H256V0L384 128zm48 96a144 144 0 1 1 0 288 144 144 0 1 1 0-288zm16 80c0-8.8-7.2-16-16-16s-16 7.2-16 16v48H368c-8.8 0-16 7.2-16 16s7.2 16 16 16h48v48c0 8.8 7.2 16 16 16s16-7.2 16-16V384h48c8.8 0 16-7.2 16-16s-7.2-16-16-16H448V304z"/></svg></span>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <span class="icon folder" title="create a new folder" on:click={createNewFolder}><svg xmlns="http://www.w3.org/2000/svg" height="0.8em" viewBox="0 0 512 512"><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><style>svg{fill:#d4d4d4}</style><path d="M512 416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96C0 60.7 28.7 32 64 32H192c20.1 0 39.1 9.5 51.2 25.6l19.2 25.6c6 8.1 15.5 12.8 25.6 12.8H448c35.3 0 64 28.7 64 64V416zM232 376c0 13.3 10.7 24 24 24s24-10.7 24-24V312h64c13.3 0 24-10.7 24-24s-10.7-24-24-24H280V200c0-13.3-10.7-24-24-24s-24 10.7-24 24v64H168c-13.3 0-24 10.7-24 24s10.7 24 24 24h64v64z"/></svg></span>
    </div>
    {#if $files}
        {#each $files.directories as directory (directory.path)}
            <div class="subdirs">
                <div 
                class="subdir-name { $selectedDirectory === directory.path ? 'active' : '' }"
                tabindex="-1" 
                on:click={() => toggleDirectory(directory.path)} 
                on:keydown={(event) => event.key === 'Enter' && toggleDirectory(directory.path)}>
                    <span>
                        {#if $openStates[directory.path]}
                            <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 512 512"><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><style>svg{fill:#d4d4d4}</style><path d="M233.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 338.7 86.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"/></svg>
                        {:else}
                            <svg xmlns="http://www.w3.org/2000/svg" height="1em" viewBox="0 0 320 512"><!--! Font Awesome Free 6.4.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2023 Fonticons, Inc. --><style>svg{fill:#d4d4d4}</style><path d="M310.6 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L242.7 256 73.4 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"/></svg>
                        {/if}
                        {directory.path.replace(directoryPath + '/', '')}/
                    </span>
                </div>
                {#if $openStates[directory.path]}
                    <ul class="subdir-list">
                        {#each directory.files as file (file)}
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <li 
                            class="file-list-item { ($activeFile === (directoryPath + '/' + file) ) ? 'active' : '' }" 
                            on:click={() => {openFile(directory.path + '/' + file); selectedDirectory.set(null)}}>
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
            class="file-list-item { ($activeFile === (directoryPath + '/' + file) ) ? 'active' : '' }" 
            on:click={() => {openFile(directoryPath + '/' + file); selectedDirectory.set(null)}}>
                {file}
        </li>
        {/each}
        {#if $newFileName !== null}
            <li>
                <input id="new-file-input" type="text" bind:this={inputElement} bind:value={$newFileName} on:keydown={handleKeypress} />
            </li>
        {/if}
    {/if}
</ul>