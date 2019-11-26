import { Request, Response } from "express";
import * as _ from 'lodash';

import { getRepository } from 'typeorm';
import { PlayerEvent } from '../entities/player_event';
import { Raid } from '../entities/raid';

import { requiresOfficer } from '../auth/requires_role';
import { auditEntity, AuditOperation } from "../util/audit";
import { RaidLoot } from "./raids/parse_raid";

export const eventTypeDataFields = {
  RAID_BOSS: ['time', 'name'],
  RAID_FULL_DURATION: ['time', 'presence_seconds', 'raid_duration_seconds'],
  RAID_LOOT: ['time', 'amount', 'item_id', 'action', 'name'],
  RAID_ON_TIME: ['time'],
  RAID_PRESENCE: ['time', 'total_seconds']
}

// TODO: Validate on this when processing RAID_LOOT event data
export const lootEventTypes = [
  'AWARD',
  'SHARD',
  'BANK'
];

async function getAll(req: Request, res: Response) {
  const player_name = req.query.player_name;
  const raid_id = req.query.raid_id;
  if(player_name == null && raid_id == null) {
    res.status(400).json({
      message: 'At least one of: [player_name, raid_id] must be specified as a filter'
    });
  } else {
    const where = {};
    if(player_name != null) { where['player_name'] = player_name }
    if(raid_id != null) { where['raid_id'] = raid_id }

    const results = await getRepository(PlayerEvent).find({
      where: [where]
    });

    res.json(results);
  }
}

async function validateRaidId(raid_id: string): Promise<boolean> {
  const raids = await getRepository(Raid).find({ where: [{ raid_id }], select: ['raid_id']});
  return Promise.resolve(raids && raids.length > 0);
}

async function validatePlayerName(playerName: string): Promise<boolean> {
  // TODO: This may or may not be sufficient validation for the name
  //       Can reference guild snapshot if we need to
  return Promise.resolve(playerName && playerName[0] === playerName[0].toUpperCase());
}

async function validateGpp(gpp: number): Promise<boolean> {
  // Must be associated with an existing raid
  return Promise.resolve(!isNaN(gpp));
}

async function validateEventType(eventType: string): Promise<boolean> {
  // Must be associated with an existing raid
  return Promise.resolve(Object.keys(eventTypeDataFields).includes(eventType));
}

async function validateEventData(eventType: string, eventData: Object): Promise<boolean> {
  const fields = eventTypeDataFields[eventType];

  if(!fields) {
    return false;
  }

  const dataKeys = Object.keys(eventData);
  return Promise.resolve(fields.every(field => dataKeys.includes(field)));
}

function filterEventData(eventType: string, eventData: Object): Object {
  const fields = eventTypeDataFields[eventType] || [];
  return _.pick(eventData, fields);
}

async function validateTopLevelFields(raid_id: string, gpp: number, player_name: string, event_type: string, event_data: Object, res: Response): Promise<boolean> {
  const validGpp = await validateGpp(gpp);
  if(!validGpp) {
    res.status(400).json({
      message: '[gpp] must be a number'
    });
    return;
  }

  const validPlayerName = await validatePlayerName(player_name);
  if(!validPlayerName) {
    res.status(400).json({
      message: '[player_name] must start with a capital letter'
    });
    return;
  }

  const validEventType = await validateEventType(event_type);
  if(!validEventType) {
    res.status(400).json({
      message: `[event_type] must be one of ${Object.keys(eventTypeDataFields).join(', ')}`
    });
    return;
  }

  const validEventData = await validateEventData(event_type, event_data);
  if(!validEventData) {
    res.status(400).json({
      message: `[event_data] must contain fields ${eventTypeDataFields[event_type].join(', ')}`
    });
    return;
  }

  const validRaidId = await validateRaidId(raid_id);
  if(!validRaidId) {
    res.status(400).json({
      message: '[raid_id] must match an existing Raid'
    });
    return;
  }

  return validGpp && validPlayerName && validRaidId && validEventType && validEventData;
}

async function editEvent(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);
  const { raid_id, player_name, gpp: gppRaw, event_type, event_data: dirtyEventData } = req.body;
  const gpp = parseInt(gppRaw, 10);
  const event_data = filterEventData(event_type, dirtyEventData);

  if(!id || !raid_id || !player_name || !isNaN(gpp) || !event_type || !event_data) {
    res.status(400).json({
      message: 'All player_event fields must be provided'
    })
  } else {
    // Check to see if the thing we're editing exists
    const existing = await getRepository(PlayerEvent).findOne(id);
    if(!existing) {
      res.status(404);
      return;
    }

    const validTop = await validateTopLevelFields(raid_id, gpp, player_name, event_type, event_data, res);
    if(!validTop) {
      return;
    }

    // event_type cannot change
    if(event_type !== existing.event_type) {
      res.status(400).json({
        message: '[event_type] cannot be edited'
      });
      return;
    }

    const newEntity = {
      id,
      raid_id,
      player_name,
      gpp,
      event_type,
      event_data
    } as PlayerEvent;

    await getRepository(PlayerEvent).save([newEntity]);
    await auditEntity('player_event', AuditOperation.UPDATE, newEntity, req.user);
    res.json(newEntity);
  }
}

async function createEvent(req: Request, res: Response) {
  const { raid_id, player_name, gpp: gppRaw, event_type, event_data: dirtyEventData } = req.body;
  const gpp = parseInt(gppRaw, 10);
  const event_data = filterEventData(event_type, dirtyEventData);

  if(!raid_id || !player_name || !isNaN(gpp) || !event_type || !event_data) {
    res.status(400).json({
      message: 'All player_event fields must be provided'
    })
  } else {
    const validTop = await validateTopLevelFields(raid_id, gpp, player_name, event_type, event_data, res);
    if(!validTop) {
      return;
    }

    const newEntity = {
      id: null,
      raid_id,
      player_name,
      gpp,
      event_type,
      event_data
    } as PlayerEvent;

    const insertedEvent = await getRepository(PlayerEvent).insert(newEntity);
    const finalInserted = Object.assign({}, insertedEvent.generatedMaps.find(it => it.id), newEntity);
    await auditEntity('player_event', AuditOperation.INSERT, finalInserted, req.user);
    res.json(finalInserted);
  }
}

async function deleteEvent(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);

  // Check to see if the thing we're editing exists
  const existing = await getRepository(PlayerEvent).findOne(id);
  if(!existing) {
    res.status(404);
    return;
  }

  await getRepository(PlayerEvent).delete(id);
  await auditEntity('player_event', AuditOperation.DELETE, existing, req.user);
  res.json(existing);
}

async function transferEvent(req: Request, res: Response) {
  const id = parseInt(req.params.id, 10);

  // Check to see if the thing we're transferring exists
  const existing = await getRepository(PlayerEvent).findOne(id);
  if(!existing) {
    res.status(404);
    return;
  }

  if(!req.query.player || req.query.player === existing.player_name) {
    res.status(400).json({
      message: 'Invalid player name - must be set, and different from the currently assigned player'
    });
    return;
  }

  if(existing.event_type !== 'RAID_LOOT') {
    res.status(400).json({
      message: 'Invalid event - only RAID_LOOT events can be transferred'
    });
    return;
  }

  const newEvent = _.cloneDeep(existing);
  newEvent.player_name = req.query.player;
  (newEvent.event_data as RaidLoot).action = 'AWARD';

  if(_.has(req.query, 'gpp')) {
    const gpp = parseInt(req.query.gpp, 10);

    if(isNaN(gpp)) {
      res.status(400).json({
        message: 'Invalid transfer GPP - must be a number'
      });
      return;
    }

    newEvent.gpp = gpp
  }

  await getRepository(PlayerEvent).save([newEvent]);
  await auditEntity('player_event', AuditOperation.TRANSFER, _.merge(newEvent, { event_data: {
    _transferTo: req.query.player,
    _transferFrom: existing.player_name,
    _oldGpp: existing.gpp,
    _newGpp: newEvent.gpp
  }}), req.user);
  res.json(newEvent);
}

export default function(app) {
  /**
   * @swagger
   *
   * /api/player_events:
   *   get:
   *     tags:
   *     - player_events
   *     description: Gets all player events.  At least one filter is required.
   *     produces:
   *       - application/json
   *     parameters:
   *     - name: player_name
   *       description: Player name
   *       in: query
   *       required: true
   *       type: string
   *     - name: raid_id
   *       description: Raid ID
   *       in: query
   *       required: false
   *       type: string
   *     responses:
   *       200:
   *         description: JWT
   *         examples:
   *           application/json: {  }
   */
  app.get('/api/player_events', getAll);

  /**
   * @swagger
   *
   * /api/player_events:
   *   post:
   *     tags:
   *     - player_events
   *     description: Creates a player_event
   *     produces:
   *       - application/json
   *     responses:
   *       200:
   *         description: The created event
   */
  app.post('/api/player_events', requiresOfficer(), createEvent);

  /**
   * @swagger
   *
   * /api/player_events/:id:
   *   update:
   *     tags:
   *     - player_events
   *     description: Updates a player_event
   *     produces:
   *       - application/json
   *     parameters:
   *     - name: id
   *       description: Event ID
   *       in: path
   *       required: true
   *       type: number
   *     - name: player_name
   *       description: Player name
   *       in: formData
   *       required: true
   *       type: string
   *     - name: raid_id
   *       description: Raid ID
   *       in: formData
   *       required: true
   *       type: string
   *     - name: gpp
   *       description: GPP to award/deduct
   *       in: formData
   *       required: true
   *       type: number
   *     - name: event_type
   *       description: Event type
   *       in: formData
   *       required: true
   *       type: string
   *     - name: event_data
   *       description: Event data
   *       in: formData
   *       required: true
   *       type: object
   *     responses:
   *       200:
   *         description: Updated event object
   */
  app.put('/api/player_events/:id', requiresOfficer(), editEvent);

  /**
   * @swagger
   *
   * /api/player_events/:id:
   *   update:
   *     tags:
   *     - player_events
   *     description: Updates a player_event
   *     produces:
   *       - application/json
   *     parameters:
   *     - name: id
   *       description: Event ID
   *       in: path
   *       required: true
   *       type: number
   *     responses:
   *       200:
   *         description: Nothing
   */
  app.delete('/api/player_events/:id', requiresOfficer(), deleteEvent);

  /**
   * @swagger
   *
   * /api/player_event/transfer/:id:
   *   post:
   *     tags:
   *     - player_events
   *     description: Transfers an event from one player to another
   *     produces:
   *       - application/json
   *     parameters:
   *     - name: id
   *       description: Event ID
   *       in: path
   *       required: true
   *       type: number
   *     - name: player
   *       description: New player to transfer item to
   *       in: query
   *       required: false
   *       type: string
   *     - name: gpp
   *       description: New GPP, if applicable
   *       in: query
   *       required: false
   *       type: number
   *     responses:
   *       200:
   *         description: Nothing
   */
  app.post('/api/player_event/transfer/:id', requiresOfficer(), transferEvent);
};
