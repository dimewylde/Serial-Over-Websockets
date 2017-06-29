"use strict";
process.title = 'CCS Serial Over Websocket';
var conf = require('./conf.json');
var webSocketServer = require('websocket').server;
var http = require('http');
// previous messages
var history = [ ];
// list of currently connected clients
var clients = [ ];
///variables used to send serial log on a websocket
var serialport = require("serialport"); 
var fs = require('fs');
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:' + conf.webSocketsServerPort);
var serialPort = new serialport(conf.COMname, { baudrate: conf.baudRate, parser: serialport.parsers.readline("\n") });


//New test, new file
fs.writeFile(conf.filePath, "");

 /*Escaping input strings*/
function htmlEntities(str) 
{
  return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}


/* HTTP server*/
var server = http.createServer(function(request, response) {
  // http server to run simultaneously with the websocket server
});
server.listen(conf.webSocketsServerPort, function() {
  console.log(" Server is listening on port "+ conf.webSocketsServerPort);
});

/* WebSocket server*/

var wsServer = new webSocketServer({httpServer: server});

// This callback function is called every time someone tries to connect to the WebSocket server
wsServer.on('request', function(request) 
{

  // accept connection 
  var connection = request.accept(null, request.origin); 
  var index = clients.push(connection) - 1;
  var sockMsg = false;
  console.log(' Connection accepted.');

  // send back chat history
  if (history.length > 0) 
  {
    connection.sendUTF(JSON.stringify({ type: 'history', data: history} ));
  }

  // user sent some message
  connection.on('message', function(message) 
  {
    if (message.type === 'utf8') { // accept only text

     if (sockMsg === false) 
     {
        sockMsg = htmlEntities(message.utf8Data);
        console.log( "Message: " + sockMsg + ", length: " + sockMsg.length );
        var consLog = 'MSG: ' + sockMsg;
        if (sockMsg.length < 2 )
        {
          fs.appendFile(conf.filePath, "Socket sent: " + sockMsg + '\n');
          writeToPort(sockMsg);
        }

      } else 
      { 
        // log and broadcast the message
          console.log(' Received Message from '+ sockMsg + ': ' + message.utf8Data);

        //history of all sent messages
          var obj = {text: htmlEntities(message.utf8Data)};
          history.push(obj);
          history = history.slice(-5);
          console.log("history length: " + history.length);

        // broadcast msg
          var json = JSON.stringify({ type:'message', data: obj });
          for (var i=0; i < clients.length; i++) 
          {
                clients[i].sendUTF(json);
          }

        // user disconnected
        connection.on('close', function(connection) 
        {
          if (sockMsg !== false ) 
          {
            //console.log(" Peer "+ connection.remoteAddress + " disconnected.");
          }
        });
      }
    }
  });

  
});

//Send serial log over a websocket 
function openPort()
{
  serialPort.on("open", function () 
  {
        serialPort.on('data', function(data) 
        {
          writeToFile(data);
          sendSocket(data);
        });
  });
  
}

function writeToPort(data)
{
    serialPort.write(data);
}

function writeToFile(data)
{
  fs.appendFile(conf.filePath, data + '\n');
}

function sendSocket(data)
{
  ws.send(data);
}

openPort();
