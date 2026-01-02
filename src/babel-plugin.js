// src/babel-plugin.js

const path = require('path');

module.exports = function (babel) {
  const { types: t } = babel;

  return {
    name: "babel-plugin-basis-transform",
    visitor: {
      CallExpression(p, state) {
        let calleeName = "";
        if (t.isIdentifier(p.node.callee)) {
          calleeName = p.node.callee.name;
        } else if (t.isMemberExpression(p.node.callee) && t.isIdentifier(p.node.callee.property)) {
          calleeName = p.node.callee.property.name;
        }

        const targetFunctions = [
          'useState', 'useMemo', 'useEffect', 'useReducer', 'createContext',
          'useRef', 'useLayoutEffect', 'useCallback', 'useId',
          'useImperativeHandle', 'useInsertionEffect', 'useDebugValue', 'useSyncExternalStore'
        ];

        if (!calleeName || !targetFunctions.includes(calleeName)) return;

        const filePath = state.file.opts.filename || "UnknownFile";
        const fileName = path.basename(filePath);
        let varName = "anonymous";

        if (t.isVariableDeclarator(p.parent)) {
          const id = p.parent.id;
          if (t.isArrayPattern(id)) {
            varName = id.elements[0] && t.isIdentifier(id.elements[0]) ? id.elements[0].name : "state";
          } else if (t.isIdentifier(id)) {
            varName = id.name;
          }
        } else if (calleeName === 'useEffect' || calleeName === 'useLayoutEffect' || calleeName === 'useInsertionEffect') {
          varName = `effect_L${p.node.loc?.start.line || 'unknown'}`;
        }

        const uniqueLabel = `${fileName} -> ${varName}`;
        const args = p.node.arguments;

        if (['useState', 'createContext', 'useRef', 'useId', 'useDebugValue'].includes(calleeName)) {
          if (args.length === 0) args.push(t.identifier('undefined'));
          if (args.length === 1) args.push(t.stringLiteral(uniqueLabel));
        }

        else if (['useEffect', 'useMemo', 'useLayoutEffect', 'useInsertionEffect'].includes(calleeName)) {
          if (args.length === 1) args.push(t.identifier('undefined'));
          if (args.length === 2) args.push(t.stringLiteral(uniqueLabel));
        }

        else if (calleeName === 'useReducer') {
          if (args.length === 2 || args.length === 3) {
            args.push(t.stringLiteral(uniqueLabel));
          }
        }

        else if (['useSyncExternalStore', 'useImperativeHandle'].includes(calleeName)) {
          if (args.length === 2) args.push(t.identifier('undefined'));
          if (args.length === 3) args.push(t.stringLiteral(uniqueLabel));
        }
      }
    }
  };
};