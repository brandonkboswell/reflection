<script lang="ts">
  import { Keymap } from 'obsidian';
  import ReflectionDay from "./ReflectionDay.svelte";
  export let currentFile;
  export let fileType;
  export let app;
  export let view;
  export let plugin : any;

  let files = plugin.getFilesFromLastTime(currentFile, fileType);
</script>

<div>
  {#each Object.entries(files).filter(([key, value]) => value !== null) as [index, file] }
    <ReflectionDay
      currentFile={currentFile}
      index={index}
      file={file}
      view={view}
      app={app}
      Keymap={Keymap} />
  {/each}
</div>

<style lang="scss"></style>