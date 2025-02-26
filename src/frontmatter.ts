import { App, TFile } from "obsidian";

export const updateFrontMatter = async(app:App, file: TFile, key: string, value: string | string[]) => {

    if (file != null) {
        await app.fileManager.processFrontMatter( file, (frontmatter) => {
            frontmatter[key] = value;
        })
    }
}

export const getFrontMatter = async (app: App, file: TFile) : Promise<any> => {

    return new Promise( async (resolve,reject) => {
        await app.fileManager.processFrontMatter( file, (frontmatter) => {
            resolve(frontmatter);
        })
    })
}