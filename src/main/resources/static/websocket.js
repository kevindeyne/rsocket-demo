(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict'

exports.byteLength = byteLength
exports.toByteArray = toByteArray
exports.fromByteArray = fromByteArray

var lookup = []
var revLookup = []
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i]
  revLookup[code.charCodeAt(i)] = i
}

// Support decoding URL-safe base64 strings, as Node.js does.
// See: https://en.wikipedia.org/wiki/Base64#URL_applications
revLookup['-'.charCodeAt(0)] = 62
revLookup['_'.charCodeAt(0)] = 63

function getLens (b64) {
  var len = b64.length

  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4')
  }

  // Trim off extra bytes after placeholder bytes are found
  // See: https://github.com/beatgammit/base64-js/issues/42
  var validLen = b64.indexOf('=')
  if (validLen === -1) validLen = len

  var placeHoldersLen = validLen === len
    ? 0
    : 4 - (validLen % 4)

  return [validLen, placeHoldersLen]
}

// base64 is 4/3 + up to two characters of the original data
function byteLength (b64) {
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function _byteLength (b64, validLen, placeHoldersLen) {
  return ((validLen + placeHoldersLen) * 3 / 4) - placeHoldersLen
}

function toByteArray (b64) {
  var tmp
  var lens = getLens(b64)
  var validLen = lens[0]
  var placeHoldersLen = lens[1]

  var arr = new Arr(_byteLength(b64, validLen, placeHoldersLen))

  var curByte = 0

  // if there are placeholders, only get up to the last complete 4 chars
  var len = placeHoldersLen > 0
    ? validLen - 4
    : validLen

  var i
  for (i = 0; i < len; i += 4) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 18) |
      (revLookup[b64.charCodeAt(i + 1)] << 12) |
      (revLookup[b64.charCodeAt(i + 2)] << 6) |
      revLookup[b64.charCodeAt(i + 3)]
    arr[curByte++] = (tmp >> 16) & 0xFF
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 2) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 2) |
      (revLookup[b64.charCodeAt(i + 1)] >> 4)
    arr[curByte++] = tmp & 0xFF
  }

  if (placeHoldersLen === 1) {
    tmp =
      (revLookup[b64.charCodeAt(i)] << 10) |
      (revLookup[b64.charCodeAt(i + 1)] << 4) |
      (revLookup[b64.charCodeAt(i + 2)] >> 2)
    arr[curByte++] = (tmp >> 8) & 0xFF
    arr[curByte++] = tmp & 0xFF
  }

  return arr
}

function tripletToBase64 (num) {
  return lookup[num >> 18 & 0x3F] +
    lookup[num >> 12 & 0x3F] +
    lookup[num >> 6 & 0x3F] +
    lookup[num & 0x3F]
}

function encodeChunk (uint8, start, end) {
  var tmp
  var output = []
  for (var i = start; i < end; i += 3) {
    tmp =
      ((uint8[i] << 16) & 0xFF0000) +
      ((uint8[i + 1] << 8) & 0xFF00) +
      (uint8[i + 2] & 0xFF)
    output.push(tripletToBase64(tmp))
  }
  return output.join('')
}

function fromByteArray (uint8) {
  var tmp
  var len = uint8.length
  var extraBytes = len % 3 // if we have 1 byte left, pad 2 bytes
  var parts = []
  var maxChunkLength = 16383 // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)))
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1]
    parts.push(
      lookup[tmp >> 2] +
      lookup[(tmp << 4) & 0x3F] +
      '=='
    )
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1]
    parts.push(
      lookup[tmp >> 10] +
      lookup[(tmp >> 4) & 0x3F] +
      lookup[(tmp << 2) & 0x3F] +
      '='
    )
  }

  return parts.join('')
}

},{}],2:[function(require,module,exports){
(function (Buffer){(function (){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict'

var base64 = require('base64-js')
var ieee754 = require('ieee754')

exports.Buffer = Buffer
exports.SlowBuffer = SlowBuffer
exports.INSPECT_MAX_BYTES = 50

var K_MAX_LENGTH = 0x7fffffff
exports.kMaxLength = K_MAX_LENGTH

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport()

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' &&
    typeof console.error === 'function') {
  console.error(
    'This browser lacks typed array (Uint8Array) support which is required by ' +
    '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.'
  )
}

function typedArraySupport () {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1)
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function () { return 42 } }
    return arr.foo() === 42
  } catch (e) {
    return false
  }
}

Object.defineProperty(Buffer.prototype, 'parent', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.buffer
  }
})

Object.defineProperty(Buffer.prototype, 'offset', {
  enumerable: true,
  get: function () {
    if (!Buffer.isBuffer(this)) return undefined
    return this.byteOffset
  }
})

function createBuffer (length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('The value "' + length + '" is invalid for option "size"')
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length)
  buf.__proto__ = Buffer.prototype
  return buf
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer (arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new TypeError(
        'The "string" argument must be of type string. Received type number'
      )
    }
    return allocUnsafe(arg)
  }
  return from(arg, encodingOrOffset, length)
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species != null &&
    Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  })
}

Buffer.poolSize = 8192 // not used by this implementation

function from (value, encodingOrOffset, length) {
  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset)
  }

  if (ArrayBuffer.isView(value)) {
    return fromArrayLike(value)
  }

  if (value == null) {
    throw TypeError(
      'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
      'or Array-like Object. Received type ' + (typeof value)
    )
  }

  if (isInstance(value, ArrayBuffer) ||
      (value && isInstance(value.buffer, ArrayBuffer))) {
    return fromArrayBuffer(value, encodingOrOffset, length)
  }

  if (typeof value === 'number') {
    throw new TypeError(
      'The "value" argument must not be of type number. Received type number'
    )
  }

  var valueOf = value.valueOf && value.valueOf()
  if (valueOf != null && valueOf !== value) {
    return Buffer.from(valueOf, encodingOrOffset, length)
  }

  var b = fromObject(value)
  if (b) return b

  if (typeof Symbol !== 'undefined' && Symbol.toPrimitive != null &&
      typeof value[Symbol.toPrimitive] === 'function') {
    return Buffer.from(
      value[Symbol.toPrimitive]('string'), encodingOrOffset, length
    )
  }

  throw new TypeError(
    'The first argument must be one of type string, Buffer, ArrayBuffer, Array, ' +
    'or Array-like Object. Received type ' + (typeof value)
  )
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length)
}

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype
Buffer.__proto__ = Uint8Array

function assertSize (size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be of type number')
  } else if (size < 0) {
    throw new RangeError('The value "' + size + '" is invalid for option "size"')
  }
}

function alloc (size, fill, encoding) {
  assertSize(size)
  if (size <= 0) {
    return createBuffer(size)
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string'
      ? createBuffer(size).fill(fill, encoding)
      : createBuffer(size).fill(fill)
  }
  return createBuffer(size)
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding)
}

function allocUnsafe (size) {
  assertSize(size)
  return createBuffer(size < 0 ? 0 : checked(size) | 0)
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size)
}
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size)
}

function fromString (string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8'
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('Unknown encoding: ' + encoding)
  }

  var length = byteLength(string, encoding) | 0
  var buf = createBuffer(length)

  var actual = buf.write(string, encoding)

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual)
  }

  return buf
}

function fromArrayLike (array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0
  var buf = createBuffer(length)
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255
  }
  return buf
}

function fromArrayBuffer (array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('"offset" is outside of buffer bounds')
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('"length" is outside of buffer bounds')
  }

  var buf
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array)
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset)
  } else {
    buf = new Uint8Array(array, byteOffset, length)
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype
  return buf
}

function fromObject (obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0
    var buf = createBuffer(len)

    if (buf.length === 0) {
      return buf
    }

    obj.copy(buf, 0, 0, len)
    return buf
  }

  if (obj.length !== undefined) {
    if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
      return createBuffer(0)
    }
    return fromArrayLike(obj)
  }

  if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
    return fromArrayLike(obj.data)
  }
}

function checked (length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                         'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes')
  }
  return length | 0
}

function SlowBuffer (length) {
  if (+length != length) { // eslint-disable-line eqeqeq
    length = 0
  }
  return Buffer.alloc(+length)
}

Buffer.isBuffer = function isBuffer (b) {
  return b != null && b._isBuffer === true &&
    b !== Buffer.prototype // so Buffer.isBuffer(Buffer.prototype) will be false
}

Buffer.compare = function compare (a, b) {
  if (isInstance(a, Uint8Array)) a = Buffer.from(a, a.offset, a.byteLength)
  if (isInstance(b, Uint8Array)) b = Buffer.from(b, b.offset, b.byteLength)
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError(
      'The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array'
    )
  }

  if (a === b) return 0

  var x = a.length
  var y = b.length

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i]
      y = b[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

Buffer.isEncoding = function isEncoding (encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true
    default:
      return false
  }
}

Buffer.concat = function concat (list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers')
  }

  if (list.length === 0) {
    return Buffer.alloc(0)
  }

  var i
  if (length === undefined) {
    length = 0
    for (i = 0; i < list.length; ++i) {
      length += list[i].length
    }
  }

  var buffer = Buffer.allocUnsafe(length)
  var pos = 0
  for (i = 0; i < list.length; ++i) {
    var buf = list[i]
    if (isInstance(buf, Uint8Array)) {
      buf = Buffer.from(buf)
    }
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers')
    }
    buf.copy(buffer, pos)
    pos += buf.length
  }
  return buffer
}

function byteLength (string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length
  }
  if (ArrayBuffer.isView(string) || isInstance(string, ArrayBuffer)) {
    return string.byteLength
  }
  if (typeof string !== 'string') {
    throw new TypeError(
      'The "string" argument must be one of type string, Buffer, or ArrayBuffer. ' +
      'Received type ' + typeof string
    )
  }

  var len = string.length
  var mustMatch = (arguments.length > 2 && arguments[2] === true)
  if (!mustMatch && len === 0) return 0

  // Use a for loop to avoid recursion
  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len
      case 'utf8':
      case 'utf-8':
        return utf8ToBytes(string).length
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2
      case 'hex':
        return len >>> 1
      case 'base64':
        return base64ToBytes(string).length
      default:
        if (loweredCase) {
          return mustMatch ? -1 : utf8ToBytes(string).length // assume utf8
        }
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}
Buffer.byteLength = byteLength

function slowToString (encoding, start, end) {
  var loweredCase = false

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return ''
  }

  if (end === undefined || end > this.length) {
    end = this.length
  }

  if (end <= 0) {
    return ''
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0
  start >>>= 0

  if (end <= start) {
    return ''
  }

  if (!encoding) encoding = 'utf8'

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end)

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end)

      case 'ascii':
        return asciiSlice(this, start, end)

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end)

      case 'base64':
        return base64Slice(this, start, end)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = (encoding + '').toLowerCase()
        loweredCase = true
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true

function swap (b, n, m) {
  var i = b[n]
  b[n] = b[m]
  b[m] = i
}

Buffer.prototype.swap16 = function swap16 () {
  var len = this.length
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits')
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1)
  }
  return this
}

Buffer.prototype.swap32 = function swap32 () {
  var len = this.length
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits')
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3)
    swap(this, i + 1, i + 2)
  }
  return this
}

Buffer.prototype.swap64 = function swap64 () {
  var len = this.length
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits')
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7)
    swap(this, i + 1, i + 6)
    swap(this, i + 2, i + 5)
    swap(this, i + 3, i + 4)
  }
  return this
}

Buffer.prototype.toString = function toString () {
  var length = this.length
  if (length === 0) return ''
  if (arguments.length === 0) return utf8Slice(this, 0, length)
  return slowToString.apply(this, arguments)
}

Buffer.prototype.toLocaleString = Buffer.prototype.toString

Buffer.prototype.equals = function equals (b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer')
  if (this === b) return true
  return Buffer.compare(this, b) === 0
}

Buffer.prototype.inspect = function inspect () {
  var str = ''
  var max = exports.INSPECT_MAX_BYTES
  str = this.toString('hex', 0, max).replace(/(.{2})/g, '$1 ').trim()
  if (this.length > max) str += ' ... '
  return '<Buffer ' + str + '>'
}

Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
  if (isInstance(target, Uint8Array)) {
    target = Buffer.from(target, target.offset, target.byteLength)
  }
  if (!Buffer.isBuffer(target)) {
    throw new TypeError(
      'The "target" argument must be one of type Buffer or Uint8Array. ' +
      'Received type ' + (typeof target)
    )
  }

  if (start === undefined) {
    start = 0
  }
  if (end === undefined) {
    end = target ? target.length : 0
  }
  if (thisStart === undefined) {
    thisStart = 0
  }
  if (thisEnd === undefined) {
    thisEnd = this.length
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index')
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0
  }
  if (thisStart >= thisEnd) {
    return -1
  }
  if (start >= end) {
    return 1
  }

  start >>>= 0
  end >>>= 0
  thisStart >>>= 0
  thisEnd >>>= 0

  if (this === target) return 0

  var x = thisEnd - thisStart
  var y = end - start
  var len = Math.min(x, y)

  var thisCopy = this.slice(thisStart, thisEnd)
  var targetCopy = target.slice(start, end)

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i]
      y = targetCopy[i]
      break
    }
  }

  if (x < y) return -1
  if (y < x) return 1
  return 0
}

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset
    byteOffset = 0
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000
  }
  byteOffset = +byteOffset // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : (buffer.length - 1)
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset
  if (byteOffset >= buffer.length) {
    if (dir) return -1
    else byteOffset = buffer.length - 1
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0
    else return -1
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding)
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
  } else if (typeof val === 'number') {
    val = val & 0xFF // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
      }
    }
    return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
  }

  throw new TypeError('val must be string, number or Buffer')
}

function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
  var indexSize = 1
  var arrLength = arr.length
  var valLength = val.length

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase()
    if (encoding === 'ucs2' || encoding === 'ucs-2' ||
        encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1
      }
      indexSize = 2
      arrLength /= 2
      valLength /= 2
      byteOffset /= 2
    }
  }

  function read (buf, i) {
    if (indexSize === 1) {
      return buf[i]
    } else {
      return buf.readUInt16BE(i * indexSize)
    }
  }

  var i
  if (dir) {
    var foundIndex = -1
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
      } else {
        if (foundIndex !== -1) i -= i - foundIndex
        foundIndex = -1
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength
    for (i = byteOffset; i >= 0; i--) {
      var found = true
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false
          break
        }
      }
      if (found) return i
    }
  }

  return -1
}

Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1
}

Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
}

Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
}

function hexWrite (buf, string, offset, length) {
  offset = Number(offset) || 0
  var remaining = buf.length - offset
  if (!length) {
    length = remaining
  } else {
    length = Number(length)
    if (length > remaining) {
      length = remaining
    }
  }

  var strLen = string.length

  if (length > strLen / 2) {
    length = strLen / 2
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16)
    if (numberIsNaN(parsed)) return i
    buf[offset + i] = parsed
  }
  return i
}

function utf8Write (buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
}

function asciiWrite (buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length)
}

function latin1Write (buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length)
}

function base64Write (buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length)
}

function ucs2Write (buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
}

Buffer.prototype.write = function write (string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8'
    length = this.length
    offset = 0
  // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset
    length = this.length
    offset = 0
  // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0
    if (isFinite(length)) {
      length = length >>> 0
      if (encoding === undefined) encoding = 'utf8'
    } else {
      encoding = length
      length = undefined
    }
  } else {
    throw new Error(
      'Buffer.write(string, encoding, offset[, length]) is no longer supported'
    )
  }

  var remaining = this.length - offset
  if (length === undefined || length > remaining) length = remaining

  if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds')
  }

  if (!encoding) encoding = 'utf8'

  var loweredCase = false
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length)

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length)

      case 'ascii':
        return asciiWrite(this, string, offset, length)

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length)

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length)

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length)

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
        encoding = ('' + encoding).toLowerCase()
        loweredCase = true
    }
  }
}

Buffer.prototype.toJSON = function toJSON () {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  }
}

function base64Slice (buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf)
  } else {
    return base64.fromByteArray(buf.slice(start, end))
  }
}

function utf8Slice (buf, start, end) {
  end = Math.min(buf.length, end)
  var res = []

  var i = start
  while (i < end) {
    var firstByte = buf[i]
    var codePoint = null
    var bytesPerSequence = (firstByte > 0xEF) ? 4
      : (firstByte > 0xDF) ? 3
        : (firstByte > 0xBF) ? 2
          : 1

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte
          }
          break
        case 2:
          secondByte = buf[i + 1]
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F)
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint
            }
          }
          break
        case 3:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F)
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint
            }
          }
          break
        case 4:
          secondByte = buf[i + 1]
          thirdByte = buf[i + 2]
          fourthByte = buf[i + 3]
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F)
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD
      bytesPerSequence = 1
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000
      res.push(codePoint >>> 10 & 0x3FF | 0xD800)
      codePoint = 0xDC00 | codePoint & 0x3FF
    }

    res.push(codePoint)
    i += bytesPerSequence
  }

  return decodeCodePointsArray(res)
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000

function decodeCodePointsArray (codePoints) {
  var len = codePoints.length
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = ''
  var i = 0
  while (i < len) {
    res += String.fromCharCode.apply(
      String,
      codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
    )
  }
  return res
}

function asciiSlice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F)
  }
  return ret
}

function latin1Slice (buf, start, end) {
  var ret = ''
  end = Math.min(buf.length, end)

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i])
  }
  return ret
}

function hexSlice (buf, start, end) {
  var len = buf.length

  if (!start || start < 0) start = 0
  if (!end || end < 0 || end > len) end = len

  var out = ''
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i])
  }
  return out
}

function utf16leSlice (buf, start, end) {
  var bytes = buf.slice(start, end)
  var res = ''
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + (bytes[i + 1] * 256))
  }
  return res
}

Buffer.prototype.slice = function slice (start, end) {
  var len = this.length
  start = ~~start
  end = end === undefined ? len : ~~end

  if (start < 0) {
    start += len
    if (start < 0) start = 0
  } else if (start > len) {
    start = len
  }

  if (end < 0) {
    end += len
    if (end < 0) end = 0
  } else if (end > len) {
    end = len
  }

  if (end < start) end = start

  var newBuf = this.subarray(start, end)
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype
  return newBuf
}

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset (offset, ext, length) {
  if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
}

Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }

  return val
}

Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length)
  }

  var val = this[offset + --byteLength]
  var mul = 1
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul
  }

  return val
}

Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  return this[offset]
}

Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return this[offset] | (this[offset + 1] << 8)
}

Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  return (this[offset] << 8) | this[offset + 1]
}

Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return ((this[offset]) |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16)) +
      (this[offset + 3] * 0x1000000)
}

Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] * 0x1000000) +
    ((this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    this[offset + 3])
}

Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var val = this[offset]
  var mul = 1
  var i = 0
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) checkOffset(offset, byteLength, this.length)

  var i = byteLength
  var mul = 1
  var val = this[offset + --i]
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul
  }
  mul *= 0x80

  if (val >= mul) val -= Math.pow(2, 8 * byteLength)

  return val
}

Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 1, this.length)
  if (!(this[offset] & 0x80)) return (this[offset])
  return ((0xff - this[offset] + 1) * -1)
}

Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset] | (this[offset + 1] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 2, this.length)
  var val = this[offset + 1] | (this[offset] << 8)
  return (val & 0x8000) ? val | 0xFFFF0000 : val
}

Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset]) |
    (this[offset + 1] << 8) |
    (this[offset + 2] << 16) |
    (this[offset + 3] << 24)
}

Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)

  return (this[offset] << 24) |
    (this[offset + 1] << 16) |
    (this[offset + 2] << 8) |
    (this[offset + 3])
}

Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, true, 23, 4)
}

Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 4, this.length)
  return ieee754.read(this, offset, false, 23, 4)
}

Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, true, 52, 8)
}

Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
  offset = offset >>> 0
  if (!noAssert) checkOffset(offset, 8, this.length)
  return ieee754.read(this, offset, false, 52, 8)
}

function checkInt (buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
}

Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var mul = 1
  var i = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  byteLength = byteLength >>> 0
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1
    checkInt(this, value, offset, byteLength, maxBytes, 0)
  }

  var i = byteLength - 1
  var mul = 1
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = (value / mul) & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0)
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset + 3] = (value >>> 24)
  this[offset + 2] = (value >>> 16)
  this[offset + 1] = (value >>> 8)
  this[offset] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0)
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = 0
  var mul = 1
  var sub = 0
  this[offset] = value & 0xFF
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    var limit = Math.pow(2, (8 * byteLength) - 1)

    checkInt(this, value, offset, byteLength, limit - 1, -limit)
  }

  var i = byteLength - 1
  var mul = 1
  var sub = 0
  this[offset + i] = value & 0xFF
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1
    }
    this[offset + i] = ((value / mul) >> 0) - sub & 0xFF
  }

  return offset + byteLength
}

Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80)
  if (value < 0) value = 0xff + value + 1
  this[offset] = (value & 0xff)
  return offset + 1
}

Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  return offset + 2
}

Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000)
  this[offset] = (value >>> 8)
  this[offset + 1] = (value & 0xff)
  return offset + 2
}

Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  this[offset] = (value & 0xff)
  this[offset + 1] = (value >>> 8)
  this[offset + 2] = (value >>> 16)
  this[offset + 3] = (value >>> 24)
  return offset + 4
}

Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000)
  if (value < 0) value = 0xffffffff + value + 1
  this[offset] = (value >>> 24)
  this[offset + 1] = (value >>> 16)
  this[offset + 2] = (value >>> 8)
  this[offset + 3] = (value & 0xff)
  return offset + 4
}

function checkIEEE754 (buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range')
  if (offset < 0) throw new RangeError('Index out of range')
}

function writeFloat (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38)
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4)
  return offset + 4
}

Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert)
}

Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert)
}

function writeDouble (buf, value, offset, littleEndian, noAssert) {
  value = +value
  offset = offset >>> 0
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308)
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8)
  return offset + 8
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert)
}

Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert)
}

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy (target, targetStart, start, end) {
  if (!Buffer.isBuffer(target)) throw new TypeError('argument should be a Buffer')
  if (!start) start = 0
  if (!end && end !== 0) end = this.length
  if (targetStart >= target.length) targetStart = target.length
  if (!targetStart) targetStart = 0
  if (end > 0 && end < start) end = start

  // Copy 0 bytes; we're done
  if (end === start) return 0
  if (target.length === 0 || this.length === 0) return 0

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds')
  }
  if (start < 0 || start >= this.length) throw new RangeError('Index out of range')
  if (end < 0) throw new RangeError('sourceEnd out of bounds')

  // Are we oob?
  if (end > this.length) end = this.length
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start
  }

  var len = end - start

  if (this === target && typeof Uint8Array.prototype.copyWithin === 'function') {
    // Use built-in when available, missing from IE11
    this.copyWithin(targetStart, start, end)
  } else if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (var i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start]
    }
  } else {
    Uint8Array.prototype.set.call(
      target,
      this.subarray(start, end),
      targetStart
    )
  }

  return len
}

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill (val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start
      start = 0
      end = this.length
    } else if (typeof end === 'string') {
      encoding = end
      end = this.length
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string')
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding)
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0)
      if ((encoding === 'utf8' && code < 128) ||
          encoding === 'latin1') {
        // Fast path: If `val` fits into a single byte, use that numeric value.
        val = code
      }
    }
  } else if (typeof val === 'number') {
    val = val & 255
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index')
  }

  if (end <= start) {
    return this
  }

  start = start >>> 0
  end = end === undefined ? this.length : end >>> 0

  if (!val) val = 0

  var i
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val
    }
  } else {
    var bytes = Buffer.isBuffer(val)
      ? val
      : Buffer.from(val, encoding)
    var len = bytes.length
    if (len === 0) {
      throw new TypeError('The value "' + val +
        '" is invalid for argument "value"')
    }
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len]
    }
  }

  return this
}

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g

function base64clean (str) {
  // Node takes equal signs as end of the Base64 encoding
  str = str.split('=')[0]
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '')
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return ''
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '='
  }
  return str
}

function toHex (n) {
  if (n < 16) return '0' + n.toString(16)
  return n.toString(16)
}

function utf8ToBytes (string, units) {
  units = units || Infinity
  var codePoint
  var length = string.length
  var leadSurrogate = null
  var bytes = []

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i)

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
          continue
        }

        // valid lead
        leadSurrogate = codePoint

        continue
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
        leadSurrogate = codePoint
        continue
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD)
    }

    leadSurrogate = null

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break
      bytes.push(codePoint)
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break
      bytes.push(
        codePoint >> 0x6 | 0xC0,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break
      bytes.push(
        codePoint >> 0xC | 0xE0,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break
      bytes.push(
        codePoint >> 0x12 | 0xF0,
        codePoint >> 0xC & 0x3F | 0x80,
        codePoint >> 0x6 & 0x3F | 0x80,
        codePoint & 0x3F | 0x80
      )
    } else {
      throw new Error('Invalid code point')
    }
  }

  return bytes
}

function asciiToBytes (str) {
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF)
  }
  return byteArray
}

function utf16leToBytes (str, units) {
  var c, hi, lo
  var byteArray = []
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break

    c = str.charCodeAt(i)
    hi = c >> 8
    lo = c % 256
    byteArray.push(lo)
    byteArray.push(hi)
  }

  return byteArray
}

function base64ToBytes (str) {
  return base64.toByteArray(base64clean(str))
}

function blitBuffer (src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if ((i + offset >= dst.length) || (i >= src.length)) break
    dst[i + offset] = src[i]
  }
  return i
}

// ArrayBuffer or Uint8Array objects from other contexts (i.e. iframes) do not pass
// the `instanceof` check but they should be treated as of that type.
// See: https://github.com/feross/buffer/issues/166
function isInstance (obj, type) {
  return obj instanceof type ||
    (obj != null && obj.constructor != null && obj.constructor.name != null &&
      obj.constructor.name === type.name)
}
function numberIsNaN (obj) {
  // For IE11 support
  return obj !== obj // eslint-disable-line no-self-compare
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"base64-js":1,"buffer":2,"ieee754":3}],3:[function(require,module,exports){
/*! ieee754. BSD-3-Clause License. Feross Aboukhadijeh <https://feross.org/opensource> */
exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var nBits = -7
  var i = isLE ? (nBytes - 1) : 0
  var d = isLE ? -1 : 1
  var s = buffer[offset + i]

  i += d

  e = s & ((1 << (-nBits)) - 1)
  s >>= (-nBits)
  nBits += eLen
  for (; nBits > 0; e = (e * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & ((1 << (-nBits)) - 1)
  e >>= (-nBits)
  nBits += mLen
  for (; nBits > 0; m = (m * 256) + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity)
  } else {
    m = m + Math.pow(2, mLen)
    e = e - eBias
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
}

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c
  var eLen = (nBytes * 8) - mLen - 1
  var eMax = (1 << eLen) - 1
  var eBias = eMax >> 1
  var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0)
  var i = isLE ? 0 : (nBytes - 1)
  var d = isLE ? 1 : -1
  var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0

  value = Math.abs(value)

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0
    e = eMax
  } else {
    e = Math.floor(Math.log(value) / Math.LN2)
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--
      c *= 2
    }
    if (e + eBias >= 1) {
      value += rt / c
    } else {
      value += rt * Math.pow(2, 1 - eBias)
    }
    if (value * c >= 2) {
      e++
      c /= 2
    }

    if (e + eBias >= eMax) {
      m = 0
      e = eMax
    } else if (e + eBias >= 1) {
      m = ((value * c) - 1) * Math.pow(2, mLen)
      e = e + eBias
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen)
      e = 0
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = (e << mLen) | m
  eLen += mLen
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128
}

},{}],4:[function(require,module,exports){
(function (Buffer){(function (){
const { RSocketConnector } = require("rsocket-core");
const { WebsocketClientTransport } = require("rsocket-websocket-client");
const {
    encodeCompositeMetadata,
    encodeRoute,
    WellKnownMimeType,
    encodeSimpleAuthMetadata,
} = require("rsocket-composite-metadata");

let client = undefined;
let rsocket = undefined;

function addErrorMessage(prefix, error) {
    var ul = document.getElementById("messages");
    var li = document.createElement("li");
    li.appendChild(document.createTextNode(prefix + error));
    ul.appendChild(li);
}

function addMessage(message) {
    var ul = document.getElementById("messages");

    var li = document.createElement("li");
    li.appendChild(document.createTextNode(JSON.stringify(message)));
    ul.appendChild(li);
}

async function main() {
    if (rsocket !== undefined) {
        //rsocket.close();
        document.getElementById("messages").innerHTML = "";
    }

    // Create an instance of a client
    client = new RSocketConnector({
        setup: {
            // ms btw sending keepalive to server
            keepAlive: 60000,
            // ms timeout if no keepalive response
            lifetime: 180000,
            // format of `data`
            dataMimeType: WellKnownMimeType.APPLICATION_JSON.string,
            // format of `metadata`
            metadataMimeType: WellKnownMimeType.MESSAGE_RSOCKET_COMPOSITE_METADATA.string,
        },
        transport: new WebsocketClientTransport({
            url: 'ws://localhost:7000/tweetsocket'
        }),
    });

    rsocket = await client.connect();
    await new Promise((resolve, reject) => {
        const encodedRoute = encodeRoute('tweets.by.author');

        const map = new Map();
        map.set(WellKnownMimeType.MESSAGE_RSOCKET_ROUTING, encodedRoute);
        map.set(WellKnownMimeType.MESSAGE_RSOCKET_AUTHENTICATION, encodeSimpleAuthMetadata("user", "pass"));
        const compositeMetaData = encodeCompositeMetadata(map);

        let payloadData = { author: document.getElementById("author-filter").value };

        const requester = rsocket.requestChannel(
            {
                data: Buffer.from(JSON.stringify(payloadData)),
                metadata: compositeMetaData,
            },
            1,
            false,
            {
                onError: error => {
                    console.error(error);
                    addErrorMessage("Connection has been closed due to ", error);
                },
                onNext: payload => {
                    console.log("onNext", payload.data.toString());
                    addMessage(JSON.parse(payload.data.toString()));
                },
                onSubscribe: subscription => {
                    console.log("onSubscribe", subscription);
                }
            }
        );
    });
}

document.addEventListener('DOMContentLoaded', main);
document.getElementById('author-filter').addEventListener('change', main);
}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":2,"rsocket-composite-metadata":10,"rsocket-core":29,"rsocket-websocket-client":32}],5:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeSimpleAuthPayload = exports.decodeAuthMetadata = exports.encodeBearerAuthMetadata = exports.encodeSimpleAuthMetadata = exports.encodeCustomAuthMetadata = exports.encodeWellKnownAuthMetadata = void 0;
var WellKnownAuthType_1 = require("./WellKnownAuthType");
var authTypeIdBytesLength = 1;
var customAuthTypeBytesLength = 1;
var usernameLengthBytesLength = 2;
var streamMetadataKnownMask = 0x80; // 1000 0000
var streamMetadataLengthMask = 0x7f; // 0111 1111
/**
 * Encode Auth metadata with the given {@link WellKnownAuthType} and auth payload {@link Buffer}
 *
 * @param authType well known auth type
 * @param authPayloadBuffer auth payload buffer
 * @returns encoded {@link WellKnownAuthType} and payload {@link Buffer}
 */
function encodeWellKnownAuthMetadata(authType, authPayloadBuffer) {
    if (authType === WellKnownAuthType_1.WellKnownAuthType.UNPARSEABLE_AUTH_TYPE ||
        authType === WellKnownAuthType_1.WellKnownAuthType.UNKNOWN_RESERVED_AUTH_TYPE) {
        throw new Error("Illegal WellKnownAuthType[".concat(authType.toString(), "]. Only allowed AuthType should be used"));
    }
    var buffer = Buffer.allocUnsafe(authTypeIdBytesLength);
    // eslint-disable-next-line no-bitwise
    buffer.writeUInt8(authType.identifier | streamMetadataKnownMask);
    return Buffer.concat([buffer, authPayloadBuffer]);
}
exports.encodeWellKnownAuthMetadata = encodeWellKnownAuthMetadata;
/**
 * Encode Auth metadata with the given custom auth type {@link string} and auth payload {@link Buffer}
 *
 * @param customAuthType custom auth type
 * @param authPayloadBuffer auth payload buffer
 * @returns encoded {@link WellKnownAuthType} and payload {@link Buffer}
 */
function encodeCustomAuthMetadata(customAuthType, authPayloadBuffer) {
    var customAuthTypeBuffer = Buffer.from(customAuthType);
    if (customAuthTypeBuffer.byteLength !== customAuthType.length) {
        throw new Error("Custom auth type must be US_ASCII characters only");
    }
    if (customAuthTypeBuffer.byteLength < 1 ||
        customAuthTypeBuffer.byteLength > 128) {
        throw new Error("Custom auth type must have a strictly positive length that fits on 7 unsigned bits, ie 1-128");
    }
    var buffer = Buffer.allocUnsafe(customAuthTypeBytesLength + customAuthTypeBuffer.byteLength);
    // encoded length is one less than actual length, since 0 is never a valid length, which gives
    // wider representation range
    buffer.writeUInt8(customAuthTypeBuffer.byteLength - 1);
    buffer.write(customAuthType, customAuthTypeBytesLength);
    return Buffer.concat([buffer, authPayloadBuffer]);
}
exports.encodeCustomAuthMetadata = encodeCustomAuthMetadata;
/**
 * Encode Simple Auth metadata with the given username and password
 *
 * @param username username
 * @param password password
 * @returns encoded {@link SIMPLE} and given username and password as auth payload {@link Buffer}
 */
function encodeSimpleAuthMetadata(username, password) {
    var usernameBuffer = Buffer.from(username);
    var passwordBuffer = Buffer.from(password);
    var usernameLength = usernameBuffer.byteLength;
    if (usernameLength > 65535) {
        throw new Error("Username should be shorter than or equal to 65535 bytes length in UTF-8 encoding but the given was ".concat(usernameLength));
    }
    var capacity = authTypeIdBytesLength + usernameLengthBytesLength;
    var buffer = Buffer.allocUnsafe(capacity);
    // eslint-disable-next-line no-bitwise
    buffer.writeUInt8(WellKnownAuthType_1.WellKnownAuthType.SIMPLE.identifier | streamMetadataKnownMask);
    buffer.writeUInt16BE(usernameLength, 1);
    return Buffer.concat([buffer, usernameBuffer, passwordBuffer]);
}
exports.encodeSimpleAuthMetadata = encodeSimpleAuthMetadata;
/**
 * Encode Bearer Auth metadata with the given token
 *
 * @param token token
 * @returns encoded {@link BEARER} and given token as auth payload {@link Buffer}
 */
function encodeBearerAuthMetadata(token) {
    var tokenBuffer = Buffer.from(token);
    var buffer = Buffer.allocUnsafe(authTypeIdBytesLength);
    // eslint-disable-next-line no-bitwise
    buffer.writeUInt8(WellKnownAuthType_1.WellKnownAuthType.BEARER.identifier | streamMetadataKnownMask);
    return Buffer.concat([buffer, tokenBuffer]);
}
exports.encodeBearerAuthMetadata = encodeBearerAuthMetadata;
/**
 * Decode auth metadata {@link Buffer} into {@link AuthMetadata} object
 *
 * @param metadata auth metadata {@link Buffer}
 * @returns decoded {@link AuthMetadata}
 */
function decodeAuthMetadata(metadata) {
    if (metadata.byteLength < 1) {
        throw new Error("Unable to decode Auth metadata. Not enough readable bytes");
    }
    var lengthOrId = metadata.readUInt8();
    // eslint-disable-next-line no-bitwise
    var normalizedId = lengthOrId & streamMetadataLengthMask;
    if (normalizedId !== lengthOrId) {
        var authType = WellKnownAuthType_1.WellKnownAuthType.fromIdentifier(normalizedId);
        return {
            payload: metadata.slice(1),
            type: {
                identifier: authType.identifier,
                string: authType.string,
            },
        };
    }
    else {
        // encoded length is realLength - 1 in order to avoid intersection with 0x00 authtype
        var realLength = lengthOrId + 1;
        if (metadata.byteLength < realLength + customAuthTypeBytesLength) {
            throw new Error("Unable to decode custom Auth type. Malformed length or auth type string");
        }
        var customAuthTypeString = metadata.toString("utf8", customAuthTypeBytesLength, customAuthTypeBytesLength + realLength);
        var payload = metadata.slice(realLength + customAuthTypeBytesLength);
        return {
            payload: payload,
            type: {
                identifier: WellKnownAuthType_1.WellKnownAuthType.UNPARSEABLE_AUTH_TYPE.identifier,
                string: customAuthTypeString,
            },
        };
    }
}
exports.decodeAuthMetadata = decodeAuthMetadata;
/**
 * Read up to 129 bytes from the given metadata in order to get the custom Auth Type
 *
 * @param authPayload
 * @return sliced username and password buffers
 */
function decodeSimpleAuthPayload(authPayload) {
    if (authPayload.byteLength < usernameLengthBytesLength) {
        throw new Error("Unable to decode Simple Auth Payload. Not enough readable bytes");
    }
    var usernameLength = authPayload.readUInt16BE();
    if (authPayload.byteLength < usernameLength + usernameLengthBytesLength) {
        throw new Error("Unable to decode Simple Auth Payload. Not enough readable bytes");
    }
    var username = authPayload.slice(usernameLengthBytesLength, usernameLengthBytesLength + usernameLength);
    var password = authPayload.slice(usernameLengthBytesLength + usernameLength);
    return { password: password, username: username };
}
exports.decodeSimpleAuthPayload = decodeSimpleAuthPayload;

}).call(this)}).call(this,require("buffer").Buffer)
},{"./WellKnownAuthType":8,"buffer":2}],6:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WellKnownMimeTypeEntry = exports.ReservedMimeTypeEntry = exports.ExplicitMimeTimeEntry = exports.decodeCompositeMetadata = exports.encodeWellKnownMetadataHeader = exports.encodeCustomMetadataHeader = exports.decodeMimeTypeFromMimeBuffer = exports.decodeMimeAndContentBuffersSlices = exports.encodeAndAddWellKnownMetadata = exports.encodeAndAddCustomMetadata = exports.encodeCompositeMetadata = exports.CompositeMetadata = void 0;
var rsocket_core_1 = require("rsocket-core");
var WellKnownMimeType_1 = require("./WellKnownMimeType");
var CompositeMetadata = /** @class */ (function () {
    function CompositeMetadata(buffer) {
        this._buffer = buffer;
    }
    CompositeMetadata.prototype.iterator = function () {
        return decodeCompositeMetadata(this._buffer);
    };
    CompositeMetadata.prototype[Symbol.iterator] = function () {
        return decodeCompositeMetadata(this._buffer);
    };
    return CompositeMetadata;
}());
exports.CompositeMetadata = CompositeMetadata;
function encodeCompositeMetadata(metadata) {
    var e_1, _a;
    var encodedCompositeMetadata = Buffer.allocUnsafe(0);
    try {
        for (var metadata_1 = __values(metadata), metadata_1_1 = metadata_1.next(); !metadata_1_1.done; metadata_1_1 = metadata_1.next()) {
            var _b = __read(metadata_1_1.value, 2), metadataKey = _b[0], metadataValue = _b[1];
            var metadataRealValue = typeof metadataValue === "function" ? metadataValue() : metadataValue;
            if (metadataKey instanceof WellKnownMimeType_1.WellKnownMimeType ||
                typeof metadataKey === "number" ||
                metadataKey.constructor.name === "WellKnownMimeType") {
                encodedCompositeMetadata = encodeAndAddWellKnownMetadata(encodedCompositeMetadata, metadataKey, metadataRealValue);
            }
            else {
                encodedCompositeMetadata = encodeAndAddCustomMetadata(encodedCompositeMetadata, metadataKey, metadataRealValue);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (metadata_1_1 && !metadata_1_1.done && (_a = metadata_1.return)) _a.call(metadata_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return encodedCompositeMetadata;
}
exports.encodeCompositeMetadata = encodeCompositeMetadata;
// see #encodeMetadataHeader(ByteBufAllocator, String, int)
function encodeAndAddCustomMetadata(compositeMetaData, customMimeType, metadata) {
    return Buffer.concat([
        compositeMetaData,
        encodeCustomMetadataHeader(customMimeType, metadata.byteLength),
        metadata,
    ]);
}
exports.encodeAndAddCustomMetadata = encodeAndAddCustomMetadata;
// see #encodeMetadataHeader(ByteBufAllocator, byte, int)
function encodeAndAddWellKnownMetadata(compositeMetadata, knownMimeType, metadata) {
    var mimeTypeId;
    if (Number.isInteger(knownMimeType)) {
        mimeTypeId = knownMimeType;
    }
    else {
        mimeTypeId = knownMimeType.identifier;
    }
    return Buffer.concat([
        compositeMetadata,
        encodeWellKnownMetadataHeader(mimeTypeId, metadata.byteLength),
        metadata,
    ]);
}
exports.encodeAndAddWellKnownMetadata = encodeAndAddWellKnownMetadata;
function decodeMimeAndContentBuffersSlices(compositeMetadata, entryIndex) {
    var mimeIdOrLength = compositeMetadata.readInt8(entryIndex);
    var mime;
    var toSkip = entryIndex;
    if ((mimeIdOrLength & STREAM_METADATA_KNOWN_MASK) ===
        STREAM_METADATA_KNOWN_MASK) {
        mime = compositeMetadata.slice(toSkip, toSkip + 1);
        toSkip += 1;
    }
    else {
        // M flag unset, remaining 7 bits are the length of the mime
        var mimeLength = (mimeIdOrLength & 0xff) + 1;
        if (compositeMetadata.byteLength > toSkip + mimeLength) {
            // need to be able to read an extra mimeLength bytes (we have already read one so byteLength should be strictly more)
            // here we need a way for the returned ByteBuf to differentiate between a
            // 1-byte length mime type and a 1 byte encoded mime id, preferably without
            // re-applying the byte mask. The easiest way is to include the initial byte
            // and have further decoding ignore the first byte. 1 byte buffer == id, 2+ byte
            // buffer == full mime string.
            mime = compositeMetadata.slice(toSkip, toSkip + mimeLength + 1);
            // we thus need to skip the bytes we just sliced, but not the flag/length byte
            // which was already skipped in initial read
            toSkip += mimeLength + 1;
        }
        else {
            throw new Error("Metadata is malformed. Inappropriately formed Mime Length");
        }
    }
    if (compositeMetadata.byteLength >= toSkip + 3) {
        // ensures the length medium can be read
        var metadataLength = (0, rsocket_core_1.readUInt24BE)(compositeMetadata, toSkip);
        toSkip += 3;
        if (compositeMetadata.byteLength >= metadataLength + toSkip) {
            var metadata = compositeMetadata.slice(toSkip, toSkip + metadataLength);
            return [mime, metadata];
        }
        else {
            throw new Error("Metadata is malformed. Inappropriately formed Metadata Length or malformed content");
        }
    }
    else {
        throw new Error("Metadata is malformed. Metadata Length is absent or malformed");
    }
}
exports.decodeMimeAndContentBuffersSlices = decodeMimeAndContentBuffersSlices;
function decodeMimeTypeFromMimeBuffer(flyweightMimeBuffer) {
    if (flyweightMimeBuffer.length < 2) {
        throw new Error("Unable to decode explicit MIME type");
    }
    // the encoded length is assumed to be kept at the start of the buffer
    // but also assumed to be irrelevant because the rest of the slice length
    // actually already matches _decoded_length
    return flyweightMimeBuffer.toString("ascii", 1);
}
exports.decodeMimeTypeFromMimeBuffer = decodeMimeTypeFromMimeBuffer;
function encodeCustomMetadataHeader(customMime, metadataLength) {
    var metadataHeader = Buffer.allocUnsafe(4 + customMime.length);
    // reserve 1 byte for the customMime length
    // /!\ careful not to read that first byte, which is random at this point
    // int writerIndexInitial = metadataHeader.writerIndex();
    // metadataHeader.writerIndex(writerIndexInitial + 1);
    // write the custom mime in UTF8 but validate it is all ASCII-compatible
    // (which produces the right result since ASCII chars are still encoded on 1 byte in UTF8)
    var customMimeLength = metadataHeader.write(customMime, 1);
    if (!isAscii(metadataHeader, 1)) {
        throw new Error("Custom mime type must be US_ASCII characters only");
    }
    if (customMimeLength < 1 || customMimeLength > 128) {
        throw new Error("Custom mime type must have a strictly positive length that fits on 7 unsigned bits, ie 1-128");
    }
    // encoded length is one less than actual length, since 0 is never a valid length, which gives
    // wider representation range
    metadataHeader.writeUInt8(customMimeLength - 1);
    (0, rsocket_core_1.writeUInt24BE)(metadataHeader, metadataLength, customMimeLength + 1);
    return metadataHeader;
}
exports.encodeCustomMetadataHeader = encodeCustomMetadataHeader;
function encodeWellKnownMetadataHeader(mimeType, metadataLength) {
    var buffer = Buffer.allocUnsafe(4);
    buffer.writeUInt8(mimeType | STREAM_METADATA_KNOWN_MASK);
    (0, rsocket_core_1.writeUInt24BE)(buffer, metadataLength, 1);
    return buffer;
}
exports.encodeWellKnownMetadataHeader = encodeWellKnownMetadataHeader;
function decodeCompositeMetadata(buffer) {
    var length, entryIndex, headerAndData, header, data, typeString, id, type;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                length = buffer.byteLength;
                entryIndex = 0;
                _a.label = 1;
            case 1:
                if (!(entryIndex < length)) return [3 /*break*/, 7];
                headerAndData = decodeMimeAndContentBuffersSlices(buffer, entryIndex);
                header = headerAndData[0];
                data = headerAndData[1];
                entryIndex = computeNextEntryIndex(entryIndex, header, data);
                if (!!isWellKnownMimeType(header)) return [3 /*break*/, 3];
                typeString = decodeMimeTypeFromMimeBuffer(header);
                if (!typeString) {
                    throw new Error("MIME type cannot be null");
                }
                return [4 /*yield*/, new ExplicitMimeTimeEntry(data, typeString)];
            case 2:
                _a.sent();
                return [3 /*break*/, 1];
            case 3:
                id = decodeMimeIdFromMimeBuffer(header);
                type = WellKnownMimeType_1.WellKnownMimeType.fromIdentifier(id);
                if (!(WellKnownMimeType_1.WellKnownMimeType.UNKNOWN_RESERVED_MIME_TYPE === type)) return [3 /*break*/, 5];
                return [4 /*yield*/, new ReservedMimeTypeEntry(data, id)];
            case 4:
                _a.sent();
                return [3 /*break*/, 1];
            case 5: return [4 /*yield*/, new WellKnownMimeTypeEntry(data, type)];
            case 6:
                _a.sent();
                return [3 /*break*/, 1];
            case 7: return [2 /*return*/];
        }
    });
}
exports.decodeCompositeMetadata = decodeCompositeMetadata;
var ExplicitMimeTimeEntry = /** @class */ (function () {
    function ExplicitMimeTimeEntry(content, type) {
        this.content = content;
        this.type = type;
    }
    return ExplicitMimeTimeEntry;
}());
exports.ExplicitMimeTimeEntry = ExplicitMimeTimeEntry;
var ReservedMimeTypeEntry = /** @class */ (function () {
    function ReservedMimeTypeEntry(content, type) {
        this.content = content;
        this.type = type;
    }
    Object.defineProperty(ReservedMimeTypeEntry.prototype, "mimeType", {
        /**
         * Since this entry represents a compressed id that couldn't be decoded, this is
         * always {@code null}.
         */
        get: function () {
            return undefined;
        },
        enumerable: false,
        configurable: true
    });
    return ReservedMimeTypeEntry;
}());
exports.ReservedMimeTypeEntry = ReservedMimeTypeEntry;
var WellKnownMimeTypeEntry = /** @class */ (function () {
    function WellKnownMimeTypeEntry(content, type) {
        this.content = content;
        this.type = type;
    }
    Object.defineProperty(WellKnownMimeTypeEntry.prototype, "mimeType", {
        get: function () {
            return this.type.string;
        },
        enumerable: false,
        configurable: true
    });
    return WellKnownMimeTypeEntry;
}());
exports.WellKnownMimeTypeEntry = WellKnownMimeTypeEntry;
function decodeMimeIdFromMimeBuffer(mimeBuffer) {
    if (!isWellKnownMimeType(mimeBuffer)) {
        return WellKnownMimeType_1.WellKnownMimeType.UNPARSEABLE_MIME_TYPE.identifier;
    }
    return mimeBuffer.readInt8() & STREAM_METADATA_LENGTH_MASK;
}
function computeNextEntryIndex(currentEntryIndex, headerSlice, contentSlice) {
    return (currentEntryIndex +
        headerSlice.byteLength + // this includes the mime length byte
        3 + // 3 bytes of the content length, which are excluded from the slice
        contentSlice.byteLength);
}
function isWellKnownMimeType(header) {
    return header.byteLength === 1;
}
var STREAM_METADATA_KNOWN_MASK = 0x80; // 1000 0000
var STREAM_METADATA_LENGTH_MASK = 0x7f; // 0111 1111
function isAscii(buffer, offset) {
    var isAscii = true;
    for (var i = offset, length_1 = buffer.length; i < length_1; i++) {
        if (buffer[i] > 127) {
            isAscii = false;
            break;
        }
    }
    return isAscii;
}

}).call(this)}).call(this,require("buffer").Buffer)
},{"./WellKnownMimeType":9,"buffer":2,"rsocket-core":29}],7:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeRoutes = exports.encodeRoute = exports.encodeRoutes = exports.RoutingMetadata = void 0;
var RoutingMetadata = /** @class */ (function () {
    function RoutingMetadata(buffer) {
        this._buffer = buffer;
    }
    RoutingMetadata.prototype.iterator = function () {
        return decodeRoutes(this._buffer);
    };
    RoutingMetadata.prototype[Symbol.iterator] = function () {
        return decodeRoutes(this._buffer);
    };
    return RoutingMetadata;
}());
exports.RoutingMetadata = RoutingMetadata;
/**
 * Encode given set of routes into {@link Buffer} following the <a href="https://github.com/rsocket/rsocket/blob/master/Extensions/Routing.md">Routing Metadata Layout</a>
 *
 * @param routes non-empty set of routes
 * @returns {Buffer} with encoded content
 */
function encodeRoutes() {
    var routes = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        routes[_i] = arguments[_i];
    }
    if (routes.length < 1) {
        throw new Error("routes should be non empty array");
    }
    return Buffer.concat(routes.map(function (route) { return encodeRoute(route); }));
}
exports.encodeRoutes = encodeRoutes;
function encodeRoute(route) {
    var encodedRoute = Buffer.from(route, "utf8");
    if (encodedRoute.length > 255) {
        throw new Error("route length should fit into unsigned byte length but the given one is ".concat(encodedRoute.length));
    }
    var encodedLength = Buffer.allocUnsafe(1);
    encodedLength.writeUInt8(encodedRoute.length);
    return Buffer.concat([encodedLength, encodedRoute]);
}
exports.encodeRoute = encodeRoute;
function decodeRoutes(routeMetadataBuffer) {
    var length, offset, routeLength, route;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                length = routeMetadataBuffer.byteLength;
                offset = 0;
                _a.label = 1;
            case 1:
                if (!(offset < length)) return [3 /*break*/, 3];
                routeLength = routeMetadataBuffer.readUInt8(offset++);
                if (offset + routeLength > length) {
                    throw new Error("Malformed RouteMetadata. Offset(".concat(offset, ") + RouteLength(").concat(routeLength, ") is greater than TotalLength"));
                }
                route = routeMetadataBuffer.toString("utf8", offset, offset + routeLength);
                offset += routeLength;
                return [4 /*yield*/, route];
            case 2:
                _a.sent();
                return [3 /*break*/, 1];
            case 3: return [2 /*return*/];
        }
    });
}
exports.decodeRoutes = decodeRoutes;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":2}],8:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WellKnownAuthType = void 0;
var WellKnownAuthType = /** @class */ (function () {
    function WellKnownAuthType(string, identifier) {
        this.string = string;
        this.identifier = identifier;
    }
    /**
     * Find the {@link WellKnownAuthType} for the given identifier (as an {@link number}). Valid
     * identifiers are defined to be integers between 0 and 127, inclusive. Identifiers outside of
     * this range will produce the {@link #UNPARSEABLE_AUTH_TYPE}. Additionally, some identifiers in
     * that range are still only reserved and don't have a type associated yet: this method returns
     * the {@link #UNKNOWN_RESERVED_AUTH_TYPE} when passing such an identifier, which lets call sites
     * potentially detect this and keep the original representation when transmitting the associated
     * metadata buffer.
     *
     * @param id the looked up identifier
     * @return the {@link WellKnownAuthType}, or {@link #UNKNOWN_RESERVED_AUTH_TYPE} if the id is out
     *     of the specification's range, or {@link #UNKNOWN_RESERVED_AUTH_TYPE} if the id is one that
     *     is merely reserved but unknown to this implementation.
     */
    WellKnownAuthType.fromIdentifier = function (id) {
        if (id < 0x00 || id > 0x7f) {
            return WellKnownAuthType.UNPARSEABLE_AUTH_TYPE;
        }
        return WellKnownAuthType.TYPES_BY_AUTH_ID[id];
    };
    /**
     * Find the {@link WellKnownAuthType} for the given {@link String} representation. If the
     * representation is {@code null} or doesn't match a {@link WellKnownAuthType}, the {@link
     * #UNPARSEABLE_AUTH_TYPE} is returned.
     *
     * @param authTypeString the looked up mime type
     * @return the matching {@link WellKnownAuthType}, or {@link #UNPARSEABLE_AUTH_TYPE} if none
     *     matches
     */
    WellKnownAuthType.fromString = function (authTypeString) {
        if (!authTypeString) {
            throw new Error("type must be non-null");
        }
        // force UNPARSEABLE if by chance UNKNOWN_RESERVED_MIME_TYPE's text has been used
        if (authTypeString === WellKnownAuthType.UNKNOWN_RESERVED_AUTH_TYPE.string) {
            return WellKnownAuthType.UNPARSEABLE_AUTH_TYPE;
        }
        return (WellKnownAuthType.TYPES_BY_AUTH_STRING.get(authTypeString) ||
            WellKnownAuthType.UNPARSEABLE_AUTH_TYPE);
    };
    /** @see #string() */
    WellKnownAuthType.prototype.toString = function () {
        return this.string;
    };
    return WellKnownAuthType;
}());
exports.WellKnownAuthType = WellKnownAuthType;
(function (WellKnownAuthType) {
    var e_1, _a;
    WellKnownAuthType.UNPARSEABLE_AUTH_TYPE = new WellKnownAuthType("UNPARSEABLE_AUTH_TYPE_DO_NOT_USE", -2);
    WellKnownAuthType.UNKNOWN_RESERVED_AUTH_TYPE = new WellKnownAuthType("UNKNOWN_YET_RESERVED_DO_NOT_USE", -1);
    WellKnownAuthType.SIMPLE = new WellKnownAuthType("simple", 0x00);
    WellKnownAuthType.BEARER = new WellKnownAuthType("bearer", 0x01);
    WellKnownAuthType.TYPES_BY_AUTH_ID = new Array(128);
    WellKnownAuthType.TYPES_BY_AUTH_STRING = new Map();
    var ALL_MIME_TYPES = [
        WellKnownAuthType.UNPARSEABLE_AUTH_TYPE,
        WellKnownAuthType.UNKNOWN_RESERVED_AUTH_TYPE,
        WellKnownAuthType.SIMPLE,
        WellKnownAuthType.BEARER,
    ];
    WellKnownAuthType.TYPES_BY_AUTH_ID.fill(WellKnownAuthType.UNKNOWN_RESERVED_AUTH_TYPE);
    try {
        for (var ALL_MIME_TYPES_1 = __values(ALL_MIME_TYPES), ALL_MIME_TYPES_1_1 = ALL_MIME_TYPES_1.next(); !ALL_MIME_TYPES_1_1.done; ALL_MIME_TYPES_1_1 = ALL_MIME_TYPES_1.next()) {
            var value = ALL_MIME_TYPES_1_1.value;
            if (value.identifier >= 0) {
                WellKnownAuthType.TYPES_BY_AUTH_ID[value.identifier] = value;
                WellKnownAuthType.TYPES_BY_AUTH_STRING.set(value.string, value);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (ALL_MIME_TYPES_1_1 && !ALL_MIME_TYPES_1_1.done && (_a = ALL_MIME_TYPES_1.return)) _a.call(ALL_MIME_TYPES_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    if (Object.seal) {
        Object.seal(WellKnownAuthType.TYPES_BY_AUTH_ID);
    }
})(WellKnownAuthType = exports.WellKnownAuthType || (exports.WellKnownAuthType = {}));
exports.WellKnownAuthType = WellKnownAuthType;

},{}],9:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WellKnownMimeType = void 0;
var WellKnownMimeType = /** @class */ (function () {
    function WellKnownMimeType(string, identifier) {
        this.string = string;
        this.identifier = identifier;
    }
    /**
     * Find the {@link WellKnownMimeType} for the given identifier (as an {@code int}). Valid
     * identifiers are defined to be integers between 0 and 127, inclusive. Identifiers outside of
     * this range will produce the {@link #UNPARSEABLE_MIME_TYPE}. Additionally, some identifiers in
     * that range are still only reserved and don't have a type associated yet: this method returns
     * the {@link #UNKNOWN_RESERVED_MIME_TYPE} when passing such an identifier, which lets call sites
     * potentially detect this and keep the original representation when transmitting the associated
     * metadata buffer.
     *
     * @param id the looked up identifier
     * @return the {@link WellKnownMimeType}, or {@link #UNKNOWN_RESERVED_MIME_TYPE} if the id is out
     *     of the specification's range, or {@link #UNKNOWN_RESERVED_MIME_TYPE} if the id is one that
     *     is merely reserved but unknown to this implementation.
     */
    WellKnownMimeType.fromIdentifier = function (id) {
        if (id < 0x00 || id > 0x7f) {
            return WellKnownMimeType.UNPARSEABLE_MIME_TYPE;
        }
        return WellKnownMimeType.TYPES_BY_MIME_ID[id];
    };
    /**
     * Find the {@link WellKnownMimeType} for the given {@link String} representation. If the
     * representation is {@code null} or doesn't match a {@link WellKnownMimeType}, the {@link
     * #UNPARSEABLE_MIME_TYPE} is returned.
     *
     * @param mimeType the looked up mime type
     * @return the matching {@link WellKnownMimeType}, or {@link #UNPARSEABLE_MIME_TYPE} if none
     *     matches
     */
    WellKnownMimeType.fromString = function (mimeType) {
        if (!mimeType) {
            throw new Error("type must be non-null");
        }
        // force UNPARSEABLE if by chance UNKNOWN_RESERVED_MIME_TYPE's text has been used
        if (mimeType === WellKnownMimeType.UNKNOWN_RESERVED_MIME_TYPE.string) {
            return WellKnownMimeType.UNPARSEABLE_MIME_TYPE;
        }
        return (WellKnownMimeType.TYPES_BY_MIME_STRING.get(mimeType) ||
            WellKnownMimeType.UNPARSEABLE_MIME_TYPE);
    };
    WellKnownMimeType.prototype.toString = function () {
        return this.string;
    };
    return WellKnownMimeType;
}());
exports.WellKnownMimeType = WellKnownMimeType;
(function (WellKnownMimeType) {
    var e_1, _a;
    WellKnownMimeType.UNPARSEABLE_MIME_TYPE = new WellKnownMimeType("UNPARSEABLE_MIME_TYPE_DO_NOT_USE", -2);
    WellKnownMimeType.UNKNOWN_RESERVED_MIME_TYPE = new WellKnownMimeType("UNKNOWN_YET_RESERVED_DO_NOT_USE", -1);
    WellKnownMimeType.APPLICATION_AVRO = new WellKnownMimeType("application/avro", 0x00);
    WellKnownMimeType.APPLICATION_CBOR = new WellKnownMimeType("application/cbor", 0x01);
    WellKnownMimeType.APPLICATION_GRAPHQL = new WellKnownMimeType("application/graphql", 0x02);
    WellKnownMimeType.APPLICATION_GZIP = new WellKnownMimeType("application/gzip", 0x03);
    WellKnownMimeType.APPLICATION_JAVASCRIPT = new WellKnownMimeType("application/javascript", 0x04);
    WellKnownMimeType.APPLICATION_JSON = new WellKnownMimeType("application/json", 0x05);
    WellKnownMimeType.APPLICATION_OCTET_STREAM = new WellKnownMimeType("application/octet-stream", 0x06);
    WellKnownMimeType.APPLICATION_PDF = new WellKnownMimeType("application/pdf", 0x07);
    WellKnownMimeType.APPLICATION_THRIFT = new WellKnownMimeType("application/vnd.apache.thrift.binary", 0x08);
    WellKnownMimeType.APPLICATION_PROTOBUF = new WellKnownMimeType("application/vnd.google.protobuf", 0x09);
    WellKnownMimeType.APPLICATION_XML = new WellKnownMimeType("application/xml", 0x0a);
    WellKnownMimeType.APPLICATION_ZIP = new WellKnownMimeType("application/zip", 0x0b);
    WellKnownMimeType.AUDIO_AAC = new WellKnownMimeType("audio/aac", 0x0c);
    WellKnownMimeType.AUDIO_MP3 = new WellKnownMimeType("audio/mp3", 0x0d);
    WellKnownMimeType.AUDIO_MP4 = new WellKnownMimeType("audio/mp4", 0x0e);
    WellKnownMimeType.AUDIO_MPEG3 = new WellKnownMimeType("audio/mpeg3", 0x0f);
    WellKnownMimeType.AUDIO_MPEG = new WellKnownMimeType("audio/mpeg", 0x10);
    WellKnownMimeType.AUDIO_OGG = new WellKnownMimeType("audio/ogg", 0x11);
    WellKnownMimeType.AUDIO_OPUS = new WellKnownMimeType("audio/opus", 0x12);
    WellKnownMimeType.AUDIO_VORBIS = new WellKnownMimeType("audio/vorbis", 0x13);
    WellKnownMimeType.IMAGE_BMP = new WellKnownMimeType("image/bmp", 0x14);
    WellKnownMimeType.IMAGE_GIG = new WellKnownMimeType("image/gif", 0x15);
    WellKnownMimeType.IMAGE_HEIC_SEQUENCE = new WellKnownMimeType("image/heic-sequence", 0x16);
    WellKnownMimeType.IMAGE_HEIC = new WellKnownMimeType("image/heic", 0x17);
    WellKnownMimeType.IMAGE_HEIF_SEQUENCE = new WellKnownMimeType("image/heif-sequence", 0x18);
    WellKnownMimeType.IMAGE_HEIF = new WellKnownMimeType("image/heif", 0x19);
    WellKnownMimeType.IMAGE_JPEG = new WellKnownMimeType("image/jpeg", 0x1a);
    WellKnownMimeType.IMAGE_PNG = new WellKnownMimeType("image/png", 0x1b);
    WellKnownMimeType.IMAGE_TIFF = new WellKnownMimeType("image/tiff", 0x1c);
    WellKnownMimeType.MULTIPART_MIXED = new WellKnownMimeType("multipart/mixed", 0x1d);
    WellKnownMimeType.TEXT_CSS = new WellKnownMimeType("text/css", 0x1e);
    WellKnownMimeType.TEXT_CSV = new WellKnownMimeType("text/csv", 0x1f);
    WellKnownMimeType.TEXT_HTML = new WellKnownMimeType("text/html", 0x20);
    WellKnownMimeType.TEXT_PLAIN = new WellKnownMimeType("text/plain", 0x21);
    WellKnownMimeType.TEXT_XML = new WellKnownMimeType("text/xml", 0x22);
    WellKnownMimeType.VIDEO_H264 = new WellKnownMimeType("video/H264", 0x23);
    WellKnownMimeType.VIDEO_H265 = new WellKnownMimeType("video/H265", 0x24);
    WellKnownMimeType.VIDEO_VP8 = new WellKnownMimeType("video/VP8", 0x25);
    WellKnownMimeType.APPLICATION_HESSIAN = new WellKnownMimeType("application/x-hessian", 0x26);
    WellKnownMimeType.APPLICATION_JAVA_OBJECT = new WellKnownMimeType("application/x-java-object", 0x27);
    WellKnownMimeType.APPLICATION_CLOUDEVENTS_JSON = new WellKnownMimeType("application/cloudevents+json", 0x28);
    // ... reserved for future use ...
    WellKnownMimeType.MESSAGE_RSOCKET_MIMETYPE = new WellKnownMimeType("message/x.rsocket.mime-type.v0", 0x7a);
    WellKnownMimeType.MESSAGE_RSOCKET_ACCEPT_MIMETYPES = new WellKnownMimeType("message/x.rsocket.accept-mime-types.v0", 0x7b);
    WellKnownMimeType.MESSAGE_RSOCKET_AUTHENTICATION = new WellKnownMimeType("message/x.rsocket.authentication.v0", 0x7c);
    WellKnownMimeType.MESSAGE_RSOCKET_TRACING_ZIPKIN = new WellKnownMimeType("message/x.rsocket.tracing-zipkin.v0", 0x7d);
    WellKnownMimeType.MESSAGE_RSOCKET_ROUTING = new WellKnownMimeType("message/x.rsocket.routing.v0", 0x7e);
    WellKnownMimeType.MESSAGE_RSOCKET_COMPOSITE_METADATA = new WellKnownMimeType("message/x.rsocket.composite-metadata.v0", 0x7f);
    WellKnownMimeType.TYPES_BY_MIME_ID = new Array(128);
    WellKnownMimeType.TYPES_BY_MIME_STRING = new Map();
    var ALL_MIME_TYPES = [
        WellKnownMimeType.UNPARSEABLE_MIME_TYPE,
        WellKnownMimeType.UNKNOWN_RESERVED_MIME_TYPE,
        WellKnownMimeType.APPLICATION_AVRO,
        WellKnownMimeType.APPLICATION_CBOR,
        WellKnownMimeType.APPLICATION_GRAPHQL,
        WellKnownMimeType.APPLICATION_GZIP,
        WellKnownMimeType.APPLICATION_JAVASCRIPT,
        WellKnownMimeType.APPLICATION_JSON,
        WellKnownMimeType.APPLICATION_OCTET_STREAM,
        WellKnownMimeType.APPLICATION_PDF,
        WellKnownMimeType.APPLICATION_THRIFT,
        WellKnownMimeType.APPLICATION_PROTOBUF,
        WellKnownMimeType.APPLICATION_XML,
        WellKnownMimeType.APPLICATION_ZIP,
        WellKnownMimeType.AUDIO_AAC,
        WellKnownMimeType.AUDIO_MP3,
        WellKnownMimeType.AUDIO_MP4,
        WellKnownMimeType.AUDIO_MPEG3,
        WellKnownMimeType.AUDIO_MPEG,
        WellKnownMimeType.AUDIO_OGG,
        WellKnownMimeType.AUDIO_OPUS,
        WellKnownMimeType.AUDIO_VORBIS,
        WellKnownMimeType.IMAGE_BMP,
        WellKnownMimeType.IMAGE_GIG,
        WellKnownMimeType.IMAGE_HEIC_SEQUENCE,
        WellKnownMimeType.IMAGE_HEIC,
        WellKnownMimeType.IMAGE_HEIF_SEQUENCE,
        WellKnownMimeType.IMAGE_HEIF,
        WellKnownMimeType.IMAGE_JPEG,
        WellKnownMimeType.IMAGE_PNG,
        WellKnownMimeType.IMAGE_TIFF,
        WellKnownMimeType.MULTIPART_MIXED,
        WellKnownMimeType.TEXT_CSS,
        WellKnownMimeType.TEXT_CSV,
        WellKnownMimeType.TEXT_HTML,
        WellKnownMimeType.TEXT_PLAIN,
        WellKnownMimeType.TEXT_XML,
        WellKnownMimeType.VIDEO_H264,
        WellKnownMimeType.VIDEO_H265,
        WellKnownMimeType.VIDEO_VP8,
        WellKnownMimeType.APPLICATION_HESSIAN,
        WellKnownMimeType.APPLICATION_JAVA_OBJECT,
        WellKnownMimeType.APPLICATION_CLOUDEVENTS_JSON,
        WellKnownMimeType.MESSAGE_RSOCKET_MIMETYPE,
        WellKnownMimeType.MESSAGE_RSOCKET_ACCEPT_MIMETYPES,
        WellKnownMimeType.MESSAGE_RSOCKET_AUTHENTICATION,
        WellKnownMimeType.MESSAGE_RSOCKET_TRACING_ZIPKIN,
        WellKnownMimeType.MESSAGE_RSOCKET_ROUTING,
        WellKnownMimeType.MESSAGE_RSOCKET_COMPOSITE_METADATA,
    ];
    WellKnownMimeType.TYPES_BY_MIME_ID.fill(WellKnownMimeType.UNKNOWN_RESERVED_MIME_TYPE);
    try {
        for (var ALL_MIME_TYPES_1 = __values(ALL_MIME_TYPES), ALL_MIME_TYPES_1_1 = ALL_MIME_TYPES_1.next(); !ALL_MIME_TYPES_1_1.done; ALL_MIME_TYPES_1_1 = ALL_MIME_TYPES_1.next()) {
            var value = ALL_MIME_TYPES_1_1.value;
            if (value.identifier >= 0) {
                WellKnownMimeType.TYPES_BY_MIME_ID[value.identifier] = value;
                WellKnownMimeType.TYPES_BY_MIME_STRING.set(value.string, value);
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (ALL_MIME_TYPES_1_1 && !ALL_MIME_TYPES_1_1.done && (_a = ALL_MIME_TYPES_1.return)) _a.call(ALL_MIME_TYPES_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    if (Object.seal) {
        Object.seal(WellKnownMimeType.TYPES_BY_MIME_ID);
    }
})(WellKnownMimeType = exports.WellKnownMimeType || (exports.WellKnownMimeType = {}));
exports.WellKnownMimeType = WellKnownMimeType;

},{}],10:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./CompositeMetadata"), exports);
__exportStar(require("./WellKnownMimeType"), exports);
__exportStar(require("./AuthMetadata"), exports);
__exportStar(require("./RoutingMetadata"), exports);
__exportStar(require("./WellKnownAuthType"), exports);

},{"./AuthMetadata":5,"./CompositeMetadata":6,"./RoutingMetadata":7,"./WellKnownAuthType":8,"./WellKnownMimeType":9}],11:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer = exports.ResumableClientServerInputMultiplexerDemultiplexer = exports.ClientServerInputMultiplexerDemultiplexer = exports.StreamIdGenerator = void 0;
var _1 = require(".");
var Deferred_1 = require("./Deferred");
var Errors_1 = require("./Errors");
var Frames_1 = require("./Frames");
var StreamIdGenerator;
(function (StreamIdGenerator) {
    function create(seedId) {
        return new StreamIdGeneratorImpl(seedId);
    }
    StreamIdGenerator.create = create;
    var StreamIdGeneratorImpl = /** @class */ (function () {
        function StreamIdGeneratorImpl(currentId) {
            this.currentId = currentId;
        }
        StreamIdGeneratorImpl.prototype.next = function (handler) {
            var nextId = this.currentId + 2;
            if (!handler(nextId)) {
                return;
            }
            this.currentId = nextId;
        };
        return StreamIdGeneratorImpl;
    }());
})(StreamIdGenerator = exports.StreamIdGenerator || (exports.StreamIdGenerator = {}));
var ClientServerInputMultiplexerDemultiplexer = /** @class */ (function (_super) {
    __extends(ClientServerInputMultiplexerDemultiplexer, _super);
    function ClientServerInputMultiplexerDemultiplexer(streamIdSupplier, outbound, closeable) {
        var _this = _super.call(this) || this;
        _this.streamIdSupplier = streamIdSupplier;
        _this.outbound = outbound;
        _this.closeable = closeable;
        _this.registry = {};
        closeable.onClose(_this.close.bind(_this));
        return _this;
    }
    ClientServerInputMultiplexerDemultiplexer.prototype.handle = function (frame) {
        if (Frames_1.Frame.isConnection(frame)) {
            if (frame.type === _1.FrameTypes.RESERVED) {
                // TODO: throw
                return;
            }
            this.connectionFramesHandler.handle(frame);
            // TODO: Connection Handler
        }
        else if (Frames_1.Frame.isRequest(frame)) {
            if (this.registry[frame.streamId]) {
                // TODO: Send error and close connection
                return;
            }
            this.requestFramesHandler.handle(frame, this);
        }
        else {
            var handler = this.registry[frame.streamId];
            if (!handler) {
                // TODO: add validation
                return;
            }
            handler.handle(frame);
        }
        // TODO: add extensions support
    };
    ClientServerInputMultiplexerDemultiplexer.prototype.connectionInbound = function (handler) {
        if (this.connectionFramesHandler) {
            throw new Error("Connection frame handler has already been installed");
        }
        this.connectionFramesHandler = handler;
    };
    ClientServerInputMultiplexerDemultiplexer.prototype.handleRequestStream = function (handler) {
        if (this.requestFramesHandler) {
            throw new Error("Stream handler has already been installed");
        }
        this.requestFramesHandler = handler;
    };
    ClientServerInputMultiplexerDemultiplexer.prototype.send = function (frame) {
        this.outbound.send(frame);
    };
    Object.defineProperty(ClientServerInputMultiplexerDemultiplexer.prototype, "connectionOutbound", {
        get: function () {
            return this;
        },
        enumerable: false,
        configurable: true
    });
    ClientServerInputMultiplexerDemultiplexer.prototype.createRequestStream = function (streamHandler) {
        var _this = this;
        // handle requester side stream registration
        if (this.done) {
            streamHandler.handleReject(new Error("Already closed"));
            return;
        }
        var registry = this.registry;
        this.streamIdSupplier.next(function (streamId) { return streamHandler.handleReady(streamId, _this); }, Object.keys(registry));
    };
    ClientServerInputMultiplexerDemultiplexer.prototype.connect = function (handler) {
        this.registry[handler.streamId] = handler;
    };
    ClientServerInputMultiplexerDemultiplexer.prototype.disconnect = function (stream) {
        delete this.registry[stream.streamId];
    };
    ClientServerInputMultiplexerDemultiplexer.prototype.close = function (error) {
        if (this.done) {
            _super.prototype.close.call(this, error);
            return;
        }
        for (var streamId in this.registry) {
            var stream = this.registry[streamId];
            stream.close(new Error("Closed. ".concat(error ? "Original cause [".concat(error, "].") : "")));
        }
        _super.prototype.close.call(this, error);
    };
    return ClientServerInputMultiplexerDemultiplexer;
}(Deferred_1.Deferred));
exports.ClientServerInputMultiplexerDemultiplexer = ClientServerInputMultiplexerDemultiplexer;
var ResumableClientServerInputMultiplexerDemultiplexer = /** @class */ (function (_super) {
    __extends(ResumableClientServerInputMultiplexerDemultiplexer, _super);
    function ResumableClientServerInputMultiplexerDemultiplexer(streamIdSupplier, outbound, closeable, frameStore, token, sessionStoreOrReconnector, sessionTimeout) {
        var _this = _super.call(this, streamIdSupplier, outbound, new Deferred_1.Deferred()) || this;
        _this.frameStore = frameStore;
        _this.token = token;
        _this.sessionTimeout = sessionTimeout;
        if (sessionStoreOrReconnector instanceof Function) {
            _this.reconnector = sessionStoreOrReconnector;
        }
        else {
            _this.sessionStore = sessionStoreOrReconnector;
        }
        closeable.onClose(_this.handleConnectionClose.bind(_this));
        return _this;
    }
    ResumableClientServerInputMultiplexerDemultiplexer.prototype.send = function (frame) {
        if (Frames_1.Frame.isConnection(frame)) {
            if (frame.type === _1.FrameTypes.KEEPALIVE) {
                frame.lastReceivedPosition = this.frameStore.lastReceivedFramePosition;
            }
            else if (frame.type === _1.FrameTypes.ERROR) {
                this.outbound.send(frame);
                if (this.sessionStore) {
                    delete this.sessionStore[this.token];
                }
                _super.prototype.close.call(this, new Errors_1.RSocketError(frame.code, frame.message));
                return;
            }
        }
        else {
            this.frameStore.store(frame);
        }
        this.outbound.send(frame);
    };
    ResumableClientServerInputMultiplexerDemultiplexer.prototype.handle = function (frame) {
        if (Frames_1.Frame.isConnection(frame)) {
            if (frame.type === _1.FrameTypes.KEEPALIVE) {
                try {
                    this.frameStore.dropTo(frame.lastReceivedPosition);
                }
                catch (re) {
                    this.outbound.send({
                        type: _1.FrameTypes.ERROR,
                        streamId: 0,
                        flags: _1.Flags.NONE,
                        code: re.code,
                        message: re.message,
                    });
                    this.close(re);
                }
            }
            else if (frame.type === _1.FrameTypes.ERROR) {
                _super.prototype.handle.call(this, frame);
                if (this.sessionStore) {
                    delete this.sessionStore[this.token];
                }
                _super.prototype.close.call(this, new Errors_1.RSocketError(frame.code, frame.message));
                return;
            }
        }
        else {
            this.frameStore.record(frame);
        }
        _super.prototype.handle.call(this, frame);
    };
    ResumableClientServerInputMultiplexerDemultiplexer.prototype.resume = function (frame, outbound, closeable) {
        this.outbound = outbound;
        switch (frame.type) {
            case _1.FrameTypes.RESUME: {
                clearTimeout(this.timeoutId);
                if (this.frameStore.lastReceivedFramePosition < frame.clientPosition) {
                    var e = new Errors_1.RSocketError(_1.ErrorCodes.REJECTED_RESUME, "Impossible to resume since first available client frame position is greater than last received server frame position");
                    this.outbound.send({
                        type: _1.FrameTypes.ERROR,
                        streamId: 0,
                        flags: _1.Flags.NONE,
                        code: e.code,
                        message: e.message,
                    });
                    this.close(e);
                    return;
                }
                try {
                    this.frameStore.dropTo(frame.serverPosition);
                }
                catch (re) {
                    this.outbound.send({
                        type: _1.FrameTypes.ERROR,
                        streamId: 0,
                        flags: _1.Flags.NONE,
                        code: re.code,
                        message: re.message,
                    });
                    this.close(re);
                    return;
                }
                this.outbound.send({
                    type: _1.FrameTypes.RESUME_OK,
                    streamId: 0,
                    flags: _1.Flags.NONE,
                    clientPosition: this.frameStore.lastReceivedFramePosition,
                });
                break;
            }
            case _1.FrameTypes.RESUME_OK: {
                try {
                    this.frameStore.dropTo(frame.clientPosition);
                }
                catch (re) {
                    this.outbound.send({
                        type: _1.FrameTypes.ERROR,
                        streamId: 0,
                        flags: _1.Flags.NONE,
                        code: re.code,
                        message: re.message,
                    });
                    this.close(re);
                }
                break;
            }
        }
        this.frameStore.drain(this.outbound.send.bind(this.outbound));
        closeable.onClose(this.handleConnectionClose.bind(this));
        this.connectionFramesHandler.resume();
    };
    ResumableClientServerInputMultiplexerDemultiplexer.prototype.handleConnectionClose = function (_error) {
        return __awaiter(this, void 0, void 0, function () {
            var e_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.connectionFramesHandler.pause();
                        if (!this.reconnector) return [3 /*break*/, 5];
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.reconnector(this, this.frameStore)];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        e_1 = _a.sent();
                        this.close(e_1);
                        return [3 /*break*/, 4];
                    case 4: return [3 /*break*/, 6];
                    case 5:
                        this.timeoutId = setTimeout(this.close.bind(this), this.sessionTimeout);
                        _a.label = 6;
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    return ResumableClientServerInputMultiplexerDemultiplexer;
}(ClientServerInputMultiplexerDemultiplexer));
exports.ResumableClientServerInputMultiplexerDemultiplexer = ResumableClientServerInputMultiplexerDemultiplexer;
var ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer = /** @class */ (function () {
    function ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer(outbound, closeable, delegate) {
        this.outbound = outbound;
        this.closeable = closeable;
        this.delegate = delegate;
        this.resumed = false;
    }
    ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer.prototype.close = function () {
        this.delegate.close();
    };
    ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer.prototype.onClose = function (callback) {
        this.delegate.onClose(callback);
    };
    Object.defineProperty(ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer.prototype, "connectionOutbound", {
        get: function () {
            return this.delegate.connectionOutbound;
        },
        enumerable: false,
        configurable: true
    });
    ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer.prototype.createRequestStream = function (streamHandler) {
        this.delegate.createRequestStream(streamHandler);
    };
    ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer.prototype.connectionInbound = function (handler) {
        this.delegate.connectionInbound(handler);
    };
    ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer.prototype.handleRequestStream = function (handler) {
        this.delegate.handleRequestStream(handler);
    };
    ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer.prototype.handle = function (frame) {
        var _this = this;
        if (!this.resumed) {
            if (frame.type === _1.FrameTypes.RESUME_OK) {
                this.resumed = true;
                this.delegate.resume(frame, this.outbound, this.closeable);
                return;
            }
            else {
                this.outbound.send({
                    type: _1.FrameTypes.ERROR,
                    streamId: 0,
                    code: _1.ErrorCodes.CONNECTION_ERROR,
                    message: "Incomplete RESUME handshake. Unexpected frame ".concat(frame.type, " received"),
                    flags: _1.Flags.NONE,
                });
                this.closeable.close();
                this.closeable.onClose(function () {
                    return _this.delegate.close(new Errors_1.RSocketError(_1.ErrorCodes.CONNECTION_ERROR, "Incomplete RESUME handshake. Unexpected frame ".concat(frame.type, " received")));
                });
            }
            return;
        }
        this.delegate.handle(frame);
    };
    return ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer;
}());
exports.ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer = ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer;

},{".":29,"./Deferred":14,"./Errors":15,"./Frames":17}],12:[function(require,module,exports){
(function (Buffer){(function (){
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Deserializer = exports.sizeOfFrame = exports.serializeFrame = exports.deserializeFrame = exports.serializeFrameWithLength = exports.deserializeFrames = exports.deserializeFrameWithLength = exports.writeUInt64BE = exports.readUInt64BE = exports.writeUInt24BE = exports.readUInt24BE = exports.MAX_VERSION = exports.MAX_TTL = exports.MAX_STREAM_ID = exports.MAX_RESUME_LENGTH = exports.MAX_REQUEST_N = exports.MAX_REQUEST_COUNT = exports.MAX_MIME_LENGTH = exports.MAX_METADATA_LENGTH = exports.MAX_LIFETIME = exports.MAX_KEEPALIVE = exports.MAX_CODE = exports.FRAME_TYPE_OFFFSET = exports.FLAGS_MASK = void 0;
var Frames_1 = require("./Frames");
exports.FLAGS_MASK = 0x3ff; // low 10 bits
exports.FRAME_TYPE_OFFFSET = 10; // frame type is offset 10 bytes within the uint16 containing type + flags
exports.MAX_CODE = 0x7fffffff; // uint31
exports.MAX_KEEPALIVE = 0x7fffffff; // uint31
exports.MAX_LIFETIME = 0x7fffffff; // uint31
exports.MAX_METADATA_LENGTH = 0xffffff; // uint24
exports.MAX_MIME_LENGTH = 0xff; // int8
exports.MAX_REQUEST_COUNT = 0x7fffffff; // uint31
exports.MAX_REQUEST_N = 0x7fffffff; // uint31
exports.MAX_RESUME_LENGTH = 0xffff; // uint16
exports.MAX_STREAM_ID = 0x7fffffff; // uint31
exports.MAX_TTL = 0x7fffffff; // uint31
exports.MAX_VERSION = 0xffff; // uint16
/**
 * Mimimum value that would overflow bitwise operators (2^32).
 */
var BITWISE_OVERFLOW = 0x100000000;
/**
 * Read a uint24 from a buffer starting at the given offset.
 */
function readUInt24BE(buffer, offset) {
    var val1 = buffer.readUInt8(offset) << 16;
    var val2 = buffer.readUInt8(offset + 1) << 8;
    var val3 = buffer.readUInt8(offset + 2);
    return val1 | val2 | val3;
}
exports.readUInt24BE = readUInt24BE;
/**
 * Writes a uint24 to a buffer starting at the given offset, returning the
 * offset of the next byte.
 */
function writeUInt24BE(buffer, value, offset) {
    offset = buffer.writeUInt8(value >>> 16, offset); // 3rd byte
    offset = buffer.writeUInt8((value >>> 8) & 0xff, offset); // 2nd byte
    return buffer.writeUInt8(value & 0xff, offset); // 1st byte
}
exports.writeUInt24BE = writeUInt24BE;
/**
 * Read a uint64 (technically supports up to 53 bits per JS number
 * representation).
 */
function readUInt64BE(buffer, offset) {
    var high = buffer.readUInt32BE(offset);
    var low = buffer.readUInt32BE(offset + 4);
    return high * BITWISE_OVERFLOW + low;
}
exports.readUInt64BE = readUInt64BE;
/**
 * Write a uint64 (technically supports up to 53 bits per JS number
 * representation).
 */
function writeUInt64BE(buffer, value, offset) {
    var high = (value / BITWISE_OVERFLOW) | 0;
    var low = value % BITWISE_OVERFLOW;
    offset = buffer.writeUInt32BE(high, offset); // first half of uint64
    return buffer.writeUInt32BE(low, offset); // second half of uint64
}
exports.writeUInt64BE = writeUInt64BE;
/**
 * Frame header is:
 * - stream id (uint32 = 4)
 * - type + flags (uint 16 = 2)
 */
var FRAME_HEADER_SIZE = 6;
/**
 * Size of frame length and metadata length fields.
 */
var UINT24_SIZE = 3;
/**
 * Reads a frame from a buffer that is prefixed with the frame length.
 */
function deserializeFrameWithLength(buffer) {
    var frameLength = readUInt24BE(buffer, 0);
    return deserializeFrame(buffer.slice(UINT24_SIZE, UINT24_SIZE + frameLength));
}
exports.deserializeFrameWithLength = deserializeFrameWithLength;
/**
 * Given a buffer that may contain zero or more length-prefixed frames followed
 * by zero or more bytes of a (partial) subsequent frame, returns an array of
 * the frames and an int representing the buffer offset.
 */
function deserializeFrames(buffer) {
    var offset, frameLength, frameStart, frameEnd, frameBuffer, frame;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                offset = 0;
                _a.label = 1;
            case 1:
                if (!(offset + UINT24_SIZE < buffer.length)) return [3 /*break*/, 3];
                frameLength = readUInt24BE(buffer, offset);
                frameStart = offset + UINT24_SIZE;
                frameEnd = frameStart + frameLength;
                if (frameEnd > buffer.length) {
                    // not all bytes of next frame received
                    return [3 /*break*/, 3];
                }
                frameBuffer = buffer.slice(frameStart, frameEnd);
                frame = deserializeFrame(frameBuffer);
                offset = frameEnd;
                return [4 /*yield*/, [frame, offset]];
            case 2:
                _a.sent();
                return [3 /*break*/, 1];
            case 3: return [2 /*return*/];
        }
    });
}
exports.deserializeFrames = deserializeFrames;
/**
 * Writes a frame to a buffer with a length prefix.
 */
function serializeFrameWithLength(frame) {
    var buffer = serializeFrame(frame);
    var lengthPrefixed = Buffer.allocUnsafe(buffer.length + UINT24_SIZE);
    writeUInt24BE(lengthPrefixed, buffer.length, 0);
    buffer.copy(lengthPrefixed, UINT24_SIZE);
    return lengthPrefixed;
}
exports.serializeFrameWithLength = serializeFrameWithLength;
/**
 * Read a frame from the buffer.
 */
function deserializeFrame(buffer) {
    var offset = 0;
    var streamId = buffer.readInt32BE(offset);
    offset += 4;
    // invariant(
    //   streamId >= 0,
    //   'RSocketBinaryFraming: Invalid frame, expected a positive stream id, got `%s.',
    //   streamId,
    // );
    var typeAndFlags = buffer.readUInt16BE(offset);
    offset += 2;
    var type = typeAndFlags >>> exports.FRAME_TYPE_OFFFSET; // keep highest 6 bits
    var flags = typeAndFlags & exports.FLAGS_MASK; // keep lowest 10 bits
    switch (type) {
        case Frames_1.FrameTypes.SETUP:
            return deserializeSetupFrame(buffer, streamId, flags);
        case Frames_1.FrameTypes.PAYLOAD:
            return deserializePayloadFrame(buffer, streamId, flags);
        case Frames_1.FrameTypes.ERROR:
            return deserializeErrorFrame(buffer, streamId, flags);
        case Frames_1.FrameTypes.KEEPALIVE:
            return deserializeKeepAliveFrame(buffer, streamId, flags);
        case Frames_1.FrameTypes.REQUEST_FNF:
            return deserializeRequestFnfFrame(buffer, streamId, flags);
        case Frames_1.FrameTypes.REQUEST_RESPONSE:
            return deserializeRequestResponseFrame(buffer, streamId, flags);
        case Frames_1.FrameTypes.REQUEST_STREAM:
            return deserializeRequestStreamFrame(buffer, streamId, flags);
        case Frames_1.FrameTypes.REQUEST_CHANNEL:
            return deserializeRequestChannelFrame(buffer, streamId, flags);
        case Frames_1.FrameTypes.METADATA_PUSH:
            return deserializeMetadataPushFrame(buffer, streamId, flags);
        case Frames_1.FrameTypes.REQUEST_N:
            return deserializeRequestNFrame(buffer, streamId, flags);
        case Frames_1.FrameTypes.RESUME:
            return deserializeResumeFrame(buffer, streamId, flags);
        case Frames_1.FrameTypes.RESUME_OK:
            return deserializeResumeOkFrame(buffer, streamId, flags);
        case Frames_1.FrameTypes.CANCEL:
            return deserializeCancelFrame(buffer, streamId, flags);
        case Frames_1.FrameTypes.LEASE:
            return deserializeLeaseFrame(buffer, streamId, flags);
        default:
        // invariant(
        //   false,
        //   "RSocketBinaryFraming: Unsupported frame type `%s`.",
        //   getFrameTypeName(type)
        // );
    }
}
exports.deserializeFrame = deserializeFrame;
/**
 * Convert the frame to a (binary) buffer.
 */
function serializeFrame(frame) {
    switch (frame.type) {
        case Frames_1.FrameTypes.SETUP:
            return serializeSetupFrame(frame);
        case Frames_1.FrameTypes.PAYLOAD:
            return serializePayloadFrame(frame);
        case Frames_1.FrameTypes.ERROR:
            return serializeErrorFrame(frame);
        case Frames_1.FrameTypes.KEEPALIVE:
            return serializeKeepAliveFrame(frame);
        case Frames_1.FrameTypes.REQUEST_FNF:
        case Frames_1.FrameTypes.REQUEST_RESPONSE:
            return serializeRequestFrame(frame);
        case Frames_1.FrameTypes.REQUEST_STREAM:
        case Frames_1.FrameTypes.REQUEST_CHANNEL:
            return serializeRequestManyFrame(frame);
        case Frames_1.FrameTypes.METADATA_PUSH:
            return serializeMetadataPushFrame(frame);
        case Frames_1.FrameTypes.REQUEST_N:
            return serializeRequestNFrame(frame);
        case Frames_1.FrameTypes.RESUME:
            return serializeResumeFrame(frame);
        case Frames_1.FrameTypes.RESUME_OK:
            return serializeResumeOkFrame(frame);
        case Frames_1.FrameTypes.CANCEL:
            return serializeCancelFrame(frame);
        case Frames_1.FrameTypes.LEASE:
            return serializeLeaseFrame(frame);
        default:
        // invariant(
        //   false,
        //   "RSocketBinaryFraming: Unsupported frame type `%s`.",
        //   getFrameTypeName(frame.type)
        // );
    }
}
exports.serializeFrame = serializeFrame;
/**
 * Byte size of frame without size prefix
 */
function sizeOfFrame(frame) {
    switch (frame.type) {
        case Frames_1.FrameTypes.SETUP:
            return sizeOfSetupFrame(frame);
        case Frames_1.FrameTypes.PAYLOAD:
            return sizeOfPayloadFrame(frame);
        case Frames_1.FrameTypes.ERROR:
            return sizeOfErrorFrame(frame);
        case Frames_1.FrameTypes.KEEPALIVE:
            return sizeOfKeepAliveFrame(frame);
        case Frames_1.FrameTypes.REQUEST_FNF:
        case Frames_1.FrameTypes.REQUEST_RESPONSE:
            return sizeOfRequestFrame(frame);
        case Frames_1.FrameTypes.REQUEST_STREAM:
        case Frames_1.FrameTypes.REQUEST_CHANNEL:
            return sizeOfRequestManyFrame(frame);
        case Frames_1.FrameTypes.METADATA_PUSH:
            return sizeOfMetadataPushFrame(frame);
        case Frames_1.FrameTypes.REQUEST_N:
            return sizeOfRequestNFrame(frame);
        case Frames_1.FrameTypes.RESUME:
            return sizeOfResumeFrame(frame);
        case Frames_1.FrameTypes.RESUME_OK:
            return sizeOfResumeOkFrame(frame);
        case Frames_1.FrameTypes.CANCEL:
            return sizeOfCancelFrame(frame);
        case Frames_1.FrameTypes.LEASE:
            return sizeOfLeaseFrame(frame);
        default:
        // invariant(
        //   false,
        //   "RSocketBinaryFraming: Unsupported frame type `%s`.",
        //   getFrameTypeName(frame.type)
        // );
    }
}
exports.sizeOfFrame = sizeOfFrame;
/**
 * Writes a SETUP frame into a new buffer and returns it.
 *
 * Prefix size is:
 * - version (2x uint16 = 4)
 * - keepalive (uint32 = 4)
 * - lifetime (uint32 = 4)
 * - mime lengths (2x uint8 = 2)
 */
var SETUP_FIXED_SIZE = 14;
var RESUME_TOKEN_LENGTH_SIZE = 2;
function serializeSetupFrame(frame) {
    var resumeTokenLength = frame.resumeToken != null ? frame.resumeToken.byteLength : 0;
    var metadataMimeTypeLength = frame.metadataMimeType != null
        ? Buffer.byteLength(frame.metadataMimeType, "ascii")
        : 0;
    var dataMimeTypeLength = frame.dataMimeType != null
        ? Buffer.byteLength(frame.dataMimeType, "ascii")
        : 0;
    var payloadLength = getPayloadLength(frame);
    var buffer = Buffer.allocUnsafe(FRAME_HEADER_SIZE +
        SETUP_FIXED_SIZE + //
        (resumeTokenLength ? RESUME_TOKEN_LENGTH_SIZE + resumeTokenLength : 0) +
        metadataMimeTypeLength +
        dataMimeTypeLength +
        payloadLength);
    var offset = writeHeader(frame, buffer);
    offset = buffer.writeUInt16BE(frame.majorVersion, offset);
    offset = buffer.writeUInt16BE(frame.minorVersion, offset);
    offset = buffer.writeUInt32BE(frame.keepAlive, offset);
    offset = buffer.writeUInt32BE(frame.lifetime, offset);
    if (frame.flags & Frames_1.Flags.RESUME_ENABLE) {
        offset = buffer.writeUInt16BE(resumeTokenLength, offset);
        if (frame.resumeToken != null) {
            offset += frame.resumeToken.copy(buffer, offset);
        }
    }
    offset = buffer.writeUInt8(metadataMimeTypeLength, offset);
    if (frame.metadataMimeType != null) {
        offset += buffer.write(frame.metadataMimeType, offset, offset + metadataMimeTypeLength, "ascii");
    }
    offset = buffer.writeUInt8(dataMimeTypeLength, offset);
    if (frame.dataMimeType != null) {
        offset += buffer.write(frame.dataMimeType, offset, offset + dataMimeTypeLength, "ascii");
    }
    writePayload(frame, buffer, offset);
    return buffer;
}
function sizeOfSetupFrame(frame) {
    var resumeTokenLength = frame.resumeToken != null ? frame.resumeToken.byteLength : 0;
    var metadataMimeTypeLength = frame.metadataMimeType != null
        ? Buffer.byteLength(frame.metadataMimeType, "ascii")
        : 0;
    var dataMimeTypeLength = frame.dataMimeType != null
        ? Buffer.byteLength(frame.dataMimeType, "ascii")
        : 0;
    var payloadLength = getPayloadLength(frame);
    return (FRAME_HEADER_SIZE +
        SETUP_FIXED_SIZE + //
        (resumeTokenLength ? RESUME_TOKEN_LENGTH_SIZE + resumeTokenLength : 0) +
        metadataMimeTypeLength +
        dataMimeTypeLength +
        payloadLength);
}
/**
 * Reads a SETUP frame from the buffer and returns it.
 */
function deserializeSetupFrame(buffer, streamId, flags) {
    // invariant(
    //   streamId === 0,
    //   'RSocketBinaryFraming: Invalid SETUP frame, expected stream id to be 0.',
    // );
    var length = buffer.length;
    var offset = FRAME_HEADER_SIZE;
    var majorVersion = buffer.readUInt16BE(offset);
    offset += 2;
    var minorVersion = buffer.readUInt16BE(offset);
    offset += 2;
    var keepAlive = buffer.readInt32BE(offset);
    offset += 4;
    // invariant(
    //   keepAlive >= 0 && keepAlive <= MAX_KEEPALIVE,
    //   'RSocketBinaryFraming: Invalid SETUP frame, expected keepAlive to be ' +
    //     '>= 0 and <= %s. Got `%s`.',
    //   MAX_KEEPALIVE,
    //   keepAlive,
    // );
    var lifetime = buffer.readInt32BE(offset);
    offset += 4;
    // invariant(
    //   lifetime >= 0 && lifetime <= MAX_LIFETIME,
    //   'RSocketBinaryFraming: Invalid SETUP frame, expected lifetime to be ' +
    //     '>= 0 and <= %s. Got `%s`.',
    //   MAX_LIFETIME,
    //   lifetime,
    // );
    var resumeToken = null;
    if (flags & Frames_1.Flags.RESUME_ENABLE) {
        var resumeTokenLength = buffer.readInt16BE(offset);
        offset += 2;
        // invariant(
        //   resumeTokenLength >= 0 && resumeTokenLength <= MAX_RESUME_LENGTH,
        //   'RSocketBinaryFraming: Invalid SETUP frame, expected resumeToken length ' +
        //     'to be >= 0 and <= %s. Got `%s`.',
        //   MAX_RESUME_LENGTH,
        //   resumeTokenLength,
        // );
        resumeToken = buffer.slice(offset, offset + resumeTokenLength);
        offset += resumeTokenLength;
    }
    var metadataMimeTypeLength = buffer.readUInt8(offset);
    offset += 1;
    var metadataMimeType = buffer.toString("ascii", offset, offset + metadataMimeTypeLength);
    offset += metadataMimeTypeLength;
    var dataMimeTypeLength = buffer.readUInt8(offset);
    offset += 1;
    var dataMimeType = buffer.toString("ascii", offset, offset + dataMimeTypeLength);
    offset += dataMimeTypeLength;
    var frame = {
        data: null,
        dataMimeType: dataMimeType,
        flags: flags,
        keepAlive: keepAlive,
        lifetime: lifetime,
        majorVersion: majorVersion,
        metadata: null,
        metadataMimeType: metadataMimeType,
        minorVersion: minorVersion,
        resumeToken: resumeToken,
        // streamId,
        streamId: 0,
        type: Frames_1.FrameTypes.SETUP,
    };
    readPayload(buffer, frame, offset);
    return frame;
}
/**
 * Writes an ERROR frame into a new buffer and returns it.
 *
 * Prefix size is for the error code (uint32 = 4).
 */
var ERROR_FIXED_SIZE = 4;
function serializeErrorFrame(frame) {
    var messageLength = frame.message != null ? Buffer.byteLength(frame.message, "utf8") : 0;
    var buffer = Buffer.allocUnsafe(FRAME_HEADER_SIZE + ERROR_FIXED_SIZE + messageLength);
    var offset = writeHeader(frame, buffer);
    offset = buffer.writeUInt32BE(frame.code, offset);
    if (frame.message != null) {
        buffer.write(frame.message, offset, offset + messageLength, "utf8");
    }
    return buffer;
}
function sizeOfErrorFrame(frame) {
    var messageLength = frame.message != null ? Buffer.byteLength(frame.message, "utf8") : 0;
    return FRAME_HEADER_SIZE + ERROR_FIXED_SIZE + messageLength;
}
/**
 * Reads an ERROR frame from the buffer and returns it.
 */
function deserializeErrorFrame(buffer, streamId, flags) {
    var length = buffer.length;
    var offset = FRAME_HEADER_SIZE;
    var code = buffer.readInt32BE(offset);
    offset += 4;
    // invariant(
    //   code >= 0 && code <= MAX_CODE,
    //   "RSocketBinaryFraming: Invalid ERROR frame, expected code to be >= 0 and <= %s. Got `%s`.",
    //   MAX_CODE,
    //   code
    // );
    var messageLength = buffer.length - offset;
    var message = "";
    if (messageLength > 0) {
        message = buffer.toString("utf8", offset, offset + messageLength);
        offset += messageLength;
    }
    return {
        code: code,
        flags: flags,
        message: message,
        streamId: streamId,
        type: Frames_1.FrameTypes.ERROR,
    };
}
/**
 * Writes a KEEPALIVE frame into a new buffer and returns it.
 *
 * Prefix size is for the last received position (uint64 = 8).
 */
var KEEPALIVE_FIXED_SIZE = 8;
function serializeKeepAliveFrame(frame) {
    var dataLength = frame.data != null ? frame.data.byteLength : 0;
    var buffer = Buffer.allocUnsafe(FRAME_HEADER_SIZE + KEEPALIVE_FIXED_SIZE + dataLength);
    var offset = writeHeader(frame, buffer);
    offset = writeUInt64BE(buffer, frame.lastReceivedPosition, offset);
    if (frame.data != null) {
        frame.data.copy(buffer, offset);
    }
    return buffer;
}
function sizeOfKeepAliveFrame(frame) {
    var dataLength = frame.data != null ? frame.data.byteLength : 0;
    return FRAME_HEADER_SIZE + KEEPALIVE_FIXED_SIZE + dataLength;
}
/**
 * Reads a KEEPALIVE frame from the buffer and returns it.
 */
function deserializeKeepAliveFrame(buffer, streamId, flags) {
    // invariant(
    //   streamId === 0,
    //   "RSocketBinaryFraming: Invalid KEEPALIVE frame, expected stream id to be 0."
    // );
    var length = buffer.length;
    var offset = FRAME_HEADER_SIZE;
    var lastReceivedPosition = readUInt64BE(buffer, offset);
    offset += 8;
    var data = null;
    if (offset < buffer.length) {
        data = buffer.slice(offset, buffer.length);
    }
    return {
        data: data,
        flags: flags,
        lastReceivedPosition: lastReceivedPosition,
        // streamId,
        streamId: 0,
        type: Frames_1.FrameTypes.KEEPALIVE,
    };
}
/**
 * Writes a LEASE frame into a new buffer and returns it.
 *
 * Prefix size is for the ttl (uint32) and requestcount (uint32).
 */
var LEASE_FIXED_SIZE = 8;
function serializeLeaseFrame(frame) {
    var metaLength = frame.metadata != null ? frame.metadata.byteLength : 0;
    var buffer = Buffer.allocUnsafe(FRAME_HEADER_SIZE + LEASE_FIXED_SIZE + metaLength);
    var offset = writeHeader(frame, buffer);
    offset = buffer.writeUInt32BE(frame.ttl, offset);
    offset = buffer.writeUInt32BE(frame.requestCount, offset);
    if (frame.metadata != null) {
        frame.metadata.copy(buffer, offset);
    }
    return buffer;
}
function sizeOfLeaseFrame(frame) {
    var metaLength = frame.metadata != null ? frame.metadata.byteLength : 0;
    return FRAME_HEADER_SIZE + LEASE_FIXED_SIZE + metaLength;
}
/**
 * Reads a LEASE frame from the buffer and returns it.
 */
function deserializeLeaseFrame(buffer, streamId, flags) {
    // invariant(
    //   streamId === 0,
    //   "RSocketBinaryFraming: Invalid LEASE frame, expected stream id to be 0."
    // );
    // const length = buffer.length;
    var offset = FRAME_HEADER_SIZE;
    var ttl = buffer.readUInt32BE(offset);
    offset += 4;
    var requestCount = buffer.readUInt32BE(offset);
    offset += 4;
    var metadata = null;
    if (offset < buffer.length) {
        metadata = buffer.slice(offset, buffer.length);
    }
    return {
        flags: flags,
        metadata: metadata,
        requestCount: requestCount,
        // streamId,
        streamId: 0,
        ttl: ttl,
        type: Frames_1.FrameTypes.LEASE,
    };
}
/**
 * Writes a REQUEST_FNF or REQUEST_RESPONSE frame to a new buffer and returns
 * it.
 *
 * Note that these frames have the same shape and only differ in their type.
 */
function serializeRequestFrame(frame) {
    var payloadLength = getPayloadLength(frame);
    var buffer = Buffer.allocUnsafe(FRAME_HEADER_SIZE + payloadLength);
    var offset = writeHeader(frame, buffer);
    writePayload(frame, buffer, offset);
    return buffer;
}
function sizeOfRequestFrame(frame) {
    var payloadLength = getPayloadLength(frame);
    return FRAME_HEADER_SIZE + payloadLength;
}
/**
 * Writes a METADATA_PUSH frame to a new buffer and returns
 * it.
 */
function serializeMetadataPushFrame(frame) {
    var metadata = frame.metadata;
    if (metadata != null) {
        var buffer = Buffer.allocUnsafe(FRAME_HEADER_SIZE + metadata.byteLength);
        var offset = writeHeader(frame, buffer);
        metadata.copy(buffer, offset);
        return buffer;
    }
    else {
        var buffer = Buffer.allocUnsafe(FRAME_HEADER_SIZE);
        writeHeader(frame, buffer);
        return buffer;
    }
}
function sizeOfMetadataPushFrame(frame) {
    return (FRAME_HEADER_SIZE + (frame.metadata != null ? frame.metadata.byteLength : 0));
}
function deserializeRequestFnfFrame(buffer, streamId, flags) {
    // invariant(
    //   streamId > 0,
    //   "RSocketBinaryFraming: Invalid REQUEST_FNF frame, expected stream id to be > 0."
    // );
    var length = buffer.length;
    var frame = {
        data: null,
        flags: flags,
        // length,
        metadata: null,
        streamId: streamId,
        type: Frames_1.FrameTypes.REQUEST_FNF,
    };
    readPayload(buffer, frame, FRAME_HEADER_SIZE);
    return frame;
}
function deserializeRequestResponseFrame(buffer, streamId, flags) {
    // invariant(
    // streamId > 0,
    // "RSocketBinaryFraming: Invalid REQUEST_RESPONSE frame, expected stream id to be > 0."
    // );
    // const length = buffer.length;
    var frame = {
        data: null,
        flags: flags,
        // length,
        metadata: null,
        streamId: streamId,
        type: Frames_1.FrameTypes.REQUEST_RESPONSE,
    };
    readPayload(buffer, frame, FRAME_HEADER_SIZE);
    return frame;
}
function deserializeMetadataPushFrame(buffer, streamId, flags) {
    // invariant(
    //   streamId === 0,
    //   "RSocketBinaryFraming: Invalid METADATA_PUSH frame, expected stream id to be 0."
    // );
    // const length = buffer.length;
    return {
        flags: flags,
        // length,
        metadata: length === FRAME_HEADER_SIZE
            ? null
            : buffer.slice(FRAME_HEADER_SIZE, length),
        // streamId,
        streamId: 0,
        type: Frames_1.FrameTypes.METADATA_PUSH,
    };
}
/**
 * Writes a REQUEST_STREAM or REQUEST_CHANNEL frame to a new buffer and returns
 * it.
 *
 * Note that these frames have the same shape and only differ in their type.
 *
 * Prefix size is for requestN (uint32 = 4).
 */
var REQUEST_MANY_HEADER = 4;
function serializeRequestManyFrame(frame) {
    var payloadLength = getPayloadLength(frame);
    var buffer = Buffer.allocUnsafe(FRAME_HEADER_SIZE + REQUEST_MANY_HEADER + payloadLength);
    var offset = writeHeader(frame, buffer);
    offset = buffer.writeUInt32BE(frame.requestN, offset);
    writePayload(frame, buffer, offset);
    return buffer;
}
function sizeOfRequestManyFrame(frame) {
    var payloadLength = getPayloadLength(frame);
    return FRAME_HEADER_SIZE + REQUEST_MANY_HEADER + payloadLength;
}
function deserializeRequestStreamFrame(buffer, streamId, flags) {
    // invariant(
    //   streamId > 0,
    //   "RSocketBinaryFraming: Invalid REQUEST_STREAM frame, expected stream id to be > 0."
    // );
    var length = buffer.length;
    var offset = FRAME_HEADER_SIZE;
    var requestN = buffer.readInt32BE(offset);
    offset += 4;
    // invariant(
    //   requestN > 0,
    //   "RSocketBinaryFraming: Invalid REQUEST_STREAM frame, expected requestN to be > 0, got `%s`.",
    //   requestN
    // );
    var frame = {
        data: null,
        flags: flags,
        // length,
        metadata: null,
        requestN: requestN,
        streamId: streamId,
        type: Frames_1.FrameTypes.REQUEST_STREAM,
    };
    readPayload(buffer, frame, offset);
    return frame;
}
function deserializeRequestChannelFrame(buffer, streamId, flags) {
    // invariant(
    //   streamId > 0,
    //   "RSocketBinaryFraming: Invalid REQUEST_CHANNEL frame, expected stream id to be > 0."
    // );
    var length = buffer.length;
    var offset = FRAME_HEADER_SIZE;
    var requestN = buffer.readInt32BE(offset);
    offset += 4;
    // invariant(
    //   requestN > 0,
    //   "RSocketBinaryFraming: Invalid REQUEST_STREAM frame, expected requestN to be > 0, got `%s`.",
    //   requestN
    // );
    var frame = {
        data: null,
        flags: flags,
        // length,
        metadata: null,
        requestN: requestN,
        streamId: streamId,
        type: Frames_1.FrameTypes.REQUEST_CHANNEL,
    };
    readPayload(buffer, frame, offset);
    return frame;
}
/**
 * Writes a REQUEST_N frame to a new buffer and returns it.
 *
 * Prefix size is for requestN (uint32 = 4).
 */
var REQUEST_N_HEADER = 4;
function serializeRequestNFrame(frame) {
    var buffer = Buffer.allocUnsafe(FRAME_HEADER_SIZE + REQUEST_N_HEADER);
    var offset = writeHeader(frame, buffer);
    buffer.writeUInt32BE(frame.requestN, offset);
    return buffer;
}
function sizeOfRequestNFrame(frame) {
    return FRAME_HEADER_SIZE + REQUEST_N_HEADER;
}
function deserializeRequestNFrame(buffer, streamId, flags) {
    // invariant(
    //   streamId > 0,
    //   "RSocketBinaryFraming: Invalid REQUEST_N frame, expected stream id to be > 0."
    // );
    var length = buffer.length;
    var requestN = buffer.readInt32BE(FRAME_HEADER_SIZE);
    // invariant(
    //   requestN > 0,
    //   "RSocketBinaryFraming: Invalid REQUEST_STREAM frame, expected requestN to be > 0, got `%s`.",
    //   requestN
    // );
    return {
        flags: flags,
        // length,
        requestN: requestN,
        streamId: streamId,
        type: Frames_1.FrameTypes.REQUEST_N,
    };
}
/**
 * Writes a CANCEL frame to a new buffer and returns it.
 */
function serializeCancelFrame(frame) {
    var buffer = Buffer.allocUnsafe(FRAME_HEADER_SIZE);
    writeHeader(frame, buffer);
    return buffer;
}
function sizeOfCancelFrame(frame) {
    return FRAME_HEADER_SIZE;
}
function deserializeCancelFrame(buffer, streamId, flags) {
    // invariant(
    //   streamId > 0,
    //   "RSocketBinaryFraming: Invalid CANCEL frame, expected stream id to be > 0."
    // );
    var length = buffer.length;
    return {
        flags: flags,
        // length,
        streamId: streamId,
        type: Frames_1.FrameTypes.CANCEL,
    };
}
/**
 * Writes a PAYLOAD frame to a new buffer and returns it.
 */
function serializePayloadFrame(frame) {
    var payloadLength = getPayloadLength(frame);
    var buffer = Buffer.allocUnsafe(FRAME_HEADER_SIZE + payloadLength);
    var offset = writeHeader(frame, buffer);
    writePayload(frame, buffer, offset);
    return buffer;
}
function sizeOfPayloadFrame(frame) {
    var payloadLength = getPayloadLength(frame);
    return FRAME_HEADER_SIZE + payloadLength;
}
function deserializePayloadFrame(buffer, streamId, flags) {
    // invariant(
    //   streamId > 0,
    //   "RSocketBinaryFraming: Invalid PAYLOAD frame, expected stream id to be > 0."
    // );
    var length = buffer.length;
    var frame = {
        data: null,
        flags: flags,
        // length,
        metadata: null,
        streamId: streamId,
        type: Frames_1.FrameTypes.PAYLOAD,
    };
    readPayload(buffer, frame, FRAME_HEADER_SIZE);
    return frame;
}
/**
 * Writes a RESUME frame into a new buffer and returns it.
 *
 * Fixed size is:
 * - major version (uint16 = 2)
 * - minor version (uint16 = 2)
 * - token length (uint16 = 2)
 * - client position (uint64 = 8)
 * - server position (uint64 = 8)
 */
var RESUME_FIXED_SIZE = 22;
function serializeResumeFrame(frame) {
    var resumeTokenLength = frame.resumeToken.byteLength;
    var buffer = Buffer.allocUnsafe(FRAME_HEADER_SIZE + RESUME_FIXED_SIZE + resumeTokenLength);
    var offset = writeHeader(frame, buffer);
    offset = buffer.writeUInt16BE(frame.majorVersion, offset);
    offset = buffer.writeUInt16BE(frame.minorVersion, offset);
    offset = buffer.writeUInt16BE(resumeTokenLength, offset);
    offset += frame.resumeToken.copy(buffer, offset);
    offset = writeUInt64BE(buffer, frame.serverPosition, offset);
    writeUInt64BE(buffer, frame.clientPosition, offset);
    return buffer;
}
function sizeOfResumeFrame(frame) {
    var resumeTokenLength = frame.resumeToken.byteLength;
    return FRAME_HEADER_SIZE + RESUME_FIXED_SIZE + resumeTokenLength;
}
function deserializeResumeFrame(buffer, streamId, flags) {
    // invariant(
    //   streamId === 0,
    //   "RSocketBinaryFraming: Invalid RESUME frame, expected stream id to be 0."
    // );
    var length = buffer.length;
    var offset = FRAME_HEADER_SIZE;
    var majorVersion = buffer.readUInt16BE(offset);
    offset += 2;
    var minorVersion = buffer.readUInt16BE(offset);
    offset += 2;
    var resumeTokenLength = buffer.readInt16BE(offset);
    offset += 2;
    // invariant(
    //   resumeTokenLength >= 0 && resumeTokenLength <= MAX_RESUME_LENGTH,
    //   "RSocketBinaryFraming: Invalid SETUP frame, expected resumeToken length " +
    //     "to be >= 0 and <= %s. Got `%s`.",
    //   MAX_RESUME_LENGTH,
    //   resumeTokenLength
    // );
    var resumeToken = buffer.slice(offset, offset + resumeTokenLength);
    offset += resumeTokenLength;
    var serverPosition = readUInt64BE(buffer, offset);
    offset += 8;
    var clientPosition = readUInt64BE(buffer, offset);
    offset += 8;
    return {
        clientPosition: clientPosition,
        flags: flags,
        // length,
        majorVersion: majorVersion,
        minorVersion: minorVersion,
        resumeToken: resumeToken,
        serverPosition: serverPosition,
        // streamId,
        streamId: 0,
        type: Frames_1.FrameTypes.RESUME,
    };
}
/**
 * Writes a RESUME_OK frame into a new buffer and returns it.
 *
 * Fixed size is:
 * - client position (uint64 = 8)
 */
var RESUME_OK_FIXED_SIZE = 8;
function serializeResumeOkFrame(frame) {
    var buffer = Buffer.allocUnsafe(FRAME_HEADER_SIZE + RESUME_OK_FIXED_SIZE);
    var offset = writeHeader(frame, buffer);
    writeUInt64BE(buffer, frame.clientPosition, offset);
    return buffer;
}
function sizeOfResumeOkFrame(frame) {
    return FRAME_HEADER_SIZE + RESUME_OK_FIXED_SIZE;
}
function deserializeResumeOkFrame(buffer, streamId, flags) {
    // invariant(
    //   streamId === 0,
    //   "RSocketBinaryFraming: Invalid RESUME frame, expected stream id to be 0."
    // );
    var length = buffer.length;
    var clientPosition = readUInt64BE(buffer, FRAME_HEADER_SIZE);
    return {
        clientPosition: clientPosition,
        flags: flags,
        // length,
        // streamId,
        streamId: 0,
        type: Frames_1.FrameTypes.RESUME_OK,
    };
}
/**
 * Write the header of the frame into the buffer.
 */
function writeHeader(frame, buffer) {
    var offset = buffer.writeInt32BE(frame.streamId, 0);
    // shift frame to high 6 bits, extract lowest 10 bits from flags
    return buffer.writeUInt16BE((frame.type << exports.FRAME_TYPE_OFFFSET) | (frame.flags & exports.FLAGS_MASK), offset);
}
/**
 * Determine the length of the payload section of a frame. Only applies to
 * frame types that MAY have both metadata and data.
 */
function getPayloadLength(frame) {
    var payloadLength = 0;
    if (frame.data != null) {
        payloadLength += frame.data.byteLength;
    }
    if (Frames_1.Flags.hasMetadata(frame.flags)) {
        payloadLength += UINT24_SIZE;
        if (frame.metadata != null) {
            payloadLength += frame.metadata.byteLength;
        }
    }
    return payloadLength;
}
/**
 * Write the payload of a frame into the given buffer. Only applies to frame
 * types that MAY have both metadata and data.
 */
function writePayload(frame, buffer, offset) {
    if (Frames_1.Flags.hasMetadata(frame.flags)) {
        if (frame.metadata != null) {
            var metaLength = frame.metadata.byteLength;
            offset = writeUInt24BE(buffer, metaLength, offset);
            offset += frame.metadata.copy(buffer, offset);
        }
        else {
            offset = writeUInt24BE(buffer, 0, offset);
        }
    }
    if (frame.data != null) {
        frame.data.copy(buffer, offset);
    }
}
/**
 * Read the payload from a buffer and write it into the frame. Only applies to
 * frame types that MAY have both metadata and data.
 */
function readPayload(buffer, frame, offset) {
    if (Frames_1.Flags.hasMetadata(frame.flags)) {
        var metaLength = readUInt24BE(buffer, offset);
        offset += UINT24_SIZE;
        if (metaLength > 0) {
            frame.metadata = buffer.slice(offset, offset + metaLength);
            offset += metaLength;
        }
    }
    if (offset < buffer.length) {
        frame.data = buffer.slice(offset, buffer.length);
    }
}
// exported as class to facilitate testing
var Deserializer = /** @class */ (function () {
    function Deserializer() {
    }
    /**
     * Read a frame from the buffer.
     */
    Deserializer.prototype.deserializeFrame = function (buffer) {
        return deserializeFrame(buffer);
    };
    /**
     * Reads a frame from a buffer that is prefixed with the frame length.
     */
    Deserializer.prototype.deserializeFrameWithLength = function (buffer) {
        return deserializeFrameWithLength(buffer);
    };
    /**
     * Given a buffer that may contain zero or more length-prefixed frames followed
     * by zero or more bytes of a (partial) subsequent frame, returns an array of
     * the frames and a int representing the buffer offset.
     */
    Deserializer.prototype.deserializeFrames = function (buffer) {
        return deserializeFrames(buffer);
    };
    return Deserializer;
}());
exports.Deserializer = Deserializer;

}).call(this)}).call(this,require("buffer").Buffer)
},{"./Frames":17,"buffer":2}],13:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });

},{}],14:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Deferred = void 0;
var Deferred = /** @class */ (function () {
    function Deferred() {
        this._done = false;
        this.onCloseCallbacks = [];
    }
    Object.defineProperty(Deferred.prototype, "done", {
        get: function () {
            return this._done;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Signals to an observer that the Deferred operation has been closed, which invokes
     * the provided `onClose` callback.
     */
    Deferred.prototype.close = function (error) {
        var e_1, _a, e_2, _b;
        if (this.done) {
            console.warn("Trying to close for the second time. ".concat(error ? "Dropping error [".concat(error, "].") : ""));
            return;
        }
        this._done = true;
        this._error = error;
        if (error) {
            try {
                for (var _c = __values(this.onCloseCallbacks), _d = _c.next(); !_d.done; _d = _c.next()) {
                    var callback = _d.value;
                    callback(error);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return;
        }
        try {
            for (var _e = __values(this.onCloseCallbacks), _f = _e.next(); !_f.done; _f = _e.next()) {
                var callback = _f.value;
                callback();
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (_f && !_f.done && (_b = _e.return)) _b.call(_e);
            }
            finally { if (e_2) throw e_2.error; }
        }
    };
    /**
     * Registers a callback to be called when the Closeable is closed. optionally with an Error.
     */
    Deferred.prototype.onClose = function (callback) {
        if (this._done) {
            callback(this._error);
            return;
        }
        this.onCloseCallbacks.push(callback);
    };
    return Deferred;
}());
exports.Deferred = Deferred;

},{}],15:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCodes = exports.RSocketError = void 0;
var RSocketError = /** @class */ (function (_super) {
    __extends(RSocketError, _super);
    function RSocketError(code, message) {
        var _this = _super.call(this, message) || this;
        _this.code = code;
        return _this;
    }
    return RSocketError;
}(Error));
exports.RSocketError = RSocketError;
var ErrorCodes;
(function (ErrorCodes) {
    ErrorCodes[ErrorCodes["RESERVED"] = 0] = "RESERVED";
    ErrorCodes[ErrorCodes["INVALID_SETUP"] = 1] = "INVALID_SETUP";
    ErrorCodes[ErrorCodes["UNSUPPORTED_SETUP"] = 2] = "UNSUPPORTED_SETUP";
    ErrorCodes[ErrorCodes["REJECTED_SETUP"] = 3] = "REJECTED_SETUP";
    ErrorCodes[ErrorCodes["REJECTED_RESUME"] = 4] = "REJECTED_RESUME";
    ErrorCodes[ErrorCodes["CONNECTION_CLOSE"] = 258] = "CONNECTION_CLOSE";
    ErrorCodes[ErrorCodes["CONNECTION_ERROR"] = 257] = "CONNECTION_ERROR";
    ErrorCodes[ErrorCodes["APPLICATION_ERROR"] = 513] = "APPLICATION_ERROR";
    ErrorCodes[ErrorCodes["REJECTED"] = 514] = "REJECTED";
    ErrorCodes[ErrorCodes["CANCELED"] = 515] = "CANCELED";
    ErrorCodes[ErrorCodes["INVALID"] = 516] = "INVALID";
    ErrorCodes[ErrorCodes["RESERVED_EXTENSION"] = 4294967295] = "RESERVED_EXTENSION";
})(ErrorCodes = exports.ErrorCodes || (exports.ErrorCodes = {}));

},{}],16:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fragmentWithRequestN = exports.fragment = exports.isFragmentable = void 0;
var Frames_1 = require("./Frames");
function isFragmentable(payload, fragmentSize, frameType) {
    if (fragmentSize === 0) {
        return false;
    }
    return (payload.data.byteLength +
        (payload.metadata ? payload.metadata.byteLength + Frames_1.Lengths.METADATA : 0) +
        (frameType == Frames_1.FrameTypes.REQUEST_STREAM ||
            frameType == Frames_1.FrameTypes.REQUEST_CHANNEL
            ? Frames_1.Lengths.REQUEST
            : 0) >
        fragmentSize);
}
exports.isFragmentable = isFragmentable;
function fragment(streamId, payload, fragmentSize, frameType, isComplete) {
    var dataLength, firstFrame, remaining, metadata, metadataLength, metadataPosition, nextMetadataPosition, nextMetadataPosition, dataPosition, data, nextDataPosition, nextDataPosition;
    var _a, _b;
    if (isComplete === void 0) { isComplete = false; }
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                dataLength = (_b = (_a = payload.data) === null || _a === void 0 ? void 0 : _a.byteLength) !== null && _b !== void 0 ? _b : 0;
                firstFrame = frameType !== Frames_1.FrameTypes.PAYLOAD;
                remaining = fragmentSize;
                if (!payload.metadata) return [3 /*break*/, 6];
                metadataLength = payload.metadata.byteLength;
                if (!(metadataLength === 0)) return [3 /*break*/, 1];
                remaining -= Frames_1.Lengths.METADATA;
                metadata = Buffer.allocUnsafe(0);
                return [3 /*break*/, 6];
            case 1:
                metadataPosition = 0;
                if (!firstFrame) return [3 /*break*/, 3];
                remaining -= Frames_1.Lengths.METADATA;
                nextMetadataPosition = Math.min(metadataLength, metadataPosition + remaining);
                metadata = payload.metadata.slice(metadataPosition, nextMetadataPosition);
                remaining -= metadata.byteLength;
                metadataPosition = nextMetadataPosition;
                if (!(remaining === 0)) return [3 /*break*/, 3];
                firstFrame = false;
                return [4 /*yield*/, {
                        type: frameType,
                        flags: Frames_1.Flags.FOLLOWS | Frames_1.Flags.METADATA,
                        data: undefined,
                        metadata: metadata,
                        streamId: streamId,
                    }];
            case 2:
                _c.sent();
                metadata = undefined;
                remaining = fragmentSize;
                _c.label = 3;
            case 3:
                if (!(metadataPosition < metadataLength)) return [3 /*break*/, 6];
                remaining -= Frames_1.Lengths.METADATA;
                nextMetadataPosition = Math.min(metadataLength, metadataPosition + remaining);
                metadata = payload.metadata.slice(metadataPosition, nextMetadataPosition);
                remaining -= metadata.byteLength;
                metadataPosition = nextMetadataPosition;
                if (!(remaining === 0 || dataLength === 0)) return [3 /*break*/, 5];
                return [4 /*yield*/, {
                        type: Frames_1.FrameTypes.PAYLOAD,
                        flags: Frames_1.Flags.NEXT |
                            Frames_1.Flags.METADATA |
                            (metadataPosition === metadataLength &&
                                isComplete &&
                                dataLength === 0
                                ? Frames_1.Flags.COMPLETE
                                : Frames_1.Flags.FOLLOWS),
                        data: undefined,
                        metadata: metadata,
                        streamId: streamId,
                    }];
            case 4:
                _c.sent();
                metadata = undefined;
                remaining = fragmentSize;
                _c.label = 5;
            case 5: return [3 /*break*/, 3];
            case 6:
                dataPosition = 0;
                if (!firstFrame) return [3 /*break*/, 8];
                nextDataPosition = Math.min(dataLength, dataPosition + remaining);
                data = payload.data.slice(dataPosition, nextDataPosition);
                remaining -= data.byteLength;
                dataPosition = nextDataPosition;
                return [4 /*yield*/, {
                        type: frameType,
                        flags: Frames_1.Flags.FOLLOWS | (metadata ? Frames_1.Flags.METADATA : Frames_1.Flags.NONE),
                        data: data,
                        metadata: metadata,
                        streamId: streamId,
                    }];
            case 7:
                _c.sent();
                metadata = undefined;
                data = undefined;
                remaining = fragmentSize;
                _c.label = 8;
            case 8:
                if (!(dataPosition < dataLength)) return [3 /*break*/, 10];
                nextDataPosition = Math.min(dataLength, dataPosition + remaining);
                data = payload.data.slice(dataPosition, nextDataPosition);
                remaining -= data.byteLength;
                dataPosition = nextDataPosition;
                return [4 /*yield*/, {
                        type: Frames_1.FrameTypes.PAYLOAD,
                        flags: dataPosition === dataLength
                            ? (isComplete ? Frames_1.Flags.COMPLETE : Frames_1.Flags.NONE) |
                                Frames_1.Flags.NEXT |
                                (metadata ? Frames_1.Flags.METADATA : 0)
                            : Frames_1.Flags.FOLLOWS | Frames_1.Flags.NEXT | (metadata ? Frames_1.Flags.METADATA : 0),
                        data: data,
                        metadata: metadata,
                        streamId: streamId,
                    }];
            case 9:
                _c.sent();
                metadata = undefined;
                data = undefined;
                remaining = fragmentSize;
                return [3 /*break*/, 8];
            case 10: return [2 /*return*/];
        }
    });
}
exports.fragment = fragment;
function fragmentWithRequestN(streamId, payload, fragmentSize, frameType, requestN, isComplete) {
    var dataLength, firstFrame, remaining, metadata, metadataLength, metadataPosition, nextMetadataPosition, nextMetadataPosition, dataPosition, data, nextDataPosition, nextDataPosition;
    var _a, _b;
    if (isComplete === void 0) { isComplete = false; }
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                dataLength = (_b = (_a = payload.data) === null || _a === void 0 ? void 0 : _a.byteLength) !== null && _b !== void 0 ? _b : 0;
                firstFrame = true;
                remaining = fragmentSize;
                if (!payload.metadata) return [3 /*break*/, 6];
                metadataLength = payload.metadata.byteLength;
                if (!(metadataLength === 0)) return [3 /*break*/, 1];
                remaining -= Frames_1.Lengths.METADATA;
                metadata = Buffer.allocUnsafe(0);
                return [3 /*break*/, 6];
            case 1:
                metadataPosition = 0;
                if (!firstFrame) return [3 /*break*/, 3];
                remaining -= Frames_1.Lengths.METADATA + Frames_1.Lengths.REQUEST;
                nextMetadataPosition = Math.min(metadataLength, metadataPosition + remaining);
                metadata = payload.metadata.slice(metadataPosition, nextMetadataPosition);
                remaining -= metadata.byteLength;
                metadataPosition = nextMetadataPosition;
                if (!(remaining === 0)) return [3 /*break*/, 3];
                firstFrame = false;
                return [4 /*yield*/, {
                        type: frameType,
                        flags: Frames_1.Flags.FOLLOWS | Frames_1.Flags.METADATA,
                        data: undefined,
                        requestN: requestN,
                        metadata: metadata,
                        streamId: streamId,
                    }];
            case 2:
                _c.sent();
                metadata = undefined;
                remaining = fragmentSize;
                _c.label = 3;
            case 3:
                if (!(metadataPosition < metadataLength)) return [3 /*break*/, 6];
                remaining -= Frames_1.Lengths.METADATA;
                nextMetadataPosition = Math.min(metadataLength, metadataPosition + remaining);
                metadata = payload.metadata.slice(metadataPosition, nextMetadataPosition);
                remaining -= metadata.byteLength;
                metadataPosition = nextMetadataPosition;
                if (!(remaining === 0 || dataLength === 0)) return [3 /*break*/, 5];
                return [4 /*yield*/, {
                        type: Frames_1.FrameTypes.PAYLOAD,
                        flags: Frames_1.Flags.NEXT |
                            Frames_1.Flags.METADATA |
                            (metadataPosition === metadataLength &&
                                isComplete &&
                                dataLength === 0
                                ? Frames_1.Flags.COMPLETE
                                : Frames_1.Flags.FOLLOWS),
                        data: undefined,
                        metadata: metadata,
                        streamId: streamId,
                    }];
            case 4:
                _c.sent();
                metadata = undefined;
                remaining = fragmentSize;
                _c.label = 5;
            case 5: return [3 /*break*/, 3];
            case 6:
                dataPosition = 0;
                if (!firstFrame) return [3 /*break*/, 8];
                remaining -= Frames_1.Lengths.REQUEST;
                nextDataPosition = Math.min(dataLength, dataPosition + remaining);
                data = payload.data.slice(dataPosition, nextDataPosition);
                remaining -= data.byteLength;
                dataPosition = nextDataPosition;
                return [4 /*yield*/, {
                        type: frameType,
                        flags: Frames_1.Flags.FOLLOWS | (metadata ? Frames_1.Flags.METADATA : Frames_1.Flags.NONE),
                        data: data,
                        requestN: requestN,
                        metadata: metadata,
                        streamId: streamId,
                    }];
            case 7:
                _c.sent();
                metadata = undefined;
                data = undefined;
                remaining = fragmentSize;
                _c.label = 8;
            case 8:
                if (!(dataPosition < dataLength)) return [3 /*break*/, 10];
                nextDataPosition = Math.min(dataLength, dataPosition + remaining);
                data = payload.data.slice(dataPosition, nextDataPosition);
                remaining -= data.byteLength;
                dataPosition = nextDataPosition;
                return [4 /*yield*/, {
                        type: Frames_1.FrameTypes.PAYLOAD,
                        flags: dataPosition === dataLength
                            ? (isComplete ? Frames_1.Flags.COMPLETE : Frames_1.Flags.NONE) |
                                Frames_1.Flags.NEXT |
                                (metadata ? Frames_1.Flags.METADATA : 0)
                            : Frames_1.Flags.FOLLOWS | Frames_1.Flags.NEXT | (metadata ? Frames_1.Flags.METADATA : 0),
                        data: data,
                        metadata: metadata,
                        streamId: streamId,
                    }];
            case 9:
                _c.sent();
                metadata = undefined;
                data = undefined;
                remaining = fragmentSize;
                return [3 /*break*/, 8];
            case 10: return [2 /*return*/];
        }
    });
}
exports.fragmentWithRequestN = fragmentWithRequestN;

}).call(this)}).call(this,require("buffer").Buffer)
},{"./Frames":17,"buffer":2}],17:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Frame = exports.Lengths = exports.Flags = exports.FrameTypes = void 0;
var FrameTypes;
(function (FrameTypes) {
    FrameTypes[FrameTypes["RESERVED"] = 0] = "RESERVED";
    FrameTypes[FrameTypes["SETUP"] = 1] = "SETUP";
    FrameTypes[FrameTypes["LEASE"] = 2] = "LEASE";
    FrameTypes[FrameTypes["KEEPALIVE"] = 3] = "KEEPALIVE";
    FrameTypes[FrameTypes["REQUEST_RESPONSE"] = 4] = "REQUEST_RESPONSE";
    FrameTypes[FrameTypes["REQUEST_FNF"] = 5] = "REQUEST_FNF";
    FrameTypes[FrameTypes["REQUEST_STREAM"] = 6] = "REQUEST_STREAM";
    FrameTypes[FrameTypes["REQUEST_CHANNEL"] = 7] = "REQUEST_CHANNEL";
    FrameTypes[FrameTypes["REQUEST_N"] = 8] = "REQUEST_N";
    FrameTypes[FrameTypes["CANCEL"] = 9] = "CANCEL";
    FrameTypes[FrameTypes["PAYLOAD"] = 10] = "PAYLOAD";
    FrameTypes[FrameTypes["ERROR"] = 11] = "ERROR";
    FrameTypes[FrameTypes["METADATA_PUSH"] = 12] = "METADATA_PUSH";
    FrameTypes[FrameTypes["RESUME"] = 13] = "RESUME";
    FrameTypes[FrameTypes["RESUME_OK"] = 14] = "RESUME_OK";
    FrameTypes[FrameTypes["EXT"] = 63] = "EXT";
})(FrameTypes = exports.FrameTypes || (exports.FrameTypes = {}));
var Flags;
(function (Flags) {
    Flags[Flags["NONE"] = 0] = "NONE";
    Flags[Flags["COMPLETE"] = 64] = "COMPLETE";
    Flags[Flags["FOLLOWS"] = 128] = "FOLLOWS";
    Flags[Flags["IGNORE"] = 512] = "IGNORE";
    Flags[Flags["LEASE"] = 64] = "LEASE";
    Flags[Flags["METADATA"] = 256] = "METADATA";
    Flags[Flags["NEXT"] = 32] = "NEXT";
    Flags[Flags["RESPOND"] = 128] = "RESPOND";
    Flags[Flags["RESUME_ENABLE"] = 128] = "RESUME_ENABLE";
})(Flags = exports.Flags || (exports.Flags = {}));
(function (Flags) {
    function hasMetadata(flags) {
        return (flags & Flags.METADATA) === Flags.METADATA;
    }
    Flags.hasMetadata = hasMetadata;
    function hasComplete(flags) {
        return (flags & Flags.COMPLETE) === Flags.COMPLETE;
    }
    Flags.hasComplete = hasComplete;
    function hasNext(flags) {
        return (flags & Flags.NEXT) === Flags.NEXT;
    }
    Flags.hasNext = hasNext;
    function hasFollows(flags) {
        return (flags & Flags.FOLLOWS) === Flags.FOLLOWS;
    }
    Flags.hasFollows = hasFollows;
    function hasIgnore(flags) {
        return (flags & Flags.IGNORE) === Flags.IGNORE;
    }
    Flags.hasIgnore = hasIgnore;
    function hasRespond(flags) {
        return (flags & Flags.RESPOND) === Flags.RESPOND;
    }
    Flags.hasRespond = hasRespond;
    function hasLease(flags) {
        return (flags & Flags.LEASE) === Flags.LEASE;
    }
    Flags.hasLease = hasLease;
    function hasResume(flags) {
        return (flags & Flags.RESUME_ENABLE) === Flags.RESUME_ENABLE;
    }
    Flags.hasResume = hasResume;
})(Flags = exports.Flags || (exports.Flags = {}));
var Lengths;
(function (Lengths) {
    Lengths[Lengths["FRAME"] = 3] = "FRAME";
    Lengths[Lengths["HEADER"] = 6] = "HEADER";
    Lengths[Lengths["METADATA"] = 3] = "METADATA";
    Lengths[Lengths["REQUEST"] = 3] = "REQUEST";
})(Lengths = exports.Lengths || (exports.Lengths = {}));
var Frame;
(function (Frame) {
    function isConnection(frame) {
        return frame.streamId === 0;
    }
    Frame.isConnection = isConnection;
    function isRequest(frame) {
        return (FrameTypes.REQUEST_RESPONSE <= frame.type &&
            frame.type <= FrameTypes.REQUEST_CHANNEL);
    }
    Frame.isRequest = isRequest;
})(Frame = exports.Frame || (exports.Frame = {}));

},{}],18:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });

},{}],19:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RSocketConnector = void 0;
var ClientServerMultiplexerDemultiplexer_1 = require("./ClientServerMultiplexerDemultiplexer");
var Frames_1 = require("./Frames");
var RSocketSupport_1 = require("./RSocketSupport");
var Resume_1 = require("./Resume");
var RSocketConnector = /** @class */ (function () {
    function RSocketConnector(config) {
        this.config = config;
    }
    RSocketConnector.prototype.connect = function () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
        return __awaiter(this, void 0, void 0, function () {
            var config, setupFrame, connection, keepAliveSender, keepAliveHandler, leaseHandler, responder, connectionFrameHandler, streamsHandler;
            var _this = this;
            return __generator(this, function (_w) {
                switch (_w.label) {
                    case 0:
                        config = this.config;
                        setupFrame = {
                            type: Frames_1.FrameTypes.SETUP,
                            dataMimeType: (_b = (_a = config.setup) === null || _a === void 0 ? void 0 : _a.dataMimeType) !== null && _b !== void 0 ? _b : "application/octet-stream",
                            metadataMimeType: (_d = (_c = config.setup) === null || _c === void 0 ? void 0 : _c.metadataMimeType) !== null && _d !== void 0 ? _d : "application/octet-stream",
                            keepAlive: (_f = (_e = config.setup) === null || _e === void 0 ? void 0 : _e.keepAlive) !== null && _f !== void 0 ? _f : 60000,
                            lifetime: (_h = (_g = config.setup) === null || _g === void 0 ? void 0 : _g.lifetime) !== null && _h !== void 0 ? _h : 300000,
                            metadata: (_k = (_j = config.setup) === null || _j === void 0 ? void 0 : _j.payload) === null || _k === void 0 ? void 0 : _k.metadata,
                            data: (_m = (_l = config.setup) === null || _l === void 0 ? void 0 : _l.payload) === null || _m === void 0 ? void 0 : _m.data,
                            resumeToken: (_p = (_o = config.resume) === null || _o === void 0 ? void 0 : _o.tokenGenerator()) !== null && _p !== void 0 ? _p : null,
                            streamId: 0,
                            majorVersion: 1,
                            minorVersion: 0,
                            flags: (((_r = (_q = config.setup) === null || _q === void 0 ? void 0 : _q.payload) === null || _r === void 0 ? void 0 : _r.metadata) ? Frames_1.Flags.METADATA : Frames_1.Flags.NONE) |
                                (config.lease ? Frames_1.Flags.LEASE : Frames_1.Flags.NONE) |
                                (config.resume ? Frames_1.Flags.RESUME_ENABLE : Frames_1.Flags.NONE),
                        };
                        return [4 /*yield*/, config.transport.connect(function (outbound) {
                                return config.resume
                                    ? new ClientServerMultiplexerDemultiplexer_1.ResumableClientServerInputMultiplexerDemultiplexer(ClientServerMultiplexerDemultiplexer_1.StreamIdGenerator.create(-1), outbound, outbound, new Resume_1.FrameStore(), // TODO: add size control
                                    setupFrame.resumeToken.toString(), function (self, frameStore) { return __awaiter(_this, void 0, void 0, function () {
                                        var multiplexerDemultiplexerProvider, reconnectionAttempts, reconnector;
                                        return __generator(this, function (_a) {
                                            switch (_a.label) {
                                                case 0:
                                                    multiplexerDemultiplexerProvider = function (outbound) {
                                                        outbound.send({
                                                            type: Frames_1.FrameTypes.RESUME,
                                                            streamId: 0,
                                                            flags: Frames_1.Flags.NONE,
                                                            clientPosition: frameStore.firstAvailableFramePosition,
                                                            serverPosition: frameStore.lastReceivedFramePosition,
                                                            majorVersion: setupFrame.minorVersion,
                                                            minorVersion: setupFrame.majorVersion,
                                                            resumeToken: setupFrame.resumeToken,
                                                        });
                                                        return new ClientServerMultiplexerDemultiplexer_1.ResumeOkAwaitingResumableClientServerInputMultiplexerDemultiplexer(outbound, outbound, self);
                                                    };
                                                    reconnectionAttempts = -1;
                                                    reconnector = function () {
                                                        reconnectionAttempts++;
                                                        return config.resume
                                                            .reconnectFunction(reconnectionAttempts)
                                                            .then(function () {
                                                            return config.transport
                                                                .connect(multiplexerDemultiplexerProvider)
                                                                .catch(reconnector);
                                                        });
                                                    };
                                                    return [4 /*yield*/, reconnector()];
                                                case 1:
                                                    _a.sent();
                                                    return [2 /*return*/];
                                            }
                                        });
                                    }); })
                                    : new ClientServerMultiplexerDemultiplexer_1.ClientServerInputMultiplexerDemultiplexer(ClientServerMultiplexerDemultiplexer_1.StreamIdGenerator.create(-1), outbound, outbound);
                            })];
                    case 1:
                        connection = _w.sent();
                        keepAliveSender = new RSocketSupport_1.KeepAliveSender(connection.multiplexerDemultiplexer.connectionOutbound, setupFrame.keepAlive);
                        keepAliveHandler = new RSocketSupport_1.KeepAliveHandler(connection, setupFrame.lifetime);
                        leaseHandler = config.lease
                            ? new RSocketSupport_1.LeaseHandler((_s = config.lease.maxPendingRequests) !== null && _s !== void 0 ? _s : 256, connection.multiplexerDemultiplexer)
                            : undefined;
                        responder = (_t = config.responder) !== null && _t !== void 0 ? _t : {};
                        connectionFrameHandler = new RSocketSupport_1.DefaultConnectionFrameHandler(connection, keepAliveHandler, keepAliveSender, leaseHandler, responder);
                        streamsHandler = new RSocketSupport_1.DefaultStreamRequestHandler(responder, 0);
                        connection.onClose(function (e) {
                            keepAliveSender.close();
                            keepAliveHandler.close();
                            connectionFrameHandler.close(e);
                        });
                        connection.multiplexerDemultiplexer.connectionInbound(connectionFrameHandler);
                        connection.multiplexerDemultiplexer.handleRequestStream(streamsHandler);
                        connection.multiplexerDemultiplexer.connectionOutbound.send(setupFrame);
                        keepAliveHandler.start();
                        keepAliveSender.start();
                        return [2 /*return*/, new RSocketSupport_1.RSocketRequester(connection, (_v = (_u = config.fragmentation) === null || _u === void 0 ? void 0 : _u.maxOutboundFragmentSize) !== null && _v !== void 0 ? _v : 0, leaseHandler)];
                }
            });
        });
    };
    return RSocketConnector;
}());
exports.RSocketConnector = RSocketConnector;

},{"./ClientServerMultiplexerDemultiplexer":11,"./Frames":17,"./RSocketSupport":21,"./Resume":27}],20:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RSocketServer = void 0;
var ClientServerMultiplexerDemultiplexer_1 = require("./ClientServerMultiplexerDemultiplexer");
var Errors_1 = require("./Errors");
var Frames_1 = require("./Frames");
var RSocketSupport_1 = require("./RSocketSupport");
var Resume_1 = require("./Resume");
var RSocketServer = /** @class */ (function () {
    function RSocketServer(config) {
        var _a, _b;
        this.acceptor = config.acceptor;
        this.transport = config.transport;
        this.lease = config.lease;
        this.serverSideKeepAlive = config.serverSideKeepAlive;
        this.sessionStore = config.resume ? {} : undefined;
        this.sessionTimeout = (_b = (_a = config.resume) === null || _a === void 0 ? void 0 : _a.sessionTimeout) !== null && _b !== void 0 ? _b : undefined;
    }
    RSocketServer.prototype.bind = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.transport.bind(function (frame, connection) { return __awaiter(_this, void 0, void 0, function () {
                            var _a, error, error, leaseHandler, requester, responder, keepAliveHandler_1, keepAliveSender_1, connectionFrameHandler_1, streamsHandler, e_1;
                            var _b, _c, _d, _e;
                            return __generator(this, function (_f) {
                                switch (_f.label) {
                                    case 0:
                                        _a = frame.type;
                                        switch (_a) {
                                            case Frames_1.FrameTypes.SETUP: return [3 /*break*/, 1];
                                            case Frames_1.FrameTypes.RESUME: return [3 /*break*/, 5];
                                        }
                                        return [3 /*break*/, 6];
                                    case 1:
                                        _f.trys.push([1, 3, , 4]);
                                        if (this.lease && !Frames_1.Flags.hasLease(frame.flags)) {
                                            error = new Errors_1.RSocketError(Errors_1.ErrorCodes.REJECTED_SETUP, "Lease has to be enabled");
                                            connection.multiplexerDemultiplexer.connectionOutbound.send({
                                                type: Frames_1.FrameTypes.ERROR,
                                                streamId: 0,
                                                flags: Frames_1.Flags.NONE,
                                                code: error.code,
                                                message: error.message,
                                            });
                                            connection.close(error);
                                            return [2 /*return*/];
                                        }
                                        if (Frames_1.Flags.hasLease(frame.flags) && !this.lease) {
                                            error = new Errors_1.RSocketError(Errors_1.ErrorCodes.REJECTED_SETUP, "Lease has to be disabled");
                                            connection.multiplexerDemultiplexer.connectionOutbound.send({
                                                type: Frames_1.FrameTypes.ERROR,
                                                streamId: 0,
                                                flags: Frames_1.Flags.NONE,
                                                code: error.code,
                                                message: error.message,
                                            });
                                            connection.close(error);
                                            return [2 /*return*/];
                                        }
                                        leaseHandler = Frames_1.Flags.hasLease(frame.flags)
                                            ? new RSocketSupport_1.LeaseHandler((_b = this.lease.maxPendingRequests) !== null && _b !== void 0 ? _b : 256, connection.multiplexerDemultiplexer)
                                            : undefined;
                                        requester = new RSocketSupport_1.RSocketRequester(connection, (_d = (_c = this.fragmentation) === null || _c === void 0 ? void 0 : _c.maxOutboundFragmentSize) !== null && _d !== void 0 ? _d : 0, leaseHandler);
                                        return [4 /*yield*/, this.acceptor.accept({
                                                data: frame.data,
                                                dataMimeType: frame.dataMimeType,
                                                metadata: frame.metadata,
                                                metadataMimeType: frame.metadataMimeType,
                                                flags: frame.flags,
                                                keepAliveMaxLifetime: frame.lifetime,
                                                keepAliveInterval: frame.keepAlive,
                                                resumeToken: frame.resumeToken,
                                            }, requester)];
                                    case 2:
                                        responder = _f.sent();
                                        keepAliveHandler_1 = new RSocketSupport_1.KeepAliveHandler(connection, frame.lifetime);
                                        keepAliveSender_1 = this.serverSideKeepAlive
                                            ? new RSocketSupport_1.KeepAliveSender(connection.multiplexerDemultiplexer.connectionOutbound, frame.keepAlive)
                                            : undefined;
                                        connectionFrameHandler_1 = new RSocketSupport_1.DefaultConnectionFrameHandler(connection, keepAliveHandler_1, keepAliveSender_1, leaseHandler, responder);
                                        streamsHandler = new RSocketSupport_1.DefaultStreamRequestHandler(responder, 0);
                                        connection.onClose(function (e) {
                                            keepAliveSender_1 === null || keepAliveSender_1 === void 0 ? void 0 : keepAliveSender_1.close();
                                            keepAliveHandler_1.close();
                                            connectionFrameHandler_1.close(e);
                                        });
                                        connection.multiplexerDemultiplexer.connectionInbound(connectionFrameHandler_1);
                                        connection.multiplexerDemultiplexer.handleRequestStream(streamsHandler);
                                        keepAliveHandler_1.start();
                                        keepAliveSender_1 === null || keepAliveSender_1 === void 0 ? void 0 : keepAliveSender_1.start();
                                        return [3 /*break*/, 4];
                                    case 3:
                                        e_1 = _f.sent();
                                        connection.multiplexerDemultiplexer.connectionOutbound.send({
                                            type: Frames_1.FrameTypes.ERROR,
                                            streamId: 0,
                                            code: Errors_1.ErrorCodes.REJECTED_SETUP,
                                            message: (_e = e_1.message) !== null && _e !== void 0 ? _e : "",
                                            flags: Frames_1.Flags.NONE,
                                        });
                                        connection.close(e_1 instanceof Errors_1.RSocketError
                                            ? e_1
                                            : new Errors_1.RSocketError(Errors_1.ErrorCodes.REJECTED_SETUP, e_1.message));
                                        return [3 /*break*/, 4];
                                    case 4: return [2 /*return*/];
                                    case 5:
                                        {
                                            // frame should be handled earlier
                                            return [2 /*return*/];
                                        }
                                        _f.label = 6;
                                    case 6:
                                        {
                                            connection.multiplexerDemultiplexer.connectionOutbound.send({
                                                type: Frames_1.FrameTypes.ERROR,
                                                streamId: 0,
                                                code: Errors_1.ErrorCodes.UNSUPPORTED_SETUP,
                                                message: "Unsupported setup",
                                                flags: Frames_1.Flags.NONE,
                                            });
                                            connection.close(new Errors_1.RSocketError(Errors_1.ErrorCodes.UNSUPPORTED_SETUP));
                                        }
                                        _f.label = 7;
                                    case 7: return [2 /*return*/];
                                }
                            });
                        }); }, function (frame, outbound) {
                            if (frame.type === Frames_1.FrameTypes.RESUME) {
                                if (_this.sessionStore) {
                                    var multiplexerDemultiplexer = _this.sessionStore[frame.resumeToken.toString()];
                                    if (!multiplexerDemultiplexer) {
                                        outbound.send({
                                            type: Frames_1.FrameTypes.ERROR,
                                            streamId: 0,
                                            code: Errors_1.ErrorCodes.REJECTED_RESUME,
                                            message: "No session found for the given resume token",
                                            flags: Frames_1.Flags.NONE,
                                        });
                                        outbound.close();
                                        return;
                                    }
                                    multiplexerDemultiplexer.resume(frame, outbound, outbound);
                                    return multiplexerDemultiplexer;
                                }
                                outbound.send({
                                    type: Frames_1.FrameTypes.ERROR,
                                    streamId: 0,
                                    code: Errors_1.ErrorCodes.REJECTED_RESUME,
                                    message: "Resume is not enabled",
                                    flags: Frames_1.Flags.NONE,
                                });
                                outbound.close();
                                return;
                            }
                            else if (frame.type === Frames_1.FrameTypes.SETUP) {
                                if (Frames_1.Flags.hasResume(frame.flags)) {
                                    if (!_this.sessionStore) {
                                        var error = new Errors_1.RSocketError(Errors_1.ErrorCodes.REJECTED_SETUP, "No resume support");
                                        outbound.send({
                                            type: Frames_1.FrameTypes.ERROR,
                                            streamId: 0,
                                            flags: Frames_1.Flags.NONE,
                                            code: error.code,
                                            message: error.message,
                                        });
                                        outbound.close(error);
                                        return;
                                    }
                                    var multiplexerDumiltiplexer = new ClientServerMultiplexerDemultiplexer_1.ResumableClientServerInputMultiplexerDemultiplexer(ClientServerMultiplexerDemultiplexer_1.StreamIdGenerator.create(0), outbound, outbound, new Resume_1.FrameStore(), // TODO: add size parameter
                                    frame.resumeToken.toString(), _this.sessionStore, _this.sessionTimeout);
                                    _this.sessionStore[frame.resumeToken.toString()] =
                                        multiplexerDumiltiplexer;
                                    return multiplexerDumiltiplexer;
                                }
                            }
                            return new ClientServerMultiplexerDemultiplexer_1.ClientServerInputMultiplexerDemultiplexer(ClientServerMultiplexerDemultiplexer_1.StreamIdGenerator.create(0), outbound, outbound);
                        })];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    return RSocketServer;
}());
exports.RSocketServer = RSocketServer;

},{"./ClientServerMultiplexerDemultiplexer":11,"./Errors":15,"./Frames":17,"./RSocketSupport":21,"./Resume":27}],21:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeepAliveSender = exports.KeepAliveHandler = exports.DefaultConnectionFrameHandler = exports.DefaultStreamRequestHandler = exports.LeaseHandler = exports.RSocketRequester = void 0;
var Errors_1 = require("./Errors");
var Frames_1 = require("./Frames");
var RequestChannelStream_1 = require("./RequestChannelStream");
var RequestFnFStream_1 = require("./RequestFnFStream");
var RequestResponseStream_1 = require("./RequestResponseStream");
var RequestStreamStream_1 = require("./RequestStreamStream");
var RSocketRequester = /** @class */ (function () {
    function RSocketRequester(connection, fragmentSize, leaseManager) {
        this.connection = connection;
        this.fragmentSize = fragmentSize;
        this.leaseManager = leaseManager;
    }
    RSocketRequester.prototype.fireAndForget = function (payload, responderStream) {
        var handler = new RequestFnFStream_1.RequestFnFRequesterStream(payload, responderStream, this.fragmentSize, this.leaseManager);
        if (this.leaseManager) {
            this.leaseManager.requestLease(handler);
        }
        else {
            this.connection.multiplexerDemultiplexer.createRequestStream(handler);
        }
        return handler;
    };
    RSocketRequester.prototype.requestResponse = function (payload, responderStream) {
        var handler = new RequestResponseStream_1.RequestResponseRequesterStream(payload, responderStream, this.fragmentSize, this.leaseManager);
        if (this.leaseManager) {
            this.leaseManager.requestLease(handler);
        }
        else {
            this.connection.multiplexerDemultiplexer.createRequestStream(handler);
        }
        return handler;
    };
    RSocketRequester.prototype.requestStream = function (payload, initialRequestN, responderStream) {
        var handler = new RequestStreamStream_1.RequestStreamRequesterStream(payload, responderStream, this.fragmentSize, initialRequestN, this.leaseManager);
        if (this.leaseManager) {
            this.leaseManager.requestLease(handler);
        }
        else {
            this.connection.multiplexerDemultiplexer.createRequestStream(handler);
        }
        return handler;
    };
    RSocketRequester.prototype.requestChannel = function (payload, initialRequestN, isCompleted, responderStream) {
        var handler = new RequestChannelStream_1.RequestChannelRequesterStream(payload, isCompleted, responderStream, this.fragmentSize, initialRequestN, this.leaseManager);
        if (this.leaseManager) {
            this.leaseManager.requestLease(handler);
        }
        else {
            this.connection.multiplexerDemultiplexer.createRequestStream(handler);
        }
        return handler;
    };
    RSocketRequester.prototype.metadataPush = function (metadata, responderStream) {
        throw new Error("Method not implemented.");
    };
    RSocketRequester.prototype.close = function (error) {
        this.connection.close(error);
    };
    RSocketRequester.prototype.onClose = function (callback) {
        this.connection.onClose(callback);
    };
    return RSocketRequester;
}());
exports.RSocketRequester = RSocketRequester;
var LeaseHandler = /** @class */ (function () {
    function LeaseHandler(maxPendingRequests, multiplexer) {
        this.maxPendingRequests = maxPendingRequests;
        this.multiplexer = multiplexer;
        this.pendingRequests = [];
        this.expirationTime = 0;
        this.availableLease = 0;
    }
    LeaseHandler.prototype.handle = function (frame) {
        this.expirationTime = frame.ttl + Date.now();
        this.availableLease = frame.requestCount;
        while (this.availableLease > 0 && this.pendingRequests.length > 0) {
            var handler = this.pendingRequests.shift();
            this.availableLease--;
            this.multiplexer.createRequestStream(handler);
        }
    };
    LeaseHandler.prototype.requestLease = function (handler) {
        var availableLease = this.availableLease;
        if (availableLease > 0 && Date.now() < this.expirationTime) {
            this.availableLease = availableLease - 1;
            this.multiplexer.createRequestStream(handler);
            return;
        }
        if (this.pendingRequests.length >= this.maxPendingRequests) {
            handler.handleReject(new Errors_1.RSocketError(Errors_1.ErrorCodes.REJECTED, "No available lease given"));
            return;
        }
        this.pendingRequests.push(handler);
    };
    LeaseHandler.prototype.cancelRequest = function (handler) {
        var index = this.pendingRequests.indexOf(handler);
        if (index > -1) {
            this.pendingRequests.splice(index, 1);
        }
    };
    return LeaseHandler;
}());
exports.LeaseHandler = LeaseHandler;
var DefaultStreamRequestHandler = /** @class */ (function () {
    function DefaultStreamRequestHandler(rsocket, fragmentSize) {
        this.rsocket = rsocket;
        this.fragmentSize = fragmentSize;
    }
    DefaultStreamRequestHandler.prototype.handle = function (frame, stream) {
        switch (frame.type) {
            case Frames_1.FrameTypes.REQUEST_FNF:
                if (this.rsocket.fireAndForget) {
                    new RequestFnFStream_1.RequestFnfResponderStream(frame.streamId, stream, this.rsocket.fireAndForget.bind(this.rsocket), frame);
                }
                return;
            case Frames_1.FrameTypes.REQUEST_RESPONSE:
                if (this.rsocket.requestResponse) {
                    new RequestResponseStream_1.RequestResponseResponderStream(frame.streamId, stream, this.fragmentSize, this.rsocket.requestResponse.bind(this.rsocket), frame);
                    return;
                }
                this.rejectRequest(frame.streamId, stream);
                return;
            case Frames_1.FrameTypes.REQUEST_STREAM:
                if (this.rsocket.requestStream) {
                    new RequestStreamStream_1.RequestStreamResponderStream(frame.streamId, stream, this.fragmentSize, this.rsocket.requestStream.bind(this.rsocket), frame);
                    return;
                }
                this.rejectRequest(frame.streamId, stream);
                return;
            case Frames_1.FrameTypes.REQUEST_CHANNEL:
                if (this.rsocket.requestChannel) {
                    new RequestChannelStream_1.RequestChannelResponderStream(frame.streamId, stream, this.fragmentSize, this.rsocket.requestChannel.bind(this.rsocket), frame);
                    return;
                }
                this.rejectRequest(frame.streamId, stream);
                return;
        }
    };
    DefaultStreamRequestHandler.prototype.rejectRequest = function (streamId, stream) {
        stream.send({
            type: Frames_1.FrameTypes.ERROR,
            streamId: streamId,
            flags: Frames_1.Flags.NONE,
            code: Errors_1.ErrorCodes.REJECTED,
            message: "No available handler found",
        });
    };
    DefaultStreamRequestHandler.prototype.close = function () { };
    return DefaultStreamRequestHandler;
}());
exports.DefaultStreamRequestHandler = DefaultStreamRequestHandler;
var DefaultConnectionFrameHandler = /** @class */ (function () {
    function DefaultConnectionFrameHandler(connection, keepAliveHandler, keepAliveSender, leaseHandler, rsocket) {
        this.connection = connection;
        this.keepAliveHandler = keepAliveHandler;
        this.keepAliveSender = keepAliveSender;
        this.leaseHandler = leaseHandler;
        this.rsocket = rsocket;
    }
    DefaultConnectionFrameHandler.prototype.handle = function (frame) {
        switch (frame.type) {
            case Frames_1.FrameTypes.KEEPALIVE:
                this.keepAliveHandler.handle(frame);
                return;
            case Frames_1.FrameTypes.LEASE:
                if (this.leaseHandler) {
                    this.leaseHandler.handle(frame);
                    return;
                }
                // TODO throw exception and close connection
                return;
            case Frames_1.FrameTypes.ERROR:
                // TODO: add code validation
                this.connection.close(new Errors_1.RSocketError(frame.code, frame.message));
                return;
            case Frames_1.FrameTypes.METADATA_PUSH:
                if (this.rsocket.metadataPush) {
                    // this.rsocket.metadataPush()
                }
                return;
            default:
                this.connection.multiplexerDemultiplexer.connectionOutbound.send({
                    type: Frames_1.FrameTypes.ERROR,
                    streamId: 0,
                    flags: Frames_1.Flags.NONE,
                    message: "Received unknown frame type",
                    code: Errors_1.ErrorCodes.CONNECTION_ERROR,
                });
            // TODO: throw an exception and close connection
        }
    };
    DefaultConnectionFrameHandler.prototype.pause = function () {
        var _a;
        this.keepAliveHandler.pause();
        (_a = this.keepAliveSender) === null || _a === void 0 ? void 0 : _a.pause();
    };
    DefaultConnectionFrameHandler.prototype.resume = function () {
        var _a;
        this.keepAliveHandler.start();
        (_a = this.keepAliveSender) === null || _a === void 0 ? void 0 : _a.start();
    };
    DefaultConnectionFrameHandler.prototype.close = function (error) {
        var _a;
        this.keepAliveHandler.close();
        (_a = this.rsocket.close) === null || _a === void 0 ? void 0 : _a.call(this.rsocket, error);
    };
    return DefaultConnectionFrameHandler;
}());
exports.DefaultConnectionFrameHandler = DefaultConnectionFrameHandler;
var KeepAliveHandlerStates;
(function (KeepAliveHandlerStates) {
    KeepAliveHandlerStates[KeepAliveHandlerStates["Paused"] = 0] = "Paused";
    KeepAliveHandlerStates[KeepAliveHandlerStates["Running"] = 1] = "Running";
    KeepAliveHandlerStates[KeepAliveHandlerStates["Closed"] = 2] = "Closed";
})(KeepAliveHandlerStates || (KeepAliveHandlerStates = {}));
var KeepAliveHandler = /** @class */ (function () {
    function KeepAliveHandler(connection, keepAliveTimeoutDuration) {
        this.connection = connection;
        this.keepAliveTimeoutDuration = keepAliveTimeoutDuration;
        this.state = KeepAliveHandlerStates.Paused;
        this.outbound = connection.multiplexerDemultiplexer.connectionOutbound;
    }
    KeepAliveHandler.prototype.handle = function (frame) {
        this.keepAliveLastReceivedMillis = Date.now();
        if (Frames_1.Flags.hasRespond(frame.flags)) {
            this.outbound.send({
                type: Frames_1.FrameTypes.KEEPALIVE,
                streamId: 0,
                data: frame.data,
                flags: frame.flags ^ Frames_1.Flags.RESPOND,
                lastReceivedPosition: 0,
            });
        }
    };
    KeepAliveHandler.prototype.start = function () {
        if (this.state !== KeepAliveHandlerStates.Paused) {
            return;
        }
        this.keepAliveLastReceivedMillis = Date.now();
        this.state = KeepAliveHandlerStates.Running;
        this.activeTimeout = setTimeout(this.timeoutCheck.bind(this), this.keepAliveTimeoutDuration);
    };
    KeepAliveHandler.prototype.pause = function () {
        if (this.state !== KeepAliveHandlerStates.Running) {
            return;
        }
        this.state = KeepAliveHandlerStates.Paused;
        clearTimeout(this.activeTimeout);
    };
    KeepAliveHandler.prototype.close = function () {
        this.state = KeepAliveHandlerStates.Closed;
        clearTimeout(this.activeTimeout);
    };
    KeepAliveHandler.prototype.timeoutCheck = function () {
        var now = Date.now();
        var noKeepAliveDuration = now - this.keepAliveLastReceivedMillis;
        if (noKeepAliveDuration >= this.keepAliveTimeoutDuration) {
            this.connection.close(new Error("No keep-alive acks for ".concat(this.keepAliveTimeoutDuration, " millis")));
        }
        else {
            this.activeTimeout = setTimeout(this.timeoutCheck.bind(this), Math.max(100, this.keepAliveTimeoutDuration - noKeepAliveDuration));
        }
    };
    return KeepAliveHandler;
}());
exports.KeepAliveHandler = KeepAliveHandler;
var KeepAliveSenderStates;
(function (KeepAliveSenderStates) {
    KeepAliveSenderStates[KeepAliveSenderStates["Paused"] = 0] = "Paused";
    KeepAliveSenderStates[KeepAliveSenderStates["Running"] = 1] = "Running";
    KeepAliveSenderStates[KeepAliveSenderStates["Closed"] = 2] = "Closed";
})(KeepAliveSenderStates || (KeepAliveSenderStates = {}));
var KeepAliveSender = /** @class */ (function () {
    function KeepAliveSender(outbound, keepAlivePeriodDuration) {
        this.outbound = outbound;
        this.keepAlivePeriodDuration = keepAlivePeriodDuration;
        this.state = KeepAliveSenderStates.Paused;
    }
    KeepAliveSender.prototype.sendKeepAlive = function () {
        this.outbound.send({
            type: Frames_1.FrameTypes.KEEPALIVE,
            streamId: 0,
            data: undefined,
            flags: Frames_1.Flags.RESPOND,
            lastReceivedPosition: 0,
        });
    };
    KeepAliveSender.prototype.start = function () {
        if (this.state !== KeepAliveSenderStates.Paused) {
            return;
        }
        this.state = KeepAliveSenderStates.Running;
        this.activeInterval = setInterval(this.sendKeepAlive.bind(this), this.keepAlivePeriodDuration);
    };
    KeepAliveSender.prototype.pause = function () {
        if (this.state !== KeepAliveSenderStates.Running) {
            return;
        }
        this.state = KeepAliveSenderStates.Paused;
        clearInterval(this.activeInterval);
    };
    KeepAliveSender.prototype.close = function () {
        this.state = KeepAliveSenderStates.Closed;
        clearInterval(this.activeInterval);
    };
    return KeepAliveSender;
}());
exports.KeepAliveSender = KeepAliveSender;

},{"./Errors":15,"./Frames":17,"./RequestChannelStream":23,"./RequestFnFStream":24,"./RequestResponseStream":25,"./RequestStreamStream":26}],22:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancel = exports.reassemble = exports.add = void 0;
function add(holder, dataFragment, metadataFragment) {
    if (!holder.hasFragments) {
        holder.hasFragments = true;
        holder.data = dataFragment;
        if (metadataFragment) {
            holder.metadata = metadataFragment;
        }
        return true;
    }
    // TODO: add validation
    holder.data = holder.data
        ? Buffer.concat([holder.data, dataFragment])
        : dataFragment;
    if (holder.metadata && metadataFragment) {
        holder.metadata = Buffer.concat([holder.metadata, metadataFragment]);
    }
    return true;
}
exports.add = add;
function reassemble(holder, dataFragment, metadataFragment) {
    // TODO: add validation
    holder.hasFragments = false;
    var data = holder.data
        ? Buffer.concat([holder.data, dataFragment])
        : dataFragment;
    holder.data = undefined;
    if (holder.metadata) {
        var metadata = metadataFragment
            ? Buffer.concat([holder.metadata, metadataFragment])
            : holder.metadata;
        holder.metadata = undefined;
        return {
            data: data,
            metadata: metadata,
        };
    }
    return {
        data: data,
    };
}
exports.reassemble = reassemble;
function cancel(holder) {
    holder.hasFragments = false;
    holder.data = undefined;
    holder.metadata = undefined;
}
exports.cancel = cancel;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":2}],23:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestChannelResponderStream = exports.RequestChannelRequesterStream = void 0;
var Errors_1 = require("./Errors");
var Fragmenter_1 = require("./Fragmenter");
var Frames_1 = require("./Frames");
var Reassembler = __importStar(require("./Reassembler"));
var RequestChannelRequesterStream = /** @class */ (function () {
    function RequestChannelRequesterStream(payload, isComplete, receiver, fragmentSize, initialRequestN, leaseManager) {
        this.payload = payload;
        this.isComplete = isComplete;
        this.receiver = receiver;
        this.fragmentSize = fragmentSize;
        this.initialRequestN = initialRequestN;
        this.leaseManager = leaseManager;
        this.streamType = Frames_1.FrameTypes.REQUEST_CHANNEL;
        // TODO: add payload size validation
    }
    RequestChannelRequesterStream.prototype.handleReady = function (streamId, stream) {
        var e_1, _a;
        if (this.outboundDone) {
            return false;
        }
        this.streamId = streamId;
        this.stream = stream;
        stream.connect(this);
        var isCompleted = this.isComplete;
        if (isCompleted) {
            this.outboundDone = isCompleted;
        }
        if ((0, Fragmenter_1.isFragmentable)(this.payload, this.fragmentSize, Frames_1.FrameTypes.REQUEST_CHANNEL)) {
            try {
                for (var _b = __values((0, Fragmenter_1.fragmentWithRequestN)(streamId, this.payload, this.fragmentSize, Frames_1.FrameTypes.REQUEST_CHANNEL, this.initialRequestN, isCompleted)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var frame = _c.value;
                    this.stream.send(frame);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        else {
            this.stream.send({
                type: Frames_1.FrameTypes.REQUEST_CHANNEL,
                data: this.payload.data,
                metadata: this.payload.metadata,
                requestN: this.initialRequestN,
                flags: (this.payload.metadata !== undefined ? Frames_1.Flags.METADATA : Frames_1.Flags.NONE) |
                    (isCompleted ? Frames_1.Flags.COMPLETE : Frames_1.Flags.NONE),
                streamId: streamId,
            });
        }
        if (this.hasExtension) {
            this.stream.send({
                type: Frames_1.FrameTypes.EXT,
                streamId: streamId,
                extendedContent: this.extendedContent,
                extendedType: this.extendedType,
                flags: this.flags,
            });
        }
        return true;
    };
    RequestChannelRequesterStream.prototype.handleReject = function (error) {
        if (this.inboundDone) {
            return;
        }
        this.inboundDone = true;
        this.outboundDone = true;
        this.receiver.onError(error);
    };
    RequestChannelRequesterStream.prototype.handle = function (frame) {
        var errorMessage;
        var frameType = frame.type;
        switch (frameType) {
            case Frames_1.FrameTypes.PAYLOAD: {
                var hasComplete = Frames_1.Flags.hasComplete(frame.flags);
                var hasNext = Frames_1.Flags.hasNext(frame.flags);
                if (hasComplete || !Frames_1.Flags.hasFollows(frame.flags)) {
                    if (hasComplete) {
                        this.inboundDone = true;
                        if (this.outboundDone) {
                            this.stream.disconnect(this);
                        }
                        if (!hasNext) {
                            // TODO: add validation no frame in reassembly
                            this.receiver.onComplete();
                            return;
                        }
                    }
                    var payload = this.hasFragments
                        ? Reassembler.reassemble(this, frame.data, frame.metadata)
                        : {
                            data: frame.data,
                            metadata: frame.metadata,
                        };
                    this.receiver.onNext(payload, hasComplete);
                    return;
                }
                if (Reassembler.add(this, frame.data, frame.metadata)) {
                    return;
                }
                errorMessage = "Unexpected frame size";
                break;
            }
            case Frames_1.FrameTypes.CANCEL: {
                if (this.outboundDone) {
                    return;
                }
                this.outboundDone = true;
                if (this.inboundDone) {
                    this.stream.disconnect(this);
                }
                this.receiver.cancel();
                return;
            }
            case Frames_1.FrameTypes.REQUEST_N: {
                if (this.outboundDone) {
                    return;
                }
                if (this.hasFragments) {
                    errorMessage = "Unexpected frame type [".concat(frameType, "] during reassembly");
                    break;
                }
                this.receiver.request(frame.requestN);
                return;
            }
            case Frames_1.FrameTypes.ERROR: {
                var outboundDone = this.outboundDone;
                this.inboundDone = true;
                this.outboundDone = true;
                this.stream.disconnect(this);
                Reassembler.cancel(this);
                if (!outboundDone) {
                    this.receiver.cancel();
                }
                this.receiver.onError(new Errors_1.RSocketError(frame.code, frame.message));
                return;
            }
            case Frames_1.FrameTypes.EXT:
                this.receiver.onExtension(frame.extendedType, frame.extendedContent, Frames_1.Flags.hasIgnore(frame.flags));
                return;
            default: {
                errorMessage = "Unexpected frame type [".concat(frameType, "]");
            }
        }
        this.close(new Errors_1.RSocketError(Errors_1.ErrorCodes.CANCELED, errorMessage));
        this.stream.send({
            type: Frames_1.FrameTypes.CANCEL,
            streamId: this.streamId,
            flags: Frames_1.Flags.NONE,
        });
        this.stream.disconnect(this);
    };
    RequestChannelRequesterStream.prototype.request = function (n) {
        if (this.inboundDone) {
            return;
        }
        if (!this.streamId) {
            this.initialRequestN += n;
            return;
        }
        this.stream.send({
            type: Frames_1.FrameTypes.REQUEST_N,
            flags: Frames_1.Flags.NONE,
            requestN: n,
            streamId: this.streamId,
        });
    };
    RequestChannelRequesterStream.prototype.cancel = function () {
        var _a;
        var inboundDone = this.inboundDone;
        var outboundDone = this.outboundDone;
        if (inboundDone && outboundDone) {
            return;
        }
        this.inboundDone = true;
        this.outboundDone = true;
        if (!outboundDone) {
            this.receiver.cancel();
        }
        if (!this.streamId) {
            (_a = this.leaseManager) === null || _a === void 0 ? void 0 : _a.cancelRequest(this);
            return;
        }
        this.stream.send({
            type: inboundDone ? Frames_1.FrameTypes.ERROR : Frames_1.FrameTypes.CANCEL,
            flags: Frames_1.Flags.NONE,
            streamId: this.streamId,
            code: Errors_1.ErrorCodes.CANCELED,
            message: "Cancelled",
        });
        this.stream.disconnect(this);
        Reassembler.cancel(this);
    };
    RequestChannelRequesterStream.prototype.onNext = function (payload, isComplete) {
        var e_2, _a;
        if (this.outboundDone) {
            return;
        }
        if (isComplete) {
            this.outboundDone = true;
            if (this.inboundDone) {
                this.stream.disconnect(this);
            }
        }
        if ((0, Fragmenter_1.isFragmentable)(payload, this.fragmentSize, Frames_1.FrameTypes.PAYLOAD)) {
            try {
                for (var _b = __values((0, Fragmenter_1.fragment)(this.streamId, payload, this.fragmentSize, Frames_1.FrameTypes.PAYLOAD, isComplete)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var frame = _c.value;
                    this.stream.send(frame);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
        else {
            this.stream.send({
                type: Frames_1.FrameTypes.PAYLOAD,
                streamId: this.streamId,
                flags: Frames_1.Flags.NEXT |
                    (payload.metadata ? Frames_1.Flags.METADATA : Frames_1.Flags.NONE) |
                    (isComplete ? Frames_1.Flags.COMPLETE : Frames_1.Flags.NONE),
                data: payload.data,
                metadata: payload.metadata,
            });
        }
    };
    RequestChannelRequesterStream.prototype.onComplete = function () {
        if (!this.streamId) {
            this.isComplete = true;
            return;
        }
        if (this.outboundDone) {
            return;
        }
        this.outboundDone = true;
        this.stream.send({
            type: Frames_1.FrameTypes.PAYLOAD,
            streamId: this.streamId,
            flags: Frames_1.Flags.COMPLETE,
            data: null,
            metadata: null,
        });
        if (this.inboundDone) {
            this.stream.disconnect(this);
        }
    };
    RequestChannelRequesterStream.prototype.onError = function (error) {
        if (this.outboundDone) {
            return;
        }
        var inboundDone = this.inboundDone;
        this.outboundDone = true;
        this.inboundDone = true;
        this.stream.send({
            type: Frames_1.FrameTypes.ERROR,
            streamId: this.streamId,
            flags: Frames_1.Flags.NONE,
            code: error instanceof Errors_1.RSocketError
                ? error.code
                : Errors_1.ErrorCodes.APPLICATION_ERROR,
            message: error.message,
        });
        this.stream.disconnect(this);
        if (!inboundDone) {
            this.receiver.onError(error);
        }
    };
    RequestChannelRequesterStream.prototype.onExtension = function (extendedType, content, canBeIgnored) {
        if (this.outboundDone) {
            return;
        }
        if (!this.streamId) {
            this.hasExtension = true;
            this.extendedType = extendedType;
            this.extendedContent = content;
            this.flags = canBeIgnored ? Frames_1.Flags.IGNORE : Frames_1.Flags.NONE;
            return;
        }
        this.stream.send({
            streamId: this.streamId,
            type: Frames_1.FrameTypes.EXT,
            extendedType: extendedType,
            extendedContent: content,
            flags: canBeIgnored ? Frames_1.Flags.IGNORE : Frames_1.Flags.NONE,
        });
    };
    RequestChannelRequesterStream.prototype.close = function (error) {
        if (this.inboundDone && this.outboundDone) {
            return;
        }
        var inboundDone = this.inboundDone;
        var outboundDone = this.outboundDone;
        this.inboundDone = true;
        this.outboundDone = true;
        Reassembler.cancel(this);
        if (!outboundDone) {
            this.receiver.cancel();
        }
        if (!inboundDone) {
            if (error) {
                this.receiver.onError(error);
            }
            else {
                this.receiver.onComplete();
            }
        }
    };
    return RequestChannelRequesterStream;
}());
exports.RequestChannelRequesterStream = RequestChannelRequesterStream;
var RequestChannelResponderStream = /** @class */ (function () {
    function RequestChannelResponderStream(streamId, stream, fragmentSize, handler, frame) {
        this.streamId = streamId;
        this.stream = stream;
        this.fragmentSize = fragmentSize;
        this.handler = handler;
        this.streamType = Frames_1.FrameTypes.REQUEST_CHANNEL;
        stream.connect(this);
        if (Frames_1.Flags.hasFollows(frame.flags)) {
            Reassembler.add(this, frame.data, frame.metadata);
            this.initialRequestN = frame.requestN;
            this.isComplete = Frames_1.Flags.hasComplete(frame.flags);
            return;
        }
        var payload = {
            data: frame.data,
            metadata: frame.metadata,
        };
        var hasComplete = Frames_1.Flags.hasComplete(frame.flags);
        this.inboundDone = hasComplete;
        try {
            this.receiver = handler(payload, frame.requestN, hasComplete, this);
            if (this.outboundDone && this.defferedError) {
                this.receiver.onError(this.defferedError);
            }
        }
        catch (error) {
            if (this.outboundDone && !this.inboundDone) {
                this.cancel();
            }
            else {
                this.inboundDone = true;
            }
            this.onError(error);
        }
    }
    RequestChannelResponderStream.prototype.handle = function (frame) {
        var errorMessage;
        var frameType = frame.type;
        switch (frameType) {
            case Frames_1.FrameTypes.PAYLOAD: {
                if (Frames_1.Flags.hasFollows(frame.flags)) {
                    if (Reassembler.add(this, frame.data, frame.metadata)) {
                        return;
                    }
                    errorMessage = "Unexpected frame size";
                    break;
                }
                var payload = this.hasFragments
                    ? Reassembler.reassemble(this, frame.data, frame.metadata)
                    : {
                        data: frame.data,
                        metadata: frame.metadata,
                    };
                var hasComplete = Frames_1.Flags.hasComplete(frame.flags);
                if (!this.receiver) {
                    var inboundDone = this.isComplete || hasComplete;
                    if (inboundDone) {
                        this.inboundDone = true;
                        if (this.outboundDone) {
                            this.stream.disconnect(this);
                        }
                    }
                    try {
                        this.receiver = this.handler(payload, this.initialRequestN, inboundDone, this);
                        if (this.outboundDone && this.defferedError) {
                        }
                    }
                    catch (error) {
                        if (this.outboundDone && !this.inboundDone) {
                            this.cancel();
                        }
                        else {
                            this.inboundDone = true;
                        }
                        this.onError(error);
                    }
                }
                else {
                    if (hasComplete) {
                        this.inboundDone = true;
                        if (this.outboundDone) {
                            this.stream.disconnect(this);
                        }
                        if (!Frames_1.Flags.hasNext(frame.flags)) {
                            this.receiver.onComplete();
                            return;
                        }
                    }
                    this.receiver.onNext(payload, hasComplete);
                }
                return;
            }
            case Frames_1.FrameTypes.REQUEST_N: {
                if (!this.receiver || this.hasFragments) {
                    errorMessage = "Unexpected frame type [".concat(frameType, "] during reassembly");
                    break;
                }
                this.receiver.request(frame.requestN);
                return;
            }
            case Frames_1.FrameTypes.ERROR:
            case Frames_1.FrameTypes.CANCEL: {
                var inboundDone = this.inboundDone;
                var outboundDone = this.outboundDone;
                this.inboundDone = true;
                this.outboundDone = true;
                this.stream.disconnect(this);
                Reassembler.cancel(this);
                if (!this.receiver) {
                    return;
                }
                if (!outboundDone) {
                    this.receiver.cancel();
                }
                if (!inboundDone) {
                    var error = frameType === Frames_1.FrameTypes.CANCEL
                        ? new Errors_1.RSocketError(Errors_1.ErrorCodes.CANCELED, "Cancelled")
                        : new Errors_1.RSocketError(frame.code, frame.message);
                    this.receiver.onError(error);
                }
                return;
            }
            case Frames_1.FrameTypes.EXT: {
                if (!this.receiver || this.hasFragments) {
                    errorMessage = "Unexpected frame type [".concat(frameType, "] during reassembly");
                    break;
                }
                this.receiver.onExtension(frame.extendedType, frame.extendedContent, Frames_1.Flags.hasIgnore(frame.flags));
                return;
            }
            default: {
                errorMessage = "Unexpected frame type [".concat(frameType, "]");
                // TODO: throws if strict
            }
        }
        this.stream.send({
            type: Frames_1.FrameTypes.ERROR,
            flags: Frames_1.Flags.NONE,
            code: Errors_1.ErrorCodes.CANCELED,
            message: errorMessage,
            streamId: this.streamId,
        });
        this.stream.disconnect(this);
        this.close(new Errors_1.RSocketError(Errors_1.ErrorCodes.CANCELED, errorMessage));
    };
    RequestChannelResponderStream.prototype.onError = function (error) {
        if (this.outboundDone) {
            console.warn("Trying to error for the second time. ".concat(error ? "Dropping error [".concat(error, "].") : ""));
            return;
        }
        var inboundDone = this.inboundDone;
        this.outboundDone = true;
        this.inboundDone = true;
        this.stream.send({
            type: Frames_1.FrameTypes.ERROR,
            flags: Frames_1.Flags.NONE,
            code: error instanceof Errors_1.RSocketError
                ? error.code
                : Errors_1.ErrorCodes.APPLICATION_ERROR,
            message: error.message,
            streamId: this.streamId,
        });
        this.stream.disconnect(this);
        if (!inboundDone) {
            if (this.receiver) {
                this.receiver.onError(error);
            }
            else {
                this.defferedError = error;
            }
        }
    };
    RequestChannelResponderStream.prototype.onNext = function (payload, isCompletion) {
        var e_3, _a;
        if (this.outboundDone) {
            return;
        }
        if (isCompletion) {
            this.outboundDone = true;
        }
        // TODO: add payload size validation
        if ((0, Fragmenter_1.isFragmentable)(payload, this.fragmentSize, Frames_1.FrameTypes.PAYLOAD)) {
            try {
                for (var _b = __values((0, Fragmenter_1.fragment)(this.streamId, payload, this.fragmentSize, Frames_1.FrameTypes.PAYLOAD, isCompletion)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var frame = _c.value;
                    this.stream.send(frame);
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_3) throw e_3.error; }
            }
        }
        else {
            this.stream.send({
                type: Frames_1.FrameTypes.PAYLOAD,
                flags: Frames_1.Flags.NEXT |
                    (isCompletion ? Frames_1.Flags.COMPLETE : Frames_1.Flags.NONE) |
                    (payload.metadata ? Frames_1.Flags.METADATA : Frames_1.Flags.NONE),
                data: payload.data,
                metadata: payload.metadata,
                streamId: this.streamId,
            });
        }
        if (isCompletion && this.inboundDone) {
            this.stream.disconnect(this);
        }
    };
    RequestChannelResponderStream.prototype.onComplete = function () {
        if (this.outboundDone) {
            return;
        }
        this.outboundDone = true;
        this.stream.send({
            type: Frames_1.FrameTypes.PAYLOAD,
            flags: Frames_1.Flags.COMPLETE,
            streamId: this.streamId,
            data: null,
            metadata: null,
        });
        if (this.inboundDone) {
            this.stream.disconnect(this);
        }
    };
    RequestChannelResponderStream.prototype.onExtension = function (extendedType, content, canBeIgnored) {
        if (this.outboundDone && this.inboundDone) {
            return;
        }
        this.stream.send({
            type: Frames_1.FrameTypes.EXT,
            streamId: this.streamId,
            flags: canBeIgnored ? Frames_1.Flags.IGNORE : Frames_1.Flags.NONE,
            extendedType: extendedType,
            extendedContent: content,
        });
    };
    RequestChannelResponderStream.prototype.request = function (n) {
        if (this.inboundDone) {
            return;
        }
        this.stream.send({
            type: Frames_1.FrameTypes.REQUEST_N,
            flags: Frames_1.Flags.NONE,
            streamId: this.streamId,
            requestN: n,
        });
    };
    RequestChannelResponderStream.prototype.cancel = function () {
        if (this.inboundDone) {
            return;
        }
        this.inboundDone = true;
        this.stream.send({
            type: Frames_1.FrameTypes.CANCEL,
            flags: Frames_1.Flags.NONE,
            streamId: this.streamId,
        });
        if (this.outboundDone) {
            this.stream.disconnect(this);
        }
    };
    RequestChannelResponderStream.prototype.close = function (error) {
        if (this.inboundDone && this.outboundDone) {
            console.warn("Trying to close for the second time. ".concat(error ? "Dropping error [".concat(error, "].") : ""));
            return;
        }
        var inboundDone = this.inboundDone;
        var outboundDone = this.outboundDone;
        this.inboundDone = true;
        this.outboundDone = true;
        Reassembler.cancel(this);
        var receiver = this.receiver;
        if (!receiver) {
            return;
        }
        if (!outboundDone) {
            receiver.cancel();
        }
        if (!inboundDone) {
            if (error) {
                receiver.onError(error);
            }
            else {
                receiver.onComplete();
            }
        }
    };
    return RequestChannelResponderStream;
}());
exports.RequestChannelResponderStream = RequestChannelResponderStream;

},{"./Errors":15,"./Fragmenter":16,"./Frames":17,"./Reassembler":22}],24:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestFnfResponderStream = exports.RequestFnFRequesterStream = void 0;
var Errors_1 = require("./Errors");
var Fragmenter_1 = require("./Fragmenter");
var Frames_1 = require("./Frames");
var Reassembler = __importStar(require("./Reassembler"));
var RequestFnFRequesterStream = /** @class */ (function () {
    function RequestFnFRequesterStream(payload, receiver, fragmentSize, leaseManager) {
        this.payload = payload;
        this.receiver = receiver;
        this.fragmentSize = fragmentSize;
        this.leaseManager = leaseManager;
        this.streamType = Frames_1.FrameTypes.REQUEST_FNF;
    }
    RequestFnFRequesterStream.prototype.handleReady = function (streamId, stream) {
        var e_1, _a;
        if (this.done) {
            return false;
        }
        this.streamId = streamId;
        if ((0, Fragmenter_1.isFragmentable)(this.payload, this.fragmentSize, Frames_1.FrameTypes.REQUEST_FNF)) {
            try {
                for (var _b = __values((0, Fragmenter_1.fragment)(streamId, this.payload, this.fragmentSize, Frames_1.FrameTypes.REQUEST_FNF)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var frame = _c.value;
                    stream.send(frame);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        else {
            stream.send({
                type: Frames_1.FrameTypes.REQUEST_FNF,
                data: this.payload.data,
                metadata: this.payload.metadata,
                flags: this.payload.metadata ? Frames_1.Flags.METADATA : 0,
                streamId: streamId,
            });
        }
        this.done = true;
        this.receiver.onComplete();
        return true;
    };
    RequestFnFRequesterStream.prototype.handleReject = function (error) {
        if (this.done) {
            return;
        }
        this.done = true;
        this.receiver.onError(error);
    };
    RequestFnFRequesterStream.prototype.cancel = function () {
        var _a;
        if (this.done) {
            return;
        }
        this.done = true;
        (_a = this.leaseManager) === null || _a === void 0 ? void 0 : _a.cancelRequest(this);
    };
    RequestFnFRequesterStream.prototype.handle = function (frame) {
        if (frame.type == Frames_1.FrameTypes.ERROR) {
            this.close(new Errors_1.RSocketError(frame.code, frame.message));
            return;
        }
        this.close(new Errors_1.RSocketError(Errors_1.ErrorCodes.CANCELED, "Received invalid frame"));
    };
    RequestFnFRequesterStream.prototype.close = function (error) {
        if (this.done) {
            console.warn("Trying to close for the second time. ".concat(error ? "Dropping error [".concat(error, "].") : ""));
            return;
        }
        if (error) {
            this.receiver.onError(error);
        }
        else {
            this.receiver.onComplete();
        }
    };
    return RequestFnFRequesterStream;
}());
exports.RequestFnFRequesterStream = RequestFnFRequesterStream;
var RequestFnfResponderStream = /** @class */ (function () {
    function RequestFnfResponderStream(streamId, stream, handler, frame) {
        this.streamId = streamId;
        this.stream = stream;
        this.handler = handler;
        this.streamType = Frames_1.FrameTypes.REQUEST_FNF;
        if (Frames_1.Flags.hasFollows(frame.flags)) {
            Reassembler.add(this, frame.data, frame.metadata);
            stream.connect(this);
            return;
        }
        var payload = {
            data: frame.data,
            metadata: frame.metadata,
        };
        try {
            this.cancellable = handler(payload, this);
        }
        catch (e) {
            // do nothing
        }
    }
    RequestFnfResponderStream.prototype.handle = function (frame) {
        var errorMessage;
        if (frame.type == Frames_1.FrameTypes.PAYLOAD) {
            if (Frames_1.Flags.hasFollows(frame.flags)) {
                if (Reassembler.add(this, frame.data, frame.metadata)) {
                    return;
                }
                errorMessage = "Unexpected fragment size";
            }
            else {
                this.stream.disconnect(this);
                var payload = Reassembler.reassemble(this, frame.data, frame.metadata);
                try {
                    this.cancellable = this.handler(payload, this);
                }
                catch (e) {
                    // do nothing
                }
                return;
            }
        }
        else {
            errorMessage = "Unexpected frame type [".concat(frame.type, "]");
        }
        this.done = true;
        if (frame.type != Frames_1.FrameTypes.CANCEL && frame.type != Frames_1.FrameTypes.ERROR) {
            this.stream.send({
                type: Frames_1.FrameTypes.ERROR,
                streamId: this.streamId,
                flags: Frames_1.Flags.NONE,
                code: Errors_1.ErrorCodes.CANCELED,
                message: errorMessage,
            });
        }
        this.stream.disconnect(this);
        Reassembler.cancel(this);
        // TODO: throws if strict
    };
    RequestFnfResponderStream.prototype.close = function (error) {
        var _a;
        if (this.done) {
            console.warn("Trying to close for the second time. ".concat(error ? "Dropping error [".concat(error, "].") : ""));
            return;
        }
        this.done = true;
        Reassembler.cancel(this);
        (_a = this.cancellable) === null || _a === void 0 ? void 0 : _a.cancel();
    };
    RequestFnfResponderStream.prototype.onError = function (error) { };
    RequestFnfResponderStream.prototype.onComplete = function () { };
    return RequestFnfResponderStream;
}());
exports.RequestFnfResponderStream = RequestFnfResponderStream;
/*
export function request(
  payload: Payload,
  responderStream: UnidirectionalStream
): Handler<Cancellable> {
  return {
    create: (r) => {
      const response = new RequestFnFRequesterHandler(
        payload,
        responderStream,
        r
      );

      r.add(response);

      return response;
    },
  };
}

export function response(
  handler: (payload: Payload, responderStream: UnidirectionalStream,) => void
): Handler<void> {
  return {
    create: (r) => new RequestFnfResponderHandler(),
  };
} */

},{"./Errors":15,"./Fragmenter":16,"./Frames":17,"./Reassembler":22}],25:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestResponseResponderStream = exports.RequestResponseRequesterStream = void 0;
var Errors_1 = require("./Errors");
var Fragmenter_1 = require("./Fragmenter");
var Frames_1 = require("./Frames");
var Reassembler = __importStar(require("./Reassembler"));
var RequestResponseRequesterStream = /** @class */ (function () {
    function RequestResponseRequesterStream(payload, receiver, fragmentSize, leaseManager) {
        this.payload = payload;
        this.receiver = receiver;
        this.fragmentSize = fragmentSize;
        this.leaseManager = leaseManager;
        this.streamType = Frames_1.FrameTypes.REQUEST_RESPONSE;
    }
    RequestResponseRequesterStream.prototype.handleReady = function (streamId, stream) {
        var e_1, _a;
        if (this.done) {
            return false;
        }
        this.streamId = streamId;
        this.stream = stream;
        stream.connect(this);
        if ((0, Fragmenter_1.isFragmentable)(this.payload, this.fragmentSize, Frames_1.FrameTypes.REQUEST_RESPONSE)) {
            try {
                for (var _b = __values((0, Fragmenter_1.fragment)(streamId, this.payload, this.fragmentSize, Frames_1.FrameTypes.REQUEST_RESPONSE)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var frame = _c.value;
                    this.stream.send(frame);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        else {
            this.stream.send({
                type: Frames_1.FrameTypes.REQUEST_RESPONSE,
                data: this.payload.data,
                metadata: this.payload.metadata,
                flags: this.payload.metadata ? Frames_1.Flags.METADATA : 0,
                streamId: streamId,
            });
        }
        if (this.hasExtension) {
            this.stream.send({
                type: Frames_1.FrameTypes.EXT,
                streamId: streamId,
                extendedContent: this.extendedContent,
                extendedType: this.extendedType,
                flags: this.flags,
            });
        }
        return true;
    };
    RequestResponseRequesterStream.prototype.handleReject = function (error) {
        if (this.done) {
            return;
        }
        this.done = true;
        this.receiver.onError(error);
    };
    RequestResponseRequesterStream.prototype.handle = function (frame) {
        var errorMessage;
        var frameType = frame.type;
        switch (frameType) {
            case Frames_1.FrameTypes.PAYLOAD: {
                var hasComplete = Frames_1.Flags.hasComplete(frame.flags);
                var hasPayload = Frames_1.Flags.hasNext(frame.flags);
                if (hasComplete || !Frames_1.Flags.hasFollows(frame.flags)) {
                    this.done = true;
                    this.stream.disconnect(this);
                    if (!hasPayload) {
                        // TODO: add validation no frame in reassembly
                        this.receiver.onComplete();
                        return;
                    }
                    var payload = this.hasFragments
                        ? Reassembler.reassemble(this, frame.data, frame.metadata)
                        : {
                            data: frame.data,
                            metadata: frame.metadata,
                        };
                    this.receiver.onNext(payload, true);
                    return;
                }
                if (!Reassembler.add(this, frame.data, frame.metadata)) {
                    errorMessage = "Unexpected fragment size";
                    break;
                }
                return;
            }
            case Frames_1.FrameTypes.ERROR: {
                this.done = true;
                this.stream.disconnect(this);
                Reassembler.cancel(this);
                this.receiver.onError(new Errors_1.RSocketError(frame.code, frame.message));
                return;
            }
            case Frames_1.FrameTypes.EXT: {
                if (this.hasFragments) {
                    errorMessage = "Unexpected frame type [".concat(frameType, "] during reassembly");
                    break;
                }
                this.receiver.onExtension(frame.extendedType, frame.extendedContent, Frames_1.Flags.hasIgnore(frame.flags));
                return;
            }
            default: {
                errorMessage = "Unexpected frame type [".concat(frameType, "]");
            }
        }
        this.close(new Errors_1.RSocketError(Errors_1.ErrorCodes.CANCELED, errorMessage));
        this.stream.send({
            type: Frames_1.FrameTypes.CANCEL,
            streamId: this.streamId,
            flags: Frames_1.Flags.NONE,
        });
        this.stream.disconnect(this);
        // TODO: throw an exception if strict frame handling mode
    };
    RequestResponseRequesterStream.prototype.cancel = function () {
        var _a;
        if (this.done) {
            return;
        }
        this.done = true;
        if (!this.streamId) {
            (_a = this.leaseManager) === null || _a === void 0 ? void 0 : _a.cancelRequest(this);
            return;
        }
        this.stream.send({
            type: Frames_1.FrameTypes.CANCEL,
            flags: Frames_1.Flags.NONE,
            streamId: this.streamId,
        });
        this.stream.disconnect(this);
        Reassembler.cancel(this);
    };
    RequestResponseRequesterStream.prototype.onExtension = function (extendedType, content, canBeIgnored) {
        if (this.done) {
            return;
        }
        if (!this.streamId) {
            this.hasExtension = true;
            this.extendedType = extendedType;
            this.extendedContent = content;
            this.flags = canBeIgnored ? Frames_1.Flags.IGNORE : Frames_1.Flags.NONE;
            return;
        }
        this.stream.send({
            streamId: this.streamId,
            type: Frames_1.FrameTypes.EXT,
            extendedType: extendedType,
            extendedContent: content,
            flags: canBeIgnored ? Frames_1.Flags.IGNORE : Frames_1.Flags.NONE,
        });
    };
    RequestResponseRequesterStream.prototype.close = function (error) {
        if (this.done) {
            return;
        }
        this.done = true;
        Reassembler.cancel(this);
        if (error) {
            this.receiver.onError(error);
        }
        else {
            this.receiver.onComplete();
        }
    };
    return RequestResponseRequesterStream;
}());
exports.RequestResponseRequesterStream = RequestResponseRequesterStream;
var RequestResponseResponderStream = /** @class */ (function () {
    function RequestResponseResponderStream(streamId, stream, fragmentSize, handler, frame) {
        this.streamId = streamId;
        this.stream = stream;
        this.fragmentSize = fragmentSize;
        this.handler = handler;
        this.streamType = Frames_1.FrameTypes.REQUEST_RESPONSE;
        stream.connect(this);
        if (Frames_1.Flags.hasFollows(frame.flags)) {
            Reassembler.add(this, frame.data, frame.metadata);
            return;
        }
        var payload = {
            data: frame.data,
            metadata: frame.metadata,
        };
        try {
            this.receiver = handler(payload, this);
        }
        catch (error) {
            this.onError(error);
        }
    }
    RequestResponseResponderStream.prototype.handle = function (frame) {
        var _a;
        var errorMessage;
        if (!this.receiver || this.hasFragments) {
            if (frame.type === Frames_1.FrameTypes.PAYLOAD) {
                if (Frames_1.Flags.hasFollows(frame.flags)) {
                    if (Reassembler.add(this, frame.data, frame.metadata)) {
                        return;
                    }
                    errorMessage = "Unexpected fragment size";
                }
                else {
                    var payload = Reassembler.reassemble(this, frame.data, frame.metadata);
                    try {
                        this.receiver = this.handler(payload, this);
                    }
                    catch (error) {
                        this.onError(error);
                    }
                    return;
                }
            }
            else {
                errorMessage = "Unexpected frame type [".concat(frame.type, "] during reassembly");
            }
        }
        else if (frame.type === Frames_1.FrameTypes.EXT) {
            this.receiver.onExtension(frame.extendedType, frame.extendedContent, Frames_1.Flags.hasIgnore(frame.flags));
            return;
        }
        else {
            errorMessage = "Unexpected frame type [".concat(frame.type, "]");
        }
        this.done = true;
        (_a = this.receiver) === null || _a === void 0 ? void 0 : _a.cancel();
        if (frame.type !== Frames_1.FrameTypes.CANCEL && frame.type !== Frames_1.FrameTypes.ERROR) {
            this.stream.send({
                type: Frames_1.FrameTypes.ERROR,
                flags: Frames_1.Flags.NONE,
                code: Errors_1.ErrorCodes.CANCELED,
                message: errorMessage,
                streamId: this.streamId,
            });
        }
        this.stream.disconnect(this);
        Reassembler.cancel(this);
        // TODO: throws if strict
    };
    RequestResponseResponderStream.prototype.onError = function (error) {
        if (this.done) {
            console.warn("Trying to error for the second time. ".concat(error ? "Dropping error [".concat(error, "].") : ""));
            return;
        }
        this.done = true;
        this.stream.send({
            type: Frames_1.FrameTypes.ERROR,
            flags: Frames_1.Flags.NONE,
            code: error instanceof Errors_1.RSocketError
                ? error.code
                : Errors_1.ErrorCodes.APPLICATION_ERROR,
            message: error.message,
            streamId: this.streamId,
        });
        this.stream.disconnect(this);
    };
    RequestResponseResponderStream.prototype.onNext = function (payload, isCompletion) {
        var e_2, _a;
        if (this.done) {
            return;
        }
        this.done = true;
        // TODO: add payload size validation
        if ((0, Fragmenter_1.isFragmentable)(payload, this.fragmentSize, Frames_1.FrameTypes.PAYLOAD)) {
            try {
                for (var _b = __values((0, Fragmenter_1.fragment)(this.streamId, payload, this.fragmentSize, Frames_1.FrameTypes.PAYLOAD, true)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var frame = _c.value;
                    this.stream.send(frame);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
        else {
            this.stream.send({
                type: Frames_1.FrameTypes.PAYLOAD,
                flags: Frames_1.Flags.NEXT | Frames_1.Flags.COMPLETE | (payload.metadata ? Frames_1.Flags.METADATA : 0),
                data: payload.data,
                metadata: payload.metadata,
                streamId: this.streamId,
            });
        }
        this.stream.disconnect(this);
    };
    RequestResponseResponderStream.prototype.onComplete = function () {
        if (this.done) {
            return;
        }
        this.done = true;
        this.stream.send({
            type: Frames_1.FrameTypes.PAYLOAD,
            flags: Frames_1.Flags.COMPLETE,
            streamId: this.streamId,
            data: null,
            metadata: null,
        });
        this.stream.disconnect(this);
    };
    RequestResponseResponderStream.prototype.onExtension = function (extendedType, content, canBeIgnored) {
        if (this.done) {
            return;
        }
        this.stream.send({
            type: Frames_1.FrameTypes.EXT,
            streamId: this.streamId,
            flags: canBeIgnored ? Frames_1.Flags.IGNORE : Frames_1.Flags.NONE,
            extendedType: extendedType,
            extendedContent: content,
        });
    };
    RequestResponseResponderStream.prototype.close = function (error) {
        var _a;
        if (this.done) {
            console.warn("Trying to close for the second time. ".concat(error ? "Dropping error [".concat(error, "].") : ""));
            return;
        }
        Reassembler.cancel(this);
        (_a = this.receiver) === null || _a === void 0 ? void 0 : _a.cancel();
    };
    return RequestResponseResponderStream;
}());
exports.RequestResponseResponderStream = RequestResponseResponderStream;

},{"./Errors":15,"./Fragmenter":16,"./Frames":17,"./Reassembler":22}],26:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestStreamResponderStream = exports.RequestStreamRequesterStream = void 0;
var Errors_1 = require("./Errors");
var Fragmenter_1 = require("./Fragmenter");
var Frames_1 = require("./Frames");
var Reassembler = __importStar(require("./Reassembler"));
var RequestStreamRequesterStream = /** @class */ (function () {
    function RequestStreamRequesterStream(payload, receiver, fragmentSize, initialRequestN, leaseManager) {
        this.payload = payload;
        this.receiver = receiver;
        this.fragmentSize = fragmentSize;
        this.initialRequestN = initialRequestN;
        this.leaseManager = leaseManager;
        this.streamType = Frames_1.FrameTypes.REQUEST_STREAM;
        // TODO: add payload size validation
    }
    RequestStreamRequesterStream.prototype.handleReady = function (streamId, stream) {
        var e_1, _a;
        if (this.done) {
            return false;
        }
        this.streamId = streamId;
        this.stream = stream;
        stream.connect(this);
        if ((0, Fragmenter_1.isFragmentable)(this.payload, this.fragmentSize, Frames_1.FrameTypes.REQUEST_STREAM)) {
            try {
                for (var _b = __values((0, Fragmenter_1.fragmentWithRequestN)(streamId, this.payload, this.fragmentSize, Frames_1.FrameTypes.REQUEST_STREAM, this.initialRequestN)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var frame = _c.value;
                    this.stream.send(frame);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        }
        else {
            this.stream.send({
                type: Frames_1.FrameTypes.REQUEST_STREAM,
                data: this.payload.data,
                metadata: this.payload.metadata,
                requestN: this.initialRequestN,
                flags: this.payload.metadata !== undefined ? Frames_1.Flags.METADATA : 0,
                streamId: streamId,
            });
        }
        if (this.hasExtension) {
            this.stream.send({
                type: Frames_1.FrameTypes.EXT,
                streamId: streamId,
                extendedContent: this.extendedContent,
                extendedType: this.extendedType,
                flags: this.flags,
            });
        }
        return true;
    };
    RequestStreamRequesterStream.prototype.handleReject = function (error) {
        if (this.done) {
            return;
        }
        this.done = true;
        this.receiver.onError(error);
    };
    RequestStreamRequesterStream.prototype.handle = function (frame) {
        var errorMessage;
        var frameType = frame.type;
        switch (frameType) {
            case Frames_1.FrameTypes.PAYLOAD: {
                var hasComplete = Frames_1.Flags.hasComplete(frame.flags);
                var hasNext = Frames_1.Flags.hasNext(frame.flags);
                if (hasComplete || !Frames_1.Flags.hasFollows(frame.flags)) {
                    if (hasComplete) {
                        this.done = true;
                        this.stream.disconnect(this);
                        if (!hasNext) {
                            // TODO: add validation no frame in reassembly
                            this.receiver.onComplete();
                            return;
                        }
                    }
                    var payload = this.hasFragments
                        ? Reassembler.reassemble(this, frame.data, frame.metadata)
                        : {
                            data: frame.data,
                            metadata: frame.metadata,
                        };
                    this.receiver.onNext(payload, hasComplete);
                    return;
                }
                if (!Reassembler.add(this, frame.data, frame.metadata)) {
                    errorMessage = "Unexpected fragment size";
                    break;
                }
                return;
            }
            case Frames_1.FrameTypes.ERROR: {
                this.done = true;
                this.stream.disconnect(this);
                Reassembler.cancel(this);
                this.receiver.onError(new Errors_1.RSocketError(frame.code, frame.message));
                return;
            }
            case Frames_1.FrameTypes.EXT: {
                if (this.hasFragments) {
                    errorMessage = "Unexpected frame type [".concat(frameType, "] during reassembly");
                    break;
                }
                this.receiver.onExtension(frame.extendedType, frame.extendedContent, Frames_1.Flags.hasIgnore(frame.flags));
                return;
            }
            default: {
                errorMessage = "Unexpected frame type [".concat(frameType, "]");
            }
        }
        this.close(new Errors_1.RSocketError(Errors_1.ErrorCodes.CANCELED, errorMessage));
        this.stream.send({
            type: Frames_1.FrameTypes.CANCEL,
            streamId: this.streamId,
            flags: Frames_1.Flags.NONE,
        });
        this.stream.disconnect(this);
        // TODO: throw an exception if strict frame handling mode
    };
    RequestStreamRequesterStream.prototype.request = function (n) {
        if (this.done) {
            return;
        }
        if (!this.streamId) {
            this.initialRequestN += n;
            return;
        }
        this.stream.send({
            type: Frames_1.FrameTypes.REQUEST_N,
            flags: Frames_1.Flags.NONE,
            requestN: n,
            streamId: this.streamId,
        });
    };
    RequestStreamRequesterStream.prototype.cancel = function () {
        var _a;
        if (this.done) {
            return;
        }
        this.done = true;
        if (!this.streamId) {
            (_a = this.leaseManager) === null || _a === void 0 ? void 0 : _a.cancelRequest(this);
            return;
        }
        this.stream.send({
            type: Frames_1.FrameTypes.CANCEL,
            flags: Frames_1.Flags.NONE,
            streamId: this.streamId,
        });
        this.stream.disconnect(this);
        Reassembler.cancel(this);
    };
    RequestStreamRequesterStream.prototype.onExtension = function (extendedType, content, canBeIgnored) {
        if (this.done) {
            return;
        }
        if (!this.streamId) {
            this.hasExtension = true;
            this.extendedType = extendedType;
            this.extendedContent = content;
            this.flags = canBeIgnored ? Frames_1.Flags.IGNORE : Frames_1.Flags.NONE;
            return;
        }
        this.stream.send({
            streamId: this.streamId,
            type: Frames_1.FrameTypes.EXT,
            extendedType: extendedType,
            extendedContent: content,
            flags: canBeIgnored ? Frames_1.Flags.IGNORE : Frames_1.Flags.NONE,
        });
    };
    RequestStreamRequesterStream.prototype.close = function (error) {
        if (this.done) {
            return;
        }
        this.done = true;
        Reassembler.cancel(this);
        if (error) {
            this.receiver.onError(error);
        }
        else {
            this.receiver.onComplete();
        }
    };
    return RequestStreamRequesterStream;
}());
exports.RequestStreamRequesterStream = RequestStreamRequesterStream;
var RequestStreamResponderStream = /** @class */ (function () {
    function RequestStreamResponderStream(streamId, stream, fragmentSize, handler, frame) {
        this.streamId = streamId;
        this.stream = stream;
        this.fragmentSize = fragmentSize;
        this.handler = handler;
        this.streamType = Frames_1.FrameTypes.REQUEST_STREAM;
        stream.connect(this);
        if (Frames_1.Flags.hasFollows(frame.flags)) {
            this.initialRequestN = frame.requestN;
            Reassembler.add(this, frame.data, frame.metadata);
            return;
        }
        var payload = {
            data: frame.data,
            metadata: frame.metadata,
        };
        try {
            this.receiver = handler(payload, frame.requestN, this);
        }
        catch (error) {
            this.onError(error);
        }
    }
    RequestStreamResponderStream.prototype.handle = function (frame) {
        var _a;
        var errorMessage;
        if (!this.receiver || this.hasFragments) {
            if (frame.type === Frames_1.FrameTypes.PAYLOAD) {
                if (Frames_1.Flags.hasFollows(frame.flags)) {
                    if (Reassembler.add(this, frame.data, frame.metadata)) {
                        return;
                    }
                    errorMessage = "Unexpected frame size";
                }
                else {
                    var payload = Reassembler.reassemble(this, frame.data, frame.metadata);
                    try {
                        this.receiver = this.handler(payload, this.initialRequestN, this);
                    }
                    catch (error) {
                        this.onError(error);
                    }
                    return;
                }
            }
            else {
                errorMessage = "Unexpected frame type [".concat(frame.type, "] during reassembly");
            }
        }
        else if (frame.type === Frames_1.FrameTypes.REQUEST_N) {
            this.receiver.request(frame.requestN);
            return;
        }
        else if (frame.type === Frames_1.FrameTypes.EXT) {
            this.receiver.onExtension(frame.extendedType, frame.extendedContent, Frames_1.Flags.hasIgnore(frame.flags));
            return;
        }
        else {
            errorMessage = "Unexpected frame type [".concat(frame.type, "]");
        }
        this.done = true;
        Reassembler.cancel(this);
        (_a = this.receiver) === null || _a === void 0 ? void 0 : _a.cancel();
        if (frame.type !== Frames_1.FrameTypes.CANCEL && frame.type !== Frames_1.FrameTypes.ERROR) {
            this.stream.send({
                type: Frames_1.FrameTypes.ERROR,
                flags: Frames_1.Flags.NONE,
                code: Errors_1.ErrorCodes.CANCELED,
                message: errorMessage,
                streamId: this.streamId,
            });
        }
        this.stream.disconnect(this);
        // TODO: throws if strict
    };
    RequestStreamResponderStream.prototype.onError = function (error) {
        if (this.done) {
            console.warn("Trying to error for the second time. ".concat(error ? "Dropping error [".concat(error, "].") : ""));
            return;
        }
        this.done = true;
        this.stream.send({
            type: Frames_1.FrameTypes.ERROR,
            flags: Frames_1.Flags.NONE,
            code: error instanceof Errors_1.RSocketError
                ? error.code
                : Errors_1.ErrorCodes.APPLICATION_ERROR,
            message: error.message,
            streamId: this.streamId,
        });
        this.stream.disconnect(this);
    };
    RequestStreamResponderStream.prototype.onNext = function (payload, isCompletion) {
        var e_2, _a;
        if (this.done) {
            return;
        }
        if (isCompletion) {
            this.done = true;
        }
        // TODO: add payload size validation
        if ((0, Fragmenter_1.isFragmentable)(payload, this.fragmentSize, Frames_1.FrameTypes.PAYLOAD)) {
            try {
                for (var _b = __values((0, Fragmenter_1.fragment)(this.streamId, payload, this.fragmentSize, Frames_1.FrameTypes.PAYLOAD, isCompletion)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var frame = _c.value;
                    this.stream.send(frame);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
        else {
            this.stream.send({
                type: Frames_1.FrameTypes.PAYLOAD,
                flags: Frames_1.Flags.NEXT |
                    (isCompletion ? Frames_1.Flags.COMPLETE : Frames_1.Flags.NONE) |
                    (payload.metadata ? Frames_1.Flags.METADATA : Frames_1.Flags.NONE),
                data: payload.data,
                metadata: payload.metadata,
                streamId: this.streamId,
            });
        }
        if (isCompletion) {
            this.stream.disconnect(this);
        }
    };
    RequestStreamResponderStream.prototype.onComplete = function () {
        if (this.done) {
            return;
        }
        this.done = true;
        this.stream.send({
            type: Frames_1.FrameTypes.PAYLOAD,
            flags: Frames_1.Flags.COMPLETE,
            streamId: this.streamId,
            data: null,
            metadata: null,
        });
        this.stream.disconnect(this);
    };
    RequestStreamResponderStream.prototype.onExtension = function (extendedType, content, canBeIgnored) {
        if (this.done) {
            return;
        }
        this.stream.send({
            type: Frames_1.FrameTypes.EXT,
            streamId: this.streamId,
            flags: canBeIgnored ? Frames_1.Flags.IGNORE : Frames_1.Flags.NONE,
            extendedType: extendedType,
            extendedContent: content,
        });
    };
    RequestStreamResponderStream.prototype.close = function (error) {
        var _a;
        if (this.done) {
            console.warn("Trying to close for the second time. ".concat(error ? "Dropping error [".concat(error, "].") : ""));
            return;
        }
        Reassembler.cancel(this);
        (_a = this.receiver) === null || _a === void 0 ? void 0 : _a.cancel();
    };
    return RequestStreamResponderStream;
}());
exports.RequestStreamResponderStream = RequestStreamResponderStream;

},{"./Errors":15,"./Fragmenter":16,"./Frames":17,"./Reassembler":22}],27:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrameStore = void 0;
var _1 = require(".");
var Codecs_1 = require("./Codecs");
var FrameStore = /** @class */ (function () {
    function FrameStore() {
        this.storedFrames = [];
        this._lastReceivedFramePosition = 0;
        this._firstAvailableFramePosition = 0;
        this._lastSentFramePosition = 0;
    }
    Object.defineProperty(FrameStore.prototype, "lastReceivedFramePosition", {
        get: function () {
            return this._lastReceivedFramePosition;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FrameStore.prototype, "firstAvailableFramePosition", {
        get: function () {
            return this._firstAvailableFramePosition;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(FrameStore.prototype, "lastSentFramePosition", {
        get: function () {
            return this._lastSentFramePosition;
        },
        enumerable: false,
        configurable: true
    });
    FrameStore.prototype.store = function (frame) {
        this._lastSentFramePosition += (0, Codecs_1.sizeOfFrame)(frame);
        this.storedFrames.push(frame);
    };
    FrameStore.prototype.record = function (frame) {
        this._lastReceivedFramePosition += (0, Codecs_1.sizeOfFrame)(frame);
    };
    FrameStore.prototype.dropTo = function (lastReceivedPosition) {
        var bytesToDrop = lastReceivedPosition - this._firstAvailableFramePosition;
        while (bytesToDrop > 0 && this.storedFrames.length > 0) {
            var storedFrame = this.storedFrames.shift();
            bytesToDrop -= (0, Codecs_1.sizeOfFrame)(storedFrame);
        }
        if (bytesToDrop !== 0) {
            throw new _1.RSocketError(_1.ErrorCodes.CONNECTION_ERROR, "State inconsistency. Expected bytes to drop ".concat(lastReceivedPosition - this._firstAvailableFramePosition, " but actual ").concat(bytesToDrop));
        }
        this._firstAvailableFramePosition = lastReceivedPosition;
    };
    FrameStore.prototype.drain = function (consumer) {
        var e_1, _a;
        try {
            for (var _b = __values(this.storedFrames), _c = _b.next(); !_c.done; _c = _b.next()) {
                var frame = _c.value;
                consumer(frame);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    return FrameStore;
}());
exports.FrameStore = FrameStore;

},{".":29,"./Codecs":12}],28:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });

},{}],29:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./Codecs"), exports);
__exportStar(require("./Common"), exports);
__exportStar(require("./Deferred"), exports);
__exportStar(require("./Errors"), exports);
__exportStar(require("./Frames"), exports);
__exportStar(require("./RSocket"), exports);
__exportStar(require("./RSocketConnector"), exports);
__exportStar(require("./RSocketServer"), exports);
__exportStar(require("./Transport"), exports);

},{"./Codecs":12,"./Common":13,"./Deferred":14,"./Errors":15,"./Frames":17,"./RSocket":18,"./RSocketConnector":19,"./RSocketServer":20,"./Transport":28}],30:[function(require,module,exports){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketClientTransport = void 0;
var rsocket_core_1 = require("rsocket-core");
var WebsocketDuplexConnection_1 = require("./WebsocketDuplexConnection");
var WebsocketClientTransport = /** @class */ (function () {
    function WebsocketClientTransport(options) {
        var _a;
        this.url = options.url;
        this.factory = (_a = options.wsCreator) !== null && _a !== void 0 ? _a : (function (url) { return new WebSocket(url); });
    }
    WebsocketClientTransport.prototype.connect = function (multiplexerDemultiplexerFactory) {
        var _this = this;
        return new Promise(function (resolve, reject) {
            var websocket = _this.factory(_this.url);
            websocket.binaryType = "arraybuffer";
            var openListener = function () {
                websocket.removeEventListener("open", openListener);
                websocket.removeEventListener("error", errorListener);
                resolve(new WebsocketDuplexConnection_1.WebsocketDuplexConnection(websocket, new rsocket_core_1.Deserializer(), multiplexerDemultiplexerFactory));
            };
            var errorListener = function (ev) {
                websocket.removeEventListener("open", openListener);
                websocket.removeEventListener("error", errorListener);
                reject(ev.error);
            };
            websocket.addEventListener("open", openListener);
            websocket.addEventListener("error", errorListener);
        });
    };
    return WebsocketClientTransport;
}());
exports.WebsocketClientTransport = WebsocketClientTransport;

},{"./WebsocketDuplexConnection":31,"rsocket-core":29}],31:[function(require,module,exports){
(function (Buffer){(function (){
"use strict";
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebsocketDuplexConnection = void 0;
var rsocket_core_1 = require("rsocket-core");
var WebsocketDuplexConnection = /** @class */ (function (_super) {
    __extends(WebsocketDuplexConnection, _super);
    function WebsocketDuplexConnection(websocket, deserializer, multiplexerDemultiplexerFactory) {
        var _this = _super.call(this) || this;
        _this.websocket = websocket;
        _this.deserializer = deserializer;
        _this.handleClosed = function (e) {
            _this.close(new Error(e.reason || "WebsocketDuplexConnection: Socket closed unexpectedly."));
        };
        _this.handleError = function (e) {
            _this.close(e.error);
        };
        _this.handleMessage = function (message) {
            try {
                var buffer = Buffer.from(message.data);
                var frame = _this.deserializer.deserializeFrame(buffer);
                _this.multiplexerDemultiplexer.handle(frame);
            }
            catch (error) {
                _this.close(error);
            }
        };
        websocket.addEventListener("close", _this.handleClosed);
        websocket.addEventListener("error", _this.handleError);
        websocket.addEventListener("message", _this.handleMessage);
        _this.multiplexerDemultiplexer = multiplexerDemultiplexerFactory(_this);
        return _this;
    }
    Object.defineProperty(WebsocketDuplexConnection.prototype, "availability", {
        get: function () {
            return this.done ? 0 : 1;
        },
        enumerable: false,
        configurable: true
    });
    WebsocketDuplexConnection.prototype.close = function (error) {
        if (this.done) {
            _super.prototype.close.call(this, error);
            return;
        }
        this.websocket.removeEventListener("close", this.handleClosed);
        this.websocket.removeEventListener("error", this.handleError);
        this.websocket.removeEventListener("message", this.handleMessage);
        this.websocket.close();
        delete this.websocket;
        _super.prototype.close.call(this, error);
    };
    WebsocketDuplexConnection.prototype.send = function (frame) {
        if (this.done) {
            return;
        }
        var buffer = (0, rsocket_core_1.serializeFrame)(frame);
        this.websocket.send(buffer);
    };
    return WebsocketDuplexConnection;
}(rsocket_core_1.Deferred));
exports.WebsocketDuplexConnection = WebsocketDuplexConnection;

}).call(this)}).call(this,require("buffer").Buffer)
},{"buffer":2,"rsocket-core":29}],32:[function(require,module,exports){
/*
 * Copyright 2021-2022 the original author or authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./WebsocketClientTransport"), exports);

},{"./WebsocketClientTransport":30}]},{},[4]);
