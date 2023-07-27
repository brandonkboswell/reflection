import { Plugin, MarkdownRenderer, Keymap, TFile, WorkspaceLeaf } from 'obsidian';
import ReflectionDay from "./ReflectionDay.svelte";
import ReflectionSection from "./ReflectionSection.svelte";
import {
  getAllDailyNotes,
  getAllWeeklyNotes,
  getDailyNote,
  getWeeklyNote,
  getDateFromFile,
  getWeeklyNoteSettings,
  getDailyNoteSettings
} from "obsidian-daily-notes-interface";

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
  ready: false;

  async runOnLeaf(leaf: WorkspaceLeaf) {
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
    this.registerEvent(this.app.workspace.on('active-leaf-change', async (leaf) => {
      console.log('active-leaf-change', leaf);
      this.runOnLeaf(leaf);
    }));

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

  async addComponentToFrame(view, editor, currentFile, fileType) {
    let props = {
      app: this.app,
      currentFile: currentFile,
      fileType,
      view,
      title: "No Previous Notes",
      plugin: this,
      Keymap: Keymap
    };

    const div = document.createElement('div');
    div.classList.add(reflectionClass)

    const parentContainer = editor.containerEl.querySelector('.cm-sizer');
    const contentContainer = editor.containerEl.querySelector('.cm-contentContainer');

    // We should remove the existing one first
    removeElementsByClass(parentContainer, reflectionClass)
    insertAfter(contentContainer, div)

    new ReflectionSection({
      target: div,
      props: props
    });
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

  getFileFromLastTime(file: TFile, fileType: string) {
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

  getFilesFromLastTime(file: TFile, fileType: string) {
    let lastTimeFile;
    let files = [];

    switch (fileType) {
      case "daily":
        files = this._getFilesFromPreviousPeriods(file, fileType);
        break;
      case "weekly":
        files = this._getFilesFromPreviousPeriods(file, fileType);
        break;
      default:
        throw 'Unknown File Type'
        return;
    }

    return files;
  }

  _getFileFromPreviousPeriod(file: TFile, fileType, lookback) {
    let location;
    let unit;

    switch (fileType) {
      case "daily":
        unit = 'day'
        location = noteCaches.daily;
        break;
      case "weekly":
        unit = 'week'
        location = noteCaches.weekly;
        break;
      default:
        throw 'Unknown File Type'
        return;
    }

    return getDailyNote(moment(getDateFromFile(file, unit)).subtract(lookback, "years"), location)
  }

  _getFilesFromPreviousPeriods(file: TFile, fileType) {
    let files = [];
    let i = 1;
    let checkLength = 5;

    while (i < checkLength) {
      let result = this._getFileFromPreviousPeriod(file, fileType, i)

      if (result) {
        files.push(result)
      }

      i++;
    }

    return files;
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
    if (!noteCaches[fileType]) { return false }

    this.addComponentToFrame(view, editor, file, fileType)
  }

  async init() {
    console.log('Loading Reflection Plugin');

    // Sometimes this loads before the dependencies are ready
    // This stops that from throwing an unncessary error
    try {
      await this.establishNoteCaches();
      await this.gatherPeriodicNoteSettings();
      this.ready = true;

      console.log('Reflection is ready')
    } catch(e) {
      console.log('Dependencies not yet ready', e);
    }
  }

  async onload() {
    this.handleRegisterEvents();

    await this.init();
    this.updateAllLeaves();
  }

  onunload() {

  }
}