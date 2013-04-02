var config = require('./config')
  , app = require('./app')

app.listen(config.get('_').pop() || config.get('port') || 8080)
