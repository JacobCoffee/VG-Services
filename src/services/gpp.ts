import { Request, Response } from 'express';
import { getConnection } from 'typeorm';

export const GPP_CAP = 150;

async function gppQuery() {
  // Sum each raid individually, per player, then sum that to get the total GPP summary
  // Cap at 150
  return getConnection().query(`
    select distinct p1.player_name, LEAST(sum(p1.raid_gpp) over (partition by p1.player_name), ${GPP_CAP}) as all_raid_gpp
    from (
      select player_name, raid_id, sum(gpp) as raid_gpp
      from player_events
      group by raid_id, player_name
      order by player_name, raid_id
    ) as p1;
  `);
}

async function getGpp(req: Request, res: Response) {
  let gpp = await gppQuery();
  
  if(req.query.player_name) {
    gpp = gpp.filter(it => it.player_name === req.query.player_name);
  }

  if(req.query.raw) {
    res.json(gpp);
  } else {
    const parsedGpp = gpp.map(it => {
      return {
        player_name: it.player_name,
        gpp: it.all_raid_gpp
      }
    });

    res.json(parsedGpp);
  }
}

export default function(app) {
  /**
   * @swagger
   *
   * /api/gpp:
   *   get:
   *     tags:
   *     - gpp
   *     description: Summarizes GPP for all players
   *     produces:
   *     - application/json
   *     parameters:
   *     - name: player_name
   *       description: Player name to filter on
   *       in: query
   *       required: false
   *       type: string
   *     responses:
   *       200:
   *         description: A list of player_name and gpp total
   *         examples:
   *           application/json: { "player_name": "DaveTheBarbarian", "gpp": 1000 }
   */
  app.get('/api/gpp', getGpp);
};
