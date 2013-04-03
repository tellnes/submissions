(function () {

  function isArray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]'
  }
  function hasAttr(element, attribute) {
    if (element.hasAttribute) return element.hasAttribute(attribute)
    var node = element.getAttributeNode(attribute)
    return !!(node && node.specified)
  }
  function addEvent(elm, name, handler) {
    if (elm.addEventListener) {
      elm.addEventListener(name, handler, false)
    } else {
      elm.attachEvent('on' + name, function () {
        handler.call(elm, event)
      })
    }
  }
  function include(arr, needle) {
    return !!~arr.indexOf(needle)
  }

  var extractValues = (function () {
    var fields = ['INPUT', 'TEXTAREA', 'SELECT']

    function optionValue(opt) {
      return hasAttr(opt, 'value') ? opt.value : opt.text
    }

    function selectOne(element) {
      var index = element.selectedIndex
      return index >= 0 ? optionValue(element.options[index]) : null
    }

    function selectMany(element) {
      var length = element.length
      if (!length) return null

      for (var i = 0, values = []; i < length; i++) {
        var opt = element.options[i]
        if (opt.selected) values.push(optionValue(opt))
      }
      return values
    }

    return function (form) {
      var elements = form.getElementsByTagName('*')
        , result = {}
        , element
        , i
        , name
        , value
        , type

      for (i = 0; (element = elements[i]); i++) {
        type = element.type
        name = element.name

        if  ( !include(fields, element.tagName) ||
              element.disabled                  ||
              !name                             ||
              type === 'file'                   ||
              type === 'submit'
            ) continue

        if (type === 'checkbox' || type === 'radio') {
          value = element.checked ? element.value : null

        } else if (type === 'select-one') {
          value = selectOne(element)

        } else if (type === 'select-multiple') {
          value = selectMany(element)

        } else {
          value = element.value
        }

        if (value === null || value === undefined) continue

        if (name in result) {
          if (!isArray(result[name])) result[name] = [result[name]]
          result[name].push(value)

        } else {
          result[name] = value
        }
      }

      return result
    }
  }())


  var XHR = (function () {
    if (window.XMLHttpRequest)
      return window.XMLHttpRequest

    if (window.XDomainRequest)
      return window.XDomainRequest

    if (window.ActiveXObject) {
      var axs = [ 'Msxml2.XMLHTTP.6.0'
                , 'Msxml2.XMLHTTP.3.0'
                , 'Microsoft.XMLHTTP'
                ]
        , i = 0
        , ax
        , axObj

      for (; i < axs.length; i++) {
        try {
          ax = axs[i]
          axObj = new (window.ActiveXObject)(ax)
          break
        } catch (e) {}
      }

      if (!axObj) return

      return function () {
        if (axObj) {
          var axObjCopy = axObj
          axObj = null
          return axObjCopy
        } else {
          return new (window.ActiveXObject)(ax)
        }
      }

    }
  }())

  function getEndpoint() {
    var scripts = document.scripts
      , i = 0
      , script
      , src
      , uri = '/'
    while ((script = scripts[i++])) {
      src = script.src
      if (src && src.slice(src.length - 15) === '/submissions.js') {
        uri = src.slice(0, src.length - 14)
        break
      }
    }

    return uri + 'f/'
  }

  function submitForm(url, data, cb) {
    url += (include(url, '?') ? '&' : '?') + 'xhr'

    var xhr = new XHR()
    xhr.open('POST', url, true)

    if (xhr.setRequestHeader) xhr.setRequestHeader('Content-Type', 'application/json')
    else url += '&type=json'

    var called = false
    function finish(err) {
      if (called) return
      called = true
      cb(err, xhr.responseText)
    }

    xhr.onerror = finish
    xhr.onload = finish
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return

      if (xhr.status !== 200) return finish(new Error('Unexpected status code; ' + xhr.status))
      finish()
    }

    xhr.send(data)
  }

  function onerror(err) {
    showMessage(err)
  }
  function showMessage(message) {
    // TODO
    alert(message)
  }

  function onsubmit(event) {
    var form = this
      , body = JSON.stringify(extractValues(form))

    submitForm(form.action, body, function (err, res) {
      if (err) return onerror(err)

      try {
        res = JSON.parse(res)
      } catch(err) {
        return onerror(err)
      }

      if (res.error) return onerror(res.error)
      showMessage(res.message)
    })

    event.preventDefault()
  }

  function onload() {
    var endpoint = getEndpoint()
      , forms = document.getElementsByTagName('form')
      , i = 0
      , form
    while ((form = forms[i++])) {
      if (form.action.slice(0, endpoint.length) !== endpoint) continue

      addEvent(form, 'submit', onsubmit)
    }
  }

  if (XHR) {
    addEvent(window, 'load', onload)
  }

}())
