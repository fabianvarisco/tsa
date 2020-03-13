'use strict';

// https://github.com/miguelmota/merkletreejs/blob/master/dist/index.js

const crypto = require('crypto');
const { MerkleTree } = require('merkletreejs');

const ALGO = 'sha256';

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

module.exports = {
  ALGO: ALGO,
  digester: digester,
  bufferToHex: bufferToHex,
  hexToBuffer: hexToBuffer,
  makeTree: makeTree,
};
