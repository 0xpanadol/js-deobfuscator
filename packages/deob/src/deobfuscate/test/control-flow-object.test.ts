import { test } from 'vitest'
import { testTransform } from '../../../test'
import controlFlowObject from '../control-flow-object'

const expectJS = testTransform(controlFlowObject)

test('inline string property', () =>
  expectJS(`
    const obj = {
      "abcde": "hello"
    };
    console.log(obj["abcde"]);
  `).toMatchInlineSnapshot(`
    console.log("hello");
  `))

test('inline binary function', () =>
  expectJS(`
    const obj = {
      "abcde": function(a, b) { return a + b; }
    };
    obj["abcde"](1, 2);
  `).toMatchInlineSnapshot(`1 + 2;`))

test('inline logical function', () =>
  expectJS(`
    const obj = {
      "abcde": function(a, b) { return a && b; }
    };
    obj["abcde"](x, y);
  `).toMatchInlineSnapshot(`x && y;`))

test('inline call function', () =>
  expectJS(`
    const obj = {
      "abcde": function(a, b) { return a(b); }
    };
    obj["abcde"](fn, arg);
  `).toMatchInlineSnapshot(`fn(arg);`))

test('mixed string and function properties', () =>
  expectJS(`
    const obj = {
      "abcde": "world",
      "fghij": function(a, b) { return a - b; }
    };
    console.log(obj["abcde"]);
    obj["fghij"](10, 5);
  `).toMatchInlineSnapshot(`
    console.log("world");
    10 - 5;
  `))
