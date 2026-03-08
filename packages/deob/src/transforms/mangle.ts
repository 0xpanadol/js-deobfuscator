import type { Binding, NodePath } from '@babel/traverse'
import type * as t from '@babel/types'
import type { Transform } from '../ast-utils'
import traverse from '@babel/traverse'
import * as m from '@codemod/matchers'
import { renameFastUnsafe } from '../ast-utils'
import { NameGenerator } from '../ast-utils/scope'

export default {
  name: 'mangle',
  tags: ['safe'],
  scope: true,
  run(ast, state, match = () => true) {
    // Two-pass mangle: collect all renames first, then apply them.
    // This avoids cascading conflicts and expensive scope.rename() calls.

    const pendingRenames: { binding: Binding, newName: string }[] = []
    const programScope = (ast as t.File).program

    // Pass 1: Traverse to collect all bindings that need renaming
    traverse(ast, {
      BindingIdentifier: {
        exit(path) {
          if (!path.isBindingIdentifier()) return
          if (path.parentPath.isImportSpecifier()) return
          if (path.parentPath.isObjectProperty()) return
          if (!match(path.node.name)) return

          const binding = path.scope.getBinding(path.node.name)
          if (!binding) return
          if (
            binding.referencePaths.some(ref => ref.isExportNamedDeclaration())
          )
            return

          pendingRenames.push({ binding, path: path as NodePath<t.Identifier> } as any)
        },
      },
    })

    if (pendingRenames.length === 0) return

    // Build a fast name generator from the program scope
    // We need to get the program scope from a traverse, so use the first binding's scope
    const nameGen = new NameGenerator(
      pendingRenames[0].binding.scope.getProgramParent(),
    )

    // Compute all new names upfront using the fast generator
    const renames: { binding: Binding, newName: string }[] = []
    for (const entry of pendingRenames) {
      const { binding } = entry
      const path = (entry as any).path as NodePath<t.Identifier>
      const newName = inferName(path, nameGen)
      if (newName !== binding.identifier.name) {
        renames.push({ binding, newName })
      }
    }

    // Pass 2: Apply all renames without conflict resolution
    for (const { binding, newName } of renames) {
      renameFastUnsafe(binding, newName)
      state.changes++
    }
  },
} satisfies Transform<(id: string) => boolean>

const requireMatcher = m.variableDeclarator(
  m.identifier(),
  m.callExpression(m.identifier('require'), [m.stringLiteral()]),
)

function inferName(path: NodePath<t.Identifier>, nameGen: NameGenerator): string {
  if (path.parentPath.isClass({ id: path.node })) {
    return nameGen.generate(path.scope, 'C')
  }
  else if (path.parentPath.isFunction({ id: path.node })) {
    return nameGen.generate(path.scope, 'f')
  }
  else if (
    path.listKey === 'params'
    || (path.parentPath.isAssignmentPattern({ left: path.node })
      && path.parentPath.listKey === 'params')
  ) {
    return nameGen.generate(path.scope, 'p')
  }
  else if (requireMatcher.match(path.parent)) {
    return nameGen.generate(
      path.scope,
      (path.parentPath.get('init.arguments.0') as NodePath<t.StringLiteral>)
        .node.value,
    )
  }
  else if (path.parentPath.isVariableDeclarator({ id: path.node })) {
    const init = path.parentPath.get('init')
    const suffix = (init.isExpression() && generateExpressionName(init)) || ''
    return nameGen.generate(path.scope, `v${titleCase(suffix)}`)
  }
  else if (path.parentPath.isCatchClause()) {
    return nameGen.generate(path.scope, 'e')
  }
  else if (path.parentPath.isArrayPattern()) {
    return nameGen.generate(path.scope, 'v')
  }
  else {
    return path.node.name
  }
}

function generateExpressionName(
  expression: NodePath<t.Expression>,
): string | undefined {
  if (expression.isIdentifier()) {
    return expression.node.name
  }
  else if (expression.isFunctionExpression()) {
    return expression.node.id?.name ?? 'f'
  }
  else if (expression.isArrowFunctionExpression()) {
    return 'f'
  }
  else if (expression.isClassExpression()) {
    return expression.node.id?.name ?? 'C'
  }
  else if (expression.isCallExpression()) {
    return generateExpressionName(
      expression.get('callee') as NodePath<t.Expression>,
    )
  }
  else if (expression.isThisExpression()) {
    return 'this'
  }
  else if (expression.isNumericLiteral()) {
    return `LN${expression.node.value.toString()}`
  }
  else if (expression.isStringLiteral()) {
    return `LS${titleCase(expression.node.value).slice(0, 20)}`
  }
  else if (expression.isObjectExpression()) {
    return 'O'
  }
  else if (expression.isArrayExpression()) {
    return 'A'
  }
  else {
    return undefined
  }
}

function titleCase(str: string) {
  return str
    .replace(/(?:^|\s)([a-z])/g, (_, m) => (m as string).toUpperCase())
    .replace(/[^\w$]/g, '')
}
