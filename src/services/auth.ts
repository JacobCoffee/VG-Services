import { Request, Response } from 'express';

import * as passport from 'passport';
import { login } from '../auth/passport_jwt';

export default function(app) {
  /**
   * @swagger
   *
   * /api/auth/login:
   *   post:
   *     tags:
   *     - auth
   *     description: Login to the application
   *     produces:
   *       - application/json
   *     parameters:
   *     - name: username
   *       description: Username
   *       in: formData
   *       required: true
   *       type: string
   *     - name: password
   *       description: Password
   *       in: formData
   *       required: true
   *       type: string
   *     responses:
   *       200:
   *         description: JWT
   *         examples:
   *           application/json: { "jwt": "jwt-token-goes-here" }
   */
  app.post('/api/auth/login', login);

  /**
   * @swagger
   *
   * /api/auth/validate:
   *   post:
   *     tags:
   *     - auth
   *     description: Validates a user session
   *     produces:
   *       - application/json
   *     responses:
   *       200:
   *         description: Session valid
   *       40x:
   *         description: Session invalid
   */
  app.post('/api/auth/validate', passport.authenticate('jwt', { session: false }), (req: Request, res: Response) => {
    res.sendStatus(200);
  });
};