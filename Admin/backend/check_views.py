"""Static check: every @blueprint.route view must not be able to fall off the end.

A view whose final statement is not a ``return`` can return ``None`` on some
code paths, which Flask turns into a 500 at runtime. This catches that before
the smoke test has to.
"""

import ast
import pathlib

ROUTES = pathlib.Path(__file__).parent / 'routes'

TERMINATORS = (ast.Return, ast.Raise, ast.Continue, ast.Break)


def always_terminates(node):
    """True if control flow cannot fall past this statement."""
    if isinstance(node, TERMINATORS):
        return True
    if isinstance(node, ast.If):
        # Both branches must terminate for the if to be a guaranteed exit.
        return always_terminates(node.body) and always_terminates(node.orelse)
    if isinstance(node, ast.Try):
        handlers_ok = all(
            always_terminates(handler.body[-1]) for handler in node.handlers if handler.body
        )
        return (
            always_terminates(node.body[-1])
            and handlers_ok
            and (not node.orelse or always_terminates(node.orelse[-1]))
        )
    return False


problems = []
for path in sorted(ROUTES.glob('*.py')):
    tree = ast.parse(path.read_text(encoding='utf-8'), filename=str(path))
    for node in ast.walk(tree):
        if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        decorated = any(
            isinstance(dec, ast.Call)
            and isinstance(dec.func, ast.Attribute)
            and dec.func.attr == 'route'
            for dec in node.decorator_list
        )
        if not decorated or not node.body:
            continue
        if always_terminates(node.body[-1]):
            continue
        problems.append((path.name, node.name, node.lineno, node.body[-1].lineno))

if problems:
    print('Views that can fall through without returning a response:')
    for name, func, line, last in problems:
        print(f'  {name}:{line}  {func}() ends at line {last}')
    raise SystemExit(1)

print('OK - every route view returns a response on all paths')

