const hre = require("hardhat");


async function main() {
    
  const pub = await hre.ethers.deployContract("NPublicationFactory");
  await pub.waitForDeployment();
  console.log(`PUBLICATIONFACTORY deployed to ${pub.target}`);

  setTimeout( async () => {
      await hre.run("verify:verify", {
        address: pub.target,
        constructorArguments: [],
      });
  }, 10000);
}
  
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

