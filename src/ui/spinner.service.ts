import { App, TFile } from "obsidian";

export class DotSpinner  {

    app;

    periodic: any;

    constructor(app: App, file: TFile, key: string) {

        this.app = app;
        this.start(file, key);
    }

    start(file: TFile, key: string) {

        let i = 1;

        this.periodic = setInterval ( async () => {
            if (file != null) {
                // console.log('spinna');
                await this.app.fileManager.processFrontMatter( file, (frontmatter) => {

                    let v = '.';
                    for (let j = 0; j <= i; j++) {
                        v = v.concat('.')
                    }

                    frontmatter[key] = v;
                })
            }

            i++;

        }, 500)
    }

    stop() {

        clearInterval(this.periodic);
    }

}