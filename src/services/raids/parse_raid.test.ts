import * as pr from './parse_raid';
import * as fs from 'fs';

const fullRaid = fs.readFileSync(`${__dirname}/parse_raid.test.full.lua`).toString();

test('it should process all raids from a lua object', () => {
  const output = pr.parseRaidDB(fullRaid, true);
  
  if(output.errors.length) {
    console.log(output.errors);
    console.log(output.exception);
  }

  expect(output.errors.length).toBe(0);
  expect(output.result.length).toBe(3);
  
  const raid1 = output.result.find(it => it.raid_id === '20191013-DZTS-TJJE-HTTT-XWMZAKWERCGX');
  const raid2 = output.result.find(it => it.raid_id === '20191013-TEXQ-HIKQ-IFVM-KZUYMJTOQDSX');
  const raid3 = output.result.find(it => it.raid_id === '20191015-FYBV-OFWZ-BOEN-ZMXWRLANUZKV');

  // ----- RAID 1 -----
  expect(raid1).toBeDefined();
  expect(raid1.events.length).toBe(2);

  const raid1Start = raid1.events.find(it => it.type === 'RAID_START');
  const raid1StartData = raid1Start.data as pr.RaidStart;
  expect(raid1Start).toBeDefined();
  expect(raid1StartData.time).toEqual(1571004996);
  expect(raid1StartData.players.length).toBe(0);
  expect(raid1StartData.isLootRaid).toBe(false);
  expect(raid1StartData.startedBy).toBe('Feyde');

  const raid1End = raid1.events.find(it => it.type === 'RAID_END');
  expect(raid1End).toBeDefined();
  expect(raid1End.data.time).toEqual(1571005003);

  // ----- RAID 2 -----
  expect(raid2).toBeDefined();
  expect(raid2.events.length).toBe(2);

  const raid2Start = raid2.events.find(it => it.type === 'RAID_START');
  const raid2StartData = raid2Start.data as pr.RaidStart;
  expect(raid2Start).toBeDefined();
  expect(raid2StartData.time).toEqual(1571005015);
  expect(raid2StartData.players.length).toBe(3);
  expect(raid2StartData.players).toEqual(['Acrux','Adow','Alexisa']);
  expect(raid1StartData.isLootRaid).toBe(false);
  expect(raid1StartData.startedBy).toBe('Feyde');

  const raid2End = raid2.events.find(it => it.type === 'RAID_END');
  expect(raid2End).toBeDefined();
  expect(raid2End.data.time).toEqual(1571005019);

  // ----- RAID 3 -----
  expect(raid3).toBeDefined();
  expect(raid3.events.length).toBe(7);

  const raid3Start = raid3.events.find(it => it.type === 'RAID_START');
  const raid3StartData = raid3Start.data as pr.RaidStart;
  expect(raid3Start).toBeDefined();
  expect(raid3StartData.time).toEqual(1571112759);
  expect(raid3StartData.players.length).toBe(2);
  expect(raid3StartData.players).toEqual(['Cosmic','Feyde']);
  expect(raid1StartData.isLootRaid).toBe(false);
  expect(raid1StartData.startedBy).toBe('Feyde');

  const raid3End = raid3.events.find(it => it.type === 'RAID_END');
  expect(raid3End).toBeDefined();
  expect(raid3End.data.time).toEqual(1571114218);

  const raid3Bosses = raid3.events.filter(it => it.type === 'RAID_BOSS');
  for(const bossEntry of raid3Bosses) {
    const bossEntryData = bossEntry.data as pr.RaidBoss;
    expect(bossEntryData.players.length).toBe(2);
    expect(bossEntryData.players).toEqual(['Cosmic','Feyde']);
    expect(bossEntryData.time).toEqual(expect.any(Number));
    expect(bossEntryData.name).toEqual(expect.any(String));
  }

  const raid3Loots = raid3.events.filter(it => it.type === 'RAID_LOOT');
  for(const lootEntry of raid3Loots) {
    const lootEntryData = lootEntry.data as pr.RaidLoot;
    expect(lootEntryData.player).toEqual(expect.any(String));
    expect(lootEntryData.time).toEqual(expect.any(Number));
    expect(lootEntryData.amount).toEqual(expect.any(Number));
    expect(lootEntryData.item_id).toEqual(expect.any(String));
    expect(lootEntryData.action).toEqual(expect.any(String));
    expect(lootEntryData.name).toEqual(expect.any(String));
  }

  const raid3JoinLeave = raid3.events.filter(it => it.type === 'RAID_JOIN' || it.type === 'RAID_LEAVE');
  for(const jlEntry of raid3JoinLeave) {
    const jlEntryData = jlEntry.data as pr.RaidJoin | pr.RaidLeave
    expect(jlEntryData.name).toEqual(expect.any(String));
    expect(jlEntryData.time).toEqual(expect.any(Number));
  }
});