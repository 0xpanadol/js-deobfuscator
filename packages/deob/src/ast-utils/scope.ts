import type { Scope } from '@babel/traverse'
import { toIdentifier } from '@babel/types'

/**
 * Like scope.generateUid from babel, but without the underscore prefix and name filters
 */
export function generateUid(scope: Scope, name: string = 'temp'): string {
  let uid = ''
  let i = 1
  do {
    uid = toIdentifier(i > 1 ? `${name}${i}` : name)
    i++
  } while (
    scope.hasLabel(uid)
    || scope.hasBinding(uid)
    || scope.hasGlobal(uid)
    || scope.hasReference(uid)
  )

  const program = scope.getProgramParent()
  program.references[uid] = true
  program.uids[uid] = true
  return uid
}

/**
 * Fast name generator that avoids repeated scope queries.
 * Pre-collects all known names into a Set, then generates unique names
 * using a simple counter per prefix.
 */
export class NameGenerator {
  private usedNames: Set<string>
  private counters: Map<string, number> = new Map()

  constructor(scope: Scope) {
    this.usedNames = new Set<string>()
    this.collectNames(scope)
  }

  private collectNames(scope: Scope): void {
    const program = scope.getProgramParent()

    for (const name in program.bindings) {
      this.usedNames.add(name)
    }
    for (const name in program.references) {
      this.usedNames.add(name)
    }
    for (const name in program.globals) {
      this.usedNames.add(name)
    }
    for (const name in program.uids) {
      this.usedNames.add(name)
    }

    // Also collect from nested scopes by walking the binding map
    this.collectScopeNames(program)
  }

  private collectScopeNames(scope: Scope): void {
    for (const name in scope.bindings) {
      this.usedNames.add(name)
    }
  }

  /**
   * Generate a unique name for the given scope and prefix.
   * Checks both the pre-collected Set and the local scope bindings.
   */
  generate(scope: Scope, name: string = 'temp'): string {
    // Also collect this scope's bindings (for nested scopes not seen at init)
    for (const n in scope.bindings) {
      this.usedNames.add(n)
    }

    const counter = this.counters.get(name) ?? 1
    let uid = ''
    let i = counter
    do {
      uid = toIdentifier(i > 1 ? `${name}${i}` : name)
      i++
    } while (this.usedNames.has(uid))

    this.counters.set(name, i)
    this.usedNames.add(uid)
    return uid
  }
}
