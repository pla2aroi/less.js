import * as glob from 'glob'
import * as fs from 'fs'
import * as path from 'path'
import { expect } from 'chai'
import 'mocha'
import { Parser } from '../src'

const testData = path.dirname(require.resolve('@less/test-data'))

const cssParser = new Parser()

/**
 * @todo - write error cases
 */
describe('can parse all CSS stylesheets', () => {
  glob.sync('test/css/**/*.css')
    .sort()
    .forEach(file => {
      if (file.indexOf('errors') === -1) {
        it(`${file}`, () => {
          const result = fs.readFileSync(file)
          const { cst, lexerResult, parser } = cssParser.parse(result.toString())
          expect(lexerResult.errors.length).to.equal(0)
          expect(parser.errors.length).to.equal(0)
        })
      }
    })
})

describe('can parse Less CSS output', () => {
  glob.sync(path.join(testData, 'css/_main/*.css'))
    .map(value => path.relative(testData, value))
    .filter(value => [
      /** Contains a less unquoted string in root */
      'css/_main/css-escapes.css'
    ].indexOf(value) === -1)
    .sort()
    .forEach(file => {
      it(`${file}`, () => {
        const result = fs.readFileSync(path.join(testData, file))
        const { cst, lexerResult, parser } = cssParser.parse(result.toString())
        expect(lexerResult.errors.length).to.equal(0)
        expect(parser.errors.length).to.equal(0)
      })
  })
})
