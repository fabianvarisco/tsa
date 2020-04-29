'use strict';

// const sing = require("crypto");
const assert = require('assert');
const dao = require('../../db/src/stampRequestDAO.js');
const w3h = require('./web3Helper.js');
const hh = require('./hashHelper.js');

class Stamper {
  constructor(ctx, contract) {
    assert(ctx.web3.eth.defaultAccount);
    assert(ctx.netId);
    assert(ctx.nodeInfo);
    assert(ctx.providerHost);
    assert(ctx.nonce);
    assert(contract.address);

    this.web3 = ctx.web3;
    this.netId = ctx.netId;
    this.nonce = ctx.nonce;
    this.nodeInfo = ctx.nodeInfo;
    this.providerHost = ctx.providerHost;
    this.defaultAccount = ctx.web3.eth.defaultAccount;
    this.contract = contract;
    this.contractAddress = contract.address;
    this.walletAccount = ctx.walletAccount; // optional
  }

  static async build(ctx, options) {
    ctx = ctx || await w3h.setup();
    const contract = await w3h.contractSetup(ctx, options);
    assert(contract.address);
    return new Stamper(ctx, contract);
  }

  // stampea un conjunto de objects (hashes) recibido como array
  // utiliza la cuenta walletAccount para enviar la transaccion
  // (o defaultAccount si no se especifica)

  async stamp(objects, checkOption = true) {
    console.log('stamping', objects.length, 'objects ...');
    assert(this.contractAddress);

    objects = Array.isArray(objects) ? objects : [objects];
    objects = objects.map(x => (x.startsWith('0x') ? x : '0x' + x));

    if (objects.length > 1) {
      console.log(`asked to stamp ${objects.length} objects`);
    } else {
      console.log(`asked to stamp [...${objects[0].substr(objects[0].length - 6)}]`);
    }
    try {
      let objectsToStamp = []; // Guardo los hashes que seran enviados a la BFA
      let objectsStamped = []; // Guardo los objetos que ya fueron enviados a la BFA
      let txResult;

      if (checkOption) {
        for (let object of objects) {
          const blockNumber = parseInt(await this.contract.methods.getBlockNo(object, this.defaultAccount).call(), 10);
          if (blockNumber === 0) {
            objectsToStamp.push(object);
          } else {
            const block = await this.web3.eth.getBlock(blockNumber);
            console.log(`already stamped [...${object.substr(object.length - 6)}]`, 'block', blockNumber, 'timestamp', block.timestamp);
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
        objectsToStamp = objects;
      }

      if (objectsToStamp.length === 0) {
        console.log('all objects already_stamped_by_this_TSA');
        return objectsStamped;
      }

      if (objectsToStamp.length > 1) {
        console.log(`stamping ${objectsToStamp.length} objects ...`);
      } else {
        console.log(`stamping [...${objectsToStamp[0].substr(objectsToStamp[0].length - 6)}] ...`);
      }

      // const gasLimit = 3400000; // Para 100 hashes
      const gasLimit = 3400000000;

      if (this.walletAccount) {
        const put = this.contract.methods.put(objectsToStamp);
        const data = put.encodeABI();
        // const nonce = await this.web3.eth.getTransactionCount(this.defaultAccount);
        const tx = {
          to: this.contractAddress,
          gas: gasLimit,
          data: data,
          nonce: this.web3.utils.toHex(this.nonce++),
        };
        const signedTx = await this.walletAccount.signTransaction(tx);

        console.log('sendSignedTransaction ...');
        console.time('sendSignedTransaction');
        txResult = await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        console.timeEnd('sendSignedTransaction');

      } else {
        txResult = await this.contract.methods.put(objectsToStamp).send({
          from: this.defaultAccount,
          gasLimit: gasLimit,
        });
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
      assert.strictEqual(objectsStamped.length, objects.length);
      return objectsStamped;
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  async verify(value, account) {
    const hash = value.startsWith('0x') ? value : '0x' + value;
    const hashTolog = `[...${hash.substr(hash.length - 6)}]`;
    try {
      if (account) {
        const blocknumber = await this.contract.methods.getBlockNo(hash, account).call();

        if (blocknumber === 0) {
          console.log(`fallo verificacion ${hashTolog} stamped by ${account}`);
          return { stamped: false, stamps: [] };
        }
      }
      const count = parseInt(await this.contract.methods.getObjectCount(hash).call(), 10);
      if (count === 0) {
        console.log(`fallo verificación ${hashTolog}`);
        return { stamped: false, stamps: [] };
      }

      const stamps = [];
      for (var i = 0; i < count; i++) {

        const stampPos = await this.contract.methods.getObjectPos(hash, i).call();
        const stamp = await this.contract.methods.getStamplistPos(stampPos).call();
        const whostamped = stamp[1];

        if (account && account !== whostamped) continue;

        const blockno = stamp[2];
        const block = await this.web3.eth.getBlock(blockno);
        stamps.push({
          whostamped: whostamped,
          contract: this.contractAddress,
          netid: this.netId,
          hashalgo: hh.ALGO,
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

  async treeVerify(value, account) {
    try {
      console.log(`Tree verifying ${value} ...`);

      const value2 = (typeof value === 'string') ? value : value.toString();

      const hash = value2.startsWith('0x') ? value2 : '0x' + value2;

      const rows = await dao.selectLeavesByLeave(hash);

      var root, leaves, target;

      if (rows.length > 0) {
        target = 'tree.root';
        root = rows[0][1];
        leaves = rows.map(row => row[0]);
        console.log(`value found in a ${leaves.length} leaves tree with root ${root}`);
      } else {
        target = 'singleHash';
      }
      console.log(`${target} verification ...`);

      // if (!stamper) stamper = newStamper();

      if (!account) account = this.defaultAccount;

      const result = await this.verify(root || hash, account);
      if (!result.stamped) {
        console.log(`${target} verification failure`);
        return { stamped: false, stamps: [] };
      }
      console.log(target, 'verification OK', result);

      if (result.stamps[0].whostamped !== account) {
        console.log(`step2 verification failure: result.whostamped ${result.stamps[0].whostamped} vs defaultAccount ${account}`);
        return { stamped: false, stamps: [] };
      }

      if (!root) return result;

      // Reconstruccion del Tree
      const tree = hh.makeTree(leaves);
      result.stamps[0].tree = {leave: hash, leavesquantity: leaves.length, root: root, hashalgo: hh.ALGO};

      if (root !== tree.getHexRoot()) {
        console.log(`fallo verificación: root ${root} vs tree.getHexRoot() ${tree.getHexRoot()}`);
        result.stamped = false;
        return result;
      }
      const proof = tree.getHexProof(hash);
      result.stamps[0].tree.proof = proof;
      if (!tree.verify(proof, hash, root)) {
        console.log('fallo verificación proof', result.stamps[0].tree);
        result.stamped = false;
        return result;
      }

      console.log('result OK', result);
      return result;
    } catch (err) {
      console.log(err);
      throw err;
    }
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
    return parseInt(await this.contract.methods.getObjectPos(object, pos).call(), 10);
  }

}

module.exports = Stamper;
