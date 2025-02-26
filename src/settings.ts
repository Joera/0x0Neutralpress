import {
	App,
	PluginSettingTab,
	Setting,
} from "obsidian";

export interface Settings {
	chain_id: number;
	db_gateway: string,
	db_model: string,
	db_rpc: string,
	storage: string,
	pinata_gateway: string,
	n_printer: string,
	pub_factory: string,
	arbiscan_key: string,
	basescan_key: string,
	publication: string
}

export const DEFAULT_SETTINGS: Settings = {
	chain_id: 84532,
	db_gateway: "https://orbis.transport-union.dev",
	db_model: "kjzl6hvfrbw6c9azzndholpflixynj59zr85g87quflikiem9mfeevnl2v0oz52",
	db_rpc: "https://base-sepolia.g.alchemy.com/v2/DAfzjixY82ICdLCssh_dTQpoN0I2mthW",
	storage: "https://ipfs.transport-union.dev",
	pinata_gateway: "https://neutralpress.mypinata.cloud",
	n_printer: "0x686b455ffe7acd5173C4AE3137d7E87cd0120380",
	pub_factory: "0x44eBAb251A247A45a1280B29Df8c00ed6bD1D6DF",
	arbiscan_key: "",
	basescan_key: "",
	publication: ""
};

export class DSGSettingsTab extends PluginSettingTab {
	
	plugin: any;
	name: string

	constructor(app: App, plugin: any) {
		super(app, plugin);
		this.plugin = plugin;
		this.name = "NeutralPress settings";
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h3", { text: "NeutralPress settings" });

		new Setting(containerEl)
			.setName("Publication FACTORY")
			.setDesc(
				"Contract address for factory that creates publications"
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.pub_factory)
					.onChange(async (value) => {
						this.plugin.settings.pub_factory = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("DB gateway")
			.setDesc(
				"Gateway to database where content is queriable "
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.db_gateway)
					.onChange(async (value) => {
						this.plugin.settings.db_gateway = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("STORAGE")
			.setDesc(
				"Addresses of IPFS nodes"
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.storage)
					.onChange(async (value) => {
						this.plugin.settings.storage = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("DEV FOLDER")
			.setDesc(
				"Directory on local machine to store template files and assets"
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.dev_folder)
					.onChange(async (value) => {
						this.plugin.settings.dev_folder = value;
						await this.plugin.saveSettings();
					})
			);

		new Setting(containerEl)
			.setName("PINATA GATEWAY")
			.setDesc(
				"Service to serve content addressed uploads"
			)
			.addText((text) =>
				text
					.setValue(this.plugin.settings.pinata_gateway)
					.onChange(async (value) => {
						this.plugin.settings.pinata_gateway = value;
						await this.plugin.saveSettings();
					})
			);
	
	}
}
