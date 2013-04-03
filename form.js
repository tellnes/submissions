
var nodemailer = require('nodemailer')
  , express = require('express')
  , CouchCache = require('couch-cache')
  , config = require('./config')
  , request = require('request')
  , uuid = require('node-uuid')
  , url = require('url')
  , compileTemplate = require('./template').compile

var env = config.get('env')

  , app = module.exports = express()

  , cache = new CouchCache({ uri: config.get('couchdb:forms') })

  , transport = nodemailer.createTransport(config.get('mail:type') || 'SMTP', config.get('mail'))


function loadForm(req, res, next) {
  cache.get(req.params.id, function (err, form) {
    if (err && err.code === 'not_found') return next('route')
    if (err) return next(err)
    req.form = form
    next()
  })
}

function accessControl(req, res, next) {
  res.set('Access-Control-Allow-Origin', (req.form.origins || ['*']).join(', '))
  res.set('Access-Control-Allow-Headers', 'origin, content-type')
  res.set('Access-Control-Allow-Methods', 'POST')
  next()
}


var submissionsUri = config.get('couchdb:submissions')
if (typeof submissionsUri === 'string')
  submissionsUri = url.parse(submissionsUri)

function insertDoc(doc, cb) {
  request ( { method: 'POST'
            , uri: submissionsUri
            , json: doc
            }
          , function (err, res, body) {
              if (err) return cb(err)
              if (typeof body !== 'object') return cb(new Error('Expected a JSON object'))
              cb(null, body)
            }
          )
}

function isXHR(req) {
  return 'xhr' in req.query
}


app.options ( '/:id'
            , loadForm
            , accessControl
            , function endOptions(req, res, next) {
                res.end()
              }
            )

app.post( '/:id'
        , function fixContentType(req, res, next) {
            if (isXHR(req) && req.query.type === 'json' && !req.is('application/json'))
              req.headers['content-type'] = 'application/json'

            next()
          }
        , express.bodyParser()
        , loadForm
        , accessControl
        , function handlePost(req, res, next) {
            var form = req.form
              , fields = []
              , values = {}

            if (form.required && Array.isArray(form.required)) {
              if (!form.required.every(function (field) {
                if (!req.body[field]) {
                  next({ message: 'Missing a required field; ' + field, code: 'validate' })
                  return false
                }
                return true
              })) return

              fields.push.apply(fields, form.required)
            }

            if (form.optional && Array.isArray(form.optional))
              fields.push.apply(fields, form.optional)

            fields.forEach(function (field) {
              values[field] = req.body[field]
            })

            if (!form._compiled) form._compiled = compileTemplate(form.template)
            var body = form._compiled(values)


            var doc = {}
            doc._id = uuid().replace(/-/g, '')
            doc.form = { _id: form._id, _rev: form._rev }
            doc.timestamp = Date.now()
            doc.body = body
            doc.fields = values
            doc.remoteAddress = req.ip
            doc.userAgent = req.header('user-agent')
            doc.referer = req.header('referer')


            if (form.emails && Array.isArray(form.emails)) {
              var mailOptions = { from: config.get('mail:from')
                                , to: form.emails.join(', ')
                                , subject: form.subject || config.get('mail:subject')
                                , text: body
                                , headers:  { 'X-Submissions-Id': doc._id }
                                }

              transport.sendMail(mailOptions, function (err, response) {
                if (err) return next({ error: err, code: 'mail' })

                doc.mail = {}
                doc.mail.message = response.message
                doc.mail.messageId = response.messageId

                save()
              })
            } else {
              save()
            }

            function save() {
              insertDoc(doc, function (err) {
                if (err) return next({ error: err, code: 'couchdb' })

                sendResponse( { req: req
                              , res: res
                              , form: form
                              }
                            )

              })
            }
          }
        , function handleError(err, req, res, next) {
            //if (err.code != 'validate') return next(err)

            sendResponse( { error: err
                          , req: req
                          , res: res
                          , form: req.form
                          }
                        )
          }
        )

function sendResponse(info) {
  var req = info.req
    , res = info.res
    , form = info.form
    , type = info.error ? 'error' : 'success'
    , redirect = form[type] && form[type].redirect
    , message = form[type] && form[type].message || config.get('messages')[type]

  if (info.error) {
    switch (info.error.code) {
    case 'validate':
      message = info.error.message
      break
    default:
      if (env !== 'production') message = info.error.stack || info.error
      break
    }
  }

  message = message && message.toString() || ''

  if (isXHR(req)) {
    var json = { redirect: redirect, message: message }
    if (env !== 'production') json.error = info.error
    res.json(json)
    return
  }

  if (redirect) {
    res.redirect(redirect)
    return
  }

  res.end(message)
}
