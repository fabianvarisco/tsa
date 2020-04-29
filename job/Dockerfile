FROM node:12.16.1-buster-slim

RUN apt-get update && apt-get -y upgrade  && apt-get install -y alien libaio1 wget
RUN wget http://yum.oracle.com/repo/OracleLinux/OL7/oracle/instantclient/x86_64/getPackage/oracle-instantclient19.5-basiclite-19.5.0.0.0-1.x86_64.rpm
RUN alien -i --scripts oracle-instantclient*.rpm
RUN rm -f oracle-instantclient19.5*.rpm && apt-get -y autoremove && apt-get -y clean

COPY  ./job/node_modules ./job/node_modules
COPY  ./job/src/job.js ./job/src/job.js
COPY  ./job/.env ./.env

COPY  ./contract/abi.json ./contract/abi.json

COPY  ./common/node_modules ./common/node_modules
COPY  ./common/src/hashHelper.js ./common/src/hashHelper.js
COPY  ./common/src/web3Helper.js ./common/src/web3Helper.js
COPY  ./common/src/stamperHelper.js ./common/src/stamperHelper.js
COPY  ./common/.env ./common/.env

COPY  ./db/node_modules ./db/node_modules
COPY  ./db/src/stampRequestDAO.js ./db/src/stampRequestDAO.js

ENV LD_LIBRARY_PATH=/usr/lib/oracle/19.5/client64/lib
CMD [ "node","job/src/job.js" ]
