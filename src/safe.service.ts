import { IMainController } from './main.ctrlr';
import { ethers } from 'ethers';

// why do we use this instead of 0xO ? ?? ? 

export interface IGnosisSafeService {
    main: IMainController;
    tx(safe_address: string, destination: string, abi: string, method: string, args: string[], callback: Function): Promise<string>;
    parse_contract_address(hash: string): Promise<string>;
}

export class GnosisSafeService implements IGnosisSafeService {
    main: IMainController;

    constructor(main: IMainController) {
        this.main = main;
    }

    async tx(safe_address: string, destination: string, abi: string, method: string, args: string[], callback: Function): Promise<string> {
        console.log("Safe transaction skipped - browser environment");
        return Promise.resolve("");
    }

    async parse_contract_address(hash: string): Promise<string> {
        console.log("Contract address parsing skipped - browser environment");
        return Promise.resolve("");
    }
}
