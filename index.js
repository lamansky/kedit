'use strict'

const arrify = require('arrify')
const constructMap = require('construct-map')
const get = require('kget')
const is = require('is-instance-of')
const isObject = require('is-object')
const otherwise = require('otherwise')
const pfn = require('pfn')
const xfn = require('xfn')

const cancel = Symbol('cancel')
const notCalled = Symbol('notCalled')
const notFound = Symbol('notFound')

module.exports = xfn({
  pluralArg: 1,
  pluralProp: 'all',
  pluralReturn: true,
}, function edit (collection, keychains, cb, {construct, getType, notFound: customNotFound, overwriteAncestors, set = defaultSet, type, types = type, ...options} = {}) {
  return arrify(keychains).map(keychain => {
    let c = collection
    cb = pfn(cb, cb)
    if (typeof construct !== 'function' && construct !== false) {
      if (typeof getType !== 'function') {
        types = arrify(types)
        getType = types.length ? i => types[Math.min(i, types.length - 1)] : i => collection
      }
      construct = i => constructMap(getType(i))
    }
    keychain = arrify(keychain)
    let cbResult = notCalled
    for (const [i, key] of keychain.entries()) {
      let child = get(c, [key], {...options, elseReturn: notFound, elseThrow: null, inObj: true})
      if (child === notFound) {
        cbResult = cb(customNotFound, false, cancel)
        if (cbResult === cancel || (construct === false && i < keychain.length - 1)) {
          return otherwise(options)
        }
      }
      if (i === keychain.length - 1) {
        if (cbResult === notCalled) cbResult = cb(child, true, cancel)
        if (cbResult === cancel) {
          return child === notFound ? otherwise(options) : child
        } else {
          set(c, key, cbResult, options, () => defaultSet(c, key, cbResult, options))
        }
      } else {
        if (child === notFound || (!isObject(child) && overwriteAncestors)) {
          set(c, key, child = construct(i), options, defaultSet)
        }
        c = child
      }
    }
    return cbResult === notCalled ? otherwise(options) : cbResult
  })
})

function defaultSet (collection, key, value, options = {}) {
  key = get.key(collection, key, {...options, elseReturn: key, elseThrow: null})
  const {arrays = [], maps = [], sets = [], weakMaps = []} = options
  if (is(collection, ['Array', arrays])) {
    if (key === 'last') key = collection.length - 1
    collection[key] = value
  } if (is(collection, ['Map', maps, 'WeakMap', weakMaps])) {
    collection.set(key, value)
  } else if (is(collection, ['Set', sets])) {
    const values = Array.from(collection.values())
    values[key] = value
    collection.clear()
    for (const v of values) collection.add(v)
  } else if (isObject(collection)) {
    collection[key] = value
  } else {
    throw new TypeError('Cannot set property of a non-object')
  }
}
