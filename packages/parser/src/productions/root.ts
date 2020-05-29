import { EMPTY_ALT } from 'chevrotain'
import type { LessParser } from '../lessParser'

export default function(this: LessParser, $: LessParser) {
  $.rule = $.OVERRIDE_RULE('rule', () => {
    $._()
    $.OR([
      { ALT: () => $.SUBRULE($.atRule) },
      { ALT: () => $.SUBRULE($.customDeclaration) },
      {
        GATE: $.BACKTRACK($.testMixin),
        ALT: () => $.SUBRULE($.mixinDefinition)
      },
      {
        GATE: $.BACKTRACK($.testQualifiedRule),
        ALT: () => $.SUBRULE($.qualifiedRule)
      },
      { ALT: () => $.SUBRULE2($.declaration) },
      { ALT: () => $.SUBRULE($.function) },

      /** Capture any isolated / redundant semi-colons */
      { ALT: () => $.CONSUME($.T.SemiColon) },
      { ALT: () => EMPTY_ALT }
    ])
  })
}