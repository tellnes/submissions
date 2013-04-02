
var express = require('express')
  , path = require('path')

var app = module.exports = express()

app.use(express.favicon())
app.use('/f', require('./form'))
app.use(express.static('public'))
