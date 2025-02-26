require("@nomicfoundation/hardhat-toolbox");
require("@xyrusworx/hardhat-solidity-json");
require("@openzeppelin/hardhat-upgrades");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "baseSepolia",
  networks: {
    arb_sepolia: {
      url: process.env.ARB_SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY]
    },
    baseSepolia : {
      url: process.env.BASE_SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 84532,
      gasPrice: "auto"
    }
  },
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  sourcify: {
    enabled: true
  },
  etherscan: {
    apiKey: {
      arbitrumSepolia: process.env.ARBISCAN_API_KEY,
      baseSepolia: process.env.BASESCAN_API_KEY
    },
    customChains: [
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io"
        }
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/api",
          browserURL: "https://sepolia.basescan.org"
        }
      }
    ]
  },
  upgrades: {
    admin: {
      address: process.env.PROXY_ADMIN_ADDRESS,
      txMode: 'manual'
    }
  }
};
