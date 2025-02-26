import { App, FrontMatterCache } from "obsidian";

function removeBrackets(str: string): string {
    return str.replace(/^\[\[|\]\]$/g, '');
}

export const findFileFromLink = (app: App, link: string) => {

    
    console.log(link);
    const mfile = app.vault.getMarkdownFiles().find(f => f.basename === link.replace(".md",""));
    let attributes : FrontMatterCache | undefined = undefined;
    if (mfile != null) {
        attributes = app.metadataCache.getFileCache(mfile)?.frontmatter;
        console.log(attributes);
    } 
    if (attributes == undefined){
        attributes = {};
    }

    return attributes;
			
}
