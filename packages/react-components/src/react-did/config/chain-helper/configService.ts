// [object Object]
// SPDX-License-Identifier: Apache-2.0

import type { LogGroupControlSettings } from 'typescript-logging';
import type { ApiPromise } from '@polkadot/api';
import type { ResultEvaluator } from './subscriptionPromise.js';

import { getLogControl, LFService, LoggerFactoryOptions, LogGroupRule, LogLevel } from 'typescript-logging';

const DEFAULT_DEBUG_LEVEL = (() => {
  if (typeof process !== 'undefined') {
    if (process.env.DEBUG === 'true') {
      return LogLevel.Debug;
    }

    if (process.env.NODE_ENV && process.env.NODE_ENV !== 'production') {
      return LogLevel.Warn;
    }
  }

  return LogLevel.Error;
})();

export type configOpts = {
  api: ApiPromise;
  logLevel: LogLevel;
  submitTxResolveOn: ResultEvaluator;
} & Record<string, any>;

export function modifyLogLevel (level: LogLevel): LogLevel {
  // eslint-disable-next-line no-nested-ternary
  const actualLevel = level > 0 ? (level > 5 ? 5 : level) : 0;

  getLogControl()
    .getLoggerFactoryControl(0)
    .change({
      group: 'all',
      logLevel: LogLevel[actualLevel]
    } as LogGroupControlSettings);

  return actualLevel;
}

const defaultConfig: Partial<configOpts> = {
  logLevel: DEFAULT_DEBUG_LEVEL
};

let configuration: Partial<configOpts> = { ...defaultConfig };

/**
 * Get the value set for a configuration.
 *
 * @param configOpt Key of the configuration.
 * @returns Value for this key.
 */
export function get<K extends keyof configOpts> (configOpt: K): configOpts[K] {
  if (typeof configuration[configOpt] === 'undefined') {
    switch (configOpt) {
      case 'api':
        throw new Error(
          'The blockchain API is not set. Did you forget to call connect()?'
        );
      default:
        throw new Error(`GENERIC NOT CONFIGURED ERROR FOR KEY: "${configOpt}"`);
    }
  }

  return configuration[configOpt];
}

function setLogLevel (logLevel: LogLevel | undefined): void {
  if (logLevel !== undefined) {
    modifyLogLevel(logLevel);
  }
}

/**
 * Set values for one or multiple configurations.
 *
 * @param opts Object of configurations as key-value pairs.
 */
export function set<K extends Partial<configOpts>> (opts: K): void {
  configuration = { ...configuration, ...opts };
  setLogLevel(configuration.logLevel);
}

/**
 * Set the value for a configuration to its default (which may be `undefined`).
 *
 * @param key Key identifying the configuration option.
 */
export function unset<K extends keyof configOpts> (key: K): void {
  if (Object.prototype.hasOwnProperty.call(defaultConfig, key)) {
    configuration[key] = defaultConfig[key];
  } else {
    delete configuration[key];
  }
}

/**
 * Indicates whether a configuration option is set.
 *
 * @param key Key identifying the configuration option.
 * @returns True if this value is set, false otherwise.
 */
export function isSet<K extends keyof configOpts> (key: K): boolean {
  return typeof configuration[key] !== 'undefined';
}

// Create options instance and specify 1 LogGroupRule:
// * LogLevel Error on default, env DEBUG = 'true' changes Level to Debug.throws
const options = new LoggerFactoryOptions().addLogGroupRule(
  new LogGroupRule(new RegExp('.+'), get('logLevel'))
);

// Create a named logging factory and pass in the options and export the factory.
// Named is since version 0.2.+ (it's recommended for future usage)
export const LoggingFactory = LFService.createNamedLoggerFactory(
  'LoggerFactory',
  options
);
