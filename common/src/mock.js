'use strict';

const hh = require('./hashHelper.js');
const web3 = require('web3');

function randomHex() {
  return web3.utils.randomHex(32);
}

function randomHexArray(size) {
  const leaves = [];
  for (var i = 0; i < size; i++) leaves.push(randomHex());
  return leaves;
}

async function stampTree(dao, stamper, leaves) {
  const tree = await prepareTree(dao, leaves);
  const root = tree.getHexRoot();

  const result = (await stamper.stamp([root]))[0];
  expect(result.status).toBe('stamped');

  console.log(`updating ${leaves.length} leaves into db ...`);
  const rowsToUpdate = leaves.map(x => ({txHash: result.txHash, block: result.block, hash: x, treeRoot: root}));
  await dao.updateStampResult(stamper.netId, stamper.address, stamper.from, rowsToUpdate);

  return {tree: tree, stampRootResult: result};
}

async function prepareTree(dao, leaves) {
  console.log(`inserting ${leaves.length} leaves into db ...`);
  await dao.insertRequests(leaves.map(x => ({ object_hash: x, force_single: 0 })));
  return hh.makeTree(leaves);
}

module.exports = {
  randomHex: randomHex,
  randomHexArray: randomHexArray,
  stampTree: stampTree,
  prepareTree: prepareTree,
};
