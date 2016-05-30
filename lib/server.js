// Copyright 2016 the project authors as listed in the AUTHORS file.
// All rights reserved. Use of this source code is governed by the
// license that can be found in the LICENSE file.
const fs = require('fs');
const socketio = require('socket.io');
const dockBackend = require('./dock-backend.js');
const eventLog = require('./eventLog.js');
const readline = require('readline');
const eventLogTag = 'DOCKER';

const PAGE_WIDTH = 450;
const PAGE_HEIGHT = 300;
const BUTTON_ROW_SIZE = 15;

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

    // setup the buttons
    var frameButtons = new Array();
    frameButtons.push('<td><button id="dockerButton" type="button" onclick="showPage(\'docker\');">Docker</button></td>');
    frameButtons.push('<td><button id="dirsButton" type="button" onclick="showPage(\'dirs\');">Dirs</button></td>');
    frameButtons.push('<td><button id="eventlogButton" type="button" onclick="showPage(\'eventLog\');">EventLog</button></td>');
    var buttons = '<tr height=' + BUTTON_ROW_SIZE + 'px">' + frameButtons.join('') + '</tr>';

    var frames = new Array();
    var pages = new Array();
    var pages = new Array();
    frames.push('<div id="docker" style="width=100%;overflow:auto;font-size:11px"></div>');
    frames.push('<div id="dirs" style="width=100%;overflow:auto;font-size:11px"></div>');
    frames.push('<div id="eventLog" style="width=100%;overflow:auto;font-size:11px"></div>');
    pages.push('docker');
    pages.push('dirs');
    pages.push('eventLog');
    var framesContent = '<tr><td>' + frames.join('\n') + '</td></tr>';

    replacements = [{ 'key': '<DASHBOARD TITLE>', 'value': config.title },
                    { 'key': '<UNIQUE_WINDOW_ID>', 'value': config.title },
                    { 'key': '<PAGE_WIDTH>', 'value': PAGE_WIDTH },
                    { 'key': '<PAGE_HEIGHT>', 'value': PAGE_HEIGHT },
                    { 'key': '<BUTTONS>', 'value': buttons },
                    { 'key': '<FRAMES>', 'value': framesContent },
                    { 'key': '<PAGES>', 'value': 'var pages = [\'' + pages.join('\',\'') + '\'];'}];

  }
  return replacements;
}


Server.handleSupportingPages = function(request, response) {
  // ok now server the appropriate page based on the request type
  return false;
};


Server.startServer = function(server) {
  var config = Server.config;

  eventSocket = socketio.listen(server);
  eventSocket.on('connection', function(ioclient) {
    eventSocket.to(ioclient.id).emit('clearLog');
    lineReader = readline.createInterface({
      input: fs.createReadStream(eventLog.getLogFileName(Server.config))
    });
    lineReader.on('line', function(line) {
      eventSocket.to(ioclient.id).emit('eventLog', line);
    });

    var eventLogListener = function() {
      eventSocket.to(ioclient.id).emit('eventLog', line);
    }

    eventLog.addListener(eventLogListener);
    eventSocket.on('disconnect', function () {
      eventLog.removeListenter(eventLogListener);
    });
  });

  eventSocket.on('dockerListRequest', function() {
    dockBackend.dockerList(Server.config, eventLog, function(dockerList) {
      eventSocket.emit('dockerList', dockerList); 
    }); 
  });

  dockBackend.start(config, eventLog);
  eventLog.logMessage(config, 'backend started', eventLog.LOG_INFO);
};


if (require.main === module) {
  var path = require('path');
  var microAppFramework = require('micro-app-framework');
  microAppFramework(path.join(__dirname), Server);
}

module.exports = Server;
