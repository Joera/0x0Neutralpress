import { IMainController, MainController } from "./main.ctrlr";

import {
	FileSystemAdapter,
	Plugin,
	TFile,
} from "obsidian";

import { DSGSettingsTab, DEFAULT_SETTINGS, Settings } from './settings'
import { NewPublicationModal } from "./ui/new_publication.modal";
import { WhitelistAuthorModal } from "./ui/whitelist_author.modal";

export default class DSG extends Plugin {

	settings: Settings;
	ctrlr: IMainController;

	async onload() {

        this.addSettingTab(new DSGSettingsTab(this.app, this));
		await this.loadSettings();

		this.ctrlr = new MainController(this);

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {

				const activeFile = this.app.workspace.getActiveFile() as TFile;

				menu.addItem((item) => {
					item
						.setTitle("Preview")
						.setIcon("document")
						.onClick(() => this.ctrlr.previewNote(activeFile))
				});
			})
		);

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {

				menu.addItem((item) => {
					item
						.setTitle("Propose to print")
						.setIcon("document")
						.onClick(() => this.ctrlr.proposeNote(file))
				});
			})
		);

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file) => {

				menu.addItem((item) => {
					item
						.setTitle("Store on orbis")
						.setIcon("document")
						.onClick(() => this.ctrlr.storeNote(file))
				});
			})
		);

		// this.registerEvent(
		// 	this.app.workspace.on("file-menu", (menu, file) => {

		// 		menu.addItem((item) => {
		// 			item
		// 				.setTitle("Update author")
		// 				.setIcon("document")
		// 				.onClick(() => this.ctrlr.updateAuthor(file))
		// 		});
		// 	})
		// );

		// this.addCommand({
		// 	id: 'preview',
		// 	name: 'preview',
		// 	callback: () => {
		// 		const activeFile = this.app.workspace.getActiveFile() as TFile;
		// 		return this.ctrlr.preview.display(activeFile);
		// 	}
		//   	});

		this.addCommand({
			id: 'publish',
			name: 'publish',
			callback: () => {
				const activeFile = this.app.workspace.getActiveFile() as TFile;
				return this.ctrlr.proposeNote(activeFile);
			}
		  	});

		this.addCommand({
			id: 'update-author',
			name: 'update author',
			callback: () => {
				const activeFile = this.app.workspace.getActiveFile() as TFile;
				return this.ctrlr.updateAuthor(activeFile);
			}
			});

		this.addCommand({
			id: 'update-publication',
			name: 'update publication',
			callback: () => this.ctrlr.publication.update(),
		  });

		this.addCommand({
			id: 'new-publication',
			name: 'new publication',
			callback: () => {
				return new NewPublicationModal(this.app,this.ctrlr).open();
			}
		  });

		this.addCommand({
			id: 'whitelist-author',
			name: 'whitelist author',
			callback: () => {
				return new WhitelistAuthorModal(this.app,this.ctrlr).open();
			}
		  });
		
		// this.addCommand({
		// 	id: 'bulk-upload',
		// 	name: 'bulk upload',
		// 	callback: () => {
		// 		return this.ctrlr.bulkUpload();
		// 	}
		// });

		
	}	

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}


}

