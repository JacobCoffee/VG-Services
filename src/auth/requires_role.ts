import { Request, Response, NextFunction } from 'express';
import * as passport from 'passport';
import { JwtUser } from '../entities/user';

export function checkRoles(roles: string[]) {
  return function(req: Request, res: Response, next: NextFunction) {
    if(req.user) {
      const user = req.user as JwtUser;
      const hasRole = user.roles.filter(role => roles.includes(role)).length > 0;
      if(hasRole) {
        next();
      } else {
        res.status(401).json({
          message: 'User must have one of the following roles',
          roles
        });
      }
    }
  }
}

export function requiresAnyRoles(roles) {
  const _requiresAuth = requiresAuth();
  const _checkRoles = checkRoles(roles);

  return function(req: Request, res: Response, next: NextFunction) {
    _requiresAuth(req, res, () => _checkRoles(req, res, next));
  }
}

export function requiresSuperuser() {
  return requiresAnyRoles(['SUPERUSER']);
}

export function requiresOfficer() {
  return requiresAnyRoles(['SUPERUSER','OFFICER']);
}

export function requiresUser() {
  return requiresAnyRoles(['SUPERUSER', 'OFFICER', 'USER']);
}

export function requiresAuth() {
  return function(req: Request, res: Response, next: NextFunction) {
    return passport.authenticate('jwt', { session: false })(req, res, next)
  }
}