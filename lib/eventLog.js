// Copyright 2016 the project authors as listed in the AUTHORS file.
// All rights reserved. Use of this source code is governed by the
// license that can be found in the LICENSE file.
const fs = require('fs');
const path = require('path');
const twilio = require('twilio');

module.exports.LOG_INFO = 0 
module.exports.LOG_WARN = 1;
module.exports.LOG_ERROR = 2;

var sendSMS = function(config, message) {
  // send sms message indicating alarm has been triggered
  var twilioClient = new twilio.RestClient(config.twilio.accountSID, config.twilio.accountAuthToken);
  twilioClient.sendMessage({
    to: config.twilio.toNumber,
    from: config.twilio.fromNumber,
    body: message 
  }, function(err, message) {
    if (err) { 
      module.exports.logMessage(config, 'Failed to send sms:' + err.message, module.exports.LOG_INFO);
    } else {
      module.exports.logMessage(config, 'SMS Sent:' + message.sid, module.exports.LOG_INFO);
    }
  });
}

module.exports.logMessage = function(config, message, level) {
  if (level === module.exports.LOG_ERROR) {
    if (config.twilio.sendError) {
      sendSMS(config, message, level);
    }
  }

  // no point to provide error function as we won't do
  // anything in case of an error
  fs.appendFile(module.exports.getLogFileName(config), level + ':' + new Date() + ': ' + message + '\n');
}

var logFileName;
module.exports.getLogFileName = function(config) {
  if (logFileName === undefined) {
    logFileName = path.join(config.eventLogPrefix, 'event_log.txt');
  }
  return logFileName;
}
