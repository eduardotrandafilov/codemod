import { deepEqual, strictEqual, throws } from 'assert';
import { inspect } from 'util';
import Options from '../../src/Options';

describe('Options', function() {
  it('has sensible defaults', function() {
    let config = new Options([]).parse();
    deepEqual(config.extensions, new Set(['.js', '.jsx']));
    deepEqual(config.localPlugins, []);
    deepEqual(config.sourcePaths, []);
    deepEqual(config.requires, []);
    strictEqual(config.pluginOptions.size, 0);
    strictEqual(config.stdio, false);
  });

  it('interprets `--help` as asking for help', function() {
    let config = new Options(['--help']).parse();
    strictEqual(config.help, true);
  });

  it('interprets `--version` as asking to print the version', function() {
    let config = new Options(['--version']).parse();
    strictEqual(config.version, true);
  });

  it('interprets `--extensions` as expected', function() {
    let config = new Options(['--extensions', '.js,.jsx,.ts']).parse();
    deepEqual(config.extensions, new Set(['.js', '.jsx', '.ts']));
  });

  it('fails to parse unknown options', function() {
    throws(() => new Options(['--wtf']).parse(), 'unexpected option: --wtf');
  });

  it('interprets non-option arguments as paths', function() {
    let config = new Options(['src/', 'a.js']).parse();
    deepEqual(config.sourcePaths, ['src/', 'a.js']);
  });

  it('treats sources as globs', function() {
    let config = new Options(['test/fixtures/glob-test/**/*.js']).parse();
    deepEqual(config.sourcePaths, [
      'test/fixtures/glob-test/abc.js',
      'test/fixtures/glob-test/subdir/def.js'
    ]);
  });

  it('interprets `--stdio` as reading/writing stdin/stdout', function() {
    let config = new Options(['--stdio']).parse();
    strictEqual(config.stdio, true);
  });

  it('can parse inline plugin options as JSON', function() {
    let config = new Options(['-o', 'my-plugin={"foo": true}']).parse();
    deepEqual(config.pluginOptions.get('my-plugin'), { foo: true });
  });

  it('associates plugin options based on declared name', async function() {
    let config = new Options([
      '--plugin',
      './test/fixtures/plugin/index.js',
      '--plugin-options',
      'basic-plugin={"a": true}'
    ]).parse();

    deepEqual(config.pluginOptions.get('basic-plugin'), { a: true });
  });

  it('interprets `--require` as expected', function() {
    let config = new Options(['--require', 'mz']).parse();
    deepEqual(config.requires, ['mz'].map(name => require.resolve(name)));
  });

  it('associates plugin options based on inferred name', async function() {
    let config = new Options([
      '--plugin',
      './test/fixtures/plugin/index.js',
      '--plugin-options',
      'index={"a": true}'
    ]).parse();

    // "index" is the name of the file
    deepEqual(config.pluginOptions.get('index'), { a: true });

    let babelPlugin = await config.getBabelPlugin('index');

    if (!Array.isArray(babelPlugin)) {
      throw new Error(
        `expected plugin to be [plugin, options] tuple: ${inspect(babelPlugin)}`
      );
    }

    deepEqual(babelPlugin[1], { a: true });
  });

  it('can parse a JSON file for plugin options', function() {
    // You wouldn't actually use package.json, but it's a convenient JSON file.
    let config = new Options(['-o', 'my-plugin=@package.json']).parse();
    let pluginOpts = config.pluginOptions.get('my-plugin');
    strictEqual(pluginOpts && pluginOpts['name'], 'babel-codemod');
  });

  it('should set dry option', function() {
    let config = new Options(['--dry']).parse();
    strictEqual(config.dry, true);
  });

  it('should set useLocalBabel', function() {
    let config = new Options(['--find-babel-config']).parse();
    strictEqual(config.findBabelConfig, true);
  });
});
