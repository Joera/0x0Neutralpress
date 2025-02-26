import { IMainController } from "./main.ctrlr";
import { MarkdownView, Notice, TFile, View } from 'obsidian';
import { ABI_PUBLICATION } from './contracts/abi_publication';
import { fetchFileFromGithub, getFilesFromGithub, getLatestCommitSHA, publicationConfig } from './publication.factory';
import { DotSpinner } from './ui/spinner.service';
import * as fs from 'fs';

import { ABI_PUBLICATION_FACTORY } from './contracts/abi_publication_factory';

import { getFrontMatter, updateFrontMatter } from './frontmatter';
import { verifyNPublication, verifySafeContract } from './contract_verification';
import path from "path";
import { NAsset } from "./types";

export interface IPublicationCtrlr {

    main: IMainController,
    new: (name: string, folder: string, owners: string[], authors: string[]) => void,
    update: () => void,
    whitelistAuthor: (publication: string, safe_address: string, author: string) => void
}

export class PublicationController implements IPublicationCtrlr {

    main: IMainController

    constructor(main: IMainController) {
        this.main = main
    }

    async initFile(name: string) {

        const filePath = `publications/${name}.publication.md`;
        let content = `
\`\`\`\meta-bind-button
style: primary
label: Update
action:  
  type: command  
  command: oxo-neutralpress:update-publication
\`\`\`
`; 
        
        try {
            const fileExists = await this.main.plugin.app.vault.adapter.exists(filePath);
            if (!fileExists) {
                
                let file = await this.main.plugin.app.vault.create(filePath, content);
        
                if (file != null) {
                    this.displayFile(file);
                    await this.main.plugin.app.fileManager.processFrontMatter( file, (frontmatter) => {
                        frontmatter["name"] = name;
                        frontmatter["owners"] = "";
                        frontmatter["contract"] = "";
                        frontmatter["chain_id"] = this.main.plugin.settings.chain_id;
                        frontmatter["domains"] = [];
                        frontmatter["db_gateway"] = this.main.plugin.settings.db_gateway;
                        frontmatter["db_model"] = this.main.plugin.settings.db_model;
                        frontmatter["rpc"] = this.main.plugin.settings.db_rpc;
                        frontmatter["storage"] = this.main.plugin.settings.storage;
                        frontmatter["config"] = "";
                    })
                }
                new Notice(`${filePath} created successfully.`);

                return file;
            } else {
                const existingFile = await this.main.plugin.app.vault.getAbstractFileByPath(filePath);
                if (existingFile instanceof TFile) {
                    new Notice(`${name} already exists.`);
                    return existingFile;
                }
                new Notice(`${name} exists but is not a file.`);
                return null;
            }

        } catch (error) {
            console.error(`Error creating file: ${error}`);
            new Notice(`Failed to create file: ${error.message}`);
        } 
    }

    async displayFile(file: TFile)  {

        if (file) {
            const leaf = this.main.plugin.app.workspace.getLeaf(false);
            await leaf.openFile(file);
        } else {
            new Notice('File not found!');
        }
    }

    async deployPublicationContract(args: any[]) {

        const pubfactory_address = this.main.plugin.settings.pub_factory; 
        const method = "createPublication";
        return await this.main.oxo.ctrlr.safe.genericTx(
            pubfactory_address, 
            ABI_PUBLICATION_FACTORY, 
            method, 
            args, 
            true
        );
    }

    async updatePublicationContract(pub_contract: string, config_cid: string ) {

        const args = [config_cid];
        return await this.main.oxo.ctrlr.safe.genericTx(
            pub_contract, 
            ABI_PUBLICATION, 
            "proposeUpdateConfig", 
            args,
            false
        );
    }

    async new(name: string, dev_folder: string, owners: string[], authors: string[]) {

        const file = await this.initFile(name);

        let spinner: DotSpinner;

        if (file) {
        
            this.displayFile(file);
            updateFrontMatter(this.main.plugin.app, file, "owners", owners.join(","));
       
            // Check if publication folder exists
            const path = require('path');

            // GENERIEK MAKEN DEEL DAT DUBBELT MET UPDATE
            
            // try {
            //     if (!dev_folder) {
            //         throw new Error("dev_folder is required");
            //     }
            //     // Expand the ~ to home directory if present
            //     const fullPath = dev_folder.replace(/^~/, process.env.HOME || process.env.USERPROFILE || '').concat(name);

            //     // Check if folder exists
            //     if (!fs.existsSync(fullPath)) {

            //         // Create the main folder
            //         fs.mkdirSync(fullPath, { recursive: true });
                    
            //         // Create standard subfolders
            //         const subfolders = ['templates','assets','output'];
            //         for (const subfolder of subfolders) {
            //             fs.mkdirSync(path.join(fullPath, subfolder), { recursive: true });
            //         }

            //         // Create an empty mapping.json file
            //         const mappingFilePath = path.join(fullPath, 'mapping.json');
            //         fs.writeFileSync(mappingFilePath, JSON.stringify([]));
            
            //         console.log(`Created publication folder structure at: ${fullPath}`);

                    

            //     } else {
            //         console.log(`Publication folder already exists at: ${fullPath}`);
            //     }

            //     updateFrontMatter(this.main.plugin.app, file, "dev_folder", fullPath);

            // } catch (err) {
            //     console.error('Error creating publication folder:', err);
            //     throw err;
            // }



            // const fm: any = await getFrontMatter(this.main.plugin.app, file);
            // // console.log(fm);

            
            // spinner = new DotSpinner(this.main.plugin.app, file, "config");
            // const assets = await this.main.oxo.ctrlr.ipfs.addRecursive(fm.dev_folder + '/assets', fm.storage);
            
            // const templatesCid = await this.main.oxo.ctrlr.ipfs.addRecursive(fm.dev_folder + '/templates', fm.storage);
            // const config = publicationConfig(fm, assets, templatesCid);
            // const config_cid = await this.main.oxo.ctrlr.ipfs.add(config, fm.storage);
            // updateFrontMatter(this.main.plugin.app, file, "config", config_cid);
            // spinner.stop();

            // spinner = new DotSpinner(this.main.plugin.app, file, "contract");

            // const archive_cid = await this.main.oxo.ctrlr.ipfs.addRecursive(fm.dev_folder + '/output', fm.storage);
            // const printer_address = this.main.plugin.settings.n_printer; // 0xE16df371dfE251Fe2FEE86378395e80078195fA3
            // const args = [owners, owners.length, printer_address, config_cid, archive_cid || ""];

            // const contract = await this.deployPublicationContract(args);
            // updateFrontMatter(this.main.plugin.app, file, "contract", contract);
            // spinner.stop();

            // await verifyNPublication(this.main, file, contract, args);

            // for (const author of authors) {
            //     this.whitelistAuthor(contract, author);
            // }
        }
    }

    async whitelistAuthor(pub_address: string, author: string) {
        
        console.log("proposing to whitelist author", author);
        const response = await this.main.oxo.ctrlr.safe.genericTx(
            pub_address, 
            ABI_PUBLICATION, 
            "proposeWhitelistAuthor", 
            [author], 
            false
        );
        console.log("proposal created:", response);
    }

    async update() {

		const activeLeaf = this.main.plugin.app.workspace.getLeaf();
		if (activeLeaf.view instanceof MarkdownView) {
			
			const file = activeLeaf.view.file;
			if (file instanceof TFile) 

                if (file != null)  {
            
                    const fm: any = await getFrontMatter(this.main.plugin.app, file);
                    
                    let config = await this.main.oxo.ctrlr.ipfs.get(fm.config, fm.data_gateway);
                    if (config.Type == "error") {
                        config = {};
                    }

                    if (config.assets === undefined) { 
                        config.assets = [];
                    }
                    if (config.stylesheets === undefined) { 
                        config.stylesheets = [];
                    }
                    if (config.templates === undefined) { 
                        config.templates = [];
                    }

                    console.log("config", config);

                    const spinner = new DotSpinner(this.main.plugin.app, file, "config");

                    try {
            
                        const assets_files: any[] = await getFilesFromGithub(fm,'assets');
                        const assets_cids = JSON.parse(JSON.stringify(config.assets.map((a: any) => a.cid)));
                    
                        for (let asset of assets_files) {
                            // console.log("asset", asset);
                            const assetCid = await this.main.oxo.ctrlr.pinata.uploadFileFromUrl(asset.url, true);
                            // console.log("asset cid", assetCid);
                            if (!assets_cids.includes(assetCid)) {
                                console.log("new asset", assets_cids, assets_cids.includes(assetCid));              
                                await this.main.oxo.ctrlr.pinata.uploadFileFromUrl(asset.url, false);

                                const existingAssetIndex = config.assets.findIndex((a: any) => a.path === asset.path);
                                
                                if (existingAssetIndex !== -1) {
                                    // Replace CID for existing asset with same path
                                    config.assets[existingAssetIndex].cid = assetCid;
                                    console.log(`updated image CID for ${asset.path}: ${assetCid}`);
                                } else {
                                    // Upload new asset and add to config
                                    config.assets.push({path: asset.path, cid: assetCid});
                                    console.log(`new image uploaded to pinata: ${assetCid}`);
                                }
                            } else {
                                console.log("image already exists in config, skipping upload");
                            }
                        }

                        // console.log("config assets", config.assets);

                        let stylesheet_files: any[] = await getFilesFromGithub(fm, 'css');

                        stylesheet_files = stylesheet_files.filter((file: any) => {
                            return path.extname(file.path) === ".css";
                        });

                        console.log("stylesheet_files", stylesheet_files);

                        for (let stylesheet of stylesheet_files) {

                            const cid = await this.main.oxo.ctrlr.pinata.uploadFileFromUrl(stylesheet.url, true);

                            if (!config.stylesheets.map((a: any) => a.cid).includes(cid)) {

                                await this.main.oxo.ctrlr.pinata.uploadFileFromUrl(stylesheet.url, false);

                                const existingAssetIndex = config.stylesheets.findIndex((a: any) => a.path === stylesheet.path);

                                if (existingAssetIndex !== -1) {
                                    // Replace CID for existing asset with same path
                                    config.stylesheets[existingAssetIndex].cid = cid;
                                    console.log(`updated stylesheet CID for ${stylesheet.path}: ${cid}`);
                                } else {
                                    // needs to be push or replace !!!!
                                    config.stylesheets.push({path: stylesheet.path, cid: cid});
                                    console.log(`new stylesheet uploaded to pinata: ${cid}`);
                                }

                            } else {
                                console.log("stylesheet already exists in config, skipping upload");
                            }
                        }

                        console.log("config stylesheets", config.stylesheets);

                        const template_files: any[] = await getFilesFromGithub(fm,'templates');

                        for (let template of template_files) {
                            
                            let templateContent = await fetchFileFromGithub(template.url);

                            if (path.basename(template.url) == "head.handlebars") { 
                                templateContent = this.insertStylesheetLink(fm, templateContent, config.stylesheets[0].cid);
                            }

                            templateContent = this.insertImageCidsIntoTemplate(templateContent, config.assets, fm.assets_gateway);

                            const cid = await this.main.oxo.ctrlr.ipfs.add(templateContent, fm.data_gateway, true);
                           
                            if (!config.templates.map((a: any) => a.cid).includes(cid)) {

                                await this.main.oxo.ctrlr.ipfs.add(templateContent, fm.data_gateway, false);

                                const existingAssetIndex = config.templates.findIndex((a: any) => a.path === template.path);

                                if (existingAssetIndex !== -1) {

                                    config.templates[existingAssetIndex].cid = cid;
                                    console.log(`updated template CID for ${template.path}: ${cid}`);

                                } else {

                                    config.templates.push({path: template.path, cid: cid, body: templateContent});
                                    console.log(` new template uploaded to ipfs: ${cid}`);
                                }
                        
                            } else {
                                console.log("template already exists in config, skipping upload");   
                            }
                        }

                            let templatesCid = await this.main.oxo.ctrlr.ipfs.dagPut(config.templates, fm.data_gateway);

                            const commit_sha = fm.commit == "latest" ? await getLatestCommitSHA(fm) : fm.commit;

                            const mapping = await fetchFileFromGithub(`https://raw.githubusercontent.com/${fm.github_profile}/${fm.github_repo}/${commit_sha}/mapping.json`);

                            console.log("templatesCid", templatesCid)

                            if (templatesCid !== "") {
                                const publication_config = publicationConfig(fm, config, templatesCid, mapping);
                                console.log("config", publication_config);
                                const config_cid = await this.main.oxo.ctrlr.ipfs.add(publication_config, fm.data_gateway);
                                updateFrontMatter(this.main.plugin.app, file, "config", config_cid);
                                spinner.stop();

                                await this.updatePublicationContract(fm.contract, config_cid);

                            } else {
                                updateFrontMatter(this.main.plugin.app, file, "config", "failed");
                                spinner.stop();    
                            }

                    } catch (error) {
                        console.log(error);
                        updateFrontMatter(this.main.plugin.app, file, "config", "failed");
                        spinner.stop();    
                    }
                }
        }
	}  

    private findHandlebarsFiles(dir: string): string[] {
        const files: string[] = [];
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = dir + '/' + item;
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
                files.push(...this.findHandlebarsFiles(fullPath));
            } else if (item.endsWith('.handlebars')) {
                files.push(fullPath);
            }
        }
        
        return files;
    }

    // private async updateHeadTemplate(fm: any, styleCid: string): Promise<void> {
    //     const templatePath = fm.dev_folder + '/templates/partials/head.handlebars';
    //     const fs = require('fs').promises;
        
    //     try {
    //         const content = await fs.readFile(templatePath, 'utf8');
            
    //         // Match first link element with rel="stylesheet"
    //         const styleRegex = /<link[^>]*rel="stylesheet"[^>]*>/;
    //         const newStyleLink = `<link rel="stylesheet" href="${fm.assets_gateway}/ipfs/${styleCid}?pinataGatewayToken=${this.main.plugin.settings.pinata_gateway_key}">`;
            
    //         const updatedContent = content.replace(styleRegex, newStyleLink);
    //         await fs.writeFile(templatePath, updatedContent, 'utf8');
    //     } catch (error) {
    //         console.error('Error updating head template:', error);
    //         throw error;
    //     }
    // }

    private insertStylesheetLink(fm: any, templateContent: string, cid: string): string {
        console.log("inserting stylesheet link");
        const styleRegex = /<link[^>]*rel="stylesheet"[^>]*>/;
        const newStyleLink = `<link rel="stylesheet" href="${fm.assets_gateway}/ipfs/${cid}?filename=styles.css">`;
        return templateContent.replace(styleRegex, newStyleLink);
    }

    // private async injectImageCidsIntoTemplates(content: string, assets: NAsset[], assets_gateway: string): Promise<string> {
    //     const templateFiles = this.findHandlebarsFiles(devFolder);another
    //     const filename = imageFile.substring(0, imageFile.lastIndexOf('.'));
        
    //     // Match img tags where id equals the filename (without extension)
    //     const imgRegex = new RegExp(`<img[^>]+id=["']${filename}["'][^>]*>`, 'gi');
        
    //     for (const templatePath of templateFiles) {
    //         const content = fs.readFileSync(templatePath, 'utf-8');
    //         const updatedContent = content.replace(imgRegex, (match) => {
    //             console.log("replacing");
    //             return match.replace(/src=["'][^"']*["']/, `src="${assets_gateway}/ipfs/${cid}?pinataGatewayToken=${this.main.plugin.settings.pinata_gateway_key}"`);
    //         });

    //         if (content !== updatedContent) {
    //             fs.writeFileSync(templatePath, updatedContent, 'utf-8');
    //             console.log(` Updated image reference in ${templatePath}`);
    //         }
    //     }
    // }

    private insertImageCidsIntoTemplate(templateContent: string, assets: NAsset[], assets_gateway: string): string {
       
        for (const asset of assets) {

            const filename = path.basename(asset.path).split('.')[0];
            
            // Match img tags where id equals the filename (without extension)
            const imgRegex = new RegExp(`<img[^>]+id=["']${filename}["'][^>]*>`, 'gi');
            
            templateContent = templateContent.replace(imgRegex, (match) => {
                // console.log("inserting image cids");
                return match.replace(/src=["'][^"']*["']/, `src="${assets_gateway}/ipfs/${asset.cid}"`);
            });
        }

        return templateContent;
    }

    private async extractImageCidsFromTemplates(devFolder: string): Promise<string[]> {
        const templateFiles = this.findHandlebarsFiles(devFolder);
        const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
        const cidRegex = /\/ipfs\/([A-Za-z0-9\-_]+)/;
        const cids: string[] = [];

        for (const templatePath of templateFiles) {
            try {
                const content = fs.readFileSync(templatePath, 'utf-8');
                let match;
                while ((match = imgRegex.exec(content)) !== null) {
                    const src = match[1];
                    const cidMatch = src.match(cidRegex);
                    if (cidMatch && cidMatch[1]) {
                        cids.push(cidMatch[1]);
                    }
                }
            } catch (error) {
                console.log(` Warning: Could not read template file ${templatePath}`, error);
            }
        }

        return cids;
    }
}
