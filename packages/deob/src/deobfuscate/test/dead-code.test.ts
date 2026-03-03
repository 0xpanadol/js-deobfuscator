import { test } from 'vitest'
import { testTransform } from '../../../test'
import deadCode from '../dead-code'

const expectJS = testTransform(deadCode)

test('remove false branch (===)', () =>
  expectJS(`
    if ("abc" === "def") {
      console.log("dead");
    } else {
      console.log("alive");
    }
  `).toMatchInlineSnapshot(`console.log("alive");`))

test('keep true branch (===)', () =>
  expectJS(`
    if ("abc" === "abc") {
      console.log("alive");
    } else {
      console.log("dead");
    }
  `).toMatchInlineSnapshot(`console.log("alive");`))

test('remove false branch (==)', () =>
  expectJS(`
    if ("x" == "y") {
      console.log("dead");
    } else {
      console.log("alive");
    }
  `).toMatchInlineSnapshot(`console.log("alive");`))

test('remove true branch (!==)', () =>
  expectJS(`
    if ("abc" !== "abc") {
      console.log("dead");
    } else {
      console.log("alive");
    }
  `).toMatchInlineSnapshot(`console.log("alive");`))

test('remove if without else when false', () =>
  expectJS(`
    if ("a" === "b") {
      console.log("dead");
    }
  `).toMatchInlineSnapshot(``))

test('conditional expression true', () =>
  expectJS(`
    var x = "a" === "a" ? "yes" : "no";
  `).toMatchInlineSnapshot(`var x = "yes";`))

test('conditional expression false', () =>
  expectJS(`
    var x = "a" === "b" ? "yes" : "no";
  `).toMatchInlineSnapshot(`var x = "no";`))

test('negated string comparison', () =>
  expectJS(`
    if (!("a" === "a")) {
      console.log("dead");
    } else {
      console.log("alive");
    }
  `).toMatchInlineSnapshot(`console.log("alive");`))
