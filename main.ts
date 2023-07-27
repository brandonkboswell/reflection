import { App, Editor, MarkdownView, Notice, Plugin, MarkdownRenderer, Component } from 'obsidian';
import { ExampleView, VIEW_TYPE_EXAMPLE } from "./view";
import {
  appHasDailyNotesPluginLoaded,
  getAllDailyNotes,
  getAllWeeklyNotes,
  getDailyNote,
  getWeeklyNote,
  getDateFromFile,
  getWeeklyNoteSettings,
  getDailyNoteSettings
} from "obsidian-daily-notes-interface";

interface ReflectionSettings {
  mySetting: string;
}

const DEFAULT_SETTINGS: ReflectionSettings = {
  mySetting: 'default'
}

let noteCaches = {
  'weekly': null,
  'daily': null,
}

let periodicNotesSettings = {
  'weekly': null,
  'daily': null,
}

let reflectionClass = "reflection-container"

let leafRegistry = {}

function removeElementsByClass(domNodeToSearch, className){
  console.log('Removing', domNodeToSearch, className)
  const elements = domNodeToSearch.getElementsByClassName(className);
  while(elements.length > 0){
    elements[0].parentNode.removeChild(elements[0]);
  }
}

function insertAfter(referenceNode, newNode) {
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

export default class Reflection extends Plugin {
  settings: ReflectionSettings;
  ready: false;

  async runOnLeaf(leaf) {
    if (!this.ready) {
      console.log('Not Ready, Re-initing');
      await this.init();
    }

    if (!this.doesLeafNeedUpdating(leaf)) { return false }

    let activeView = leaf.view
    let activeFile = leaf.view.file

    if (activeView && activeFile) {  // The active view might not be a markdown view
      this.setLeafRegistry(leaf)
      this.renderContent(activeView, activeFile)
    }
  }

  setLeafRegistry(leaf) {
    leafRegistry[leaf.id] = leaf.view.file.path;
  }

  handleRegisterEvents() {
    // this.registerEvent(this.app.workspace.on('file-open', async (file) => {
    //   debugger;
    //   // this.onFileOpen(file);
    //   this.updateAllLeaves();
    // }));

    this.registerEvent(this.app.workspace.on('active-leaf-change', async (leaf) => {
      console.log('active-leaf-change', leaf);
      this.runOnLeaf(leaf);
    }));

    // this.registerEvent(this.app.workspace.on('layout-change', async () => {
    //   debugger;
    //   this.updateAllLeaves();
    // }));

    this.registerEvent(this.app.workspace.on('window-open', async () => {
      console.log('window-open');
      this.updateAllLeaves();
    }));
  }

  updateAllLeaves() {
    const { workspace } = this.app;
    let leaves = workspace.getLeavesOfType('markdown')

    leaves.forEach(l => this.runOnLeaf(l));
  }

  doesLeafNeedUpdating(leaf) {
    return (leafRegistry[leaf.id] == leaf.view?.file?.path) ? false : true;
  }

  removeContentFromFrame(container) {
    removeElementsByClass(container, reflectionClass)
  }

  addContentToFrame(editor, title, content) {
    console.log('addContentToFrame', title, editor);

    const div = document.createElement('div');
    div.classList.add("embedded-backlinks")
    div.classList.add(reflectionClass)
    div.innerHTML = `
      <div class="backlink-pane">
        <div class="tree-item-self">
          <div class="tree-item-inner">${title}</div>
        </div>
        <div class="search-result-container">
        ${content}</div>
    </div>`;

    const parentContainer = editor.containerEl.querySelector('.cm-sizer');
    const contentContainer = editor.containerEl.querySelector('.cm-contentContainer');
    const backlinksContainer = parentContainer.querySelector('.embedded-backlinks');

    // We should remove the existing one first
    removeElementsByClass(parentContainer, reflectionClass)
    insertAfter(contentContainer, div)
  }

  async gatherAllWeeklyNotes() {
    return getAllWeeklyNotes();
  }

  async gatherAllDailyNotes() {
    return getAllDailyNotes();
  }

  async establishNoteCaches() {
    noteCaches.weekly = await this.gatherAllWeeklyNotes();
    noteCaches.daily = await this.gatherAllDailyNotes();
  }

  async gatherPeriodicNoteSettings() {
    periodicNotesSettings.weekly = getWeeklyNoteSettings();
    periodicNotesSettings.daily = getDailyNoteSettings();
  }

  getFileFromLastTime(file, fileType) {
    let lastTimeFile;

    switch(fileType) {
      case "daily":
        lastTimeFile = getDailyNote(moment(getDateFromFile(file, "day")).subtract(1, "years"), noteCaches.daily)
      break;
      case "weekly":
        lastTimeFile = getWeeklyNote(moment(getDateFromFile(file, "week")).subtract(1, "years"), noteCaches.weekly);
      break;
      default:
        return;
    }

    return lastTimeFile;
  }

  getTypeOfFile(file) {
    switch(file.parent.path) {
      case periodicNotesSettings.daily.folder:
        return "daily"
        break;
      case periodicNotesSettings.weekly.folder:
        return "weekly"
        break;
      default:
        return;
    }
  }

  async renderContent(view, file) {
    const editor = view.sourceMode.cmEditor;

    this.removeContentFromFrame(editor.containerEl);

    const fileType = this.getTypeOfFile(file);
    let title = "No Previous Notes";
    let innerContent = "";
    console.log('fileType', fileType);
    if (!noteCaches[fileType]) { return false }

    const lastTimeFile = this.getFileFromLastTime(file, fileType);

    if(lastTimeFile) {
      const markdown = await this.app.vault.read(lastTimeFile);
      const wrapper = document.createElement('div');
      // document.body.appendChild(wrapper);
      // await MarkdownRenderer.renderMarkdown(markdown, wrapper, file.path, view);
      await MarkdownRenderer.renderMarkdown(markdown, wrapper, file.path, this);
      title = lastTimeFile.basename;
      innerContent = wrapper.innerHTML;
      console.log('innerContent', innerContent);
    }

    this.addContentToFrame(editor, title, innerContent)
    console.log('rendered', title, innerContent);
  }

  async init() {
    console.log('Loading Reflection Plugin');

    // Sometimes this loads before the dependencies are ready
    // This stops that from throwing an unncessary error
    try {
      await this.establishNoteCaches();
      await this.gatherPeriodicNoteSettings();
      this.ready = true;

      this.registerView(
        VIEW_TYPE_EXAMPLE,
        (leaf) => new ExampleView(leaf)
      );

      this.activateView();

      console.log('Reflection is ready')
    } catch(e) {
      console.log('Dependencies not yet ready', e);
    }
  }

  async activateView() {
    // this.app.workspace.detachLeavesOfType(VIEW_TYPE_EXAMPLE);

    await this.app.workspace.getRightLeaf(false).setViewState({
      type: VIEW_TYPE_EXAMPLE,
      active: true,
    });

    this.app.workspace.revealLeaf(
      this.app.workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE)[0]
    );
  }

  async onload() {
    this.handleRegisterEvents();

    await this.init();
    await this.updateAllLeaves();
  }

  onunload() {
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_EXAMPLE);
  }
}
