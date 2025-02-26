import { TFile, MarkdownView, WorkspaceLeaf, ItemView, ViewCreator } from 'obsidian';
import { MainController } from './main.ctrlr';

const HTML_VIEW_TYPE = 'neutralpress-html-preview';

class HTMLView extends ItemView {
    content: string = '';

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType(): string {
        return HTML_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'HTML Preview';
    }

    setHTML(html: string) {
        this.content = html;
        this.contentEl.empty();
        this.contentEl.innerHTML = html;
    }

    async onOpen() {
        this.contentEl.empty();
        this.contentEl.innerHTML = this.content;
    }
}

export class PreviewCtrlr {

    main: MainController;

    constructor(main: MainController) {
        this.main = main;
        // Register the custom view
        this.main.plugin.registerView(
            HTML_VIEW_TYPE,
            (leaf: WorkspaceLeaf) => new HTMLView(leaf)
        );
    }

    public async display(html: string): Promise<void> {

        console.log(html);


        
        // Get or create HTML preview leaf
        let leaf = this.main.plugin.app.workspace.getLeavesOfType(HTML_VIEW_TYPE)[0];
        if (!leaf) {
            leaf = this.main.plugin.app.workspace.getLeaf('split');
            await leaf.setViewState({
                type: HTML_VIEW_TYPE
            });
        }

        // Set the HTML content
        if (leaf.view instanceof HTMLView) {
            leaf.view.setHTML(html);
            
            // Create a temporary DOM parser to find the stylesheet
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const styleLinks = [].slice.call(doc.querySelectorAll('link[rel="stylesheet"]'));
            for (const styleLink of styleLinks) {
                if (styleLink && styleLink.getAttribute('href')) {
                    await this.injectStylesheet(styleLink.getAttribute('href')!);
                }
            }
        }
    }

    public async renderHTML (stream_id: string, publication: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const request = require('electron').remote.net.request({
                method: 'POST',
                protocol: 'http:',
                hostname: 'localhost',
                port: 3004,
                path: '/preview'
            });

            request.setHeader('Content-Type', 'application/json');

            request.on('response', (response: any) => {
                let data = '';
                response.on('data', (chunk: any) => {

                    const chunkStr = chunk.toString();
                    
                    if (response.statusCode >= 200 && response.statusCode < 300) {
                        resolve(chunkStr);
                    } else {
                        console.error('HTTP error:', response.statusCode, chunkStr);
                        reject(new Error(`HTTP ${response.statusCode}: ${chunkStr}`));
                    }
                });
            });

            request.on('error', (error: Error) => {
                reject(error);
            });

            request.write(JSON.stringify({
                stream_id,
                publication
            }));

            request.end();
        });
    }

    async injectStylesheet(url: string) {

        if (url.includes("https://cloud.typography.com")) {
            return;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.error("Failed to fetch stylesheet:", response.statusText);
                return;
            }
            const css = await response.text();

            // console.log(css);
            
            // Inject CSS into a <style> tag
            const styleTag = document.createElement("style");
            styleTag.textContent = css;
            document.head.appendChild(styleTag);
        } catch (error) {
            console.error("Error loading stylesheet:", error);
        }
    }
}