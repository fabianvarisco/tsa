
'use strict';

const assert = require('assert').strict;
const hh = require('./hashHelper.js');
const dao = require('../../db/src/stampRequestDAO.js');

async function verify(stamper, value, account) {
  try {
    assert(stamper);
    assert(value);

    const value2 = (typeof value === 'string') ? value : value.toString();

    console.log(`Verifying [...${value2.substring(value2.length - 6)}] ...`);

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

    const result = await stamper.verify(root || hash, account);
    if (!result.stamped) {
      console.log(`${target} verification failure`);
      return { stamped: false, stamps: [] };
    }
    console.log(target, 'verification OK', result);

    if (result.stamps[0].whostamped !== account) {
      console.log(`step2 verification failure: result.whostamped ${result.stamps[0].whostamped} vs defaultAccount ${account}`);
      return { stamped: false, stamps: [] };
    }

    result.stamps[0].contract = process.env.CONTRACT_ADDRESS;

    if (!root) return result;

    // Reconstruccion del Tree
    const tree = hh.makeTree(leaves);
    result.stamps[0].tree = {leave: hash, root: root, algo: hh.ALGO};

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

module.exports = {
  verify: verify,
};
