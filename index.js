// Require the framework and instantiate it
const fastify = require('fastify')({ logger: true })
var redis = require('redis');

const redis_client = redis.createClient(
  {
    password: 'redis',
    port: 6379,
    url: 'redis://redis'
  });

redis_client.on('connect', function () {
  console.log('connected');
});

fastify.post('/gateway-management', function (req, reply) {
  //var obj = JSON.parse(req.body)
  const { destinationCod, destinationName } = req.body.credentials;
  let libreria = null;
  let response = new Object()

  response.audit = req.body.audit

  redis_client.get(destinationCod, (err, gateway) => {
    //var t0 = performance.now();
    if (err) {
      response.result = { app: 'gp', status: '06', mensaje: `Error` };
      reply.send(200, response)
    }
    if (gateway) {
      if (gateway === destinationName) {
        try {
          libreria = require('./gateways/' + gateway)
          libreria.cliente(req.body, transactionId('GM-')).then((respuesta) => {
            //var t1 = performance.now();
            response.result = respuesta;
            reply.send(200, response)
          });
        } catch (error) {
          response.result = { app: 'gp', status: '99', mensaje: `Error : ${error}` };
          reply.send(500, response)
        }
      } else {
        response.result = { app: 'gp', status: '03', mensaje: `No Existe el destino con nombre : ${destinationName}` };
        reply.send(500, response)
      }
    } else {
      response.result = { app: 'gp', status: '04', mensaje: `No Existe el destino con codigo : ${destinationCod}` };
      reply.send(500, response)
    }
  });
});

// Run the server!
const start = async () => {
  try {
    await fastify.listen(8080,'0.0.0.0')
    fastify.log.info(`server listening on ${fastify.server.address().port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
