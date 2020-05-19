// Require the framework and instantiate it
const fastify = require('fastify')({ logger: true })
var redis = require('redis');
var Stomp = require('stomp-client');
var stompClient = new Stomp('89.40.10.246', 61613, 'user', 'pass');
stompClient.connect(function (sessionId) {
  console.log("A CONECTED STOMP...!!!");
});
const redis_client = redis.createClient(
  {
    password: 'redis',
    port: 6379,
    url: 'redis://redis'
  });

redis_client.on('connect', function () {
  console.log('conect to redis...');
});

// Stom
var destination = '/queue/proveedores';//resolutor
console.log("start...");
var stompClient = new Stomp('89.40.10.246', 61613, 'user', 'pass');
stompClient.connect(function (sessionId) {
  console.log("A CONECTED...!!!");
  stompClient.subscribe(destination, function (body, headers) {
    console.log("A message...!!! : " + body);
    //replace artificio
    let newbody = body.replace("%", "'");
    console.log("Body...!!! : " + newbody);
    //convert to json
    let bodyJson = JSON.parse(newbody);
    //registro redis
    let jsonOp = {};
    if (bodyJson.script) {
      jsonOp.script = bodyJson.script
    }
    if (bodyJson.username) {
      jsonOp.username = bodyJson.username
    }
    if (bodyJson.password) {
      jsonOp.password = bodyJson.password
    }
    clientRedis.hmset(bodyJson.id, jsonOp);
    console.log("Registro redis!!!")
  });
});

fastify.post('/gateway-management', function (req, reply) {
  //var obj = JSON.parse(req.body)  
  console.log('conect to gateway-management... : ', req.body);

  const { destinationCod, destinationName } = req.body.credentials;
  let response = new Object()

  response.audit = req.body.audit

  redis_client.hgetall(destinationCod, function (err, gateway) {
    //var t0 = performance.now();
    console.log('conect to gateway-management...');
    if (err) {
      console.log('err...');
      response.result = { app: 'gp', status: '06', mensaje: `Error` };
      reply.send(200, response)
    }
    if (gateway) {
      console.log('gateway...');
      try {
        console.log('Encontro objeto redis...');

        //consultamos el redis con key (rest-banbif-client)
        let script =  gateway.script;
        
        //aplicamos Eval al body
        script= script.replace("$body$",req.body);
        script= script.replace("$transactionId$",1);
        let res = eval(script);
        console.log("String : ", res);
        response.result = res;
        reply.code(200).send(response)
        console.log('Termino...');

      } catch (error) {
        console.log('error...libreria.cliente', error);
        response.result = { app: 'gp', status: '99', mensaje: `Error : ${error}` };
        reply.code(500).send(response)
      }
    } else {
      response.result = { app: 'gp', status: '04', mensaje: `No Existe el destino con codigo : ${destinationCod}` };
      reply.code(500).send(response)
    }
  });
}).get('/emit', function (req, reply) {
  //stompClient.publish(destination, "appId");
  stompClient.publish(destination, 'function sumar(a, b){return a + b;}sumar(5, 9);');
  //stompClient.publish(destination, '{ "id": "rest-banbif-client", "script": "const axios=require(´axios´),qs=require(´qs´);function cliente(a,t){var e=new Object,{url:s,timeout:n}=a.credentials;a.dataMapping[0].data=qs.stringify(a.dataMapping[0].data),a.dataMapping[0].timeout=n,a.dataMapping[0].url=s;try{const t=axios(a.dataMapping[0]).data;e.status=´00´,e.mensaje=t}catch(a){e.status=ERROR´,void 0===a.response?e.mensaje=a.message:e.mensaje=a.response.data}return e}cliente($body$,$transactionId$);" }');

  reply.send({ result: 'emit-exitoso' })
});

// Run the server!
const start = async () => {
  try {
    await fastify.listen(8080, '0.0.0.0')
    fastify.log.info(`server listening on ${fastify.server.address().port}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
