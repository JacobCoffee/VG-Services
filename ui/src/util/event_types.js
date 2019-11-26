import { capitalize, startCase } from 'lodash-es';

function humanizedOptions(opts) {
  return opts.map(type => ({
    key: type,
    text: startCase(type).split(' ').map(capitalize).join(' '),
    value: type
  }))
}

export const eventTypes = [
  "RAID_BOSS",
  "RAID_FULL_DURATION",
  "RAID_LOOT",
  "RAID_ON_TIME",
  "RAID_PRESENCE"
];

export const eventTypeOptions = humanizedOptions(eventTypes);

export const lootEventTypes = [
  'AWARD',
  'SHARD',
  'BANK'
];

export const lootEventTypeOptions = humanizedOptions(lootEventTypes);