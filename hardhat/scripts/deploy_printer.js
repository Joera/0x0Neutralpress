const hre = require("hardhat");


async function main() {
    const factory = await hre.ethers.getContractFactory("NPrinter");
    
    const constructorArgs = [];
    const contract = await factory.deploy(...constructorArgs);

   setTimeout( async () => {
    
      await hre.run("verify:verify", {
        address: contract.target,
        constructorArguments: constructorArgs,
      });

    },10000);

  }
  
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

