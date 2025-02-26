import { FileSystemAdapter, TAbstractFile, TFile } from 'obsidian';
import { DSGAuthorInput, SGTask } from './types'; 
import { parseNote } from './note.factory';
import DSG from './main';
import { parseAuthor } from './author.factory';
import { ABI_NPRINTER } from './contracts/abi_nprinter';
import { IPublicationCtrlr, PublicationController } from './publication.ctrlr';
import { TablelandProvider } from './tableland';
import { GnosisSafeService, IGnosisSafeService } from './safe.service';
import { updateFrontMatter } from './frontmatter';
import { PreviewCtrlr } from './preview.ctrlr';

const NPRINTER = "0xE16df371dfE251Fe2FEE86378395e80078195fA3";

export interface IMainController {
    basePath: string,
    plugin: DSG,
	oxo: any,
	preview: PreviewCtrlr,
	publication: IPublicationCtrlr,
	safe: IGnosisSafeService,

	updateAuthor: (_file: TAbstractFile) => Promise<void>,
	proposeNote: (_file: TAbstractFile) => Promise<void>,
	previewNote: (_file: TAbstractFile) => Promise<void>,
	storeNote: (_file: TAbstractFile) => Promise<void>,
	// bulkUpload: () => Promise<void>,
}

export class MainController implements IMainController {

	basePath: string;
	oxo: any;
	plugin: DSG;
	preview: PreviewCtrlr;
	publication: IPublicationCtrlr;
	safe: IGnosisSafeService;

    constructor(plugin: DSG) {
		
		this.plugin = plugin;
		this.publication = new PublicationController(this);
		this.preview = new PreviewCtrlr(this);

		// Set basePath using Obsidian's adapter
		const adapter = this.plugin.app.vault.adapter;
		if (adapter instanceof FileSystemAdapter) {
			this.basePath = adapter.getBasePath();
		}
		
		// Wait for 0xobsidian plugin to be available
		this.initializeOxo();
	}

	private async initializeOxo() {
		let attempts = 0;
		const maxAttempts = 10;
		
		const tryInitialize = () => {
			try {
				// @ts-ignore  
				// console.log(this.plugin.app.plugins.plugins)
				// @ts-ignore    
				const oxoPlugin = this.plugin.app.plugins.plugins["oxo-core"];

				if (oxoPlugin) {
					this.oxo = oxoPlugin;
					console.log("0xobsidian plugin initialized:", this.oxo);
					return true;
				}
			} catch (error) {
				console.warn("Error initializing 0xobsidian:", error);
			}
			return false;
		};

		const waitForPlugin = async () => {
			while (attempts < maxAttempts) {
				if (tryInitialize()) {
					return;
				}
				
				attempts++;
				await new Promise(resolve => setTimeout(resolve, 1000));
			}
			
			console.warn("Failed to initialize 0xobsidian plugin after", maxAttempts, "attempts");
		};

		await waitForPlugin();
	}

	async updateAuthor(_file: TAbstractFile) {

		const file = this.plugin.app.vault.getFileByPath(_file.path);
		if (file != null) {
			let author: DSGAuthorInput | null = await parseAuthor(this, file);
			if(author != null) {
				author.content_mappings = await this.oxo.ctrlr.ipfs.addFile(author.content_mappings); //  
				const cid = await this.oxo.ctrlr.ipfs.add(author, "ipfs.autonomous-times.com");
				await this.plugin.app.fileManager.processFrontMatter( file, (frontmatter) => {
					frontmatter["config"] = cid;
				})
			}
		}
	}	

	async getNoteInfo(file: TFile) {

		let publication: string = "";
			let stream_id: string = "";

		await this.plugin.app.fileManager.processFrontMatter( file, (frontmatter) => {
			// frontmatter["cid"] = cid;
			publication = frontmatter["publication"]
			stream_id = frontmatter["stream_id"]
		});

		return {stream_id, publication};
	}

	async previewNote(_file: TAbstractFile) {

		// preview should call renderer directly 
		// it should replace relative urls with absolute ones
		// find solution for typography 

		const file = this.plugin.app.vault.getFileByPath(_file.path);
		if (file != null) {
			await this.storeNote(file);
			const {stream_id, publication} = await this.getNoteInfo(file);
			let html = await this.preview.renderHTML(stream_id, publication);
			// let html = mockedHtml();
			await this.preview.display(html);
		}
	}

    async proposeNote(_file: TAbstractFile) {

		const file = this.plugin.app.vault.getFileByPath(_file.path);
		if (file != null) {

			await this.storeNote(file);
			const {stream_id, publication} = await this.getNoteInfo(file);
			const args = [publication, stream_id];
			const method = "makeOffer";
			const s = await this.oxo.ctrlr.safe.genericTx(NPRINTER, ABI_NPRINTER, method, args, false);
			console.log(s);

				// lsiten to nprinter event confirming the render, possibly proofs of hosting, storage??  

				// await saveRoot(this, new_archive_cid, file);
				// await includeUrl(this, url,file)
		}    
    }

	async storeNote(_file: TAbstractFile) {

		const model = "kjzl6hvfrbw6c9azzndholpflixynj59zr85g87quflikiem9mfeevnl2v0oz52";
        const context = "kjzl6kcym7w8ya9eooishoahx3dehdyzticwolc95udtobxcnpk3m3zrpf5o4fa";

		const file = this.plugin.app.vault.getFileByPath(_file.path);
		if (file != null) {
			try {
				
				let {streamId, contentItem } : any = await parseNote(this, file);

				if(contentItem != null) {
					if (!this.oxo?.ctrlr?.orbis) {
						throw new Error('Orbis service not initialized');
					}

					// console.log(contentItem);

					if(streamId) {
						console.log("updatin")
						const res = await this.oxo.ctrlr.orbis.update(contentItem, streamId);
						console.log(res);

					} else {
						const res = await this.oxo.ctrlr.orbis.insert(contentItem, model, context);
						await updateFrontMatter(this.plugin.app, file, "stream_id", res.id);
					}
				}
			} catch (error) {
				console.error('Error in storeNote:', error);		
				console.error('Error details:', {
					message: error.message,
					stack: error.stack,
					oxoState: this.oxo?.ctrlr ? 'Initialized' : 'Not initialized'
				});
				throw error;
			}
		}
	}

	// async bulkUpload() {

    //     console.log('readying for bulk upload');

    //     const getFiles = async (distPath: string): Promise<string[]> => {
    //         const adapter = this.plugin.app.vault.adapter;
    //         const files = await adapter.list(distPath);
    //         return files.files;
    //     }

    //     const pubName = this.plugin.settings.publication;
    //     const path =  this.basePath + "/" + pubName;

    //     let tasks: SGTask[] = [];
    //     const fileNames = await getFiles(path);

    //     for (let i = 0; i < fileNames.length; i++) {
    //         const file = fileNames[i];
    //         try {
    //             const task: SGTask = {
    //                 slug: file,
    //                 // author: "Unamore",
    //                 // post_type: "painting",
    //                 // tags: "",
    //                 // categories: "",
    //                 // parent: "0",
    //                 // creation_date: "",
    //                 // modified_date: "",
    //                 // title: "",
    //                 // order: 0,
    //                 // content: ""
    //             }
    //             tasks.push(task);
    //         } catch(error) {
    //             console.error('Error processing file:', file, error);
    //         }
    //     }

    //     console.log(tasks);
    // }

    // async bulkUploadPaintings() {

    //     console.log('readying for bulk upload');

    //     const getFiles = async (distPath: string): Promise<string[]> => {
    //         const adapter = this.plugin.app.vault.adapter;
    //         const files = await adapter.list(distPath);
    //         return files.files;
    //     }

    //     const folder = "paintings";
    //     const path =  this.basePath + "/" + folder;

    //     let tasks: SGTask[] = [];
    //     const fileNames = await getFiles(path);

    //     for (let i = 0; i < fileNames.length; i++) {
    //         const file = fileNames[i];
    //         try {
    //             const task: SGTask = {
    //                 slug: file,
    //                 // author: "Unamore",
    //                 // post_type: "painting",
    //                 // tags: "",
    //                 // categories: "",
    //                 // parent: "0",
    //                 // creation_date: "",
    //                 // modified_date: "",
    //                 // title: "",
    //                 // order: 0,
    //                 // content: ""
    //             }
    //             tasks.push(task);
    //         } catch(error) {
    //             console.error('Error processing file:', file, error);
    //         }
    //     }

    //     console.log(tasks);
    // }
}
