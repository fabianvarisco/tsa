'use strict';

require('dotenv').config();
const w3h = require('./web3Helper.js');
const fs = require('fs-extra');
const path = require('path');
const assert = require('assert');

const buildPath = process.env.CONTRACTS_BUILD_PATH;
console.log('process.env.CONTRACTS_BUILD_PATH', buildPath);
assert(buildPath);

async function unsignedDeploy(web3Setup, compiled) {
  assert(web3Setup.from);
  assert(web3Setup.web3);
  assert(web3Setup.web3.eth.defaultAccount);
  assert(compiled.abi);
  assert(compiled.evm);
  assert(compiled.evm.bytecode);
  assert(compiled.evm.bytecode.object);

  console.log('deploying from account', web3Setup.from, '...');

  const contract = await new web3Setup.web3.eth.Contract(compiled.abi);

  const tx = await contract.deploy({
    data: '0x' + compiled.evm.bytecode.object,
    arguments: [],
  });

  const deployed = await tx.send({from: web3Setup.from, gas: '2000000'});

  assert(deployed);
  assert(deployed.options);
  assert(deployed.options.address);

  return deployed.options.address;
}

async function signedDeploy(web3Setup, compiled) {
  try {
    assert(web3Setup.from);
    assert(web3Setup.web3);
    assert(web3Setup.web3.eth.defaultAccount);

    assert(compiled.abi);
    assert(compiled.evm);
    assert(compiled.evm.bytecode);
    assert(compiled.evm.bytecode.object);

    console.log('deploying from account', web3Setup.from, '...');

    const contract = await  new web3Setup.web3.eth.Contract(compiled.abi);

    const data = await contract.deploy({
      data: '0x' + compiled.evm.bytecode.object,
      arguments: [],
    }).encodeABI();

    const nonce = await web3Setup.web3.eth.getTransactionCount(web3Setup.from);
    assert(nonce >= 0, 'nonce debe ser mayor o igual que cero');
    console.log('nonce:', nonce);
    
    const tx = { data: data, gas: 3400000000, nonce: web3Setup.web3.utils.toHex(nonce)};
    
    const signedTx = await web3Setup.walletAccount.signTransaction(tx);

    console.log('sendSignedTransaction ...');
    console.time('sendSignedTransaction');
    const result = await web3Setup.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
    console.timeEnd('sendSignedTransaction');
    console.log('sendSignedTransaction - gasUsed', result.gasUsed, 'block', result.blockNumber);

    assert(result.status);
    assert(result.contractAddress);

    console.log('contract', result.contractAddress, 'deploy OK !!!');

    return result.contractAddress;

  } catch (err) {
    console.log(err);
    throw err;
  }
}

async function run() {
  const CONTRACT_JSON_PATH = process.argv[process.argv.length - 1];
  const compiled = require(CONTRACT_JSON_PATH);
  const name = path.parse(CONTRACT_JSON_PATH).name;

  console.log('deploying', name, 'from', CONTRACT_JSON_PATH);

  const address = await signedDeploy(await w3h.setup(), compiled);

  const fullPath = path.resolve(buildPath, `${name.replace('compiled','deployed')}.address`);

  console.log('writing', fullPath, '...');

  fs.writeFile(fullPath, address);
}

module.exports = {
  signedDeploy: signedDeploy,
  unsignedDeploy: unsignedDeploy,
};

run();
