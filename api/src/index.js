import express          from 'express'
import cors             from 'cors'
import bodyParser       from 'body-parser'
import basicAuth        from 'express-basic-auth'

import 'dotenv/config'
const web3Helper = require("../../common/src/web3Helper.js")
const dao = require("../../db/src/stampRequestDAO.js")

var web3Config

const app = express()

const FORCE_SINGLE = 1

async function stamp(req, res, force_single = 0) {
    console.log( Date(), "Stamping", (force_single == 0 ? "single" : "tree"), req.body.hashes.join(', ') );

    if ( ! ("hashes" in req.body) )
    {
        res.status(422)
        res.send('No se incluyó la clave hashes en el cuerpo del POST')
        return
    }
    const leaves = req.body.hashes
    if ( ! Array.isArray(leaves))
    {
        res.status(422)
        res.send('La clave hashes debe ser un array')
        return
    }

    // ToDo, antes de insertar verificar en db
    try
    {
        const rowsToInsert = []
        for (var leave of leaves) rowsToInsert.push({ object_hash: leave , force_single: force_single });
        const insertedRows = await dao.insertRequests(rowsToInsert);
        if (insertedRows != rowsToInsert.length) console.log("rowsToInsert", rowsToInsert, "insertedRows", insertedRows); 
            //let   fullUrl             =   req.protocol + '://' + req.get('host')
        res.status(200).send('success')
    } catch (e) {
            console.error(e)
            res.status(500)
            res.send('Error interno. Chequee el log de la aplicación para más detalles')
    }
}

async function batchStamp(req, res, force_single = 0) {
    console.log( Date(), "Stamping", (force_single == 0 ? "single" : "tree"), " mode batch");


    const file = req.body;
    console.log(req.header)
    if ( ! ("files" in req.body) )
    {
        res.status(422)
        res.send('No se incluyó archivos en el cuerpo del POST')
        return
    }

    // ToDo, antes de insertar verificar en db
    try
    {

        let name = file.name
        console.log(name)

        res.status(200).send('success')
    } catch (e) {
            console.error(e)
            res.status(500)
            res.send('Error interno. Chequee el log de la aplicación para más detalles')
    }
}

async function setup() {
    /***************************************************/
    // Conexión al provider
    /***************************************************/


    web3Config = await web3Helper.setup()
    const pool = await dao.initPool();

    /***************************************************/
    // Setup CORS y Auth
    /***************************************************/

    // USE_CORS=0 para disablear
    const   useCors                     =   process.env.USE_CORS || 1
    if (useCors) app.use(cors())

    app.use(bodyParser.json())

    if ( process.env.API_USER && process.env.API_PASS ) {
        const     users                   =   {}
        users[process.env.API_USER]     =   process.env.API_PASS

        app.use(basicAuth({
            users: users,
            challenge: true
        }))
    } else {
        console.log("El servidor es PUBLICO")
    }

    /***************************************************/
    // API Endpoints
    /***************************************************/
    app.get('/wait1block', async (req, res) => {
        console.log( Date() + ": /wait1block" );

        try {
            let blockno = await web3Helper.wait1Block(web3Config.stamper)
            return res.json(
            {
            success:        true,
            blocknumber:    blockno
            }
        )
        } catch (e) {
            console.error( e )
            res.status( 500 )
            res.send( e )
        }
    })
    app.post('/stamp', async (req, res) => {
        console.log( Date() + ": /stamp " + req.body.hashes.join(', ') );

        if ( ! ("hashes" in req.body) )
        {
            res.status(422)
            res.send('No se incluyó la clave hashes en el cuerpo del POST')
            return
        }

        let     hashes                  =   req.body.hashes
        if ( ! Array.isArray(hashes))
        {
            res.status(422)
            res.send('La clave hashes debe ser un array')
            return
        }

        try
        {
            const result = await web3Helper.stamp(web3Config.stamper, hashes)
            //let   fullUrl             =   req.protocol + '://' + req.get('host')
            res.status(200).send('success')
        } catch (e) {
            console.error(e)
            res.status(500)
            res.send('Error interno. Chequee el log de la aplicación para más detalles')
        }
    })

    app.post('/singlestamp', async (req, res) => {
        console.log( Date() + ": /singletamp");
        stamp(req, res, FORCE_SINGLE)
    })

    app.post('/treestamp', async (req, res) => {
        console.log( Date() + ": /treestamp");
        stamp(req, res)
    })

    app.post('/batchstamp', async (req, res) => {
        console.log( Date() + ": /batchstamp");
        batchStamp(req, res)
    })

    app.get('/verify/:hash', async (req, res) => {
        console.log( Date() + ": /verify/:" + req.params.hash );
        var     value                   =   req.params.hash
        if ( ! value.startsWith('0x') )
            value = '0x' + value

        try {
            const info = await web3Helper.verify(web3Config.stamper, value)
            return res.json(info)
        } catch (e) {
            console.error(e)
            res.status(404)
            res.send("No existe el hash en la base de datos")
        } 
    })


    // app.get('/status/:txHash', async (req, res) => {
    //     try {
    //         let info = await web3.eth.getTransaction(req.params.txHash, (e, f) => {
    //             console.log(e)
    //             console.log(f)
    //         })
    //         console.log(info)
    //         res.send(info)
    //     } catch (e) {
    //         res.send(e)
    //     }
    // })

}


async function run() {
    await setup()
    const port = process.env.PORT ? process.env.PORT : 3000

    app.listen(port, () =>
        console.log(`TSA Api corriendo en ${port}!`),
    )
}


run()
