import { DSGPublication, DSGTable } from "./types";
import fs from 'fs';
//@ts-ignore
import electron from 'electron';
const net = electron.remote.net;

export const publicationConfig = (fm: any, config: any, templatesCid: string, mapping: any):  DSGPublication => {
  
    let content = "{}"; // fs.readFileSync(fm.dev_folder + "/mapping.json", "utf8");
    
    let domain = {
        url: "unamore.publikaan.nl",
        dns: {
            custodian: "digitalocean",
            item_id: "xxx",
            auth_key: "xxx"
        }
    }

    let table : DSGTable = {
        id: fm.db_model,
        gateway: fm.db_gateway,
    }

   return  {
        assets: config.assets,
        assets_gateway: fm.assets_gateway,
        contract: fm.contract,
        data_gateway: fm.data_gateway ||fm.storage,
        domains: [domain],
        owners: fm.owners.split(","),
        mapping,
        name: fm.name,
        rpc: fm.rpc,
        stylesheets: config.stylesheets,
        table,
        template_cid: templatesCid,
        templates: config.templates
    }
}

export const fetchFileFromGithub = (url: string): Promise<string> => {
    try {
        const request = net.request({
            method: 'GET',
            url: url,
            headers: { 
                "Accept": "text/css,text/javascript,text/html,text/plain,application/json;q=0.9,*/*;q=0.8"
            }
        });

        return new Promise((resolve, reject) => {
            
            request.on('response', (response: any) => {
                response.on('data', (data: Buffer) => { 
                    resolve(data.toString());
                });
                
                response.on('error', (error: Error) => {
                    reject(error);
                });
            });

            request.on('error', (error: Error) => {
                reject(error);
            });

            request.end();
        });
    } catch (error) {
        console.error('Error fetching file:', error);
        return Promise.resolve("");
    }
};

export const getFilesFromGithub = async (fm:any, folder: string) : Promise<any[]> => {

    const commit_sha = fm.commit == "latest" ? await getLatestCommitSHA(fm) : fm.commit;

    const GITHUB_API_URL = `https://api.github.com/repos/${fm.github_profile}/${fm.github_repo}/git/trees/${commit_sha}?recursive=1`;

    try {
        return new Promise((resolve, reject) => {
            const request = net.request({
                method: 'GET',
                url: GITHUB_API_URL,
                headers: { "Accept": "application/vnd.github.v3+json" }
            });
            
            request.on('response', (response: any) => {
                response.on('data', function(chunk?: any) {        
                    const jsonData = JSON.parse(chunk);
                    resolve(jsonData.tree
                        .filter((file: any) => file.type === "blob")
                        .filter((file: any) => file.path.startsWith(folder + "/"))
                        .map((file: any) => ({
                            path: file.path,
                            url: `https://raw.githubusercontent.com/${fm.github_profile}/${fm.github_repo}/${commit_sha}/${file.path}`
                        })));
                });
            });

            request.on('error', (error: any) => {
                reject(error);
            });

            request.end();
        });
    } catch (error) {
        console.error("Error fetching folder contents:", error);
        return Promise.resolve([]);
    }
    
}

export const getLatestCommitSHA = async (fm: any, branch = "main") => {

    const GITHUB_API_URL = `https://api.github.com/repos/${fm.github_profile}/${fm.github_repo}/branches/${branch}`;

    try {
        return new Promise((resolve, reject) => {
            
            const request = net.request({
                method: 'GET',
                url: GITHUB_API_URL,
                headers: { "Accept": "application/vnd.github.v3+json" }
            });

            request.on('response', (response: any) => {
                
                console.log("response", response)
                response.on('data', function(chunk?: any) {      
                    const jsonData = JSON.parse(chunk);
                    resolve(jsonData.commit.sha);
                });
            });

            request.on('error', (error: any) => {
                reject(error);
            });

            request.end();
        });
    } catch (error) {
        console.error("Error fetching latest commit SHA:", error);
        return null;
    }
}