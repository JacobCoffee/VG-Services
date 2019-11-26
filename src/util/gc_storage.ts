// Simple interface to Google Cloud storage
// Requires a GCP service account credentials file, with the path to it available in
// If running on GCP, it'll just work like magic
import { Storage } from '@google-cloud/storage';
import { isLocal } from './generic';
import { JwtUser } from '../entities/user';

const storage = isLocal() ? new Storage({
  projectId: 'vanguard-255823',
  keyFilename: '../vanguard-storage.json'
}) : new Storage();

const RAID_BUCKET = process.env.VANGUARD_STORAGE_RAID_BUCKET || 'raidfiles-test.vanguard-ashkandi.com';

async function uploadRaid(filename: string, rawRaid: Buffer, actor: Express.User) {
  try {
    const bucket = await storage.bucket(RAID_BUCKET);
    const username = ((actor as JwtUser) || {}).username;

    // Generate a unique filename, but still naturally sortable
    const prefix = `${new Date().getTime()}-${username}-`;
    const gcsName = `raids/${prefix}${filename}`;
    const file = bucket.file(gcsName);
    const fileBuf = rawRaid.toString('utf-8');

    return file.save(fileBuf);
  } catch (err) {
    console.error('Error uploading raid:', err);
  }
}

export {
  uploadRaid
};
