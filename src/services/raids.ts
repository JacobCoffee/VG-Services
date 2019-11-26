import { Request, Response } from 'express';
import { getManager, getRepository } from 'typeorm';
import * as _ from 'lodash';

import { Raid } from '../entities/raid';
import { PlayerEvent } from '../entities/player_event';
import { GuildMember } from '../entities/guild_member';

import { requiresOfficer, requiresSuperuser } from '../auth/requires_role';

import * as parse from './raids/parse_raid';
import * as parseGuild from './raids/parse_guild_members';
import { uploadRaid } from '../util/gc_storage';

// Handle file upload
import * as multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() })

interface RaidProcessingResult {
  raids?: parse.Raid[]
  error?: ErrorResponse
}

interface RaidInsertResult {
  processedRaids?: string[]
  skippedRaids?: string[]
  error?: ErrorResponse
}

interface GuildMemberProcessingResult {
  members?: GuildMember[]
  error?: ErrorResponse
}

// This is intended for crafting an error to send back to the client
interface ErrorResponse {
  status: number
  message: string
  errors?: string[]
  exception?: Error
}

async function batchUploadRaids(req: Request, res: Response) {
  if(!req.file) {
    res.status(400).json({
      message: 'File must be provided'
    });
    return;
  }

  // Allow upload of a lua file, or of direct RaidEvent JSON
  const uploadFile = req.file.buffer.toString('utf-8');
  const isLua = req.file.originalname.toLowerCase().endsWith('lua');
  let raidParseResult, guildParseResult = {};

  if(isLua) {
    raidParseResult = parse.parseRaidDB(uploadFile, isLua);
    guildParseResult = parseGuild.parseGuildMembers(uploadFile);
  } else {
    try {
      // JSON
      const parsed = JSON.parse(uploadFile);
      
      if(parsed) {
        raidParseResult = parse.parseRaidDB(parsed.VanguardRaids || [], false);
        // Members as JSON should just be submitted verbatim - nothing fancy happens in the member parser
        guildParseResult = parsed.VanguardGuild || [];
      } else {
        res.status(400).json({
          message: 'Uploaded JSON was empty'
        });
        return;
      }
    } catch(e) {
      res.status(400).json({
        message: 'Could not parse upload JSON'
      })
      return;
    }
  }

  const { raids, error: raidError } = processParseResult(raidParseResult, 'raids') as RaidProcessingResult
  const { members, error: guildMemberError } = processParseResult(guildParseResult, 'members') as GuildMemberProcessingResult

  if(raidError || guildMemberError) {
    const maxStatus = Math.max(raidError && raidError.status || 0, guildMemberError && guildMemberError.status || 0)
    res.status(maxStatus || 500).json({
      raidError,
      guildMemberError
    });
  } else {
    // Only upload if we have something new
    if(raids.length) {
      await uploadRaid(req.file.originalname, req.file.buffer, req.user);
    }

    const { processedRaids, skippedRaids, error } = await insertRaids(raids);
    if(members && members.length) {
      await upsertGuildMembers(members)
    }

    res.status(200).json({
      raids: {
        processed: processedRaids,
        skipped: skippedRaids
      },
      guild: {
        members
      }
    })
  }
}

function processParseResult(parseResult, type): RaidProcessingResult | GuildMemberProcessingResult {
  if(parseResult.exception) {
    // If we had an exception, send 500
    return {
      error: {
        status: 500,
        message: parseResult.exception.message,
        errors: parseResult.errors,
        exception: parseResult.exception
      }
    };
  } else if(parseResult.errors && parseResult.errors.length) {
    // If we failed parsing, but did not crash, send 400
    return {
      error: {
        status: 400,
        message: `Invalid ${type} data`,
        errors: parseResult.errors
      }
    };
  } else if(parseResult.result && parseResult.result.length) {
    return {
      [type]: parseResult.result
    };
  } else {
    // We found nothing in the data
    return {
      [type]: []
    };
  }
}

async function insertRaids(raids: parse.Raid[]): Promise<RaidInsertResult> {
  return getManager().transaction(transactionMgr => {
    return transactionMgr
      .createQueryBuilder(Raid, 'raids')
      .select('raids.raid_id')
      .getMany()
      .then(async existingRaids => {
        if(raids) {
          // Find existing raid IDs
          const existingRaidIds = new Set(existingRaids.map(it => it.raid_id));

          // Remove existing raids from the ones to be imported
          const raidsToProcess = raids.filter(it => !existingRaidIds.has(it.raid_id));
          const raidsSkipped = raids.filter(it => existingRaidIds.has(it.raid_id));

          console.info('Processing raids', {
            new: raidsToProcess.map(it => it.raid_id),
            skipped: raidsSkipped.map(it => it.raid_id)
          });

          // If we succeeded, then write all the raids to their table
          // Also write all the new events to the player_events table
          // The views should catch themselves up afterward
          for(const raid of raidsToProcess) {
            await transactionMgr
              .createQueryBuilder(Raid, 'raids')
              .setLock('pessimistic_write')
              .insert()
              .values({
                id: null,
                instances: raid.instances,
                raid_id: raid.raid_id,
                parsed: raid.events
              })
              .execute();

            await transactionMgr
              .createQueryBuilder(PlayerEvent, 'player_events')
              .setLock('pessimistic_write')
              .insert()
              // FIXME: Typescript complains about the missing ID field, but it isn't actually needed
              //        The cast to unknown will band-aid the inferences
              .values(raid.player_events as unknown as PlayerEvent[])
              .execute();
          }

          return {
            processedRaids: raidsToProcess.map(it => it.raid_id),
            skippedRaids: raidsSkipped.map(it => it.raid_id)
          }
        } else {
          return {
            processedRaids: [],
            skippedRaids: []
          }
        }
      })
    }).catch(e => {
      console.error('Error saving processed raid results', e);
      return {
        error: {
          status: 500,
          message: e.message,
          exception: e
        }
      };
    });
}

async function upsertGuildMembers(parseResult): Promise<GuildMemberProcessingResult> {
  return getManager().transaction(transactionMgr => {
    const playerNamesSql = parseResult.map(it => `'${it.player_name}'`).join(',');

    return transactionMgr
      .createQueryBuilder(GuildMember, 'guild_members')
      .insert()
      .values(parseResult)
      .orUpdate({ conflict_target: ['player_name'], overwrite: ['officer_note', 'class', 'level', 'rank_index','rank'] })
      .execute()
      .then(() => {
        return {
          members: parseResult.length
        };
      });
    }
  ).catch(e => {
    console.error('Error saving processed guild member results', e);
    return {
      error: {
        status: 500,
        message: e.message,
        exception: e
      }
    };
  })
}

async function listRaids(req: Request, res: Response) {
  const raids = await getRepository(Raid).find();
  res.json(raids.map(it => _.omit(it, ['parsed'])));
}

async function getRaid(req: Request, res: Response) {
  const id = req.params.id;

  // Allow the db-id or the wow-id to be a find param here
  const raids = await getRepository(Raid).findOne({
    where: [
      { id },
      { raid_id: id }
    ]
  });
  res.json(raids);
}

// TODO: Delete this once testing is done
function nuke(req: Request, res: Response) {
  try {
    getRepository(Raid).clear();
    getRepository(PlayerEvent).clear();
    getRepository(GuildMember).clear();
    res.sendStatus(200);
  } catch(e) {
    res.status(500).json({ exception: e })
  }
}

function reprocess(req: Request, res: Response) {
  // TODO: Implement raid reprocessing
}

export default function(app) {
  /**
   * @swagger
   *
   * /api/raids:
   *   get:
   *     tags:
   *     - raids
   *     description: Gets a list of raids
   *     produces:
   *       - application/json
   *     responses:
   *       200:
   *         description: List of raid objects
   *         examples:
   *           application/json: [{ }]
   */
  app.get('/api/raids', listRaids);

  /**
   * @swagger
   *
   * /api/raids/:id_or_sequence_id:
   *   get:
   *     tags:
   *     - raids
   *     description: Gets a single raid by raid_id or sequential table ID
   *     produces:
   *       - application/json
   *     responses:
   *       200:
   *         description: Raid object
   *         examples:
   *           application/json: { }
   */
  app.get('/api/raids/:id', getRaid);

  /**
   * @swagger
   *
   * /api/raid/upload:
   *   get:
   *     tags:
   *     - raid
   *     description: Processes a dump file from Vanguard Raid Reporter
   *     produces:
   *       - application/json
   *     parameters:
   *     - name: raids
   *       description: Raid dump file
   *       in: formData
   *       required: true
   *       type: file
   *     responses:
   *       200:
   *         description: Raid object
   *         examples:
   *           application/json: |
   *             {
   *               raids: {
   *                 ids: [
   *                   '20191015-ALNL-TAVX-FBYE-UODKKZBNRFQF',
   *                   '20191015-MARISA_TEST_COPY'
   *                 ]
   *               },
   *               guild: {
   *                 members: 640
   *               }
   *             }
   */
  app.post('/api/raid/upload', requiresOfficer(), upload.single('raids'), batchUploadRaids);
  app.post('/api/raid/reprocess', requiresOfficer(), reprocess);
  app.delete('/api/raid/nuke_everything', requiresSuperuser(), nuke);
}