'use strict';

// https://github.com/miguelmota/merkletreejs/blob/master/dist/index.js

const crypto = require('crypto');
const { MerkleTree } = require('merkletreejs');

const ALGO = process.env.HASH_ALGORITHM || 'sha256';

const treeOptions = {
  duplicateOdd: false,
  hashLeaves: false,
  sort: true, // If set to `true`, the leaves and hashing pairs will be sorted.
};

function digester(data) {
  return crypto.createHash(ALGO).update(data).digest();
}

function bufferToHex(data) {
  return '0x' + data.toString('hex');
}

function hexToBuffer(data) {
  return Buffer.from(data.replace(/^0x/, ''), 'hex');
}

function makeTree(leaves) {
  try {
    return new MerkleTree(leaves, digester, treeOptions);
  } catch (err) {
    console.error(err);
    throw err;
  }
}

function makeHexRoot(leave, proof, algo) {
  var root = hexToBuffer(leave);
  for (var item of proof) {
    const pairs = [];
    const data = hexToBuffer(item);
    if (Buffer.compare(root, data) === -1) {
      pairs.push(root, data);
    } else {
      pairs.push(data, root);
    }
    root = crypto.createHash(algo).update(Buffer.concat(pairs)).digest();
  }
  return bufferToHex(root);
}

module.exports = {
  ALGO: ALGO,
  digester: digester,
  bufferToHex: bufferToHex,
  hexToBuffer: hexToBuffer,
  makeTree: makeTree,
  makeHexRoot,
};
