"use strict";
process.title = 'CCS Serial Over Websocket';


var webSocketsServerPort = 1337;
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
const ws = new WebSocket('ws://localhost:1337');
var filePath = "C:\\Users\\YourUser\\YourFolder\\file.txt";
var serialPort = new serialport("COM9", { baudrate: 56700, parser: serialport.parsers.readline("\n") });

fs.writeFile(filePath, "");

///

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
server.listen(webSocketsServerPort, function() {
  console.log(" Server is listening on port "+ webSocketsServerPort);
});

/* WebSocket server*/

var wsServer = new webSocketServer({httpServer: server});


// Attempt to connect to the websocket server
wsServer.on('request', function(request) 
{

  // accept connection 
  var connection = request.accept(null, request.origin); 
  var index = clients.push(connection) - 1;
  var sockMsg = false;
  console.log(' Connection accepted.');

  // send back messages history
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
        // remember msg
        sockMsg = htmlEntities(message.utf8Data);
        console.log( "Message: " + sockMsg + ", length: " + sockMsg.length );

        var consLog = 'MSG: ' + sockMsg;
        if (sockMsg.length < 2 )
        {
          fs.appendFile(filePath, "Socket sent: " + sockMsg + '\n');
          serialPort.write(sockMsg);
        }
        

      } else 
      { 
        // log and broadcast the message
          console.log(' Received Message from '+ sockMsg + ': ' + message.utf8Data);

        //history of all sent messages
          var obj = {text: htmlEntities(message.utf8Data)};
          history.push(obj);
          history = history.slice(-3);
          console.log("history length: " + history.length);

        // broadcast msg so listener can receive it
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
  serialPort.on("open", function () {
  serialPort.on('data', function(data) {
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
  fs.appendFile(filePath, data + '\n');
}

function sendSocket(data)
{
  ws.send(data);
}


openPort();


//Send WebSocket Serial