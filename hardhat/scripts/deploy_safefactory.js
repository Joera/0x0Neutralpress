const hre = require("hardhat");


async function main() {


  // const singleton = await hre.ethers.deployContract("GnosisSafe");
  // await singleton.waitForDeployment();
  // console.log(`GnosisSafe singleton deployed to ${singleton.target}`);

  // setTimeout( async () => {
  //     await hre.run("verify:verify", {
  //       address: singleton.target,
  //       constructorArguments: [],
  //     });
  // },10000);

  const singletonAddress = "0x2B0c360f87D8Df75cEDb96bB1Dcd10bFB5Fd15da";
    
  // const pub = await hre.ethers.deployContract("GnosisSafeProxyFactory");
  // await pub.waitForDeployment();
  // console.log(`GnosisSafeProxyFactory deployed to ${pub.target}`);

  // setTimeout( async () => {
  //     await hre.run("verify:verify", {
  //       address: pub.target,
  //       constructorArguments: [],
  //     });
  // },10000);

  const proxyFactoryAddress = "0x55C3CDE97919F8ff1051e20615bD37b5A4EDfe43";


  const factory = await hre.ethers.getContractFactory("SafeFactory");
  const constructorArgs = [
    proxyFactoryAddress,
    singletonAddress
  ];
  const contract = await factory.deploy(...constructorArgs);
  console.log(`GnosisSafeFactory deployed to ${contract.target}`);
  setTimeout( async () => {
      await hre.run("verify:verify", {
        address: contract.target,
        constructorArguments: [proxyFactoryAddress, singletonAddress],
      });
  },10000);
}
  
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

