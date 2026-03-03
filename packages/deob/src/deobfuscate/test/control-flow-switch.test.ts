import { test } from 'vitest'
import { testTransform } from '../../../test'
import controlFlowSwitch from '../control-flow-switch'

const expectJS = testTransform(controlFlowSwitch)

test('basic switch control flow', () =>
  expectJS(`
    {
      const _0x1 = "1|0|2".split("|");
      let _0x2 = 0;
      while (true) {
        switch (_0x1[_0x2++]) {
          case "0":
            console.log("second");
            continue;
          case "1":
            console.log("first");
            continue;
          case "2":
            console.log("third");
            continue;
        }
        break;
      }
    }
  `).toMatchInlineSnapshot(`
    {
      console.log("first");
      console.log("second");
      console.log("third");
    }
  `))

test('single case', () =>
  expectJS(`
    {
      const _0x1 = "0".split("|");
      let _0x2 = 0;
      while (true) {
        switch (_0x1[_0x2++]) {
          case "0":
            var x = 1;
            continue;
        }
        break;
      }
    }
  `).toMatchInlineSnapshot(`
    {
      var x = 1;
    }
  `))

test('five element sequence', () =>
  expectJS(`
    {
      const _0x1 = "3|1|4|0|2".split("|");
      let _0x2 = 0;
      while (true) {
        switch (_0x1[_0x2++]) {
          case "0":
            d();
            continue;
          case "1":
            b();
            continue;
          case "2":
            e();
            continue;
          case "3":
            a();
            continue;
          case "4":
            c();
            continue;
        }
        break;
      }
    }
  `).toMatchInlineSnapshot(`
    {
      a();
      b();
      c();
      d();
      e();
    }
  `))
