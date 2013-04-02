
exports.compile = function (template) {
  template = template.split(/\[([a-z0-9_-]+)\]/)
  var length = template.length
  return function(values) {
    var result = []

    for(var i = 0; i < length; i++) {
      if (i % 2) {
        result.push(values[template[i]])
      } else {
        result.push(template[i])
      }
    }

    return result.join('')
  }
}
