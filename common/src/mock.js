'use strict';

const hh = require('./hashHelper.js');
const web3h = require('./web3Helper.js');
const assert = require('assert');

function randomHex() {
  return web3h.randomHex();
}

function randomHexArray(size) {
  const leaves = [];
  for (var i = 0; i < size; i++) leaves.push(randomHex());
  return leaves;
}

async function stampTree(dao, stamper, leaves) {
  assert(dao);
  assert(stamper);
  assert(leaves);

  const tree = await prepareTree(dao, leaves);

  const result = (await stamper.stamp(tree.getHexRoot()))[0];
  expect(result.status).toBe('stamped');

  await dbPostStampTree(dao, stamper, tree, result);

  return tree;
}

async function prepareTree(dao, leaves) {
  console.log(`inserting ${leaves.length} leaves into db ...`);
  await dao.insertRequests(leaves.map(x => ({ object_hash: x, force_single: 0 })));
  return hh.makeTree(leaves);
}

async function dbPostStampTree(dao, stamper, tree, stampResult) {
  const root = tree.getHexRoot();
  const leaves = tree.getLeaves().map(x => hh.bufferToHex(x));
  console.log(`updating ${leaves.length} leaves into db ...`);
  const rowsToUpdate = leaves.map(x => ({txHash: stampResult.txHash, block: stampResult.block, hash: x, treeRoot: root}));
  await dao.updateStampResult(stamper.netId, stamper.contractAddress, stamper.defaultAccount, rowsToUpdate);
}

module.exports = {
  randomHex: randomHex,
  randomHexArray: randomHexArray,
  stampTree: stampTree,
  prepareTree: prepareTree,
  dbPostStampTree: dbPostStampTree,
};
