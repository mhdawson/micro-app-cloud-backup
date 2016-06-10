const path = require('path');
const fs = require('fs');
const Docker = require('dockerode');
const docker = new Docker({socketPath: '/var/run/docker.sock'});
const googleAuth = require('google-auth-wrapper');
const gdriveWrapper = require('google-drive-wrapper');
const crontab = require('node-crontab');

const eventLogTag = 'DOCKER:';

/**
 * check images and backup those that are configured to be
 * backed up and have not already been backed up
 * uses googleAuth/gdriveWrapper to back up images to
 * configured google drive/directories
 *
 * @param config - object with configuration
 * @param eventLog - event log object that can be used to log messages
 */
var doBackups = function(config, eventLog) {
  // read in the list of docker images to be backed up
  var imageList = JSON.parse(fs.readFileSync(path.join(__dirname, 'imageList.json'))).images;
  
  // get the list of docker images and the find the subset that
  // we should backup
  docker.listImages({}, function(err, data) {
    if (err) {
      eventLog.logMessage(config, eventLogTag + 'failed to get list of docker images' +
                          err, eventLog.LOG_ERROR);
    } else {
      // find the list of images we may need to back up
      var imagesToBackup = new Array();
      for (var i = 0; i < data.length; i++) {
        var entry = data[i].RepoTags[0];
        if (imageList.indexOf(entry) !== -1) {
          imagesToBackup.push(entry + '----' + data[i].Id + '.gz.enc');
        }
      } 
  
      // now check if the images have already been backed up
      googleAuth.execute(config.clientSecretDir, config.clientSecret, function(auth, google) {
        var wrapper = new gdriveWrapper(auth, google, config.encPassword);
        wrapper.listFiles(config.gdriveDockDir, function(err, fileList) {
          if(err) {
            eventLog.logMessage(config, eventLogTag + 'Failed to get list of files in gdrive:' +
                                err, eventLog.LOG_ERROR);
          } else {
            for (var j = 0; j < fileList.length; j++) {
              var index = imagesToBackup.indexOf(fileList[j].name);
              if(index !== -1) {
                imagesToBackup.splice(index, 1);
              }
            }
            // now backup the images which have not been
            // backed up before
            if (imagesToBackup.length > 0) {
              wrapper.getMetaForFilename(config.gdriveDockDir, function(err, meta) {
                if (err) {
                  eventLog.logMessage(config, eventLogTag + 'failed to get metadata for:' +
                                      config.gdriveDockDir + ':' + err, eventLog.LOG_ERROR);
                  return;
                }
  
                var backupNextFile = function(index) {
                  if (index < imagesToBackup.length) {
                    entry = imagesToBackup[index].substring(0, imagesToBackup[index].indexOf('.gz.enc'));
                    eventLog.logMessage(config, eventLogTag + 'Backing up:' + entry, eventLog.LOG_INFO);
                    dockerId = entry.substring(0,entry.indexOf('----'));
                    var image = docker.getImage(dockerId);
                    image.get(function(err,data) {
                      wrapper.uploadFile(entry, data, { 'parent': meta.id } , function(err) {
                        if (err) {
                          eventLog.logMessage(config, eventLogTag + 'Failed to upload file:' +
                                              entry + ':' + err, eventLog.LOG_ERROR);
                        } else {
                          eventLog.logMessage(config, eventLogTag + 'Completed backup', eventLog.LOG_INFO);
                        }
                        backupNextFile(index + 1);
                      }); 
                    });
                  }
                };
                backupNextFile(0);
              });
            }
          }
        });
      });
    }
  });
}  

/**
 * Schedule docker backups
 *
 * @param config - object with configuration
 * @param eventLog - event log object that can be used to log messages
 */
module.exports.start = function(config, eventLog) {
  crontab.scheduleJob(config.dockerSchedule, function() {
    eventLog.logMessage(config, eventLogTag + 'Check if containers need backup', eventLog.LOG_INFO);
    doBackups(config, eventLog);
  })
}

/**
 * Get the list of docker images which have a primary tag
 *
 * @param config - object with configuratio
 * @param eventLog - event log object that can be used to log message
 * @complete function that will be called if list of docker images
 *           can be successfully returned.  If there is an error
 *           getting the list an error will be logged and the complete
 *           function will not be called
 */
module.exports.dockerList = function(config, eventLog, complete) {
  docker.listImages({}, function(err, data) {
    if (err) {
      eventLog.logMessage(config, eventLogTag + 'failed to get list of docker images' +
                          err, eventLog.LOG_ERROR);
    } else {
      // find the list of images we may need to back up
      var imageList = new Array();
      for (var i = 0; i < data.length; i++) {
        var entry = data[i].RepoTags[0];
        // only include those that are tagged latest
        if (entry.indexOf('<none>') !== 0) {
          imageList.push(entry)
        }
      }
      complete(imageList);
    }
  });
}
