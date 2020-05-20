// Require the framework and instantiate it
const fastify = require('fastify')({ logger: true })
var redis = require('redis');
var Stomp = require('stomp-client');
var stompClient = new Stomp('89.40.10.246', 61613, 'user', 'pass');
stompClient.connect(function (sessionId) {
  console.log("connect to stomp...");
});
const redis_client = redis.createClient(
  {
    password: 'redis',
    port: 6379,
    url: 'redis://redis'
  });

redis_client.on('connect', function () {
  console.log('connect to redis...');
});

// Stom
var destination = '/queue/proveedores';//resolutor
var stompClient = new Stomp('89.40.10.246', 61613, 'user', 'pass');
stompClient.connect(function (sessionId) {
  console.log("connect...!!!");
  stompClient.subscribe(destination, function (body, headers) {
    console.log("message...!!! : " + body);
    //replace artificio
    let newbody = body.replace("%", "'");
    console.log("body...!!! : " + newbody);
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
    console.log("registro redis!!!")
  });
});

fastify.post('/gateway-management', function (req, reply) {
  //var obj = JSON.parse(req.body)  
  console.log('IN_RequestApiRest_json : ', req.body);

  const { destinationCod, destinationName } = req.body.credentials;
  let response = new Object()

  response.audit = req.body.audit

  redis_client.hgetall(destinationCod, function (err, gateway) {
    if (err) {
      console.log('err...');
      response.result = { app: 'gp', status: '06', mensaje: `Error` };
      reply.send(200).send(response)
    }
    if (gateway) {
      console.log('gateway...');
      try {
        //consultamos el redis con key (rest-banbif-client)
        let script = gateway.script;
        //set credenciales        
        let data = req.body;
        if (data.dataMapping) {
          let dataString = JSON.stringify(data.dataMapping);
          dataString = dataString.replace("$username$", gateway.username);
          dataString = dataString.replace("$password$", gateway.password);
          data.dataMapping = JSON.parse(dataString);
        }        
        //aplicamos eval
        console.log("script : ", script);
        eval(script);
        //llamamos funcion del script
        cliente(data, 1).then((respuesta) => {
          response.result = respuesta;
          reply.code(200).send(response)
        });
        console.log('Termino...');
      } catch (error) {
        console.log('error...try', error);
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