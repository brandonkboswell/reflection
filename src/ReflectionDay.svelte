<script lang="ts">
  import { MarkdownRenderer } from 'obsidian';
  import { onMount } from 'svelte';

  export let file;
  export let title = file.basename;
  export let index;
  export let currentFile;
  export let app: any;
  export let view;
  export let Keymap: any;

  let content: string | null;

  async function onInit() {
    if (file) {
      const markdown = await app.vault.read(file);
      const markdownRenderWrapper = document.createElement('div');

      try {
		await MarkdownRenderer.render(
          app,
          markdown,
          markdownRenderWrapper,
          currentFile.path,
          view,
        );
      } catch (error) {
        // Likely Markdown Error from other plugins
      }

      title = file.basename;
      content = markdownRenderWrapper.innerHTML;
    }
  }

  function titleLookup(key) {
    if (key === "1") {
      return "Last Year"
    }

    return `${key} years ago`
  }

  function titleClick($event) {
    openLink($event, file.path, currentFile.path)
  }

  function bodyClick($event) {
    let href = $event.target?.dataset?.href

    if (href) {
      openLink($event, href, currentFile.path)
    }
  }

  function openLink($event, href, filePath) {
    const newPane = Keymap.isModEvent($event);
    app.workspace.openLinkText(href, filePath, newPane)
  }

  onMount(async () => {
    await onInit()
  })
</script>

<div class="reflection-day">
  {#if file}
    <div class="reflection-day__header" on:click={titleClick}>
      <span>{titleLookup(index)}</span>
    </div>
    {#if content}
      <div on:click={bodyClick} class="reflection-day__body">{@html content}</div>
    {:else}
      <div class="reflection-day__body">This file is empty</div>
    {/if}
  {:else}
    <div class="reflection-day__header">
      <span on:click={titleClick}>No Previous Notes</span>
    </div>
  {/if}
</div>

<style lang="scss">
  :root {
    --grid-unit: 4px;
  }

  :global(.cm-content) {
    // For whatever reason when the embedded backlinks option is disabled
    // then the content container has a large amount of bottom padding
    padding-bottom: 0px !important;
  }

  :global(.reflection-container) {
    max-width: var(--max-width);
    width: var(--line-width);
    margin-inline: var(--content-margin)!important;
  }

  .reflection-day {
    margin-top: calc(var(--grid-unit) * 4);
    border: 1px solid var(--background-modifier-border);
    border-radius: calc(var(--grid-unit) * 4);
    margin-bottom: calc(var(--grid-unit) * 6);

    &__body {
      border-top: 1px solid var(--background-modifier-border);
      padding: 0px calc(var(--grid-unit) * 5) 0px calc(var(--grid-unit) * 5);

      &:first-child {
        margin-top: 0px;
      }
    }

    &__header {
      padding: calc(var(--grid-unit) * 4) calc(var(--grid-unit) * 5);
      font-weight: var(--inline-title-weight);
      font-size: var(--inline-title-size);
      line-height: var(--inline-title-line-height);
      font-style: var(--inline-title-style);
      font-variant: var(--inline-title-variant);
      font-family: var(--inline-title-font);
      letter-spacing: -0.015em;
      color: var(--inline-title-color);
      cursor: pointer;
    }
  }
</style>
