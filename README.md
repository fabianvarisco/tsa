Para preparar el ambiente se requiere tener instalado nodejs 10.x y truffle

En el directorio del proyecto previamente a trabajar se deben instalar los modulos 
npm install

y luego un modulo extra requerido por Truffle/Hyperledger BESU para interactuar 

npm install --save @truffle/hdwallet-provider  


Para iniciar el uso de truffle sobre el proyecto

truffle compile

Para instalar en ganache

instalar e iniciar GANACHE --> ej: ./ganache-2.1.2-linux-x86_64.AppImage

desplegar smart contract en GANACHE

truffle migrate --network development

desplegar smart contract en nodo DEV 10.30.215.143

truffle migrate --network dev


# node oracle

## Oracle Instant Client

https://oracle.github.io/odpi/doc/installation.html#oracle-instant-client-zip

export LD_LIBRARY_PATH=/opt/oracle/instantclient_19_5

sudo apt-get install libaio1 libaio-dev


## Preparacion para el copiado de archivo en la imagen docker (Produccion)

#API
1- ejecutar 'npm install' en db
2- ejecutar 'npm install --only=prod' en common
3- ejecutar 'npm install --only=prod' en api
4- Copiar el dockerfile un nivel arriba, y ejecutar 'docker build -t tsa_api_image .'
5- prueba: 'docker run -it -p 3000:3000 --rm --name tsa_api_prueba tsa_api_image'

#UI
1- ejecutar 'npm install'
2- setear 'apiurl="http://10.30.215.144:3000"' o segun corresponda, en public/index.html
3- ejecutar 'npm run build'
4- ejecutar 'docker build -t tsa_ui_image .'
5- prueba: 'docker run -it -p 80:80 --rm --name tsa_ui_prueba tsa_ui_image'

#JOB
1- ejecutar 'npm install' en db
2- ejecutar 'npm install --only=prod' en common
3- ejecutar 'npm install --only=prod' en job
4- Copiar el dockerfile un nivel arriba, y ejecutar 'docker build -t tsa_job_image .'
5- prueba: 'docker run -it --rm --name tsa_job_prueba tsa_job_image'

## ---
