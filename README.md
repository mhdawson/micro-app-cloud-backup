# micro-app-cloud-backup

Micro app to do backups for docker images, upload contents of
one or more directories and download the contents of one or
more directories.  It currently supports backups and
upload/downloads to your google drive.  It uses
the [google-drive-wrapper](https://github.com/mhdawson/google-drive-wrapper)
project/npm and you must set up google drive credentials as
outlined in the readme for that project.

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
look and feel on desktp and mobile devices with the
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



