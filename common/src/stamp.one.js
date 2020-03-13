'use strict';

require('dotenv').config();
const assert = require('assert');
const Stamper = require('./Stamper.js');
const mock = require('./mock.js');

async function run() {
  try {
    var options = {};
    options = {
      address: '0x6657080bb2F7e879865724ebaf2DB9981b00a812', // Deployado en Geth
      // address: '0xf8b628Bd8B4200fE754DFF9F1412AA361A0EceC4', // Deployado en BESU x Fabian
      // address: '0x864F981C3895f37728b78FCb7F5C3d77A3f51E2E', Deployado en BESU por Gonzalo
      // addressPath: '/home/fvarisco/projects/tsa/contracts/build/Stamper.deployed.address',
      abiPath: '/home/fvarisco/projects/tsa/contracts/build/Stamper.abi.json',
      truffleDeployedPath: '/home/fvarisco/projects/tsa2/contract/build/contracts/Stamper.json'
    };
    const stamper = await Stamper.build(null, options);

    const hash = mock.randomHex();
    const result1 = (await stamper.stamp(hash, true))[0];
    console.log(result1);

    const objectCount = await stamper.getObjectCount(hash);
    console.log('getObjectCount(hash):', objectCount);

    const addresses = [stamper.from, stamper.web3.eth.defaultAccount];
    for (var a of addresses) {
      console.log(`getBlockNo(hash, ${a}):`, await stamper.getBlockNo(hash, a));
      console.log(`getStamperCount(${a}):`, await stamper.getStamperCount(a));
    };

    const result2 = (await stamper.stamp(hash, true))[0];
    console.log(result2);

    for (var i=0;;i++) {
      console.log(`getStamplistPos(${i}):`);
      try {
        const result3 = await stamper.getStamplistPos(i);
        console.log('>>', result3);
        const r0 = result3['0'];
        console.log(`>> getObjectCount([...${r0.substr(r0.length - 6)}])`, await stamper.getObjectCount(r0));
      } catch(err) {
        console.log(err);
        break;
      }
    };

    assert.equal(result2.status, 'already_stamped_by_this_TSA');

    const result3 = await stamper.verify(hashes);
    console.log(result2);

  } catch(e) {
    console.error(e);
  }
}

run();
