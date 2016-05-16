const path = require('path');
const Docker = require('dockerode');
const docker = new Docker({socketPath: '/var/run/docker.sock'});
const googleAuth = require('google-auth-wrapper');
const gdriveWrapper = require('google-drive-wrapper');

// read in configuration
var config = require(path.join(__dirname, 'config.json'));

var doBackups = function() {
  // read in the list of docker images to be backed up
  var imageList = require(path.join(__dirname, 'imageList.json')).images;
  
  // get the list of docker images and the find the subset that
  // we should backup
  docker.listImages({}, function(err, data) {
    if (err) {
      console.log('failed to get list of docker images');
    } else {
      // find the list of images we may need to back up
      var imagesToBackup = new Array();
      for (var i = 0; i < data.length; i++) {
        var entry = data[i].RepoTags[0];
        var primaryTag = entry.substring(0, entry.indexOf(':'));
        if (!imageList.indexOf(primaryTag)) {
          imagesToBackup.push(primaryTag + '-' + data[i].Id + '.gz.enc');
        }
      } 
  
      // now check if the images have already been backed up
      googleAuth.execute(config.clientSecretDir, config.clientSecret, function(auth, google) {
        var wrapper = new gdriveWrapper(auth, google, config.encPassword);
        wrapper.listFiles(config.gdriveDockDir, function(err, fileList) {
          if(err) {
            console.log('Failed to get list of files in gdrive:' + err);
          } else {
            for (var j = 0; j < fileList.length; j++) {
              var index = imagesToBackup.indexOf(fileList[j].name);
              if(index !== -1) {
                imagesToBackup.pop(index);
              }
            }
            // now backup the images which have not been
            // backed before
            if (imagesToBackup.length > 0) {
              wrapper.getMetaForFilename(config.gdriveDockDir, function(err, meta) {
                if (err) {
                  console.log('failed to get metadata for:' + config.gdriveDockDir);
                  return;
                }
  
                var backupNextFile = function(index) {
                  if (index < imagesToBackup.length) {
                    entry = imagesToBackup[index].substring(0, imagesToBackup[index].indexOf('.gz.enc'));
                    dockerId = entry.substring(0,entry.indexOf('-'));
                    var image = docker.getImage(dockerId);
                    image.get(function(err,data) {
                      wrapper.uploadFile(entry, data, { 'parent': meta.id } , function(err) {
                        if (err) {
                          console.log('Failed to upload file:' + err);
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


doBackups();
