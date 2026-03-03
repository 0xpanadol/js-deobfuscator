import type { ParseResult } from '@babel/parser'
import type * as t from '@babel/types'
import type { ArrayRotator } from './deobfuscate/array-rotator'
import type { Decoder } from './deobfuscate/decoder'
import type { StringArray } from './deobfuscate/string-array'
import type { Options } from './options'
import { join, normalize } from 'node:path'
import { codeFrameColumns } from '@babel/code-frame'
import { parse } from '@babel/parser'
import { applyTransform, applyTransforms, codePrettier, enableLogger, generate, deobLogger as logger } from './ast-utils'
import controlFlowObject from './deobfuscate/control-flow-object'
import controlFlowSwitch from './deobfuscate/control-flow-switch'
import deadCode from './deobfuscate/dead-code'
import debugProtection from './deobfuscate/debug-protection'
import evaluateGlobals from './deobfuscate/evaluate-globals'
import inlineDecoderWrappers from './deobfuscate/inline-decoder-wrappers'
import inlineObjectProps from './deobfuscate/inline-object-props'
import mergeObjectAssignments from './deobfuscate/merge-object-assignments'

import selfDefending from './deobfuscate/self-defending'
import varFunctions from './deobfuscate/var-functions'

import { evalCode } from './deobfuscate/vm'
import { defaultOptions, mergeOptions } from './options'
import { collectDecoders } from './transforms/collect-decoders'
import { decodeStrings } from './transforms/decode-strings'
import { findDecoderByArray } from './transforms/find-decoder-by-array'
import { findDecoderByCallCount } from './transforms/find-decoder-by-call-count'
import mangle from './transforms/mangle'
import { markKeyword } from './transforms/mark-keyword'
import transpile from './transpile'
import unminify from './unminify'
import { blockStatements, mergeStrings, rawLiterals, sequence, splitVariableDeclarations } from './unminify/transforms'

export {
  codePrettier,
  defaultOptions,
  evalCode,
  type Options,
}

export interface DeobResult {
  code: string
  save: (path: string) => Promise<void>
}

export function parseCode(code: string): ParseResult<t.File> {
  return parse(code, {
    sourceType: 'unambiguous',
    allowReturnOutsideFunction: true,
    errorRecovery: true,
    plugins: ['jsx'],
  })
}


function handleError(error: any, rawCode: string, stageName?: string) {
  const prefix = stageName ? `[${stageName}] ` : ''
  if (error instanceof SyntaxError) {
    const loc = (error as any).loc
    if (loc) {
      const codeFrame = codeFrameColumns(rawCode, {
        start: { line: loc.line, column: loc.column + 1 },
      }, {
        highlightCode: true,
        message: `${prefix}${error.message}`,
      })
      return new Error(`${prefix}SyntaxError at line ${loc.line}:${loc.column}\n${codeFrame}`)
    }
  }
  const msg = error instanceof Error ? error.message : String(error)
  return new Error(`${prefix}${msg}`)
}

function buildDecryptionSummaryLog(map: Map<string, string>) {
  const shorten = (value: string, max = 120) => {
    const clean = value.replace(/\s+/g, ' ').trim()
    return clean.length <= max ? clean : `${clean.slice(0, max)}...`
  }

  const preview = Array.from(map.entries()).slice(0, 5)
  return [
    '=== Decryption Result Preview ===',
    `- Decrypted items: ${map.size}`,
    ...preview.map(([k, v]) => `  • ${k} -> ${shorten(String(v))}`),
    '====================',
  ].join('\n')
}

interface Stage {
  name: string
  key: string
  fn: () => unknown | Promise<unknown>
}

export async function deob(rawCode: string, options: Options = {}): Promise<DeobResult> {
  mergeOptions(options)
  const opts = options
  const t = opts.transforms ?? {}
  const progress = opts.onProgress

  enableLogger('Deob')

  if (!rawCode)
    throw new Error('Please load js code')

  const ast: ParseResult<t.File> = parse(rawCode, {
    sourceType: 'unambiguous',
    allowReturnOutsideFunction: true,
    errorRecovery: true,
    plugins: ['jsx'],
  })

  let outputCode = ''

  const stages: Stage[] = []

  if (t.prepare !== false) {
    stages.push({
      name: 'Preparing code (block statements, sequences, variable splitting)',
      key: 'prepare',
      fn: () => applyTransforms(
        ast,
        [blockStatements, sequence, splitVariableDeclarations, varFunctions, rawLiterals],
        { name: 'prepare' },
      ),
    })
  }

  if (t.decodeStrings !== false) {
    stages.push({
      name: 'Locating and decoding strings',
      key: 'decodeStrings',
      fn: async () => {
        let stringArray: StringArray | undefined
        let decoders: Decoder[] = []
        let rotators: ArrayRotator[] = []
        let setupCode: string = ''

        if (opts.decoderLocationMethod === 'stringArray') {
          const { decoders: ds, rotators: r, stringArray: s, setupCode: scode } = findDecoderByArray(ast)
          stringArray = s as any
          rotators = r
          decoders = collectDecoders(ast, ds.map(d => d.name))
          setupCode = scode
        }
        else if (opts.decoderLocationMethod === 'callCount') {
          const { decoders: ds, setupCode: scode } = findDecoderByCallCount(ast, opts.decoderCallCount)
          decoders = collectDecoders(ast, ds.map(d => d.name))
          setupCode = scode
        }
        else if (opts.decoderLocationMethod === 'evalCode') {
          await evalCode(opts.sandbox!, opts.setupCode!)
          decoders = collectDecoders(ast, opts.decoderNames!)
        }

        logger(`${stringArray ? `String Array: ${stringArray?.name} (Total ${stringArray?.length} items) Referenced ${stringArray?.references.length} times` : 'String Array not found'} | ${decoders.length ? `Decoder functions: ${decoders.map(d => d.name)}` : 'Decoder functions not found'}`)

        await evalCode(opts.sandbox!, setupCode)

        for (const decoder of decoders) {
          applyTransform(ast, inlineDecoderWrappers, decoder.path)
        }

        applyTransform(ast, inlineObjectProps)

        const map = await decodeStrings(opts.sandbox!, decoders as Decoder[])

        if (map.size > 0) {
          logger(buildDecryptionSummaryLog(map))
        }

        if (decoders.length > 0) {
          if (stringArray?.path) stringArray.path.remove()
          rotators.forEach(rotator => rotator.remove())
          decoders.forEach(decoder => decoder.path.remove())
        }

        return { changes: (map as any)?.size ?? decoders.length }
      },
    })
  }

  if (t.controlFlow !== false) {
    stages.push({
      name: 'Simplifying control flow',
      key: 'controlFlow',
      fn: () => applyTransforms(
        ast,
        [mergeStrings, deadCode, controlFlowObject, controlFlowSwitch],
        { noScope: true },
      ),
    })
  }

  if (t.unminify !== false) {
    stages.push({
      name: 'Unminifying code',
      key: 'unminify',
      fn: () => applyTransforms(ast, [transpile, unminify]),
    })
  }

  if (t.mangle !== false) {
    stages.push({
      name: 'Optimizing variable names',
      key: 'mangle',
      fn: () => applyTransform(ast, mangle, getMangleMatcher(opts)),
    })
  }

  if (t.selfDefending !== false) {
    stages.push({
      name: 'Removing self-defending and debug protection',
      key: 'selfDefending',
      fn: () => applyTransforms(ast, [selfDefending, debugProtection]),
    })
  }

  if (t.mergeObjects !== false) {
    stages.push({
      name: 'Merging objects and evaluating globals',
      key: 'mergeObjects',
      fn: () => applyTransforms(ast, [mergeObjectAssignments, evaluateGlobals]),
    })
  }

  if (t.markKeywords !== false && opts.isMarkEnable) {
    stages.push({
      name: 'Marking keywords',
      key: 'markKeywords',
      fn: () => {
        logger(`Keyword list: [${opts.keywords.join(', ')}]`)
        markKeyword(ast, opts.keywords)
        return { changes: opts.keywords.length }
      },
    })
  }

  stages.push({
    name: 'Generating output code',
    key: 'generate',
    fn: () => { outputCode = generate(ast) },
  })

  const total = stages.length
  for (let i = 0; i < total; i++) {
    const stage = stages[i]
    progress?.(stage.name, i + 1, total)
    try {
      await stage.fn()
    } catch (err) {
      throw handleError(err, rawCode, stage.name)
    }
  }

  return {
    code: outputCode,
    async save(path) {
      const { mkdir, writeFile } = await import('node:fs/promises')
      path = normalize(path)
      await mkdir(path, { recursive: true })
      await writeFile(join(path, 'output.js'), outputCode, 'utf8')
    },
  }
}

function getMangleMatcher(options: Options): ((id: string) => boolean) | undefined {
  const legacyBoolean = (options as any).mangle
  const mode
    = options.mangleMode ?? (typeof legacyBoolean === 'boolean' ? (legacyBoolean ? 'all' : 'off') : 'off')

  switch (mode) {
    case 'off':
      return
    case 'all':
      return () => true
    case 'hex': {
      const re = /_0x[a-f\d]+/i
      return id => re.test(id)
    }
    case 'short':
      return id => id.length <= 2
    case 'custom': {
      const pattern = options.manglePattern ?? ''
      const flags = options.mangleFlags ?? ''
      try {
        const re = new RegExp(pattern, flags)
        return id => re.test(id)
      }
      catch {
        // invalid regex, skip mangling
      }
    }
  }
}
