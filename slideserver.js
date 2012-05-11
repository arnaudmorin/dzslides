#!/usr/bin/env node
// Open socket
var io = require('socket.io').listen(80);
io.set('log level', 1); // reduce logging

var debug = true;

// Store the clients already connected in an array
var socketArray = new Array();

// superConnectionID will be the guy controlling the presentation
var superConnectionID = null;

// Initiate IDs
var nextID = Date.now();

// Wait for connection
io.sockets.on('connection', function(socket){
    // If this is the first client connecting, he will be the controlling guy
    if (socketArray.length == 0){
        superConnectionID = nextID;
    }
    
    // Store this client
    socketArray.push(socket);
    
    // Set ID
    socket.clientID = nextID;
    socket.login = "unknown";
    
    // Compute next ID
    nextID++;
    
    // And your ID is ...
    var msg = {type: 'id', id: socket.clientID};
    socket.send(JSON.stringify(msg));

    if (debug) console.log("New client: " + msg.id);
    
    // Wait for message from client
    socket.on('message', function(message) {
        // Process messages
        var sendToClients = false;
        var msg = JSON.parse(message);

        if (debug) console.log(socket.login + "(" + msg.id + ") > " + msg.data);

        // If this is a message to ask to be presenter
        if (msg.data == "MASTER")
            superConnectionID = msg.id;

        // If this is the controlling guy
        if (msg.id == superConnectionID)
            sendToClients = true;

        // If this is a message to get clients list
        if (msg.data == "LIST"){
            sendList();
            sendToClients = false;
        }

        if (msg.data.login){
            if (debug) console.log("Update login for " + msg.id + " to " + msg.data.login);
            socket.login = msg.data.login;
            sendList();
            sendToClients = false;
        }


        // Convert the message back to JSON and send it.
        if (sendToClients) {
            if (debug) console.log("        This message is from MASTER! It's important! Send it back to all clients");
            msg = {type: 'data', data: msg.data};
            var msgString = JSON.stringify(msg);
            // Send to all clients, controlling guy included
            for(i=0;i<socketArray.length;i++){
                socketArray[i].send(msgString);
            }
        }
    });

    socket.on('disconnect', function(){
        // Remove this client from array
        for(i=0;i<socketArray.length;i++){
            if (socketArray[i].clientID == socket.clientID)
                socketArray.splice(i,1);
        }
        sendList();
    });
});

function sendList(){
    var list = new Array();
    for(i=0;i<socketArray.length;i++){
        list[i] = socketArray[i].login;
    }
    msg = {type: 'list', data: "LIST", list: list};
    var msgString = JSON.stringify(msg);
    for(i=0;i<socketArray.length;i++){
      socketArray[i].send(msgString);
    }
    if (debug) console.log("List sent: " + list);
}
