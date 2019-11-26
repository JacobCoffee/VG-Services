import { Request, Response, NextFunction } from 'express';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

import * as passport from 'passport';
import * as passportJwt from 'passport-jwt';
import * as passportLocal from 'passport-local';

import { getRepository } from 'typeorm';
import { User } from '../entities/user';
import { isLocal } from '../util/generic';

// 12 hours
const JWT_VALIDITY_MILLIS = 43200000;

// bcrypt rounds
const SALT_ROUNDS = 10;

// Use the env jwt secret, or just invent one
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

export function setup(app) {
  app.use(passport.initialize());

  passport.use(
    new passportLocal.Strategy({
      usernameField: 'username',
      passwordField: 'password',
    }, async (username, password, done) => {
      try {
        const repo = getRepository(User);
        const user = await repo.findOne({ where: [{ username }] })
        if(user) {
          const isCorrectPassword = await bcrypt.compare(password, user.password);
          if(isCorrectPassword) {
            console.log(`Logging in user: ${username}`);
            return done(null, user);
          }
        }

        console.log(`Login failed: ${username}`);
        return done(null, false, { message: 'Invalid username or password' });
      } catch (err) {
        console.error(err);
        done(err);
      }
    })
  );

  passport.use(
    new passportJwt.Strategy({
      // Allow bearer token or cookie for jwt value
      jwtFromRequest: req => passportJwt.ExtractJwt.fromAuthHeaderAsBearerToken()(req) || req.cookies.jwt,
      secretOrKey: JWT_SECRET,
    },
    (jwtPayload, done) => {
      if (Date.now() > jwtPayload.expires) {
        return done('jwt expired');
      }

      return done(null, jwtPayload);
    }
  ));
}

// Compare creds against db.  If matching, generate a JWT with the current user roles
export function login(req: Request, res: Response, next: NextFunction) {
  passport.authenticate(
    'local',
    { session: false },
    (error, user) => {
      if (error || !user) {
        res.status(400).json({ error });
      } else {
        // JWT payload
        const payload = {
          id: user.id,
          username: user.username,
          player_name: user.player_name,
          roles: user.roles,
          expires: Date.now() + JWT_VALIDITY_MILLIS
        };

        // Sign and send
        req.login(payload, { session: false }, (error) => {
          if (error) {
            res.status(400).send({ error });
          } else {
            // Sign payload
            const token = jwt.sign(JSON.stringify(payload), JWT_SECRET);

            // Send as cookie and as response data
            res.cookie('jwt', token, { httpOnly: false, secure: !isLocal() });
            res.status(200).json(Object.assign({ jwt: token }, payload));
          }
        });
      }
    },
  )(req, res, next);
}