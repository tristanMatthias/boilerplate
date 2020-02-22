import deepmerge from 'deepmerge';
import { config } from 'dotenv';
import findup from 'find-up';
import fs from 'fs-extra';
import path from 'path';
import yaml from 'yaml';

import { ErrorInvalidConfigOption } from '../errors';
import { dirOrDist } from '../lib/dirOrDist';
import { CONFIG_BASE, CONFIG_DEVELOPMENT, CONFIG_PRODUCTION, CONFIG_TEST, CONFIGS } from './defaults';
import { BrixConfig, Env } from './types';
import { validateConfig } from './validate';


// Allow for `.env` files to override config
const dotEnv = () => config({
  path: process.env.ENV || path.resolve(process.cwd(), '.env')
});
dotEnv();


export abstract class Config {
  static env: BrixConfig['env'];
  static port: BrixConfig['port'];
  static rootDir: BrixConfig['rootDir'];
  static mocks: BrixConfig['mocks'];
  static resolverDir: BrixConfig['resolverDir'];
  static mocksDir: BrixConfig['mocksDir'];
  static middlewareDir: BrixConfig['middlewareDir'];
  static dbConnection: BrixConfig['dbConnection'];
  static skipDatabase: BrixConfig['skipDatabase'];
  static accessTokenSecret: BrixConfig['accessTokenSecret'];
  static corsAllowFrom: BrixConfig['corsAllowFrom'];
  static middleware: BrixConfig['middleware'];
  static plugins: BrixConfig['plugins'];
  static clsNamespace: BrixConfig['clsNamespace'];

  private static loaded = false;

  static reset() {
    return Object.assign(this, CONFIG_BASE);
  }

  static loadEnv(env: Env | 'development' | 'test' | 'production') {
    switch (env) {
      case 'development':
      case Env.development:
        return Object.assign(this, CONFIG_DEVELOPMENT);
      case 'test':
      case Env.test:
        return Object.assign(this, CONFIG_TEST);
      case 'production':
      case Env.production:
        return Object.assign(this, CONFIG_PRODUCTION);
    }
  }


  /**
   * Load a Brix configuration file. Brix will attempt to load it from the root
   * project directory, and look for `brix.yml`, `brix.yaml`, `brix.json` and `.brixrc`
   * files.
   * @param dir Directory to load the config file from
   */
  static async loadConfig(dir: string = CONFIG_BASE.rootDir!) {
    if (this.loaded) return this.toJSON();

    if (dir && dir !== CONFIG_BASE.rootDir) {
      await this.update({ rootDir: dirOrDist(dir) });
    }

    let yml;
    let json;
    let config: Partial<BrixConfig> = {};

    const find = (p: string[] | string) => findup(p, { cwd: dir });

    const fYaml = await find(['brix.yml', 'brix.yaml']);
    const fJson = await find(['brix.json', '.brixrc']);


    if (fYaml) yml = await fs.readFile(fYaml);
    else if (fJson) json = await fs.readFile(fJson);

    if (yml) config = yaml.parse(yml.toString());
    else if (json) config = JSON.parse(json.toString());

    if (config && Object.keys(config).length) await this.update(config);
    this.loaded = true;
    return this.toJSON();
  }


  /**
   * Override particular settings globally (uss deep merging)
   * @param config Override settings for the config
   */
  static async update(config: Partial<BrixConfig> | Env) {
    dotEnv();

    try {
      let newConfig: Partial<BrixConfig>;

      if (typeof config === 'string') newConfig = CONFIGS[config];
      else newConfig = config || {};

      newConfig = this.merge(newConfig);

      await validateConfig.validate(newConfig, { strict: true });

      Object.assign(this, newConfig);

    } catch (e) {
      throw new ErrorInvalidConfigOption(e.message);
    }
  }

  private static toJSON(): BrixConfig {
    return {
      env: this.env,
      port: this.port,
      rootDir: this.rootDir,
      mocks: this.mocks,
      resolverDir: this.resolverDir,
      mocksDir: this.mocksDir,
      middlewareDir: this.middlewareDir,
      dbConnection: this.dbConnection,
      skipDatabase: this.skipDatabase,
      accessTokenSecret: this.accessTokenSecret,
      corsAllowFrom: this.corsAllowFrom,
      middleware: this.middleware,
      plugins: this.plugins,
      clsNamespace: this.clsNamespace
    };
  }

  private static merge(config: Partial<BrixConfig>): Partial<BrixConfig> {
    return deepmerge.all([
      CONFIGS[config.env || process.env.NODE_ENV as Env || 'development'],
      this.toJSON(),
      config
    ]);
  }
}


// Intialize with base config
Config.reset();