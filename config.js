
var nconf = require('nconf')
  , path = require('path')

module.exports = nconf

nconf
      .argv()
      .file('locale', { file: path.resolve(__dirname, 'locale.json' )})
      .file('default', { file: path.resolve(__dirname, 'default.json' )})
