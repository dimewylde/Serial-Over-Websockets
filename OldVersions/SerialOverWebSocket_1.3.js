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
var json = "";
var msg = "";
var serialport = require("serialport"); 
var fs = require('fs');
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:' + conf.webSocketsServerPort);



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

  // received message
  connection.on('message', function(message) 
  {
    if (message.type === 'utf8') 
    { // accept only text

     
        sockMsg = htmlEntities(message.utf8Data);
        console.log( "Message: " + sockMsg + ", length: " + sockMsg.length );

        //history of all sent messages
        var obj = {text: htmlEntities(message.utf8Data)};
        history.push(obj);
        history = history.slice(-5);
        //concatenating every message in a single string to broadcast it
        msg += sockMsg + " ";
        
        

        if (sockMsg.length < 2 )
        {
          writeToFile("Socket sent: " + sockMsg);

          if (serialPort.isOpen())
          {
              writeToPort(sockMsg);

          }else
          {
              console.log("\nCan't write to serial device, \nport is closed or being used by another application\n");
              msg += "\nTest Failed, can't communicate with serial port\n";
              broadcastMsg(msg, clients);
              //Cleaning history array
              history = [ ];
              msg="";
          }
          
        }
        if(sockMsg.contains("Not enough"))
        {
            console.log("\nTest Failed. Transaction was not successful\n");
            msg += "\nTest Failed, Not enough credit\n";
            broadcastMsg(msg, clients);
            history = [ ];
            msg="";

        }

        console.log("history length: " + history.length + " history msgs: " + msg );
          
        // log and broadcast the message

        broadcastMsg(msg, clients);

        // user disconnected
        connection.on('close', function(connection) 
        {
          if (sockMsg !== false ) 
          {
            // broadcast msg to all connected clients
            
          }
        });
      
    }

  });

  
});
//Send serial logs
openPort();


//Escaping input strings
function broadcastMsg(msg, cli)
{
    console.log("Broadcasting...");

    for (var i=0; i < cli.length; i++) 
    {
        cli[i].sendUTF(msg);
      
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



