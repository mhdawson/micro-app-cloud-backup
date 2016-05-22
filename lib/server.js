// Copyright 2016 the project authors as listed in the AUTHORS file.
// All rights reserved. Use of this source code is governed by the
// license that can be found in the LICENSE file.
const socketio = require('socket.io');
const dockBackend = require('./dock-backend.js');
const eventLog = require('./eventLog.js');
const eventLogTag = 'DOCKER';

// this is filled in later as the socket io connection is established
var eventSocket;


///////////////////////////////////////////////
// micro-app framework methods
///////////////////////////////////////////////
var Server = function() {
}

Server.getDefaults = function() {
  return { 'title': 'Cloud Backup Console' };
}


var replacements;
Server.getTemplateReplacments = function() {
  if (replacements === undefined) {
    var config = Server.config;
    replacements = [{ 'key': '<DASHBOARD TITLE>', 'value': config.title },
                    { 'key': '<UNIQUE_WINDOW_ID>', 'value': config.title },
                    { 'key': '<PAGE_WIDTH>', 'value': PAGE_WIDTH },
                    { 'key': '<PAGE_HEIGHT>', 'value': PAGE_HEIGHT }];

  }
  return replacements;
}


Server.handleSupportingPages = function(request, response) {
  // ok now server the appropriate page base on the request type
  return false;
};


Server.startServer = function(server) {
  var config = Server.config;

  eventSocket = socketio.listen(server);
  eventSocket.on('connection', function(ioclient) {
    for (key in latestData) {
      if (key != newPictureTopic) {
         eventSocket.to(ioclient.id).emit('message', key + ":" + latestData[key]);
      }
    }

    ioclient.on('message', function(event) {
    });
  });

  dockBackend.start(config, eventLog);
  console.log('backend started');
};


if (require.main === module) {
  var path = require('path');
  var microAppFramework = require('micro-app-framework');
  microAppFramework(path.join(__dirname), Server);
}

module.exports = Server;
