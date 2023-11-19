import { Plugin, Keymap, moment } from 'obsidian';
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

const noteCaches = {
  'weekly': null,
  'daily': null,
}

const periodicNotesSettings = {
  'weekly': null,
  'daily': null,
}

const reflectionClass = "reflection-container"

const leafRegistry = {}

function removeElementsByClass(domNodeToSearch, className) {
  const elements = domNodeToSearch.getElementsByClassName(className);
  while (elements.length > 0) {
    elements[0].parentNode.removeChild(elements[0]);
  }
}

function insertAfter(referenceNode, newNode) {
  referenceNode.parentNode.insertBefore(newNode, referenceNode.nextSibling);
}

export default class Reflection extends Plugin {
  ready = false;

  async runOnLeaf(leaf) {
    if (!this.ready) {
      await this.init();
    }

    if (!this.doesLeafNeedUpdating(leaf)) { return false }

    const activeView = leaf.view
    const activeFile = leaf.view.file

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
      this.runOnLeaf(leaf);
    }));

    this.registerEvent(this.app.workspace.on('window-open', async () => {
      this.updateAllLeaves();
    }));
  }

  updateAllLeaves() {
    const { workspace } = this.app;
    const leaves = workspace.getLeavesOfType('markdown')

    leaves.forEach(l => this.runOnLeaf(l));
  }

  doesLeafNeedUpdating(leaf) {
    return (leafRegistry[leaf.id] == leaf.view?.file?.path) ? false : true;
  }

  removeContentFromFrame(container) {
    removeElementsByClass(container, reflectionClass)
  }

  async addComponentToFrame(view, editor, currentFile, fileType) {
    const props = {
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
    const embeddedLinksContainer = parentContainer.querySelector('.embedded-backlinks');
    // const contentContainer = editor.containerEl.querySelector('.cm-active');

    // We should remove the existing one first
    removeElementsByClass(parentContainer, reflectionClass)

    if (embeddedLinksContainer) {
      embeddedLinksContainer.parentNode.insertBefore(div, embeddedLinksContainer)
    } else {
      insertAfter(contentContainer, div)
    }

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

  getFileFromLastTime(file, fileType: string) {
    let lastTimeFile;

    switch (fileType) {
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

  getFilesFromLastTime(file, fileType: string) {
    // This will return an object with the files from the previous years
    // Where the key is how many years ago this file was from.
    let files = {};

    switch (fileType) {
      case "daily":
        files = this._getFilesFromPreviousPeriods(file, fileType);
        break;
      case "weekly":
        files = this._getFilesFromPreviousPeriods(file, fileType);
        break;
      default:
        throw 'Unknown File Type'
    }

    return files;
  }

  _getFileFromPreviousPeriod(file, fileType, lookback) {
    let location;
    let unit;

    switch (fileType) {
      case "daily":
        unit = 'day'
        location = noteCaches.daily;
        return getDailyNote(moment(getDateFromFile(file, unit)).subtract(lookback, "years"), location)
      case "weekly":
        unit = 'week'
        location = noteCaches.weekly;
        return getWeeklyNote(moment(getDateFromFile(file, unit)).subtract(lookback, "years"), location)
      default:
        throw 'Unknown File Type'
    }
  }

  _getFilesFromPreviousPeriods(file, fileType) {
    // We use the key in this object to know how many years back a file was
    // Otherwise we could use an array and just use the index
    // We're not necessarily going to have a file each year
    const files = {};
    let i = 1;
    // Define how many years back we want to look back
    const checkLength = 5;

    while (i <= checkLength) {
      files[i] = this._getFileFromPreviousPeriod(file, fileType, i)

      i++;
    }

    return files;
  }

  getTypeOfFile(file) {
    switch (file.parent.path) {
      case periodicNotesSettings.daily.folder:
        return "daily"
      case periodicNotesSettings.weekly.folder:
        return "weekly"
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
    // Sometimes this loads before the dependencies are ready
    // This stops that from throwing an unncessary error
    try {
      await this.establishNoteCaches();
      await this.gatherPeriodicNoteSettings();
      this.ready = true;
    } catch (e) {
      // Dependencies not yet ready
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
