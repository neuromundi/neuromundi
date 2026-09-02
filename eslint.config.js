/**
 * Configuración de ESLint (formato "flat", ESLint 9).
 *
 * Por qué existe: el proyecto no tenía linter. El fallo que dejó inutilizable
 * el registro de empresas —`t(..., {returnObjects:true}) as string[]` sin
 * comprobar que fuera un arreglo— es justo la clase de cosa que un linter
 * señala antes de que llegue a producción, porque el `as` silencia al
 * compilador de TypeScript sin dar ninguna garantía en tiempo de ejecución.
 *
 * Criterio de severidad: se marca como ERROR lo que rompe en ejecución
 * (dependencias de hooks mal declaradas, promesas sin await) y como WARN el
 * estilo. Así `npm run lint` falla solo ante problemas reales y no se vuelve
 * ruido que todo el mundo ignora.
 */
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    // supabase/functions son Edge Functions de Deno: otro runtime, otros
    // globals y su propia cadena de herramientas. Lintarlas con la config del
    // navegador solo produce falsos positivos.
    ignores: [
      'dist',
      'node_modules',
      'coverage',
      'src/i18n/critical', // generado por scripts/gen_i18n_critical.mjs
      'src/types/database.ts', // generado desde el esquema de Supabase
      'supabase/functions',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Prohibido `any`: el proyecto hoy tiene CERO, y conviene que siga así.
      '@typescript-eslint/no-explicit-any': 'error',

      // Variables sin usar: aviso, y se permite el prefijo _ para lo intencional.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // console.log fuera; el proyecto ya tiene su `logger` condicional.
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Los espacios duros (U+00A0) DENTRO de expresiones regulares son
      // intencionales aquí: feesCsv.ts los usa para limpiar importes copiados
      // de Excel o de la web, donde aparecen como separador de miles.
      // Marcarlos como error llevaría a "arreglar" algo que rompería la
      // importación de cuotas.
      'no-irregular-whitespace': ['error', { skipRegExps: true }],

      /**
       * Reglas del React Compiler (eslint-plugin-react-hooks v7). Detectan
       * patrones que impiden memoizar componentes; útiles como guía, pero
       * marcan 110 casos del código actual, la mayoría correctos en la
       * práctica. Van como AVISO: si fueran error, `npm run lint` fallaría
       * siempre y el linter se volvería ruido que todos ignoran.
       * Migrar a memoización es un trabajo aparte, no un requisito para
       * publicar.
       */
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/incompatible-library': 'warn',
    },
  },
  {
    // Los tests usan aserciones y utilidades que no aplican al código de la app.
    files: ['**/*.test.{ts,tsx}', 'src/test/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      'no-console': 'off',
    },
  },
);
