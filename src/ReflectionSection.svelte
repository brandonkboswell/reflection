<script lang="ts">
  import { Keymap } from 'obsidian';
  import ReflectionDay from "./ReflectionDay.svelte";
  export let currentFile;
  export let fileType;
  export let app;
  export let view;
  export let plugin;

  let files = plugin.getFilesFromLastTime(currentFile, fileType);
</script>

<div>
  {#each files as file}
    <ReflectionDay
      currentFile={currentFile}
      file={file}
      plugin={plugin}
      view={view}
      app={app}
      Keymap={Keymap}/>
  {/each}
</div>

<style lang="scss"></style>