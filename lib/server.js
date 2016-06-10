// Copyright 2016 the project authors as listed in the AUTHORS file.
// All rights reserved. Use of this source code is governed by the
// license that can be found in the LICENSE file.

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const socketio = require('socket.io');
const crontab = require('node-crontab');
const googleAuth = require('google-auth-wrapper');
const gdriveWrapper = require('google-drive-wrapper');

const dockBackend = require('./dock-backend.js');
const eventLog = require('./eventLog.js');

const PAGE_WIDTH = 500;
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

  // used to ensure that docker images that are on the
  // blacklist cannot be backed up
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
      input: fs.createReadStream(eventLog.getLogFileName(config))
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

        // add info about gdrive directory
        docklist.push('gdrive Directory:' + config.gdriveDockDir + '<BR>');
        docklist.push('schedule:' + config.dockerSchedule + '<BR>');

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
          docklist.push('<input type="checkbox" id="docker' + counter +
                        '" value="' + primaryName + '" ' + checked + '>' +
                        primaryName + '<br>'); 
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

    ioclient.on('uploadList', function() {
      var uploadEntries = config.uploadDirs;
      var uploadEntriesArray = new Array();
      uploadEntriesArray.push('<table border="1">');
      uploadEntriesArray.push('<tr><th>Local Dir</th><th>Move To</th><th>gdrive Dir</th><th>schedule</th></tr>');
      if (uploadEntries) {
        for (var i = 0; i < uploadEntries.length; i++) {
          uploadEntriesArray.push('<tr><td>' + uploadEntries[i].localdir +'</td><td>' + uploadEntries[i].localdirDone + 
                                  '</td><td>' + uploadEntries[i].gdriveDir + '</td><td>' + uploadEntries[i].schedule + 
                                  '</td></tr>');
        }
      }
      uploadEntriesArray.push('</table>');

      eventSocket.emit('uploadEntries', uploadEntriesArray.join('')); 
    });

    ioclient.on('downloadList', function() {
      var downloadEntries = config.downloadDirs;
      var downloadEntriesArray = new Array();
      downloadEntriesArray.push('<table border="1">');
      downloadEntriesArray.push('<tr><th>gdrive Dir</th><th>Local Dir</th><th>schedule</th></tr>');
      if (downloadEntries) {
        for (var i = 0; i < downloadEntries.length; i++) {
          downloadEntriesArray.push('<tr><td>' + downloadEntries[i].gdriveDir +'</td><td>' + downloadEntries[i].localdir + 
                                    '</td><td>' + downloadEntries[i].schedule + 
                                    '</td></tr>');
        }
      }
      downloadEntriesArray.push('</table>');

      eventSocket.emit('downloadEntries', downloadEntriesArray.join('')); 
    });

  });


  // schedule the jobs to do the docker backups
  dockBackend.start(config, eventLog);

  // schedule the jobs to download from the configured directories
  var downloadEntries = Server.config.downloadDirs;
  if (downloadEntries) {
    for (var i = 0; i < downloadEntries.length; i++) {
      crontab.scheduleJob(downloadEntries[i].schedule, function(entry) {
        eventLog.logMessage(Server.config, 'DOWNLOAD:Starting download for:' + entry.gdriveDir, eventLog.LOG_INFO);
        googleAuth.execute(Server.config.clientSecretDir, Server.config.clientSecret, function(entry, auth, google) {
          var wrapper = new gdriveWrapper(auth, google, Server.config.encPassword);
          wrapper.downloadNewFiles(entry.gdriveDir, entry.localdir, function(err, targetFile) {
            if(err) {
              eventLog.logMessage(Server.config, 'DOWNLOAD:Failed to download file:' + targetFile + ':' + err, eventLog.LOG_ERROR);
            }
          });
        }.bind(undefined, entry));
      }.bind(undefined, downloadEntries[i]));
    }
  }

  // schedule the jobs to upload from the configured directories
  var uploadEntries = Server.config.uploadDirs;
  if (uploadEntries) {
    for (var i = 0; i < uploadEntries.length; i++) {
      crontab.scheduleJob(uploadEntries[i].schedule, function(entry) {
        eventLog.logMessage(Server.config, 'UPLOAD:Starting upload for:' + entry.localdir, eventLog.LOG_INFO);
        googleAuth.execute(Server.config.clientSecretDir, Server.config.clientSecret, function(entry, auth, google) {
          var wrapper = new gdriveWrapper(auth, google, Server.config.encPassword);
          wrapper.uploadNewFiles(entry.gdriveDir, entry.localdir, entry.localdirDone, function(err) {
            if(err) {
              eventLog.logMessage(Server.config, 'UPLOAD:Failed to upload file:' + err, eventLog.LOG_ERROR);
            }
          });
        }.bind(undefined, entry));
      }.bind(undefined, uploadEntries[i]));
    }
  }

  eventLog.logMessage(config, 'backend started', eventLog.LOG_INFO);
};


if (require.main === module) {
  var microAppFramework = require('micro-app-framework');
  microAppFramework(path.join(__dirname), Server);
}

module.exports = Server;
