import { TFile, Vault } from "obsidian";
import { DSGAuthorInput, SGFile } from "./types";
import { IMainController } from "./main.ctrlr";

export const parseAuthor =  async (main: IMainController, file: TFile): Promise<DSGAuthorInput | null> =>   {

    return new Promise ( async (resolve, reject) => { 
    
        await main.plugin.app.fileManager.processFrontMatter( file, (frontmatter) => {

            const a = {
                name : frontmatter.name,
                repository: frontmatter.repository,
                content_mappings : frontmatter.mapping
            }

            resolve(a)
        })


        reject()


    });
  
}