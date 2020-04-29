'use strict';

require('dotenv').config();
const Stamper = require('./Stamper.js');
const hh = require('./hashHelper.js');
const mock = require('./mock.js');
const dao = require('../../db/src/stampRequestDAO.js');

const TIMEOUT = 200000;

beforeAll(async() => {
  await dao.initPool();
  await dao.dbTest();
});

test('stamp a tree and verify all leaves', async() => {
  const TREE_LEAVES_QUANTITY = 10;
  const leaves = mock.randomHexArray(TREE_LEAVES_QUANTITY);

  var stamper = await Stamper.build();

  const tree = await mock.stampTree(dao, stamper, leaves);

  // merkletreejs proof verification
  const treeResult = [];
  for (var leave of leaves) treeResult.push(await stamper.treeVerify(leave));

  expect(treeResult).toHaveLength(TREE_LEAVES_QUANTITY);
  expect(treeResult[0]).toHaveProperty('stamps');
  expect(treeResult[0].stamps).toHaveLength(1);
  expect(treeResult[0].stamps[0]).toHaveProperty('tree');
  expect(treeResult[0].stamps[0].tree).toHaveProperty('leavesquantity', TREE_LEAVES_QUANTITY);

  console.log(treeResult[0].stamps[0].tree);

  console.log('verifying results ...');
  const resultTable = [];
  treeResult.forEach(function(x) {
    expect(x.stamped).toBeTruthy();
    var t = x.stamps[0].tree;
    resultTable.push({leave: t.leave, proofSize: t.proof.length});
  });
  expect(resultTable).toHaveLength(treeResult.length);

  console.table(resultTable.sort((a, b) => a.leave > b.leave ? 1 : -1));

  // proof verification
  treeResult.forEach(function(x) {
    const t = x.stamps[0].tree;
    expect(tree.getHexRoot()).toBe(hh.makeHexRoot(t.leave, t.proof, process.env.HASH_ALGORITHM));
    console.log(tree.toString());
  });
}, TIMEOUT);
