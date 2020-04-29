const PrivateKeyProvider = require("@truffle/hdwallet-provider");
// const privateKey = "8f2a55949038a9610f50fb23b5883af3b4ecb3c3bb792cbcefbd1542c692be63";

const account = "0x0a391c83B64537A706a6f1d16aeCD6a5F94fCa0b"
const privateKey = "0x950750d5c533ed16c0b8b420e7863dbcd53b2a12296dfa7f146eb034f7116158"
const gethURL = "http://127.0.0.1:8089/"

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // for more about customizing your Truffle configuration!
  networks: {
    geth: {
      provider: () => new PrivateKeyProvider(privateKey, gethURL),
      from: account,
      network_id: "*",
      gasPrice: 2000,
      gas: 4700000
    },
    development: {
      host: "127.0.0.1",
      port: 8089,
      network_id: "*" // Match any network id

    },
    quickstartWallet: {
      provider: () => new PrivateKeyProvider(privateKey, "http://localhost:8545/"),
      from: "0xfe3b557e8fb62b89f4916b721be55ceb828dbd73",
      network_id: "*"
    },
    node1: {
      provider: () => new PrivateKeyProvider(privateKey, "http://localhost:9000/"),
      from: "0xfe3b557e8fb62b89f4916b721be55ceb828dbd73",
      network_id: "*",
      gasPrice: 2000,
      gas: 4700000
    },
    besu: {
      provider: () => new PrivateKeyProvider(privateKey, "http://10.30.215.143:8089/"),
      from: "0xfe3b557e8fb62b89f4916b721be55ceb828dbd73",
      network_id: "*",
      gasPrice: 2000,
      gas: 4700000
    }
  },
  compilers: {
    solc: { version: "0.5.2" }
    // solc: { version: "0.5.16" } // New opcode SHR support - Requieres constantinople
    // solc: { version: "0.6.4" }
  }
};
