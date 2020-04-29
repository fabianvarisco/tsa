'use strict';

require('dotenv').config();
const mock = require('./mock.js');

test('Tree', () => {
  process.env.HASH_ALGORITHM = 'SHA3-256';
  const hh = require('./hashHelper.js');

  const TREE_LEAVES_QUANTITY = 100;
  const leaves = mock.randomHexArray(TREE_LEAVES_QUANTITY);
  const tree = hh.makeTree(leaves);

  expect(tree.isBitcoinTree).toBeFalsy();
  expect(tree.hashLeaves).toBeFalsy();
  expect(tree.sortLeaves).toBeTruthy();
  expect(tree.sortPairs).toBeTruthy();
  expect(tree.duplicateOdd).toBeFalsy();
  expect(leaves).toHaveLength(TREE_LEAVES_QUANTITY);
  const root = tree.getHexRoot();

  expect(tree.verify(tree.getHexProof(leaves[0]), leaves[0], root)).toBeTruthy();
  expect(tree.verify(tree.getHexProof(leaves[0]), leaves[0] + 'x', root)).toBeFalsy();

  const result = [];
  var proof, verified;
  for (var leave of leaves) {
    proof = tree.getHexProof(leave);
    expect([4, 7]).toContain(proof.length);
    verified = tree.verify(proof, leave, root);
    expect(verified).toBeTruthy();
    expect(root).toBe(hh.makeHexRoot(leave, proof, 'SHA3-256'));
    result.push({leave: leave, proofSize: proof.length, verified: verified});
  }
  console.table(result);

  console.log(tree.toString());

}, 100000);
