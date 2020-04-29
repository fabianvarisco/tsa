# Proyecto que ofrece funciones para

- generar hashes
- trabajar con Merkle Tree
- stampear y verificar invocando al smart contract `TSA2`

---

## Stamper

```js
const Stamper = require('./Stamper.js');

const stamper = await Stamper.build();

const result = (await stamper.stamp(hash))[0];
```

### Configuración

##### URL del servicio RPC del nodo Ethereum

```ini
PROVIDER_HOST=http://10.30.215.147:8089/
```

##### Contrato TSA2

Disponiendo del address y del abi.json del contrato:

```ini
CONTRACT_ADDRESS=0x32E6eC009435a7740eF0003Cb5d7De609B5AeD94
CONTRACT_ABI_PATH="../../contract/abi.json"
```

Disponiendo del json generado por un deploy efectuado con Truffle:

En este caso el address y el abi.json se obtienen desde el json generado por Truffle.

```ini
CONTRACT_TRUFFLE_DEPLOYED_PATH="../../contract/build/contracts/Stamper.json"
```

##### Account a utilizar para firmar txs

Disponiendo de la clave privada del account y su address:

```ini
ACCOUNT_ADDRESS=0x33E6d65f8Ad0398DA990337955F14014b96dd6e7
ACCOUNT_PKEY=0x3266b414b5f46741d39611a29f5fe73a63d52d12473a1b929719fcc26e5ec2bf
```

Disponiendo de un keystore v3 cifrado y su password:

```ini
GETH_ACCOUNT_JSON="/home/appserv/keystore/UTC--2020-04-28T20-33-40.321376056Z--0a391c83b64537a706a6f1d16aecd6a5f94fca0b"
GETH_ACCOUNT_PASSWORD="clave secreta"
```

Un keystore v3 cifrado se puede generar con el comando:

```bash
$ geth account new --datadir=<path to dir> --password=<path to txt file>
```

#### Algoritmo de hash

```ini
HASH_ALGORITHM=SHA3-256
```
