'use strict';

// https://medium.com/coinmonks/compiling-and-deploying-ethereum-smart-contracts-with-pure-javascript-4bee3bfe99bb

require('dotenv').config();
const fs = require('fs-extra');
const solc = require('solc');
const path = require('path');
const assert = require('assert');

console.log('process.env.CONTRACTS_BUILD_PATH', process.env.CONTRACTS_BUILD_PATH);
console.log('process.env.CONTRACTS_SRC_PATH', process.env.CONTRACTS_SRC_PATH);

const buildPath = process.env.CONTRACTS_BUILD_PATH;
const scrPath = process.env.CONTRACTS_SRC_PATH;

async function buildSources() {
  const sources = {};
  const files = fs.readdirSync(scrPath);
  assert(files[0], 'sources not found');

  files.forEach(file => {
    const fullPath = path.resolve(scrPath, file);
    sources[file] = {
      content: fs.readFileSync(fullPath, 'utf8'),
    };
  });

  return sources;
}

async function compileContracts() {
  const input = {
    language: 'Solidity',
    sources: await buildSources(),
    settings: {
      outputSelection: {
        '*': {
          '*': [ 'abi', 'evm.bytecode' ],
        },
      },
    },
  };

  console.log('solc version:', solc.semver());

  const result = JSON.parse(solc.compile(JSON.stringify(input)));

  if (result.errors) {
    console.log(result.errors);
    return;
  }

  const contracts = result.contracts;

  console.log(contracts);
  // assert(contracts.length > 0, "empty contracts");

  for (var contract in contracts) {
    for (var name in contracts[contract]) {
      const full = path.resolve(buildPath, `${name}.compiled.json`);
      const abi = path.resolve(buildPath, `${name}.abi.json`);
      console.log('writing', full, '...');
      fs.outputJsonSync(full, contracts[contract][name], { spaces: 2 });
      console.log('writing', abi, '...');
      fs.outputJsonSync(abi, contracts[contract][name].abi, { spaces: 2 });
    }
  }
  console.log('compiling OK !!!');
}

compileContracts();
