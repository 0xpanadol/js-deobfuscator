import { test } from 'vitest'
import { testTransform } from '../../../test'
import selfDefending from '../self-defending'

const expectJS = testTransform(selfDefending)

test('remove call controller pattern', () =>
  expectJS(`
    const _0xcc = (function() {
      let firstCall = true;
      return function(context, fn) {
        const rfn = firstCall ? function() {
          if (fn) {
            const res = fn.apply(context, arguments);
            fn = null;
            return res;
          }
        } : function() {};
        firstCall = false;
        return rfn;
      };
    })();
  `).toMatchInlineSnapshot(``))
