import * as express from 'express';
import * as bodyParser from  'body-parser';
import * as cookieParser from 'cookie-parser';

import {Request, Response} from 'express';

import { setup } from './auth/passport_jwt';
import { init } from './db';
import * as swaggerUI from 'swagger-ui-express';
import services from './services';
import { isLocal } from './util/generic';

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Configure auth
setup(app);

// Configure services
services(app);

// Health check
app.get('/__health', (req: Request, res: Response) => {
  return res.sendStatus(200);
});

// API docs
try {
  const prefix = isLocal() ? '../' : './'
  app.use('/api/', swaggerUI.serve, swaggerUI.setup(require(`${prefix}swagger.json`)));
} catch(e) {
  console.error('Failed to create API docs route');
}

// Less Shit UI
app.use('/ui', express.static('ui'));

// Wait for db init, then start
init().then(() => {
  console.log('Starting service on port 3000');
  app.listen(3000);
});

process.on('SIGINT', function() {
  console.log( "\nSIGINT (Ctrl-C)" );
  process.exit(1);
});