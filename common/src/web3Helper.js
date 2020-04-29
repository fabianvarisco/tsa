'use strict';

const assert = require('assert');
const Web3 = require('web3');
const fs = require('fs');

/** *************************************************/
// Conexión al provider
/** *************************************************/

async function setup() {
  try {
    var walletAccount;

    const providerHost = process.env.PROVIDER_HOST || 'http://localhost:8545';
    console.log('Web3.setup: Connecting to', providerHost, '...');
    const provider = new Web3.providers.HttpProvider(providerHost);

    const web3 = new Web3(provider);
    const netId = await web3.eth.net.getId();
    const nodeInfo = await await web3.eth.getNodeInfo();

    console.log('> netId:', netId);
    console.log('> nodeInfo:', nodeInfo);
    console.log('> isListening():', await web3.eth.net.isListening());
    console.log('> web3.version:', web3.version);

    if (process.env.ACCOUNT_PKEY) {
      assert(process.env.ACCOUNT_ADDRESS, 'Si existe env.ACCOUNT_PKEY debe existir env.ACCOUNT_ADDRESS');
    }

    if (process.env.ACCOUNT_ADDRESS) {
      console.log(`> process.env.ACCOUNT_ADDRESS: ${process.env.ACCOUNT_ADDRESS}`);
      console.log(`> process.env.ACCOUNT_PKEY: ${process.env.ACCOUNT_PKEY ? '***' : null}`);
      web3.eth.defaultAccount = process.env.ACCOUNT_ADDRESS;
      if (process.env.ACCOUNT_PKEY) {
        walletAccount = web3.eth.accounts.wallet.add(process.env.ACCOUNT_PKEY);
      }
    } else if (process.env.GETH_ACCOUNT_JSON || process.env.GETH_ACCOUNT_PASSWORD) {
      assert(process.env.GETH_ACCOUNT_JSON, 'Si existe env.GETH_ACCOUNT_PASSWORD debe existir env.GETH_ACCOUNT_JSON');
      assert(process.env.GETH_ACCOUNT_PASSWORD, 'Si existe env.GETH_ACCOUNT_JSON debe existir env.GETH_ACCOUNT_PASSWORD');
      console.log(`> process.env.GETH_ACCOUNT_JSON: ${process.env.GETH_ACCOUNT_JSON}`);
      const rawKeyJsonV3 = fs.readFileSync(process.env.GETH_ACCOUNT_JSON);
      const keyJsonV3 = JSON.parse(rawKeyJsonV3);
      walletAccount = web3.eth.accounts.decrypt(keyJsonV3, process.env.GETH_ACCOUNT_PASSWORD);
      web3.eth.defaultAccount = walletAccount.address;
    } else {
      console.log('> connected to Ganache');
      web3.eth.defaultAccount = (await web3.eth.getAccounts())[0];
    }
    assert(web3.eth.defaultAccount, 'web3.eth.defaultAccount is null or undefined');

    console.log('> web3.eth.defaultAccount:', web3.eth.defaultAccount);
    console.log('> blockNumber:', await web3.eth.getBlockNumber());

    const nonce = await web3.eth.getTransactionCount(web3.eth.defaultAccount);
    console.log('> transaccionCount (nonce):', nonce);

    console.log('> balance:', web3.utils.fromWei(await web3.eth.getBalance(web3.eth.defaultAccount), 'ether'));
    console.log('> block.gasLimit:', (await web3.eth.getBlock('latest')).gasLimit);
    console.log('> gasPrice:', await web3.eth.getGasPrice());

    const result = {
      web3: web3,
      netId: netId,
      nonce: nonce,
      nodeInfo: nodeInfo,
      providerHost: providerHost,
      walletAccount: walletAccount,
      defaultAccount: web3.eth.defaultAccount,
    };
    console.log('> connection OK !!!');
    console.log('>');
    return result;

  } catch (e) {
    console.error('Error de conexión');
    console.error(e);
    throw e;
  }
}

async function contractSetup(ctx, options) {
  try {
    assert(ctx);
    assert(ctx.netId);
    assert(ctx.nodeInfo);
    assert(ctx.providerHost);
    assert(ctx.web3);

    if (options) {
      console.log('contract setup options:', options);
    }
    const abiPath = (options && options.abiPath) || process.env.CONTRACT_ABI_PATH;
    const truffleDeployedPath = (options && options.truffleDeployedPath) || process.env.CONTRACT_TRUFFLE_DEPLOYED_PATH;
    const addressPath = (options && options.addressPath) || process.env.CONTRACT_ADDRESS_PATH;
    var address = (options && options.address) || process.env.CONTRACT_ADDRESS;

    var compiler;

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
      const netId = ctx.netId;
      console.log('> contract from env CONTRACT_TRUFFLE_DEPLOYED_PATH', truffleDeployedPath, 'netId', netId);
      const json = require(truffleDeployedPath);
      abi = json.abi;
      if (json.networks &&
        json.networks[netId] &&
        json.networks[netId].address) {
        address = json.networks[netId].address;
      }
      if (json.compiler) {
        compiler = json.compiler;
        console.log('> truffle compiled contract:', compiler);
      }
    }
    assert(abi);
    console.log('> abi:', JSON.stringify(abi));
    assert(address);
    console.log('> contract address:', address);
    const contract = new ctx.web3.eth.Contract(abi, address);
    contract.address = address;
    contract.compiler = compiler;
    console.log('contract setup OK !!!');
    console.log('>');
    return contract;

  } catch (e) {
    console.error('ERROR on contractHelper.setup');
    console.error(e);
    throw e;
  }
}

async function wait1Block(context) {
  return new Promise((resolve, reject) => {
    var max = 10;
    const web3 = context.web3;
    web3.eth.getBlockNumber()
      .then(
        (startnum) => {
          setTimeout(
            function nextblock() {
              web3.eth.getBlockNumber()
                .then(
                  (nownum) => {
                    if (nownum !== startnum)
                      resolve(nownum);
                    else
                    if (max-- > 0)
                      setTimeout(nextblock, 500);
                    else
                      reject('Timeout. Tal vez no esta sincronizado el nodo local');
                  },
                  reject,
                );
            },
            500,
          );
        },
        (errtxt) => { reject('No conseguimos el blockNumber.\n' + errtxt); },
      );
  });
}

function randomHex() {
  return Web3.utils.randomHex(32);
}

module.exports = {
  setup: setup,
  contractSetup: contractSetup,
  wait1Block: wait1Block,
  randomHex: randomHex,
};
