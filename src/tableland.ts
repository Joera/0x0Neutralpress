import { Database} from "@tableland/sdk";
import { Wallet, getDefaultProvider } from "ethers";
import { IMainController } from "./main.ctrlr";
// import { TuContentItem } from "./table.js";

export interface Creds {
    key: string,
    gateway: string
}

export interface Payload {

    creds?: Creds,
    table?: string,
    content?: any,
    query?: string
    sql_query?: string
}


export class TablelandProvider {

    main: IMainController
    db: Database

    constructor(main: IMainController) {
        this.main = main;
    }

    init(creds?: Creds): Database {

        const key = this.main.oxo.ctrlr.author.private_key;
        const rpc = this.main.plugin.settings.db_rpc;

        if (key != undefined && rpc != undefined) {

            // MULTISIG SHOULD ACTUALLY OWN THE TABLE -- NOT EOA 
            // DOES IT? 

            // MAKE NEW METHOD FOR ETH CALL USING THE SAFE

            const wallet = new Wallet(key);
            const provider = getDefaultProvider(rpc);
            const signer = wallet.connect(provider);

            return new Database({ signer });

        } else {

            throw Error("needed env vars not found")
        }
    }

    async create_table(body: Payload):Promise<String> {

        this.db = this.init();

        // console.log(this.db);

        const prefix: string = "nprinter_content";
        const { meta: create } = await this.db
            .prepare(
                `CREATE TABLE ${prefix} (
                    id text primary key, 
                    title text,
                    slug text,
                    _owner text, 
                    publication text,
                    author text,
                    post_type text,
                    tags text,
                    categories text,
                    parent text,
                    creation_date text,
                    modified_date text,
                    content_cid text
                );
            `)
            .run();
            
            await create.txn?.wait();

            const tableName = create.txn?.names[0] ?? ""; 

            return tableName;

    }

    async accessToNPrinter(tableName: string) {

        const { meta } = await this.db
        .prepare(
            `GRANT INSERT, UPDATE, DELETE ON ${tableName} TO '${this.main.plugin.settings.n_printer}'`
        )
        .run();
        await meta.txn?.wait();
    }


    async insert(c: any, sql_query: string, db: Database) : Promise<string> {

        let owner = "0x0000000000000000000000000000000000000000"; // what was intention? 

        console.log(c);
        const { meta: insert } = await db
        .prepare(sql_query)
        .bind(c.id, c.title, c.slug, owner, c.publication, c.author, c.post_type, c.tags, c.categories, c.parent, c.creation_date, c.modified_date, c.content_cid)
        .run();

       
        let res = await insert.txn?.wait();
        console.log({"inserttx" :res});
      

        return JSON.stringify(res);

    }

    async update(c: any, table: string, db: Database,) : Promise<string> {

        const { meta: insert } = await db
        .prepare(`UPDATE ${table} SET title = ?, slug = ?, publication = ?, author = ?, post_type = ?, tags = ?, categories = ?, parent = ?, creation_date = ?, modified_date = ?, content_cid = ? WHERE id = ?`)
        .bind(c.title, c.slug, c.publication,c.author, c.post_type, c.tags, c.categories, c.parent, c.creation_date, c.modified_date, c.content_cid, c.id)
        .run();

        let res = await insert.txn?.wait();
        console.log({"updatetx" : res});

        return JSON.stringify(res);

    }



    

}