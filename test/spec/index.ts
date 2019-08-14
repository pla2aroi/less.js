import { parse } from '../../lib/less/parser'
import * as glob from 'glob';
import * as fs from 'fs';

describe('Less parsing', () => {
  describe('can parse all Less stylesheets', () => {
    const files = glob.sync('test/less/**/*.less');
    files.sort();
    files.forEach(file => {
      if (file.indexOf('errors') === -1) {
        it(`${file}`, () => {
          const result = fs.readFileSync(file);
          const parsed = parse(result.toString());
          expect(parsed.lexErrors.length).toBe(0);
          expect(parsed.parseErrors.length).toBe(0);
        });
      }
    });
  });
});

// const result = parse(`
// @import 'foo';

// @bird: 1px 2px 3px;

// .foo #oops {
//   &:extend(.b all);
//   foo: bar;
//   prop2: blah;

//   .testing:extend(.blah) { 
//     foo: bar;
//   }
// }
// `);

// console.log(result);