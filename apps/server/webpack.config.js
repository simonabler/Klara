const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/server'),
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: [
        './src/assets',
        // Migrations als kompilierte JS-Dateien ins dist kopieren.
        // tsc kompiliert sie via tsconfig.typeorm.json separat –
        // Webpack bundelt sie NICHT (TypeORM lädt sie dynamisch per Glob).
        // optional: true → Build schlägt nicht fehl wenn tsc noch nicht gelaufen ist.
        {
          glob: '**/*.js',
          input: '../../dist/typeorm/apps/server/src/migrations',
          output: 'migrations',
          optional: true,
        },
      ],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: true,
      sourceMaps: true,
    }),
  ],
};
