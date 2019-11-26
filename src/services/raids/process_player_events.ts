import * as pr from './parse_raid';
import * as _ from 'lodash';

export const BANK_CHARACTER = 'Vanguardbank';

// P means Player
export interface PRaidProcessingResult {
  events: PRaidEvent[]
  errors: string[]
}

export interface PRaidEvent {
  raid_id: string
  player_name: string
  gpp: number
  event_type: string
  event_data: PRaidLoot | PRaidOnTime | PRaidPresence | PRaidFullDuration | PRaidBoss
}

export interface PRaidLoot extends pr.RaidLoot {}

export interface PRaidBoss {
  time: number
  name: string
}

export interface PRaidOnTime {
  time: number
}

export interface PRaidPresenceEvent {
  player_name: string
  type: string
  time: number
}

export interface PRaidPresenceSegment {
  player_name: string
  start_time: number
  end_time: number
}

export interface PRaidPresence {
  time: number
  player_name: string
  total_seconds: number
}

export interface PRaidFullDuration {
  player_name: string
  presence_seconds: number
  raid_duration_seconds: number
}

/*
 * OVERVIEW:
 * The points system: https://www.ashkandi.org/wp-content/uploads/2019/10/Vanguard-Point-System.pdf
 *
 * On time - 2pt
 * Each hour - 1pt
 * Full raid - 2pt
 * Boss kill - 2pt
 * Point cap - 150
 * 
 * NYI:
 * Double points for alts *replacing* mains for duration of alt in raid
 * Main/alt merging (need accurate guild data)
 * 
 * NOTES:
 * - Duration is calculated by sum-of-segments - join/leave and start/end events decide length
 *   - 95% attendance in a raid counts for the full bonus
 *   - Round up for raid hours if > 30m
 *   - Min duration 1h
 * - Waitlist
 *   - Full raid credit is given to waitlist
 *   - Waitlist players appear as normal raid members
 *   - If a player is waitlisted for multiple raids simultaneously on the same day, choose the raid that grants the most points
 * - Cap is a bit tricky, since order of point changes can matter if the implementation isn't clean
 *   - All changes from a raid are considered as 'net' during aggregation
 *     - i.e. if you have 145 points at raid start, the raid awards 50 points total, and you get a 40 pt loot
 *       - If point adds are calcuated first, you end up with 115 points (we don't do this)
 *       - If net, then you end up with 150 points (5 points lost to cap)
 * 
 * EVENT TYPES:
 * 
 * Some events are tracked directly (e.g. loot, boss kills), some are synthetic (e.g on-time, durations)
 * 
 * The types we actually store are:
 * - RAID_LOOT
 * - RAID_ON_TIME
 * - RAID_PRESENCE
 * - RAID_FULL_DURATION
 * - RAID_BOSS
 */

// Loot is omitted, since it's not static
const GPP_MAP = {
  RAID_ON_TIME: 2,
  RAID_PRESENCE: 1,
  RAID_FULL_DURATION: 2,
  RAID_BOSS: 2
};

const RAID_FULL_DURATION_THRESHOLD = 0.95

function sortByTime(a, b) {
  if(a.time > b.time) {
    return 1;
  }
  if(a.time < b.time) {
    return -1;
  }
  return 0;
}

export function processPlayerEvents(raid: pr.Raid): PRaidProcessingResult {
  const events: PRaidEvent[] = [];
  const errors: string[] = [];

  const processed = processRaidEvents(raid, errors);

  // Group by raid and return
  return {
    events: processed,
    errors
  }
}

function processRaidEvents(raid: pr.Raid, errors: string[]): PRaidEvent[] {
  // Transform all raids into events
  const isLootRaid = (raid.events.find(it => it.type === 'RAID_START').data as pr.RaidStart).isLootRaid;
  const presenceEvents = processRaidPresence(raid, errors);

  if(isLootRaid) {
    return [
      ...processRaidLoot(raid, errors)
    ]
  } else {
    return [
      ...processRaidLoot(raid, errors),
      ...processRaidOnTime(raid, errors),
      ...presenceEvents,
      ...processRaidFullDuration(raid, presenceEvents, errors),
      ...processRaidBoss(raid, errors)
    ]
  }
}

function processRaidLoot(raid: pr.Raid, errors: string[]): PRaidEvent[] {
  const lootEvents = raid.events.filter(it => it.type === 'RAID_LOOT');
  const parsedLootEvents = lootEvents.map(lootEvent => {
    const lootData = lootEvent.data as pr.RaidLoot;

    // Depending on the action, these might change
    // These values represent an AWARD action, which is negative GPP
    let player_name = lootData.player;
    let gpp = -1 * lootData.amount
    if(lootData.action != 'AWARD') {
      player_name = BANK_CHARACTER;
      gpp = lootData.amount;
    }

    return {
      raid_id: raid.raid_id,
      player_name,
      gpp,
      event_type: 'RAID_LOOT',
      event_data: lootData
    } as PRaidEvent;
  })

  return parsedLootEvents;
}

function processRaidOnTime(raid: pr.Raid, errors: string[]): PRaidEvent[] {
  const raidStartEvents = raid.events.filter(it => it.type === 'RAID_START');

  if(raidStartEvents.length != 1) {
    errors.push(`Cannot process RAID_ON_TIME - Raid with ID ${raid.raid_id} did not have exactly one RAID_START event`);
    return [];
  }

  const parsedOnTimeEvents = raidStartEvents.reduce((acc2, startEvent) => {
    const startData = startEvent.data as pr.RaidStart;

    const playersOnTime = startData.players.filter(it => it).map(player => {
      return {
        raid_id: raid.raid_id,
        player_name: player,
        gpp: GPP_MAP.RAID_ON_TIME,
        event_type: 'RAID_ON_TIME',
        event_data: {
          time: startData.time
        }
      };
    });
    return [...acc2, ...playersOnTime]
  }, []);

  return parsedOnTimeEvents;
}

function processRaidPresence(raid: pr.Raid, errors: string[]): PRaidEvent[] {
  const presenceEventTypes = ['RAID_START', 'RAID_JOIN', 'RAID_LEAVE'];

  // Filter any RAID_LEAVE events after the last RAID_BOSS event
  // This will allow full duration for all players present for the final boss kill, even if they leave before last boss loot/RAID_END
  let consideredRaidEvents = raid.events.sort(sortByTime);
  const lastBossIndex = _.findLastIndex(consideredRaidEvents, { type: 'RAID_BOSS' });
  if(lastBossIndex != -1) {
    consideredRaidEvents = consideredRaidEvents.filter((evt, index) => {
      return !(index > lastBossIndex && evt.type === 'RAID_LEAVE');
    })
  }

  const presenceEvents = consideredRaidEvents.filter((it):it is pr.RaidEvent => presenceEventTypes.some(et => et === it.type));
  // Group all presence events by player
  const byPlayer = presenceEvents.reduce((all, evt) => {
    const addPlayerEvent = (player: string, evt: PRaidPresenceEvent) => {
      all[player] = all[player] || [];
      all[player].push(evt);
    };

    const time = evt.data.time;

    if(evt.type === 'RAID_START') {
        for(const raidPlayer of (evt.data as pr.RaidStart).players.filter(it => it)) {
          addPlayerEvent(raidPlayer, {
            player_name: raidPlayer,
            type: evt.type,
            time
          });
        }
    } else if(evt.type === 'RAID_JOIN') {
      const evtPlayer = (evt.data as pr.RaidJoin).name;
      addPlayerEvent(evtPlayer, {
        player_name: evtPlayer,
        type: evt.type,
        time
      });
    } else if(evt.type === 'RAID_LEAVE') {
      const evtPlayer = (evt.data as pr.RaidLeave).name;
      addPlayerEvent(evtPlayer, {
        player_name: evtPlayer,
        type: evt.type,
        time
      });
    } else {
      errors.push(`Unknown presence event type: ${evt.type}`);
    }

    return all;
  }, <{[player: string]: PRaidPresenceEvent[]}>{});

  // Insert a RAID_END event for all players we found in the raid
  const raidEndEvents = consideredRaidEvents.filter(it => it.type === 'RAID_END');
  if(raidEndEvents.length != 1) {
    errors.push(`Cannot process RAID_PRESENCE - Raid with ID ${raid.raid_id} did not have exactly one RAID_END event`);
    return [];
  }

  for(const player in byPlayer) {
    const data = byPlayer[player];
    data.push({
      player_name: player,
      type: 'RAID_END',
      time: raidEndEvents[0].data.time
    });
  }

  // Process player segments
  const playerSegments = Object.entries(byPlayer).reduce((all, entry) => {
    const [player, events] = entry;
    const playerEvents = events.sort(sortByTime);
    
    // Iterate through each list of events, sorted by time, and create segments
    const segments: PRaidPresenceSegment[] = [];

    function resetSegment(): PRaidPresenceSegment {
      return {
        player_name: player,
        start_time: null,
        end_time: null
      }
    }

    // State flag that indicates which part of the segment we are currently looking for
    // This lets us detect a start without an end, and vice versa
    let starting = true;
    let currentSegment: PRaidPresenceSegment = resetSegment()

    for(const evt of playerEvents) {
      if(evt.type === 'RAID_START' && starting) {
        currentSegment.start_time = evt.time;
        starting = false;
      } else if(evt.type === 'RAID_JOIN' && starting) {
        currentSegment.start_time = evt.time;
        starting = false;
      } else if(evt.type === 'RAID_LEAVE' && !starting) {
        currentSegment.end_time = evt.time;
        starting = true;
        segments.push(currentSegment);
        currentSegment = resetSegment();
      } else if(evt.type === 'RAID_END') {
        // It's possible to have a RAID_LEAVE followed by a RAID_END, and that's valid
        // If we are looking for an start time and hit RAID_END, just do nothing
        if(!starting) {
          currentSegment.end_time = evt.time;
          starting = true;
          segments.push(currentSegment);
          currentSegment = resetSegment();
        }
      }
    }

    // Validate segments
    if(!segments.length) {
      errors.push(`No segments found for player: ${JSON.stringify(player)}`);
      return all;
    }

    for(const seg of segments) {
      if(!seg.player_name || !seg.start_time || !seg.end_time) {
        errors.push(`Generated invalid segment - missing data: ${JSON.stringify(seg)}`);
        return all;
      }

      if(seg.start_time > seg.end_time) {
        errors.push(`Generated invalid segment - start time after end time: ${JSON.stringify(seg)}`);
        return all;
      }
    }

    // Set segments
    all[player] = segments;
    return all;
  }, <{[player: string]: PRaidPresenceSegment[]}>{});

  // Reduce segments to a total time
  const playerDuration = Object.entries(playerSegments).reduce((all, entry) => {
    const [player, segments] = entry;

    const duration = segments.reduce((total, seg) => {
      return total + (seg.end_time - seg.start_time);
    }, 0);

    return [...all, {
      player_name: player,
      total_seconds: duration,
      segments
    }]
  }, <PRaidPresence[]>[])

  const presenceRaidEvents: PRaidEvent[] = playerDuration.map(presence => {
    // Raid hours are rounded to the nearest hour
    const hours = Math.round(presence.total_seconds / 60 / 60);

    return {
      raid_id: raid.raid_id,
      player_name: presence.player_name,
      gpp: hours * GPP_MAP.RAID_PRESENCE,
      event_type: 'RAID_PRESENCE',
      event_data: {
        time: raidEndEvents[0].data.time,
        player_name: presence.player_name,
        total_seconds: presence.total_seconds
      }
    };
  })

  return presenceRaidEvents;
}

function processRaidFullDuration(raid: pr.Raid, presenceEvents: PRaidEvent[], errors: string[]): PRaidEvent[] {
  const raidStartEvents = raid.events.filter(it => it.type === 'RAID_START');

  if(raidStartEvents.length != 1) {
    errors.push(`Cannot process RAID_FULL_DURATION - Raid with ID ${raid.raid_id} did not have exactly one RAID_START event`);
    return [];
  }

  const raidEndEvents = raid.events.filter(it => it.type === 'RAID_END');
  if(raidEndEvents.length != 1) {
    errors.push(`Cannot process RAID_FULL_DURATION - Raid with ID ${raid.raid_id} did not have exactly one RAID_END event`);
    return [];
  }

  // Calculate total raid duration
  const raid_duration_seconds = raidEndEvents[0].data.time - raidStartEvents[0].data.time;

  const bonuses: PRaidFullDuration[] = presenceEvents.filter(it => it.raid_id === raid.raid_id).map(presenceEvt => {
    const { player_name, event_type, event_data } = presenceEvt;
    const { total_seconds } = event_data as PRaidPresence;

    return {
      player_name,
      time: raidEndEvents[0].data.time,
      presence_seconds: total_seconds,
      raid_duration_seconds
    };
  });

  const bonusRaidEvents: PRaidEvent[] = bonuses.map(bonus => {
    if(bonus.presence_seconds >= (bonus.raid_duration_seconds * RAID_FULL_DURATION_THRESHOLD)) {
      return {
        raid_id: raid.raid_id,
        player_name: bonus.player_name,
        gpp: GPP_MAP.RAID_FULL_DURATION,
        event_type: 'RAID_FULL_DURATION',
        event_data: bonus
      }
    }
  }).filter(it => it)

  return bonusRaidEvents;
}

function processRaidBoss(raid: pr.Raid, errors: string[]): PRaidEvent[] {
  const bossEvents = raid.events.filter(it => it.type === 'RAID_BOSS');

  const parsedBossEvents = bossEvents.reduce((acc2, bossEvent) => {
    const bossData = bossEvent.data as pr.RaidBoss;

    const playersKilledBoss = bossData.players.filter(it => it).map(player => {
      return {
        raid_id: raid.raid_id,
        player_name: player,
        gpp: GPP_MAP.RAID_BOSS,
        event_type: 'RAID_BOSS',
        event_data: _.pick(bossData, ['name', 'time'])
      };
    });

    return [...acc2, ...playersKilledBoss];
  }, []);

  return parsedBossEvents;
}