//Configuración de Web
const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);
let fs = require('fs');
//Configuración de drone
var PORT = 8889;
var HOST = '192.168.10.1';
const dgram = require('dgram');
const client = dgram.createSocket('udp4').bind(8001);

//Configuración para recibir data de drone
const clientState = dgram.createSocket('udp4').bind(8890);

//Función init()
const init = () => {

// Conexión a sitio web *Escuchar comandos*
io.on('connection', socket => {

  //Guardar modelo
  socket.on('save-model', function(model){
    console.log("Modelo Guardado")
    fs.writeFile("./model.json", model, function(err) {
      if (err) {
        console.log(err);
      }
    });
  });

  //Cargar modelo
  socket.on('load-model', function(model){
    fs.readFile("./model.json", {encoding: 'utf8'}, function(err, model){
      if (err) {
        console.log(err);
        console.log("No model to load.")
        model = null;
      }
      socket.emit('receive-model', model);
    });
  });

  //Socket para recibir comando y enviarlo a drone
  socket.on('command', command => {
    middlewareCommands(command)
  });

  //Conexión a drone para actuar como cliente y recibir respuesta de cada comando
  client.on('message', (msg,info) => {
    console.log('Data from tello: ' + msg.toString());
  });	

  //Función para recibir data de drone y enviarla hacia frontend
  clientState.on('message', (msg,info) => {
    const fixedData = parseState(msg.toString());
    socket.emit('state', fixedData)
  });
    
  //Respuesta de recibido a frontend
  socket.emit('status', 'CONNECTED');
});
}

//Enviar mensaje final a drone
const sendCommandDrone = (command) => {
  console.log("Se envio comando al drone Exitosamente!")
  client.send(command, 0, command.length, PORT, HOST, function(err, bytes) {
    if (err) 
    throw err;
  });
}

//Función Middleware que define que comando se envia al drone
const middlewareCommands = (command) => {
  switch(command) {
    case 'quit':
	    client.close();
    break;
    case 'stand by':
      console.log("Waiting for commands!")
    break;
    case 'init':
      sendCommandDrone('command')
    break;
    case 'take off':
      sendCommandDrone('takeoff')
    break;
    case 'land':
      sendCommandDrone('land')
    break;
    case 'up':
      sendCommandDrone('up 60')
    break;
    case 'down':
    sendCommandDrone('down 60')
    break;
    case 'left':
    sendCommandDrone('left 60')
    break;
    case 'right':
    sendCommandDrone('right 60')
    break;
    case 'forward':
    sendCommandDrone('forward 60')
    break;
    case 'back':
    sendCommandDrone('back 60')
    break;
    case 'emergency':
    sendCommandDrone('emergency')
    break;
    default:
      console.log("No one commnad was detected")
    break;
	}
}

//Función para arreglar JSON
function parseState(state) {
  return state
    .split(';')
    .map(x => x.split(':'))
    .reduce((data, [key, value]) => {
      data[key] = value;
      return data;
    }, {});
}

http.listen(6767, () => {
  console.log('Socket io server up and running');
});

middlewareCommands('init')
init()