# micro-app-cloud-backup

Micro app to do backups for docker images, upload contents of
one or more directories and download the contents of one or
more directories.  It currently supports backups and
upload/downloads to your google drive.  It uses
the [google-drive-wrapper](https://github.com/mhdawson/google-drive-wrapper)
project/npm and you must set up google drive credentials as
outlined in the readme for that project.

For me the initial use case will be to back docker images
and lxc images which I have running in virtual machines
hosted in the cloud. 

For docker image backups, a new copy will only be upload
if the image has changed or the target folder on google
drive does not already include a backup that matches the
current version of the image.

For files being uploaded, the contents of the specified
directories will be uploaded and once each file is uploaded
it will be transferred to the specified "Move To" directory
such that the source directory will be empty at the end
of the transfer.

For downloaded files, files will only be downloaded from
the source google drive folder if a copy does not already
exist in the local destination folder.

Docker images and files which are uploaded are both
encrypted and compressed as part of the upload.  Before using
please ensure you have validated that the encryption is suitable
for the data you are protecting and that you have verified the implementation.

The GUI for the micro app allows the docker images that will 
be backed up to be configured.  It is possible to exclude images
from the available list through a blacklist in the configuration
file.  For folders that will be uploaded/download these can
only be configured in the config file and the GUI provides
only a read only view of the configuration.  The GUI also
has a tab to display the log events.

As backups are important the micro-app also supports
sending sms messages (using https://www.twilio.com/) when
errors that may affect backup/upload/download progress
occur.

You can use the micro-app in the browser or get native
look and feel on desktop and mobile devices with the
[micro-app-cordova-launcher](https://github.com/mhdawson/micro-app-cordova-launcher)
and [micro-app-electron-launcher](https://github.com/mhdawson/micro-app-electron-launcher)
projects.

You will want to setup your docker configuration so that docker
commands can be issued by a non-root user as you don't want
to run the micro-app as root. Some instructions on how to do
that are available here:
http://askubuntu.com/questions/477551/how-can-i-use-docker-without-sudo

Here are some sample screenshots:

![Docker tab](https://raw.githubusercontent.com/mhdawson/micro-app-cloud-backup/master/pictures/docker.png?raw=true)

![Upload tab](https://raw.githubusercontent.com/mhdawson/micro-app-cloud-backup/master/pictures/upload.png?raw=true)

![Download tab](https://raw.githubusercontent.com/mhdawson/micro-app-cloud-backup/master/pictures/download.png?raw=true)

![EventLog tab](https://raw.githubusercontent.com/mhdawson/micro-app-cloud-backup/master/pictures/event-log.png?raw=true)


# Configuration

# Installation

# Running




