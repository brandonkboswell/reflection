<script lang="ts">
  import { MarkdownRenderer } from 'obsidian';
  export let plugin;
  export let file;
  export let title = file.basename;
  export let content: string;
  export let currentFile;
  export let app: any;
  export let view;
  export let Keymap: any;
  import {onMount, tick} from 'svelte'

  async function onInit() {
    if (file) {
      const markdown = await app.vault.read(file);
      const markdownRenderWrapper = document.createElement('div');

      try {
        await MarkdownRenderer.renderMarkdown(markdown, markdownRenderWrapper, currentFile, view);
      } catch (error) {
        console.log('Markdown Error', error)
      }
      title = file.basename;
      content = markdownRenderWrapper.innerHTML;
    }
  }

  function titleClick($event) {
    app.workspace.openLinkText(title, currentFile.path)
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
    <div class="reflection-day__header">
      <span on:click={titleClick}>{title}</span>
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

  :global(.reflection-container) {
    width: calc(var(--line-width-adaptive) - var(--folding-offset));
    max-width: calc(var(--max-width) - var(--folding-offset));
    margin-right: auto;
    margin-left: max(calc(50% + var(--folding-offset) - var(--line-width-adaptive)/ 2),calc(50% + var(--folding-offset) - var(--max-width)/ 2))!important;
  }

  .reflection-day {
    border: 1px solid var(--background-modifier-border);
    border-radius: calc(var(--grid-unit) * 4);
    margin-bottom: calc(var(--grid-unit) * 4);

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