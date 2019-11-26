import {Request, Response} from 'express';
import { getRepository } from 'typeorm';
import { requiresSuperuser } from '../auth/requires_role';

import { User } from '../entities/user';

async function getUser(req: Request, res: Response) {
  const user = await getRepository(User).findOne({
    where: [{ username: req.params.username }]
  });
  if(user) {
    delete user.password;
    res.send(200).json(user)
  } else {
    res.sendStatus(404);
  }
}

async function createUser(req: Request, res: Response) {
  
}

async function deleteUser(req: Request, res: Response) {
  if(!req.params.username) {
    res.status(400).json({
      message: '[username] is required'
    });
  } else {
    // Superusers cannot be deleted
    const existing = await getRepository(User).findOne({
      where: [{ username: req.params.username }]
    });

    if(existing.roles.some(it => it === 'SUPERUSER')) {
      res.status(400).json({
        message: 'Superusers cannot be deleted'
      });
    } else {
      if(existing) {
        await getRepository(User).delete({
          username: req.params.username
        });
      } else {
        res.sendStatus(404);
      }
    }
  }
}

export default function(app) {
  /**
   * @swagger
   *
   * /api/users:
   *   get:
   *     tags:
   *     - user
   *     description: Gets a user
   *     produces:
   *       - application/json
   *     parameters:
   *     - name: username
   *       description: Username
   *       in: path
   *       required: true
   *       type: string
   *     responses:
   *       200:
   *         description: User object
   *         examples:
   *           application/json: {  }
   */
  app.get('/api/user/:username', getUser);

  /**
   * @swagger
   *
   * /api/users:
   *   post:
   *     tags:
   *     - user
   *     description: Creates a user
   *     produces:
   *       - application/json
   *     parameters:
   *     - name: username
   *       description: Username
   *       in: path
   *       required: true
   *       type: string
   *     responses:
   *       200:
   *         description: User object
   *         examples:
   *           application/json: {  }
   */
  app.post('/api/users', requiresSuperuser(), createUser);

  // app.put('/api/users/:username', requiresSuperuser(), updateUser);

  /**
   * @swagger
   *
   * /api/users:
   *   delete:
   *     tags:
   *     - user
   *     description: Deletes a user
   *     produces:
   *       - application/json
   *     parameters:
   *     - name: username
   *       description: Username
   *       in: path
   *       required: true
   *       type: string
   *     responses:
   *       200:
   *         description: Nothing
   */
  app.delete('/api/users/:username', requiresSuperuser(), deleteUser);
};