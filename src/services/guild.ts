import { Request, Response } from 'express';
import { getRepository } from 'typeorm';
import * as _ from 'lodash';

import { GuildMember } from '../entities/guild_member';

async function getGuild(req: Request, res: Response) {
  const members = await getRepository(GuildMember).find();
  const sort = (req.query && req.query.sort) || 'player_name';

  res.json(_.sortBy(members, [sort]));
}

export default function(app) {
  /**
   * @swagger
   *
   * /api/guild:
   *   get:
   *     tags:
   *     - guild
   *     description: Lists all guild members
   *     produces:
   *       - application/json
   *     responses:
   *       200:
   *         description: List of guild members
   *         examples:
   *           application/json: { }
   */
  app.get('/api/guild', getGuild);
};