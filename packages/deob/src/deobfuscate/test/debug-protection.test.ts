import { test } from 'vitest'
import { testTransform } from '../../../test'
import debugProtection from '../debug-protection'

const expectJS = testTransform(debugProtection)

test('remove debug protection function', () =>
  expectJS(`
    function _0xdbg(ret) {
      function debuggerProtection(counter) {
        if (typeof counter === "string") {
          return function() {}.constructor("while (true) {}").apply("counter");
        } else {
          if (("" + counter / counter).length !== 1 || counter % 20 === 0) {
            debugger;
          } else {
            debugger;
          }
        }
        debuggerProtection(++counter);
      }
      try {
        if (ret) {
          return debuggerProtection;
        } else {
          debuggerProtection(0);
        }
      } catch (e) {}
    }
  `).toMatchInlineSnapshot(``))
