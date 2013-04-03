;(function () {

  function $A(obj) {
    return Array.prototype.slice.call(obj)
  }
  function isArray(obj) {
    return Object.prototype.toString.call(obj) == '[object Array]'
  }

  function each(arr, fn) {
    for(var i = 0, len = arr.length; i < len; i++) {
      fn(arr[i], i, arr)
    }
  }

  function getAttr(elm, attr) {
    return elm.getAttribute(attr)
  }
  function hasAttr(element, attribute) {
    if (element.hasAttribute) return element.hasAttribute(attribute)
    var node = $(element).getAttributeNode(attribute)
    return !!(node && node.specified)
  }

  function addEvent(elm, name, fn) {
    elm.addEventListener(name, fn, false)
  }
  function toLower(str) {
    return str.toLowerCase()
  }
  function include(arr, needle) {
    return !!~arr.indexOf(needle)
  }


  var extractValues = (function () {
    var fields = ['input', 'textarea', 'select']

    function optionValue(opt) {
      return hasAttr(opt, 'value') ? opt.value : opt.text
    }

    function selectOne(element) {
      var index = element.selectedIndex
      return index >= 0 ? optionValue(element.options[index]) : null
    }

    function selectMany(element) {
      var values, length = element.length
      if (!length) return null

      for (var i = 0, values = []; i < length; i++) {
        var opt = element.options[i]
        if (opt.selected) values.push(optionValue(opt))
      }
      return values
    }

    return function (form, options) {
      var elements = form.getElementsByTagName('*')
        , result = {}
        , element
        , i
        , name
        , value
        , type

      for (i = 0; element = elements[i]; i++) {
        type = element.type
        name = element.name

        if ( !include(fields, toLower(element.tagName))
          || element.disabled
          || !name
          || type === 'file'
          || type === 'submit'
            ) continue

        if (type === 'checkbox' || type === 'radio') {
          value = element.checked ? element.value : null

        } else if (type == 'select-one') {
          value = selectOne(element)

        } else if (type == 'select-multiple') {
          value = selectMany(element)

        } else {
          value = element.value
        }

        if (value == null) continue

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
                ,'Microsoft.XMLHTTP'
                ]
      for (var i = 0; i < axs.length; i++) {
        try {
          var ax = new (window.ActiveXObject)(axs[i])
          return function () {
            if (ax) {
              var ax_ = ax
              ax = null
              return ax_
            } else {
              return new(window.ActiveXObject)(axs[i])
            }
          }
        } catch (e) {}
      }
    }
  }())

  function getEndpoint() {
    var scripts = $A(document.scripts)
      , i = scripts.length - 1
      , src
      , uri = '/'
    for (; i >= 0; i--) {
      src = scripts[i].src
      if (src.slice(src.length - 15) === '/submissions.js') {
        uri = src.slice(0, src.length - 14)
        break
      }
    }

    return uri + 'f/'
  }

  function submit(url, data, cb) {
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
      if (xhr.readyState != 4) return

      if (xhr.status != 200) return finish(new Error('Unexpected status code; ' + xhr.status))
      finish()
    }

    xhr.send(data)
  }

  function onerror(err) {
    showMessage(err)
  }
  function showMessage(message) {
    alert(message)
  }

  function onload() {

    endpoint = getEndpoint()

    each($A(document.getElementsByTagName('form')), function (form) {
      if (form.action.slice(0, endpoint.length) !== endpoint) return

      addEvent(form, 'submit', function (event) {
        var body = JSON.stringify(extractValues(form))

        submit(form.action, body, function (err, res) {
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
      })
    })
  }

  if (XHR) {
    addEvent(window, 'load', onload)
  }

}())
