import { RaidEvent, RaidBossEvent } from './parse_raid';
import * as _ from 'lodash';

export enum RaidInstanceId {
  MC = 'MC',
  ONY = 'ONY',
  BWL = 'BWL',
  ZG = 'ZG',
  AQ20 = 'AQ20',
  AQ40 = 'AQ40',
  NAXX = 'NAXX'
}

export interface RaidInstance {
  id: RaidInstanceId
  name: string
}

export interface RaidInstanceDetail extends RaidInstance {
  bosses: string[]
}

export const RAID_INSTANCES: RaidInstanceDetail[] = [{
  id: RaidInstanceId.MC,
  name: 'Molten Core',
  bosses: [
    'Lucifron',
    'Magmadar',
    'Gehennas',
    'Garr',
    'Shazzrah',
    'Baron Geddon',
    'Golemagg the Incinerator',
    'Sulfuron Harbinger',
    'Ragnaros'
  ]
},{
  id: RaidInstanceId.ONY,
  name: 'Onyxia\'s Lair',
  bosses: [ 'Onyxia' ]
},{
  id: RaidInstanceId.BWL,
  name: 'Blackwing Lair',
  bosses: [
    'Razorgore the Untamed',
    'Vaelastrasz the Corrupt',
    'Broodlord Lashlayer',
    'Firemaw',
    'Ebonroc',
    'Flamegor',
    'Chromaggus',
    'Nefarian'
  ]
},{
  id: RaidInstanceId.ZG,
  name: 'Zul\'Gurub',
  bosses: [
    'High Priestess Jeklik',
    'High Priest Venoxis',
    'High Priestess Mar\'li',
    'High Priest Thekal',
    'High Priestess Arlokk',
    'Bloodlord Mandokir',
    'Jin\'do the Hexxer',
    'Gahz\'ranka',
    'Gri\'lek',
    'Renataki',
    'Hazza\'rah',
    'Wushoolay',
    'Hakkar'
  ]
},{
  id: RaidInstanceId.AQ20,
  name: 'Ruins of Anh\'Qiraj',
  bosses: [
    'Kurinnaxx',
    'General Rajaxx',
    'Moam',
    'Buru the Gorger',
    'Ayamiss the Hunter',
    'Ossirian the Unscarred'
  ]
},{
  id: RaidInstanceId.AQ40,
  name: 'Temple of Anh\'Qiraj',
  bosses: [
    'The Prophet Skeram',
    'Princess Yauj',
    'Vem',
    'Lord Kri',
    'Battleguard Sartura',
    'Fankriss the Unyielding',
    'Princess Huhuran',
    'The Twin Emperors',
    'Emperor Vek\'lor',
    'Emperor Vek\'nilash',
    'Viscidus',
    'Ouro',
    'C\'Thun'
  ]
},{
  id: RaidInstanceId.NAXX,
  name: 'Naxxramas',
  bosses: [
    'Anub\'Rekhan',
    'Grand Widow Faerlina',
    'Maexxna',
    'Instructor Razuvious',
    'Gothik the Harvester',
    'The Four Horsemen',
    'Highlord Mograine',
    'Thane Korth\'azz',
    'Lady Blaumeux',
    'Sir Zeliek',
    'Noth the Plaguebringer',
    'Heigan the Unclean',
    'Loatheb',
    'Patchwerk',
    'Grobbulus',
    'Gluth',
    'Thaddius',
    'Sapphiron',
    'Kel\'Thuzad'
  ]
}];

function isInstance(boss_events: RaidBossEvent[], instance: RaidInstanceDetail) {
  // Consider this that instance if there was ANY boss kill from the instance in the raid data
  return boss_events.some(bossEvent => {
    return instance.bosses.some(boss => boss === bossEvent.data.name);
  });
}

// A single "raid" may be (and generally will be) multiple raid instances
export function classify(raid_events: RaidEvent[]): RaidInstance[] {
  const bossEvents = raid_events.filter((it):it is RaidBossEvent => it.type === 'RAID_BOSS');

  return RAID_INSTANCES.filter(instance => {
    return isInstance(bossEvents, instance);
  }).map(it => _.pick(it, ['id', 'name']));
}