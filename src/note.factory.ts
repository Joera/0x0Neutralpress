import {
	App,
	FileManager,
	TFile,
	Vault,
} from "obsidian";

import { NPContentItem, SGContentItem, SGTask } from "./types";
import slugify from "slugify";
import { IMainController } from "./main.ctrlr";
import { marked } from "marked";


export const slug = (title: string) : string => {

	const options = {
		lower: true, // Convert to lowercase
		remove: /['"?!.,:;()\[\]{}@#$%^&*+=<>~`|\\]/g, // Remove special characters that are unsafe for URLs
		strict: true // Replace spaces with dashes
	};

	return slugify(title, options);
}

export const parseNote =  async (main: IMainController, file: TFile) : Promise<any>=> {

	const rawFile = await app.vault.read(file);

	let { streamId, contentItem } = await parseFrontmatter(file, app.fileManager);

	if (file.name != undefined) contentItem.title = file.name.replace(/\.[^/.]+$/, "");
	let [ content, title ] = extractTitle(rawFile, contentItem.title);
	contentItem.slug = slug(title || contentItem.title);

	contentItem.content = await marked(content);
	contentItem.content = await distributeImages(main, contentItem.content);

	if (title != undefined && title != "") contentItem.title = title;
	return { streamId, contentItem};
}

export const distributeImages = async (main: IMainController, content: string) => {
    const imgRegex = /<img[^>]+>/g;
    let modifiedContent = content;
    
    // Find all image tags
    const images = content.match(imgRegex) || [];
    
    for (const imgTag of images) {
        // Extract src attribute
        const srcMatch = imgTag.match(/src="([^"]+)"/);
        if (srcMatch && srcMatch[1]) {

			// ook meteen in obsidian vervangen .. en dan niet opnieuw uploaden bij 2de keer 
            
			const originalSrc = srcMatch[1].replace("file://", "");
			const response = await main.oxo.ctrlr.pinata.upload(originalSrc);
			const newSrc = `${main.plugin.settings.pinata_gateway}/ipfs/${response}?pinataGatewayToken=${main.plugin.settings.pinata_gateway_key}`;

            // Create new image tag with modified src
            const newImgTag = imgTag.replace(srcMatch[1], newSrc);
            
            // Replace old tag with new tag in content
            modifiedContent = modifiedContent.replace(imgTag, newImgTag);
        }
    }

    return modifiedContent;
}

const removeCodeBlocks = (text: string) => {
	return text.replace(/```[\s\S]*?```/g, '');
}

const removeMarkdownImages = (text: string) => {
    return text.replace(/!\[.*?\]\(.*?\)/g, '');
}

const extractTitle = (raw: string, title: string) : [string, string | undefined] => {

	let content = raw.split("---")[2].trim();

	// content = removeMarkdownImages(content);
	// content = removeCodeBlocks(content);

	content = content.replace(/^\n+/, '');

	if (content.slice(0,2) == '# ') {

		const parts = content.split("\n");
		title = parts[0].replace("# ","").trim();
		parts.shift();
		content = parts.join("\n").trim() 
	} else {
		title = title.split(".")[0].trim();
	}

	return [content, title]
}

const skipDefault = (fmcopy: Record<string, any>) : Record<string, any> => {
	
	const keysToDelete = [
		"args",
		"categories",
		"cid",
		"contract",
		"creation_date",
		"language",
		"modified_date",
		"position",
		"parent",
		"post_type",
		"publication",
		"sgId",
		"stream_id",
		"tags",
		"thumbnail",
		"url",
	];

	keysToDelete.forEach(key => {
		if (key in fmcopy) {
			delete fmcopy[key];
		}
	});

	Object.entries(fmcopy).forEach(([k, v]: [string, any]) => {
		if (v == null && k in fmcopy) {
			delete fmcopy[k];
		}
	});

	return fmcopy;
}

const parseFrontmatter = async (file: TFile, fileManager: FileManager) : Promise<{streamId: string, contentItem: NPContentItem}> => {

	let contentItem: NPContentItem;
	let content: string;

	return new Promise ( async (resolve: any, reject: any) => {

		await fileManager.processFrontMatter(file, (frontmatter: any) => {

			// possibly check if content was modified ??? 
			const now = new Date().toJSON().split(".")[0];
			frontmatter.modified_date = now;
			if (frontmatter.creation_date == undefined) frontmatter.creation_date = now;

			contentItem = {
				args: frontmatter.args != undefined ? frontmatter.args : [],
				content: "",
				creation_date: Math.floor(new Date(frontmatter.creation_date).getTime() / 1000),
				modified_date: Math.floor(new Date(frontmatter.modified_date).getTime() / 1000),
				language: frontmatter.language != undefined ? frontmatter.language : "nl",
				parent: frontmatter.parent != undefined ? parseInt(frontmatter.parent) : 0,
				position: frontmatter.position != undefined ? parseInt(frontmatter.position) : 0,
				post_type: frontmatter.post_type,
				publication: frontmatter.publication != undefined ? frontmatter.publication : "",
				slug: "",
				status: frontmatter.status != undefined ? frontmatter.status : "private",
				tags: frontmatter.tags != undefined ? frontmatter.tags : [],
				title: "",
				custom: JSON.stringify(skipDefault(JSON.parse(JSON.stringify(frontmatter))))
			}

			// extra content hier toevoegen 
			// of toch .painting individueel doorsturen .. in tableland opnemen ... 
			// maar niet renderen .. of alleen een ripple (dat dus) 

			const streamId = frontmatter.stream_id != undefined ? frontmatter.stream_id : null;

			resolve({streamId, contentItem});
		})

	})
	
}

export const followLink = async (key: string, linkText: string, app: App) : Promise<string> => {

	return new Promise ( async(resolve,reject) => {

		let files = app.vault.getMarkdownFiles();
		let file = files.find( (f) => f.basename == linkText.replace("[","").replace("[","").replace("]","").replace("]",""));
		if(file != undefined) {
			await app.fileManager.processFrontMatter(file, (frontmatter) => {
				resolve(frontmatter[key])
			})
			
		} else {
			throw Error(`link to ${key} not specified or found`)
		}
	});	 
}

export const saveRoot = async (main: IMainController, cid: string , file: TFile) : Promise<void> => {

	// find file for publication 

	let publication = "";

	await main.plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
		publication = frontmatter["publication"].replace("[","").replace("[","").replace("]","").replace("]","");
	})

	let pubfile = main.plugin.app.vault.getMarkdownFiles().find( (f) => f.basename == publication);
	if(pubfile != undefined) {
		await main.plugin.app.fileManager.processFrontMatter(pubfile, (frontmatter) => {
			
			// do some check first -- QmYeo7FUc9B5GmJQaqUHnqyJpi6BmwxsfYyNYFJ8J9ndVY
			// frontmatter["archive"] = cid;
		})
	} else {
		throw Error("failed to include archive in publication")
	}
}

export const saveRootDirectly = async (cid: string , url: string, pubName: string, app: App) : Promise<[string,string]> => {

	const pubfile = app.vault.getFiles().find( f =>  f.basename == pubName + '.publication');

	if(pubfile != undefined) {
		await app.fileManager.processFrontMatter(pubfile, (frontmatter) => {
			frontmatter["archive"] = cid;
		})
	} else {
		throw Error("failed to include archive in publication")
	}

	return [cid, url];
}

export const includeUrl = async (main: IMainController, url: string , file: TFile) : Promise<void> => {

	await main.plugin.app.fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter["url"] = url;
	})
}

export const createTask = async (contentItem: SGContentItem): Promise<SGTask> =>  {

	// do slug check on db! 
	// is dit nog wel nodig? of enkel de cid? 

	const task  = {
			slug: slugify(contentItem.title),
			payload: JSON.stringify(contentItem),
			post_type: contentItem.post_type
		}

    return task
}