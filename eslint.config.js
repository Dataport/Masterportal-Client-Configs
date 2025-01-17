import globals from 'globals'
import pluginJs from '@eslint/js'
import stylisticJs from '@stylistic/eslint-plugin-js'

export default [
	{
		ignores: [ 'dist/' ],
	},
	{
		languageOptions: {
			globals: globals.node,
		},
	},
	pluginJs.configs.recommended,
	{
		rules: {
			'no-cond-assign': 'off',
			'no-unused-vars': 'off',
		},
	},
	stylisticJs.configs['all-flat'],
	{
		plugins: {
			'@stylistic/js': stylisticJs,
		},
		rules: {
			'@stylistic/js/indent': [ 'error', 'tab', { SwitchCase: 1 } ],
			'@stylistic/js/quotes': [ 'error', 'single', { avoidEscape: true, allowTemplateLiterals: true } ],
			'@stylistic/js/quote-props': [ 'error', 'as-needed', { unnecessary: false } ],
			'@stylistic/js/array-bracket-newline': [ 'error', { multiline: true, minItems: null } ],
			'@stylistic/js/array-element-newline': [ 'error', 'consistent' ],
			'@stylistic/js/array-bracket-spacing': [ 'error', 'always' ],
			'@stylistic/js/object-curly-spacing': [ 'error', 'always' ],
			'@stylistic/js/space-before-function-paren': [ 'error', { anonymous: 'never', named: 'never', asyncArrow: 'always' } ],
			'@stylistic/js/object-property-newline': 'off',
			'@stylistic/js/comma-dangle': [ 'error', 'always-multiline' ],
			'@stylistic/js/semi': [ 'error', 'never' ],
			'@stylistic/js/keyword-spacing': [ 'error', { overrides: { if: { after: false }, for: { after: false }, while: { after: false }, switch: { after: false }, catch: { after: false } } } ],
			'@stylistic/js/padded-blocks': 'off',
			'@stylistic/js/no-extra-parens': 'off',
			'@stylistic/js/multiline-comment-style': 'off',
			'@stylistic/js/function-call-argument-newline': [ 'error', 'consistent' ],
			'@stylistic/js/dot-location': [ 'error', 'property' ],
			'@stylistic/js/arrow-parens': [ 'error', 'as-needed' ],
			'@stylistic/js/multiline-ternary': [ 'error', 'always-multiline' ],
		},
	},
]
