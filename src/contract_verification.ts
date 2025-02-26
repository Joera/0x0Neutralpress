import { ethers } from "ethers";
import { TFile } from "obsidian";
import { JSON_NPUBLICATION } from "./contracts/json_npublication";
import { getFrontMatter } from "./frontmatter";
import { IMainController } from "./main.ctrlr";
import { JSON_GNOSIS_SAFE } from "./contracts/json_gnosis_safe";

export const verifyNPublication =  async(main: IMainController,file: TFile, contract_address: string, args: any) => {

    const constructorArgTypes = ['address[]','uint8','address','string','string'];

    // ABI encode the constructor arguments
    const abiCoder = new ethers.AbiCoder();
    const encodedArgs = abiCoder.encode(constructorArgTypes, args);

    const requestBody = {
        module: 'contract',
        action: 'verifysourcecode',
        apikey: main.plugin.settings.basescan_key,
        chainId: main.plugin.settings.chain_id.toString(),
        codeformat: 'solidity-standard-json-input',
        sourceCode: JSON.stringify(JSON_NPUBLICATION), // JSON_NPUBLICATION,
        constructorArguments: encodedArgs.substring(2),
        contractaddress: contract_address,
        contractname: 'contracts/NPublication.sol:NPublication',
        compilerversion: 'v0.8.24+commit.e11b9ed9',
        optimizationUsed: '1'
    };

    const encodedBody = new URLSearchParams(requestBody).toString();
      
    const requestOptions = {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: encodedBody
    };


    return new Promise( (resolve, reject) : any => {
      
        fetch('https://api-sepolia.basescan.org/api', requestOptions)
            .then(response => response.json())
            .then(response => {
                console.log(response);
                resolve(response)
            })
            .catch(err => console.error(err));
    });
}

export const verifySafeContract =  async (main: IMainController, contract_address: string, members: string[]) => {

    const constructorArgTypes = [];
    const constructorArgValues = [];

    // ABI encode the constructor arguments
    // const abiCoder = new ethers.AbiCoder();
    // const encodedArgs = abiCoder.encode(constructorArgTypes, constructorArgValues);

    const requestBody = {
        module: 'contract',
        action: 'verifysourcecode',
        apikey: main.plugin.settings.arbiscan_key,
        chainId: main.plugin.settings.chain_id.toString(),
        codeformat: 'solidity-standard-json-input',
        sourceCode: JSON.stringify(JSON_GNOSIS_SAFE), // JSON_NPUBLICATION,
        // constructorArguments: encodedArgs.substring(2),
        contractaddress: contract_address,
        contractname: 'contracts/safe/GnosisSafe.sol:GnosisSafe',
        compilerversion: 'v0.8.24+commit.e11b9ed9',
        optimizationUsed: '1'
    };

    const encodedBody = new URLSearchParams(requestBody).toString();
      
    const requestOptions = {
        method: 'POST', 
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: encodedBody
    };


    return new Promise( (resolve, reject) : any => {
      
        fetch('https://api-sepolia.arbiscan.io/api', requestOptions)
            .then(response => response.json())
            .then(response => {
                console.log(response);
                resolve(response)
            })
            .catch(err => console.error(err));
    });
}