import { _baseOptions } from '../core/yargs';
import { logMigrator } from '../core/migrator';

import helpers from '../helpers';
import { cloneDeep, defaults } from 'lodash';
import clc from 'cli-color';

const Sequelize = helpers.generic.getSequelize();

exports.builder = yargs => _baseOptions(yargs)
  .option('if-not-exists', {
    default: false,
    type: 'boolean',
    desc: 'Prevents error if database exists'
  })
  .help()
  .argv;

exports.handler = async function (args) {
  // legacy, gulp used to do this
  await helpers.config.init();

  const sequelize = getDatabaseLessSequelize();
  const config = helpers.config.readConfig();

  console.log(`CREATE DATABASE ${args.ifNotExists ? 'IF NOT EXISTS' : ''} ${sequelize.getQueryInterface().quoteIdentifier(config.database)}`);

  await sequelize.query(`CREATE DATABASE ${args.ifNotExists ? 'IF NOT EXISTS' : ''} ${sequelize.getQueryInterface().quoteIdentifier(config.database)}`, {
    type: sequelize.QueryTypes.RAW
  }).catch(e => {
    console.log(e.message);
    helpers.view.error(e);
  });

  helpers.view.log(
    'Database',
    clc.blueBright(config.database),
    'created.'
  );

  process.exit(0);
};

function getDatabaseLessSequelize () {
  let config = null;

  try {
    config = helpers.config.readConfig();
  } catch (e) {
    helpers.view.error(e);
  }

  config = cloneDeep(config);
  config = defaults(config, { logging: logMigrator });

  switch (config.dialect) {
    case 'postgres':
    case 'postgres-native':
      config.database = 'postgres';
      break;

    case 'mysql':
      delete config.database;
      break;

    case 'mssql':
      config.database = 'master';
      break;

    default:
      helpers.view.error(`Dialect ${config.dialect} does not support db:create / db:drop commands`);
  }

  try {
    return new Sequelize(config);
  } catch (e) {
    helpers.view.error(e);
  }
}
