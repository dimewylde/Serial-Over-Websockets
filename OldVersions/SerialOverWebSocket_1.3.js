////v1.3//////

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
var obj = {text: htmlEntities(message.utf8Data)};


//Opening serial port

var serialPort = new serialport(conf.COMname, { baudrate: conf.baudRate, parser: serialport.parsers.readline("\n")}, function (err) 
  {
    if (err) 
    {
      console.log('\nError: ' + err.message + " , port might be already in use by another application\n");
    }
  });

//Overwrite or create new file
fs.writeFile(conf.filePath, "");


// http server to run simultaneously with the websocket server
var server = http.createServer(function(request, response) {});

server.listen(conf.webSocketsServerPort, function() 
{
  console.log(" Server is listening on port "+ conf.webSocketsServerPort);
}
);

/* Creation of WebSocket server*/
var wsServer = new webSocketServer({httpServer: server});

// This callback function is called every time someone tries to connect to the WebSocket server
wsServer.on('request', function(request) 
{

  // accept connection 
  var connection = request.accept(null, request.origin); 
  var index = clients.push(connection) - 1;
  var sockMsg = false;
  console.log('.Connection accepted.');
  broadcastMsg(obj, clients[]);

  // received message
  connection.on('message', function(message) 
  {
    if (message.type === 'utf8') { // accept only text

     if (sockMsg === false) 
     {
        sockMsg = htmlEntities(message.utf8Data);
        console.log( "Message: " + sockMsg + ", length: " + sockMsg.length );

        if (sockMsg.length < 2 )
        {
          writeToFile("Socket sent: " + sockMsg);

          if (serialPort.isOpen())
          {
              writeToPort(sockMsg);

          }else
          {

              console.log("\nCan't write to serial device, \nport is closed or being used by another application\n");
              sendSocket("\nTest Failed, can't communicate with serial port\n");
              //Cleaning history array
              history = [ ];

          }
          
        }

      } else 
      { 
        // log and broadcast the message

        broadcastMsg(obj, clients[]);

        //history of all sent messages
          
          history.push(obj);
          history = history.slice(-5);
          console.log("history length: " + history.length);
          
        

        // user disconnected
        connection.on('close', function(connection) 
        {
          if (sockMsg !== false ) 
          {
            // broadcast msg to all connected clients
            
          }
        });
      }
    }
  });

  
});
//Send serial logs
openPort();


//Escaping input strings
function broadcastMsg(obj, arr[])
{
  console.log("Broadcasting...");
  var json = JSON.stringify({ type:'message', data: obj });
  for (var i=0; i < arr.length; i++) 
  {
      arr[i].sendUTF(json);
  }
}

function htmlEntities(str) 
{
  return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
//Send serial log over a websocket 
function openPort()
{

  serialPort.on("open", function () 
  {

        console.log("Opening Serial Port");
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



