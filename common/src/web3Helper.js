'use strict';

const assert = require('assert');
const Web3 = require('web3');
const fs = require('fs');

/** *************************************************/
// Conexión al provider
/** *************************************************/

async function setup() {
  try {
    const providerHost = process.env.PROVIDER_HOST || 'http://localhost:8545';
    console.log('Web3.setup: connecting to', providerHost, '...');
    const provider = new Web3.providers.HttpProvider(providerHost);
    const web3 = new Web3(provider);
    const isListening = await web3.eth.net.isListening();
    const netId = await web3.eth.net.getId();

    console.log('> nodeInfo:', await web3.eth.getNodeInfo());
    console.log('> web3.version:', web3.version);
    console.log('> netId:', netId);
    console.log('> isListening():', isListening);

    var walletAccount, key;

    if (process.env.ACCOUNT_PKEY) assert(process.env.ACCOUNT_ADDRESS, 'Si existe env.ACCOUNT_PKEY debe existir env.ACCOUNT_ADDRESS');

    if (process.env.ACCOUNT_ADDRESS) {
      console.log(`> process.env.ACCOUNT_ADDRESS: ${process.env.ACCOUNT_ADDRESS}`);
      web3.eth.defaultAccount = process.env.ACCOUNT_ADDRESS;
      if (process.env.ACCOUNT_PKEY) {
        key = process.env.ACCOUNT_PKEY;
        console.log(`> process.env.ACCOUNT_PKEY: [...${key.substr(key.length - 6)}]`);
      }
    } else if (process.env.KEYSTORE_JSON || process.env.KEYSTORE_PASSWORD) {
      assert(process.env.KEYSTORE_JSON, 'Si existe env.KEYSTORE_PASSWORD debe existir env.KEYSTORE_JSON');
      assert(process.env.KEYSTORE_PASSWORD, 'Si existe env.KEYSTORE_JSON debe existir env.KEYSTORE_PASSWORD');
      console.log(`> process.env.KEYSTORE_JSON: ${process.env.KEYSTORE_JSON}`);
      const rawKeyJsonV3 = fs.readFileSync(process.env.KEYSTORE_JSON);
      const keyJsonV3 = JSON.parse(rawKeyJsonV3);
      key = web3.eth.accounts.decrypt(keyJsonV3, process.env.KEYSTORE_PASSWORD);
      assert(key);

    } else {
      console.log('> connected to Ganache');
      web3.eth.defaultAccount = (await web3.eth.getAccounts())[0];
    }

    if (key) {
      walletAccount = web3.eth.accounts.wallet.add(key);
      if (web3.eth.defaultAccount) {
        assert.equal(
          web3.eth.defaultAccount.toLowerCase(),
          walletAccount.address.toLowerCase(),
          `address [${walletAccount.address}] made from key [... ${key.substr(key.length - 6)}] missmatchs with [${web3.eth.defaultAccount}]`,
        );
      }
      web3.eth.defaultAccount = walletAccount.address;
    }

    assert(web3.eth.defaultAccount, 'unseted web3.eth.defaultAccount');
    console.log('> web3.eth.defaultAccount:', web3.eth.defaultAccount);

    if (walletAccount) {
      assert.equal(walletAccount.address.toLowerCase(), web3.eth.defaultAccount.toLowerCase());
      console.log('> walletAccount.address:', walletAccount.address);
    }
    console.log('> transaccionCount:', await web3.eth.getTransactionCount(web3.eth.defaultAccount));
    console.log('> transaccionCount pending:', await web3.eth.getTransactionCount(web3.eth.defaultAccount, 'pending'));
    console.log('> balance:', web3.utils.fromWei(await web3.eth.getBalance(web3.eth.defaultAccount), 'ether'));
    console.log('> block.gasLimit:', (await web3.eth.getBlock('latest')).gasLimit);
    console.log('> gasPrice:', await web3.eth.getGasPrice());

    console.log('> connection OK !!!');
    console.log('>');
    return {
      web3: web3,
      walletAccount: walletAccount,
      providerHost: providerHost,
      netId: netId,
      from: web3.eth.defaultAccount,
    };
  } catch (e) {
    console.error('Error de conexión');
    console.error(e);
    throw e;
  }
}

async function wait1block(web3) {
  return new Promise((resolve, reject) => {
    var max = 10;
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

module.exports = {
  setup: setup,
  wait1block: wait1block,
};
