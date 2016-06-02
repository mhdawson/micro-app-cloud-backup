// Copyright 2016 the project authors as listed in the AUTHORS file.
// All rights reserved. Use of this source code is governed by the
// license that can be found in the LICENSE file.
const fs = require('fs');
const path = require('path');
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
    frameButtons.push('<td><button id="dockerButton" type="button" onclick="showPage(\'dockerWrapper\');">Docker</button></td>');
    frameButtons.push('<td><button id="uploadDirsButton" type="button" onclick="showPage(\'uploadDirs\');">Upload Dirs</button></td>');
    frameButtons.push('<td><button id="downlaodDirsButton" type="button" onclick="showPage(\'downloadDirs\');">Download Dirs</button></td>');
    frameButtons.push('<td><button id="eventlogButton" type="button" onclick="showPage(\'eventLog\');">EventLog</button></td>');
    var buttons = '<tr height=' + BUTTON_ROW_SIZE + 'px">' + frameButtons.join('') + '</tr>';

    var frames = new Array();
    var pages = new Array();
    var pages = new Array();
    frames.push('<div id="dockerWrapper" style="width=100%;overflow:auto;font-size:11px;display:none">' +
                '<div id="docker" style="width=100%;overflow:auto;font-size:11px"></div>' +
                '<button onclick="saveDockerList()">Save</button>' +
                '</div> ');
    frames.push('<div id="uploadDirs" style="width=100%;overflow:auto;font-size:11px;display:none"></div>');
    frames.push('<div id="downloadDirs" style="width=100%;overflow:auto;font-size:11px;display:none"></div>');
    frames.push('<div id="eventLog" style="width=100%;overflow:auto;font-size:11px;display:none"></div>');
    pages.push('dockerWrapper');
    pages.push('uploadDirs');
    pages.push('downloadDirs');
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

  var removeBlackList = function(list) {
    if (config.blacklist) {
      for (var i = 0; i < config.blacklist.length; i++) {
        for (var j = 0; j < list.length; j++) {
          if(config.blacklist[i] === list[j]) {
            list.splice(j,1);
            j--;
          }
        }
      }
    }
  }


  eventSocket.on('connection', function(ioclient) {
    eventSocket.to(ioclient.id).emit('clearLog');
    lineReader = readline.createInterface({
      input: fs.createReadStream(eventLog.getLogFileName(Server.config))
    });
    lineReader.on('line', function(line) {
      eventSocket.to(ioclient.id).emit('eventLog', line);
    });


    var eventLogListener = function(message) {
      eventSocket.to(ioclient.id).emit('eventLog', message);
    }
    eventLog.addListener(eventLogListener);

    eventSocket.on('disconnect', function () {
      eventLog.removeListenter(eventLogListener);
    });

    ioclient.on('dockerListRequest', function() {
        dockBackend.dockerList(config, eventLog, function(dockerList) {
        var imageFile = path.join(__dirname,'imageList.json');
        var enabled = { images: []};
        if (fs.existsSync(imageFile)) {
          enabled = JSON.parse(fs.readFileSync(imageFile));
        }
        var docklist = new Array();
        var counter = 0;

        // remove entries from the blacklist
        removeBlackList(dockerList);

        for (var i = 0; i < dockerList.length; i++) {
          var primaryName = dockerList[i];
          var checked = '';
          for (var j = 0; j < enabled.images.length; j++) {
            if (enabled.images[j] === primaryName) {
              checked = 'checked';
              break;
            }
          }
          docklist.push('<input type="checkbox" id="docker' + counter + '" value="' + primaryName + '" ' + checked + '>' + primaryName + '<br>'); 
          counter++;
        }
        eventSocket.emit('dockerList', docklist.join('')); 
      }); 
    });


    ioclient.on('dockerListSave', function(enabled) {
      removeBlackList(enabled);
      var imageList = { images: enabled };
      fs.writeFileSync(path.join(__dirname,'imageList.json'), JSON.stringify(imageList, null, 2));
    });

  });

  dockBackend.start(config, eventLog);
  eventLog.logMessage(config, 'backend started', eventLog.LOG_INFO);
};


if (require.main === module) {
  var microAppFramework = require('micro-app-framework');
  microAppFramework(path.join(__dirname), Server);
}

module.exports = Server;
