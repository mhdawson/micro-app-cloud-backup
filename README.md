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

Most of the configuration is done in the lib/config.json
file which supports the following configuration options:


* title - title used to name the page for the app
* serverPort - port on which alarm GUI is server
* tls - if this value is the string "true" then the server will
  only support connections using tls. In this case there must
  be a cert.pem and key.pem which contain the key and
  certificate that will be used by the server in the lib directory.
* authenticate - set to "true" to enable basic authentication. If set
  to true then you must provide the "authInfo" values described below
* authInfo - object with username, password and realm values.
  authInfo.password is the hashed password that will be used to
  authenticate to the micro-app.  This can be generated with the
  utility in the micro-app framework which is called:
   .../node_modules/micro-app-framework/lib/gen_password.js.
  The first parameter is the password to be hashed.
* twilio - object specifying the accountSID, accountAuthToken, fromNumber 
  and toNumber that will be used to send SMS notifications
* clientSecretDir - the directory in which the client
  secret needed to use the google APIs will be located.  See
  [google-drive-wrapper](https://github.com/mhdawson/google-drive-wrapper)
  for more details.
* clientSecret - name of the file that contains
  the client secret needed to use the google APIs.  See
  [google-drive-wrapper](https://github.com/mhdawson/google-drive-wrapper)
  for more details.
* encPassword - the password that will be used to encrypt/decrypt when
  uploading/downloading from google drive
* gdriveDockDir - the folder in your google drive to which docker
  images will be backed up.
* dockerSchedule - schedule in cron format for times at which
  docker backups will be scheduled.
* eventLogPrefix - directory in which log for alarm will be written
* uploadDirs - array with zero or more entries for directories
  that will be uploaded to google drive. As described below.
* downloadDirs - array with zero or more entries for folders
  on your google drive that will be downloaded.  As described
  below. 
* blacklist - array with zero or more entries, each entry 
  being the tag for a docker image that should not be
  in the list of images available to be selected for backup.


Each of the entries for uploadDirs has the following fields:

* localdir - local directory containing the files to be uploaded
* localdirDone - directory to which files will be moved
  once they have been uploaded
* gdriveDir - google drive folder to which files will be
  transferred
* schedule - schedule in cron format for times at which
  uploads will be scheduled

Each of the entries for downloadDirs has the following fields:

* gdriveDir - forlder on your google drive from which files
  will be downloaded
* localdir - local folder into which files will be downloaded  
* schedule - schedule in cron format for times at which
  downloads will be scheduled
 
If required the key/certificate can be created using a command along 
these lines (if tls is "true"):

<PRE>
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.pem -out cert.pem
</PRE>


This is an example with sensitive parts masked out:
<PRE>
{
  "serverPort": 9000,
  "tls": "true",
  "authenticate": "true",
  "authInfo": {"username": "xxxxxx", "password": "xxxxxxxxxxx", "realm": "backup"},
  "clientSecretDir": "/home/user1/",
  "clientSecret": "client_secret",
  "encPassword": "xxxxxxx",
  "gdriveDockDir": "/backups/machine1",
  "dockerSchedule": "32 * * * *",
  "eventLogPrefix": "./",
  "uploadDirs": [ { "localdir": "/home/user1/upload1", "localdirDone": "/home/user1/uploadDone",
                    "gdriveDir": "/backups/back1", "schedule": "10 * * * *" },
                  { "localdir": "/home/user1/upload2", "localdirDone": "/home/user1/uploadDone",
                    "gdriveDir": "/backups/back2", "schedule": "15 * * * *" } ],
  "downloadDirs": [ { "gdriveDir": "/backups/back1", "localdir": "/home/user1/download1",
                      "schedule": "1 * * * *" }],
  "twilio": { "accountSID": "xxxxxxxxxxxxxxxxxxx",
              "accountAuthToken": "xxxxxxxxxxxxxxxxxx",
              "fromNumber": "xxxxxxxxxx",
              "toNumber": "xxxxxxxxxxx",
              "sendError": true  },
  "blacklist": [ "ubuntux:latest" ]
}
</PRE>


# Installation

The easiest way to install is to run:

<PRE>
npm install micro-app-cloud-backup
</PRE>

and then configure the default config.json file in the lib directory as described
in the configuration section above.

# Running

Simply cd to the directory where the npm was installed and type:

<PRE>
npm start
</PRE>



