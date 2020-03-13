'use strict';

// const sing = require("crypto");
const assert = require('assert');
const w3h = require('./web3Helper.js');
const ch = require('./contractHelper.js');

class Stamper {
  constructor(web3setup, contract) {
    assert(web3setup);
    assert(web3setup.web3);
    assert(web3setup.web3.eth.defaultAccount);
    assert(contract);

    this.web3 = web3setup.web3;
    this.netId = web3setup.netId;
    this.from = web3setup.from;
    this.defaultAccount = web3setup.web3.eth.defaultAccount;
    this.walletAccount = web3setup.walletAccount;
    this.contract = contract;
    this.address = contract._address;
  }

  static async build(web3setup, options) {
    web3setup = web3setup || await w3h.setup();
    const contract = await ch.setup(web3setup, options);
    return new Stamper(web3setup, contract);
  }

  async getBlockNo(object, address) {
    return parseInt(await this.contract.methods.getBlockNo(object, address).call(), 10);
  }

  async getObjectCount(object) {
    return parseInt(await this.contract.methods.getObjectCount(object).call(), 10);
  }

  async getStamperCount(address) {
    return parseInt(await this.contract.methods.getStamperCount(address).call(), 10);
  }

  async getStamplistPos(pos) {
    return await this.contract.methods.getStamplistPos(pos).call();
  }

  async getObjectPos(object, pos) {
    return await this.contract.methods.getStamplistPos(object, pos).call();
  }

  // stampea un conjunto de objects (hashes) recibido como array
  // utiliza la cuenta walletAccount para enviar la transaccion
  // (o defaultAccount si no se especifica)
  async stamp(hashes, checkOption = true) {
    try {
      assert(hashes);
      hashes = Array.isArray(hashes) ? hashes : [hashes];
      hashes = hashes.map(x => (x.startsWith('0x') ? x : '0x' + x));

      if (hashes.length > 1) {
        console.log(`asked to stamp ${hashes.length} objects`);
      } else {
        console.log(`asked to stamp [...${hashes[0].substr(hashes[0].length - 6)}]`);
      }
      var objectsToStamp = []; // Guardo los hashes que seran enviados a la BFA
      const objectsStamped = []; // Guardo los objetos que ya fueron enviados a la BFA

      if (checkOption) {
        for (var object of hashes) {
          var blockNumber = await this.getBlockNo(object, this.defaultAccount);
          if (blockNumber === 0 && this.defaultAccount != this.web3.eth.defaultAccount) {
            console.log('check fail with address', this.defaultAccount);
            blockNumber = await this.getBlockNo(object, this.web3.eth.defaultAccount);
            if (blockNumber === 0) console.log('check fail with address', this.web3.eth.defaultAccount);
          }
          if (blockNumber === 0) {
            objectsToStamp.push(object);
          } else {
            const block = await this.web3.eth.getBlock(blockNumber);
            console.log('already stamped', object, 'block', blockNumber, 'timestamp', block.timestamp);
            objectsStamped.push({
              hash: object,
              block: blockNumber,
              txHash: block.transactions.length === 1 ? block.transactions[0] : null,
              gasUsed: null,
              status: 'already_stamped_by_this_TSA',
            });
          }
        }
      } else {
        objectsToStamp = hashes;
      }

      if (objectsToStamp.length === 0) {
        console.log('Los objects enviados ya están stampeados');
        return objectsStamped;
      }

      if (objectsToStamp.length > 1) {
        console.log(`stamping ${objectsToStamp.length} objects ...`);
      } else {
        console.log(`stamping [...${objectsToStamp[0].substr(objectsToStamp[0].length - 6)}] ...`);
      }

      // const gasLimit = 3400000; // Para 100 hashes
      const gasLimit = 3400000000;

      var txResult;

      if (this.walletAccount) {
        const methodPut = this.contract.methods.put(objectsToStamp);
        const data = methodPut.encodeABI();
        const nonce = await this.web3.eth.getTransactionCount(this.defaultAccount);
        assert(nonce >= 0, 'nonce debe ser mayor o igual que cero');
        const tx = {
          to: this.contractAddress,
          // v: 47525974938 * 35 + 2,
          // v: 47525974938,
          // Parece que sin chainId funciona igual - hasta a veces mejor. Pero en la red Testnet, hay que agregar el chainID 99118822
          // chainId: '99118822',
          gas: gasLimit,
          // gasLimit: gasLimit,
          data: data,
          nonce: this.web3.utils.toHex(nonce),
        };
        // tx.v = Buffer.from([47525974938])
        // tx.nonce = this.web3.utils.toHex(await this.web3.eth.getTransactionCount(defaultAccount))

        const signedTx = await this.walletAccount.signTransaction(tx);
        // txPromise = this.web3.eth.sendSignedTransaction(signedTx)
        // txPromise = this.web3.eth.sendSignedTransaction('0x' + signedTx.serialize().toString('hex'))

        console.log('sendSignedTransaction ...');
        console.time('sendSignedTransaction');
        txResult = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.timeEnd('sendSignedTransaction');
        console.log('sendSignedTransaction - gasUsed', txResult.gasUsed);

      } else {
        console.log('put(objects).send ...');
        console.time('put(objects).send');
        txResult = await this.contract.methods.put(objectsToStamp).send({
          from: this.from,
          gasLimit: gasLimit,
        });
        console.timeEnd('put(objects).send');
        console.log('put(objects).send - gasUsed', txResult.gasUsed);
      }

      if (txResult.status) {
        // Agrego el objeto al array de objetos stampados (incluye los que ya fueron stampados, si los hubiese, y los nuevos)
        objectsToStamp.forEach(object => objectsStamped.push({
          hash: object,
          block: txResult.blockNumber,
          txHash: txResult.transactionHash,
          gasUsed: txResult.gasUsed,
          status: 'stamped',
        }));
      }
      // Retorno un array con todos los objetos stampados

      return objectsStamped;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async verify(hash, account) {
    const web3 = this.web3;

    assert(hash);
    hash = (typeof hash === 'string') ? hash : hash.toString();

    const hashTolog = `[...${hash.substr(hash.length - 6)}]`;

    try {
      if (account) {
        console.log('verifying hash', hashTolog, 'from account', account, '...');
        const blocknumber = parseInt(await this.contract.methods.getBlockNo(hash, account).call(), 10);

        if (blocknumber === 0) {
          console.log(`fallo verificacion ${hashTolog} stamped by ${account}`);
          return { stamped: false, stamps: [] };
        }
      } else {
        console.log('verifying hash', hashTolog, 'from any account ...');
      }
      const count = parseInt(await this.contract.methods.getObjectCount(hash).call(), 10);
      if (count === 0) {
        console.log('unverified hash', hashTolog);
        return { stamped: false, stamps: [] };
      }

      const stamps = [];
      for (var i = 0; i < count; i++) {

        const stampPos = await this.contract.methods.getObjectPos(hash, i).call();
        const stamp = await this.contract.methods.getStamplistPos(stampPos).call();
        const whostamped = stamp[1];

        if (account && account !== whostamped) continue;

        const blockno = stamp[2];
        const block = await web3.eth.getBlock(blockno);
        stamps.push({
          whostamped: whostamped,
          blocknumber: parseInt(blockno, 10),
          blocktimestamp: block.timestamp,
        });
      }

      assert(stamps[0], `stamps must be a non-empty array - hash ${hash} - account ${account}`);

      console.log(`hash ${hashTolog} successfully verified`);
      return { stamped: true, stamps: stamps };
    } catch (e) {
      console.error(e);
      throw e;
    }
  }
}

module.exports = Stamper;
