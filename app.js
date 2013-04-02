
var express = require('express')
  , path = require('path')
  , config = require('./config')

var app = module.exports = express()

app.enable('trust proxy')

app.use(express.logger(config.get('env') === 'development' ? 'dev' : 'default'))
app.use(express.favicon())
app.use('/f', require('./form'))
app.use(express.static(path.resolve(__dirname, 'client')))
