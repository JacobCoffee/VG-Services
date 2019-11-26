import auth from './auth';
import gpp from './gpp';
import guild from './guild';
import player_events from './player_events';
import raids from './raids';
import users from './users';

// Have each service add its routes to the Express app
export default function(app) {
  auth(app);
  gpp(app);
  guild(app);
  player_events(app);
  raids(app);
  users(app);
}