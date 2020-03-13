'use strict';

const assert = require('assert');
const fs = require('fs');

async function setup(web3setup, options) {
  try {
    assert(web3setup);
    assert(web3setup.netId);
    assert(web3setup.web3);

    if (options) {
      console.log('contract setup options:', options);
    }
    const abiPath = (options && options.abiPath) || process.env.CONTRACT_ABI_PATH;
    const truffleDeployedPath = (options && options.truffleDeployedPath) || process.env.CONTRACT_TRUFFLE_DEPLOYED_PATH;
    const addressPath = (options && options.addressPath) || process.env.CONTRACT_ADDRESS_PATH;
    var address = (options && options.address) || process.env.CONTRACT_ADDRESS;

    if (addressPath) {
      const addressFromPath = fs.readFileSync(addressPath).toString();
      if (address) {
        assert.equal(address, addressFromPath);
      }
      address = addressFromPath;
    }

    var abi;
    if (abiPath && address) {
      console.log('> contract abiPath:', abiPath);
      abi = require(abiPath);

    } else if (truffleDeployedPath) {
      // A json with abi and address indexed by netId
      const netId = web3setup.netId;
      console.log('> contract from env CONTRACT_TRUFFLE_DEPLOYED_PATH', truffleDeployedPath, 'netId', netId);
      const json = require(truffleDeployedPath);
      abi = json.abi;
      if (json.networks &&
        json.networks[netId] &&
        json.networks[netId].address) {
        address = json.networks[netId].address;
      }
      if (json.compiler) {
        console.log('> contract compiled by truffle: ', json.compiler);
      }
    }
    assert(abi);
    console.log('> abi:', JSON.stringify(abi));
    assert(address);
    console.log('> contract address:', address);
    const contract = new web3setup.web3.eth.Contract(abi, address);
    console.log('contract setup OK !!!');
    return contract;

  } catch (e) {
    console.error('ERROR on contractHelper.setup');
    console.error(e);
    throw e;
  }
}

module.exports = {
  setup: setup,
};
