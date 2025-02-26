const { ethers, upgrades } = require("hardhat");

async function main() {
  // 1. Deploy implementation contract
  console.log("Deploying implementation...");
  const NPublication = await ethers.getContractFactory("NPublication");
  const implementation = await NPublication.deploy();
  await implementation.waitForDeployment();
  const implementationAddress = await implementation.getAddress();
  console.log("Implementation deployed to:", implementationAddress);

  // Wait for some blocks for better verification
  console.log("Waiting for block confirmations...");
  const deployTx = await implementation.deploymentTransaction();
  await deployTx.wait(5);

  // Verify implementation
  console.log("Verifying implementation...");
  try {
    await hre.run("verify:verify", {
      address: implementationAddress,
      constructorArguments: []
    });
  } catch (error) {
    if (!error.message.includes("Already Verified")) {
      console.error("Implementation verification failed:", error);
    } else {
      console.log("Implementation already verified");
    }
  }

  // 2. Deploy factory with implementation
  console.log("Deploying factory...");
  const NPublicationFactory = await ethers.getContractFactory("NPublicationFactory");
  const factory = await NPublicationFactory.deploy(implementationAddress);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("Factory deployed to:", factoryAddress);

  // Wait for some blocks
  console.log("Waiting for block confirmations...");
  const factoryTx = await factory.deploymentTransaction();
  await factoryTx.wait(5);

  // Verify factory
  console.log("Verifying factory...");
  try {
    await hre.run("verify:verify", {
      address: factoryAddress,
      constructorArguments: [implementationAddress]
    });
  } catch (error) {
    if (!error.message.includes("Already Verified")) {
      console.error("Factory verification failed:", error);
    } else {
      console.log("Factory already verified");
    }
  }

  // 3. Create new proxy instance
  console.log("Creating proxy instance...");
  const owners = ["0xd065d8C47994cAC57e49785aCEE04FcA495afac4"]; 
  const required = 1; 
  const printer = "0xE16df371dfE251Fe2FEE86378395e80078195fA3"; 
  const config = "QmNXjEkFCUe3aZpMZqNz45ShJoau6wqT2Xfw4d2xeFSzjz";
  const html_root = "bafyreihayciuiyedtk7n3edqzytp6ccj6dao2a35vgpggx56mgtheng66i";

  const tx = await factory.createPublication(
    owners,
    required,
    printer,
    config,
    html_root
  );
  const receipt = await tx.wait();
  const proxyAddress = receipt.logs.find(log => {
    try {
      const event = factory.interface.parseLog(log);
      return event && event.name === 'PublicationCreated';
    } catch (e) {
      return false;
    }
  }).args.publicationAddress;
  
  console.log("Proxy deployed to:", proxyAddress);

  // Wait for some blocks
  console.log("Waiting for block confirmations...");
  await tx.wait(5);

  // Verify proxy
  console.log("Verifying proxy...");
  try {
    await hre.run("verify:verify", {
      address: proxyAddress,
      constructorArguments: [],
      contract: "contracts/NPublication.sol:NPublication"
    });
  } catch (error) {
    if (!error.message.includes("Already Verified")) {
      console.error("Proxy verification failed:", error);
    } else {
      console.log("Proxy already verified");
    }
  }

  console.log("Deployment and verification completed!");
  console.log({
    implementation: implementationAddress,
    factory: factoryAddress,
    proxy: proxyAddress
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});