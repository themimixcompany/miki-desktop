const path = require('path');
const os = require('os');
const fs = require('fs');

module.exports = {
  mikiTemp: path.resolve(os.tmpdir() + '/miki.' + process.geteuid())
};