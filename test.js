'use strict'

const assert = require('assert')
const edit = require('.')

describe('edit()', function () {
  it('should edit value at Array index', function () {
    const arr = ['before']
    edit(arr, 0, val => val + '+after')
    assert.strictEqual(arr[0], 'before+after')
  })

  it('should edit value for Map key', function () {
    const map = new Map()
    edit(map, 'key', () => 'value')
    assert.strictEqual(map.get('key'), 'value')
  })

  it('should edit value for Object key', function () {
    const obj = {}
    edit(obj, 'key', () => 'value')
    assert.strictEqual(obj.key, 'value')
  })

  it('should edit value at Set index', function () {
    let s = new Set([1, 2, 3])
    edit(s, 1, () => 5)
    s = Array.from(s.values())
    assert.strictEqual(s[0], 1)
    assert.strictEqual(s[1], 5)
    assert.strictEqual(s[2], 3)
  })

  it('should edit value at Typed Array index', function () {
    const arr = new Int32Array(new ArrayBuffer(4))
    assert.strictEqual(arr[0], 0)
    edit(arr, 0, () => 123)
    assert.strictEqual(arr[0], 123)
  })

  it('should edit value for WeakMap key', function () {
    const key = {}
    const map = new WeakMap()
    edit(map, key, () => 'value')
    assert.strictEqual(map.get(key), 'value')
  })

  it('should return the new value', function () {
    assert.strictEqual(edit({}, 'key', () => 'value'), 'value')
  })

  it('should pass undefined as the current value if the key is not set', function (done) {
    edit({}, 'key', x => {
      assert.strictEqual(typeof x, 'undefined')
      done()
    })
  })

  it('should pass `notFound` as the current value if the key is not set', function (done) {
    const notFound = Symbol('notFound')
    edit({}, 'key', x => {
      assert.strictEqual(x, notFound)
      done()
    }, {notFound})
  })

  it('should throw TypeError attempting to edit a key on a non-object', function () {
    assert.throws(() => edit('string', 'key', () => 'value'), TypeError)
  })

  it('should throw TypeError attempting to edit a key on a nested non-object', function () {
    assert.throws(() => edit({sub: 'string'}, ['sub', 'key'], () => 'value'), TypeError)
  })

  it('should overwrite nested non-object if `overwriteAncestors` is true', function () {
    const obj = {sub: 'string'}
    edit(obj, ['sub', 'key'], () => 'value', {overwriteAncestors: true})
    assert.strictEqual(typeof obj.sub, 'object')
    assert.strictEqual(obj.sub.key, 'value')
  })

  it('should not edit an existing value if the cancel symbol is returned', function () {
    const obj = {sub: {key: 'value'}}
    let called = false
    assert.strictEqual(edit(obj, ['sub', 'key'], (old, found, cancel) => {
      called = true
      return cancel
    }), 'value')
    assert.strictEqual(called, true)
    assert.strictEqual(obj.sub.key, 'value')
  })

  it('should not set a new value if the cancel symbol is returned', function () {
    const obj = {}
    assert.strictEqual(typeof edit(obj, ['sub', 'key'], (old, found, cancel) => cancel), 'undefined')
    assert.strictEqual(typeof obj.sub, 'undefined')
  })

  it('should edit nested value by Object key chain', function () {
    const obj = {sub: {}}
    edit(obj, ['sub', 'key'], () => 'value')
    assert.strictEqual(obj.sub.key, 'value')
  })

  it('should create nested Arrays if necessary', function () {
    const arr = []
    edit(arr, [0, 0, 0], () => 'value')
    assert(arr[0] instanceof Array)
    assert(arr[0][0] instanceof Array)
    assert.strictEqual(arr[0][0][0], 'value')
  })

  it('should create nested Maps if necessary', function () {
    const map = new Map()
    edit(map, ['sub', 'key'], () => 'value')
    assert(map.get('sub') instanceof Map)
    assert.strictEqual(map.get('sub').get('key'), 'value')
  })

  it('should create nested Objects if necessary', function () {
    const obj = {}
    edit(obj, ['sub', 'key'], () => 'value')
    assert.strictEqual(typeof obj.sub, 'object')
    assert.strictEqual(obj.sub.key, 'value')
  })

  it('should edit value using first equivalent key if `loose` is true', function () {
    const key1 = {key: true}
    const key2 = {key: true}
    const map = new Map([[key1, 1], [key2, 2]])
    assert.strictEqual(map.size, 2)
    assert.strictEqual(map.get(key1), 1)
    edit(map, {key: true}, () => 3, {loose: true})
    assert.strictEqual(map.size, 2)
    assert.strictEqual(map.get(key1), 3)
  })

  it('should edit value using last equivalent key if `loose` and `reverse` are true', function () {
    const key1 = {key: true}
    const key2 = {key: true}
    const map = new Map([[key1, 1], [key2, 2]])
    assert.strictEqual(map.size, 2)
    assert.strictEqual(map.get(key2), 2)
    edit(map, {key: true}, () => 3, {loose: true, reverse: true})
    assert.strictEqual(map.size, 2)
    assert.strictEqual(map.get(key2), 3)
  })

  it('should support overriding nested collection type with `type` class', function () {
    const map = new Map()
    edit(map, ['sub', 'key'], () => 'value', {type: Object})
    assert.strictEqual(typeof map.get('sub'), 'object')
    assert.strictEqual(map.get('sub').key, 'value')
  })

  it('should support overriding nested collection type with `type` string', function () {
    const map = new Map()
    edit(map, ['sub', 'key'], () => 'value', {type: 'Object'})
    assert.strictEqual(typeof map.get('sub'), 'object')
    assert.strictEqual(map.get('sub').key, 'value')
  })

  it('should support overriding nested collection types with `types` classes', function () {
    const map = new Map()
    edit(map, ['sub', 'key', 0], () => 'value', {type: [Object, Array]})
    assert.strictEqual(typeof map.get('sub'), 'object')
    assert(Array.isArray(map.get('sub').key))
    assert.strictEqual(map.get('sub').key[0], 'value')
  })

  it('should support overriding nested collection types with `types` strings', function () {
    const map = new Map()
    edit(map, ['sub', 'key', 0], () => 'value', {type: ['Object', 'Array']})
    assert.strictEqual(typeof map.get('sub'), 'object')
    assert(Array.isArray(map.get('sub').key))
    assert.strictEqual(map.get('sub').key[0], 'value')
  })

  it('should support overriding nested collection types with `getType` classes', function () {
    const map = new Map()
    edit(map, ['sub', 'key', 0], () => 'value', {getType: i => i === 0 ? Object : Array})
    assert.strictEqual(typeof map.get('sub'), 'object')
    assert(Array.isArray(map.get('sub').key))
    assert.strictEqual(map.get('sub').key[0], 'value')
  })

  it('should support overriding nested collection types with `getType` strings', function () {
    const map = new Map()
    edit(map, ['sub', 'key', 0], () => 'value', {getType: i => i === 0 ? 'Object' : 'Array'})
    assert.strictEqual(typeof map.get('sub'), 'object')
    assert(Array.isArray(map.get('sub').key))
    assert.strictEqual(map.get('sub').key[0], 'value')
  })

  it('should support overriding nested collection construction with `construct`', function () {
    const map = new Map()
    edit(map, ['sub', 'key', 0], () => 'value', {construct: i => i === 0 ? {} : []})
    assert.strictEqual(typeof map.get('sub'), 'object')
    assert(Array.isArray(map.get('sub').key))
    assert.strictEqual(map.get('sub').key[0], 'value')
  })

  it('should return `undefined` if no changes were made', function () {
    assert.strictEqual(typeof edit({}, [], () => 'value'), 'undefined')
  })

  it('should return `elseReturn` if no changes were made', function () {
    assert.strictEqual(edit({}, [], () => 'value', {elseReturn: 123}), 123)
  })

  it('should throw `elseThrow` if no changes were made', function () {
    assert.throws(() => edit({}, ['sub', 'key'], (old, found, cancel) => cancel, {elseThrow: new Error()}))
  })

  it('should only throw `elseThrow` if no changes were made', function () {
    const obj = {}
    edit(obj, ['sub', 'key'], () => 'value', {elseThrow: new Error()})
    assert.strictEqual(obj.sub.key, 'value')
  })

  it('should not construct nested collections if `construct` is false', function () {
    assert.throws(() => edit({}, ['sub', 'key'], () => 'value', {construct: false, elseThrow: new Error()}))
  })

  it('should set value if non-function is provided instead of callback', function () {
    const map = new Map()
    edit(map, 'key', 'value')
    assert.strictEqual(map.get('key'), 'value')
  })
})
