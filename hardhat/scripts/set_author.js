const hre = require("hardhat");


async function main() {
    
    const contract = await hre.ethers.getContractAt("NPublication","0x77CD8353A5C344e0Fb2795A470AD3cDa81a6cE0f");
    
    await contract.whitelist("0xa1Fb9ce92842a23a347c925cc5F71507843Aac5e");

   

  }
  
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

