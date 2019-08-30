import {
  Lexer,
  createToken,
  ITokenConfig,
  TokenType
} from 'chevrotain'
import * as XRegExp from 'xregexp'

interface TokenMap {
  [key: string]: TokenType
}

export interface rawTokenConfig extends Omit<ITokenConfig, 'longer_alt' | 'categories'> {
  longer_alt?: string;
  categories?: string[];
}

interface ILexer {
  T: TokenMap
  lexer: Lexer
  tokens: TokenType[]
}

export const createLexer = (rawFragments: string[][], rawTokens: rawTokenConfig[]): ILexer => {
  const fragments: {
    [key: string]: RegExp;
  } = {};
  const T: TokenMap = {};
  const tokens: TokenType[] = [];

  /** Build fragment replacements */
  rawFragments.forEach(fragment => {
    fragments[fragment[0]] = XRegExp.build(fragment[1], fragments)
  })
  rawTokens.forEach((rawToken: rawTokenConfig) => {
    let { name, pattern, longer_alt, categories, ...rest } = rawToken

    if (
      pattern !== Lexer.NA &&
      pattern !== Lexer.SKIPPED &&
      !(pattern instanceof RegExp)
    ) {
      pattern = XRegExp.build(pattern as string, fragments)
    }
    const longerAlt = longer_alt ? { longer_alt: T[longer_alt] } : {}
    const tokenCategories = categories ? { categories: categories.map(category => {
      return T[category]
    }) } : {}
    const token = createToken({
      name,
      pattern,
      ...longerAlt,
      ...tokenCategories,
      ...rest
    })
    T[name] = token
    /** Build tokens from bottom to top */
    tokens.unshift(token);
  })
  return {
    lexer: new Lexer(tokens),
    tokens,
    T
  }
}
