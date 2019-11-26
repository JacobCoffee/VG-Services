import * as parser from 'luaparse';
import * as lua from '../../util/lua';
import { RaidInstance, classify } from './classify_raid';
import { processPlayerEvents, PRaidEvent } from './process_player_events';

const defaultOptions = {
  comments: false
};

export interface Raid {
  raid_id: string
  events: RaidEvent[]
  player_events: PRaidEvent[]
  instances: RaidInstance[]
}

export interface RaidEvent {
  type: string
  data: RaidStart | RaidEnd | RaidBoss | RaidLoot | RaidJoin | RaidLeave
}

export interface RaidStartEvent extends RaidEvent {
  data: RaidStart
}

export interface RaidEndEvent extends RaidEvent {
  data: RaidEnd
}

export interface RaidBossEvent extends RaidEvent {
  data: RaidBoss
}

export interface RaidLootEvent extends RaidEvent {
  data: RaidLoot
}

export interface RaidJoinEvent extends RaidEvent {
  data: RaidJoin
}

export interface RaidLeaveEvent extends RaidEvent {
  data: RaidLeave
}

export interface RaidStart {
  time: number
  players: string[]
  isLootRaid: boolean
  startedBy: string
}

export interface RaidEnd {
  time: number
}

export interface RaidBoss {
  time: number
  players: string[]
  name: string
}

export interface RaidLoot {
  time: number
  player: string
  amount: number
  item_id: string
  action: string
  name: string
}

export interface RaidJoin {
  time: number
  name: string
}

export interface RaidLeave {
  time: number
  name: string
}

const eventParsers = {
  'RAID_START': parseRaidStartEvent,
  'RAID_END': parseRaidEndEvent,
  'RAID_BOSS': parseRaidBossEvent,
  'RAID_LOOT': parseRaidLootEvent,
  'RAID_JOIN': parseRaidJoinEvent,
  'RAID_LEAVE': parseRaidLeaveEvent
};

function stringify(obj: Object) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch(e) {
     return `${obj}`;
  }
}

function parseRaidDBRoot(root: parser.Chunk, raids: Object[], errors: string[]) {
  const rdbAssign = lua.getAssignment(root, 'VanguardRaids', errors);

  if(rdbAssign) {
    parseRaidEntries(lua.findTable(rdbAssign.init, errors), raids, errors);
  } else {
    errors.push('Could not find assignment to variable "VanguardRaids"');
  }
}

function parseRaidEntries(node: parser.TableConstructorExpression, raids: Object[], errors: string[]) {
  const raidDict = lua.getDict(node, errors);

  if(raidDict) {
    const raidRoots = raidDict.map(raidRoot => {
      if(lua.isTableConstructorExpression(raidRoot.value)) {
        return {
          raid_id: raidRoot.key.value,
          events: parseRaidEvents(raidRoot.value, errors),
          raw: JSON.stringify(node)
        }
      } else {
        errors.push(`Raid root value must be a TableConstructorExpression: ${stringify(raidRoot)}`);
      }
    });

    raids.push(...raidRoots)
  } else {
    errors.push('Cannot find TableConstructorExpression from "VanguardRaids" assignment');
  }
}

function parseRaidEvents(node: parser.TableConstructorExpression, errors: string[]): RaidEvent[] {
  // Find each event, and pass the nodes to the appropriate handler
  const raidEventList = lua.getList(node, errors);

  if(raidEventList) {
    if(raidEventList.every(it => lua.isTableConstructorExpression(it.value))) {
      const events = raidEventList.map(field => {
        const eventDict = lua.getDict(field.value as parser.TableConstructorExpression, errors);
        const eventType = lua.getDictValue(eventDict, 'EVENT_TYPE', errors);
        const eventData = lua.getDictValue(eventDict, 'EVENT_DATA', errors);

        if(lua.isStringLiteral(eventType) && lua.isTableConstructorExpression(eventData)) {
          const type = eventType.value;
          const handler = eventParsers[type];

          if(!handler) {
            errors.push(`No handler for raid event: ${type}`);
            return;
          }

          return {
            type,
            data: handler(eventData, errors)
          }
        } else {
          errors.push(`Invalid event format - expected EVENT_TYPE as a StringLiteral, and EVENT_DATA as a TableConstructorExpression`);
        }
      });

      return events;
    } else {
      errors.push(`Invalid raid event list - all items must be a TableConstructorExpression`);
    }
  } else {
    errors.push(`Could not find raid event dict: ${node}`);
  }
}

function parseRaidStartEvent(node: parser.TableConstructorExpression, errors: string[]): RaidStart {
  const raidStartDict = lua.getDict(node, errors);

  if(raidStartDict) {
    // Find each field we expect and process them
    const startTime = lua.getDictValue(raidStartDict, 'Time', errors);
    const players = lua.getDictValue(raidStartDict, 'Players', errors);
    const isLootRaid = lua.getDictValue(raidStartDict, 'Loot', errors);
    const startedBy = lua.getDictValue(raidStartDict, 'StartedBy', errors);

    if(
      lua.isNumericLiteral(startTime) &&
      lua.isTableConstructorExpression(players) &&
      lua.isStringLiteral(isLootRaid) &&
      lua.isStringLiteral(startedBy)
    ) {
      return {
        time: startTime.value,
        players: parseRaidPlayersList(players, errors),
        isLootRaid: isLootRaid.value === 'true',
        startedBy: startedBy.value
      }
    } else {
      errors.push(`Invalid RAID_START event format`);
    }
  } else {
    errors.push(`Failed to parse RAID_START event - expected a TableConstructorExpression: ${node}`);
  }
}

function parseRaidPlayersList(node: parser.TableConstructorExpression, errors: string[]): string[] {
  const raidPlayersList = lua.getList(node, errors);

  if(raidPlayersList) {
    if(!raidPlayersList.length) {
      //This means a raid with no players at the start - probably a mistake?
      return [];
    }

    // For each TableValue field, extract the player name
    const players = raidPlayersList.map(playerEntry => {
      return playerEntry.value;
    });

    if(players.every(it => lua.isStringLiteral(it))) {
      return players.map(it => (it as parser.StringLiteral).value);
    } else {
      errors.push(`RAID_START players list must be a list of StringLiterals: ${raidPlayersList}`);
    }
  } else {
    errors.push(`Failed to parse RAID_START event players: ${raidPlayersList}`);
  }
}

function parseRaidEndEvent(node: parser.TableConstructorExpression, errors: string[]): RaidEnd {
  const raidEndDict = lua.getDict(node, errors);

  if(raidEndDict) {
    // Find each field we expect and process them
    const endTime = lua.getDictValue(raidEndDict, 'Time', errors);

    if(lua.isNumericLiteral(endTime)) {
      return {
        time: endTime.value
      }
    } else {
      errors.push(`Invalid RAID_END event format`);
    }
  } else {
    errors.push(`Failed to parse RAID_END event - expected a TableConstructorExpression: ${node}`);
  }
}

function parseRaidBossEvent(node: parser.TableConstructorExpression, errors: string[]): RaidBoss {
  const raidBossDict = lua.getDict(node, errors);

  if(raidBossDict) {
    // Find each field we expect and process them
    const time = lua.getDictValue(raidBossDict, 'Time', errors);
    const players = lua.getDictValue(raidBossDict, 'Players', errors);
    const name = lua.getDictValue(raidBossDict, 'Name', errors);

    if(
      lua.isNumericLiteral(time) &&
      lua.isTableConstructorExpression(players) &&
      lua.isStringLiteral(name)
    ) {
      return {
        time: time.value,
        players: parseRaidPlayersList(players, errors),
        name: name.value
      }
    } else {
      errors.push(`Invalid RAID_BOSS event format`);
    }
  } else {
    errors.push(`Failed to parse RAID_BOSS event - expected a TableConstructorExpression: ${node}`);
  }
}

function parseRaidLootEvent(node: parser.TableConstructorExpression, errors: string[]): RaidLoot {
  const raidLootDict = lua.getDict(node, errors);

  if(raidLootDict) {
    // Find each field we expect and process them
    const time = lua.getDictValue(raidLootDict, 'Time', errors);
    const player = lua.getDictValue(raidLootDict, 'Player', errors);
    const amount = lua.getDictValue(raidLootDict, 'Amount', errors);
    const item_id = lua.getDictValue(raidLootDict, 'ID', errors);
    const action = lua.getDictValue(raidLootDict, 'Action', errors);
    const name = lua.getDictValue(raidLootDict, 'Name', errors);

    if(
      lua.isNumericLiteral(time) &&
      lua.isStringLiteral(player) &&
      lua.isNumericLiteral(amount) &&
      (lua.isStringLiteral(item_id) || lua.isNumericLiteral(item_id)) &&
      lua.isStringLiteral(action) &&
      lua.isStringLiteral(name)
    ) {
      return {
        time: time.value,
        player: player.value,
        amount: amount.value,
        item_id: `${item_id.value}`,
        action: action.value,
        name: name.value
      };
    } else {
      errors.push(`Invalid RAID_LOOT event format`);
    }
  } else {
    errors.push(`Failed to parse RAID_LOOT event - expected a TableConstructorExpression: ${node}`);
  }
}

function parseRaidJoinEvent(node: parser.TableConstructorExpression, errors: string[]): RaidJoin {
  return parseRaidJoinOrLeaveEvent('RAID_JOIN', node, errors);
}

function parseRaidLeaveEvent(node: parser.TableConstructorExpression, errors: string[]): RaidLeave {
  return parseRaidJoinOrLeaveEvent('RAID_LEAVE', node, errors);
}

function parseRaidJoinOrLeaveEvent(eventType: string, node: parser.TableConstructorExpression, errors: string[]) {
  const raidLootDict = lua.getDict(node, errors);

  if(raidLootDict) {
    // Find each field we expect and process them
    const time = lua.getDictValue(raidLootDict, 'Time', errors);
    const name = lua.getDictValue(raidLootDict, 'Name', errors);

    if(
      lua.isNumericLiteral(time) &&
      lua.isStringLiteral(name)
    ) {
      return {
        time: time.value,
        name: name.value
      };
    } else {
      errors.push(`Invalid ${eventType} event format`);
    }
  } else {
    errors.push(`Failed to parse ${eventType} event - expected a TableConstructorExpression: ${node}`);
  }
}

function classifyRaids(raids: Raid[], errors: string[]) {
  for(const raid of raids) {
    const classification = classify(raid.events);
    if(classification) {
      raid.instances = classification
    } else {
      errors.push(`Could not classify raid: ${raid.raid_id}`);
    }
  }
}

async function playerEventsForRaid(raid: Raid, errors: string[]) {
  // Turn all raid events into player events
  try {
    const processed = processPlayerEvents(raid);

    // If we had any controlled processing errors, return it as validation errorss
    if(processed.errors.length) {
      errors.push(...processed.errors);
    } else {
      raid.player_events = processed.events;
    }
  } catch(e) {
    errors.push( e.message);
  }
}

// Expects a Lua script with an assignment to a variable called "VanguardRaids"
// Converts whatever is assigned there into a structure for internal consumption
export function parseRaidDB(raidDB, isLua: Boolean): { result: Raid[], errors: string[], exception?: Error } {
  try {
    let errors: string[] = [];
    let raids: Raid[] = [];
    if(isLua) {
      const ast = parser.parse(raidDB, defaultOptions);
      parseRaidDBRoot(ast, raids, errors);
    } else {
      raids = raidDB;
    }

    // Parse all the raid things into raid events
    classifyRaids(raids, errors);

    // Process the raid events into player events for each raid, and staple them to their respective raid objects
    for(const raid of raids) {
      playerEventsForRaid(raid, errors);
    }

    console.info('Parsed raids', {
      ids: raids.map(it => it.raid_id),
      errors: JSON.stringify(errors)
    });

    return {
      result: raids,
      errors
    }
  } catch(e) {
    return {
      result: null,
      errors: [e.message],
      exception: e
    }
  }
}
