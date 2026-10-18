#!/usr/bin/env node
/**
 * Farcaster Snapchain Protocol CLI Client
 * Single-command operations against local or remote Snapchain read nodes
 * MIT License
 */

import { SnapchainNodeClient } from '../lib/farcaster/node-client';
import { GaslessSignerManager } from '../lib/farcaster/gasless-signer';
import { identifyCastClient, applyClientFilter } from '../lib/farcaster/client-filter';
import { generateCustodyAccount, deriveCustodyFromMnemonic } from '../lib/farcaster/crypto';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_FILE = path.join(process.cwd(), '.farcaster-cli.json');

interface StoredConfig {
  nodeUrl: string;
  fid?: number;
  custodyAddress?: string;
  signerPublicKey?: string;
  signerPrivateKey?: string;
}

function loadConfig(): StoredConfig {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch {}
  return { nodeUrl: 'http://127.0.0.1:3381' };
}

function saveConfig(cfg: StoredConfig) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
  } catch (err) {
    console.error('Could not save configuration:', err);
  }
}

function printHeader() {
  console.log('\n======================================================');
  console.log('   🟣 FARCASTER SNAPCHAIN READ NODE & CLIENT SUITE   ');
  console.log('       Zero API Keys • Gasless Signers • MIT        ');
  console.log('======================================================\n');
}

function printHelp() {
  printHeader();
  console.log('Usage: npx tsx src/cli/index.ts <command> [options]\n');
  console.log('  node-info             Check local or remote Snapchain read node status');
  console.log('  create-signer         Create gasless Ed25519 signer authorized by custody key');
  console.log('  post-cast <text>      Publish a cast directly to the node mempool');
  console.log('  follow <targetFid>    Follow an FID via LinkAdd message');
  console.log('  unfollow <targetFid>  Unfollow an FID via LinkRemove message');
  console.log('  react <fid> <hash>    React (like/recast) to a cast');
  console.log('  feed <fid>            View casts for FID with client attribution');
  console.log('  user-profile <fid>    Inspect user metadata (bio, handle, PFP)');
  console.log('  set-node <url>        Configure node endpoint (default: http://127.0.0.1:3381)');
  console.log('\nFiltering Options for `feed`:');
  console.log('  --exclude <client>    Exclude casts from specific client (e.g. Warpcast, Supercast)');
  console.log('  --include <client>    Include only casts from specific client');
  console.log('  --keyword <text>      Filter out casts matching phrase');
  console.log('\nDeveloper Notice:');
  console.log('  This CLI communicates directly with Snapchain read nodes via HTTP (:3381)');
  console.log('  without any third-party gateway or paid API keys.\n');
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const config = loadConfig();
  const client = new SnapchainNodeClient(config.nodeUrl);

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    return;
  }

  switch (command) {
    case 'node-info': {
      const nodeUrl = args[1] || config.nodeUrl;
      console.log(`Connecting to Snapchain node at: ${nodeUrl} ...`);
      const health = await client.checkHealth(nodeUrl);
      if (health.isOnline) {
        console.log('\n Node Status: ONLINE');
        console.log(`Latency:         ${health.latencyMs}ms`);
        console.log(`Version:         ${health.version}`);
        console.log(`Syncing:         ${health.isSyncing ? 'Yes (Sync in progress)' : 'Synchronized'}`);
        console.log(`Peer Count:      ${health.peerCount}`);
        console.log(`Total Messages:  ${health.numMessages?.toLocaleString()}`);
        console.log(`Total FIDs:      ${health.numFidRegistrations?.toLocaleString()}`);
      } else {
        console.log('\n❌ Node Status: OFFLINE');
        console.log(`Endpoint:        ${nodeUrl}`);
        console.log(`Reason:          ${health.error}`);
        console.log('\n💡 Tip: Run `bash scripts/1-setup-read-node.sh` to start your standalone node.');
      }
      break;
    }

    case 'set-node': {
      const newUrl = args[1];
      if (!newUrl) {
        console.error('Error: Please specify node URL. Example: set-node http://127.0.0.1:3381');
        process.exit(1);
      }
      config.nodeUrl = newUrl;
      saveConfig(config);
      console.log(`Node endpoint set to: ${newUrl}`);
      break;
    }

    case 'create-signer': {
      printHeader();
      console.log('⚠️  DEVELOPER SECURITY WARNING (Unix `rm` policy):');
      console.log('Only use mnemonic seed phrases or private keys for TEST accounts.');
      console.log('Never enter your primary high-value cold storage wallet.\n');

      const fid = parseInt(args[1] || String(config.fid || 0), 10);
      const secret = args[2]; // mnemonic or 0x private key

      if (!fid) {
        console.error('Usage: create-signer <fid> [seed_phrase_or_private_key]');
        console.error('Example: create-signer 12345 "test test test ... "');
        process.exit(1);
      }

      let custodyKey = secret;
      if (!custodyKey) {
        console.log('Generating random test custody account for sandbox testing...');
        const randomCustody = generateCustodyAccount();
        custodyKey = randomCustody.privateKey;
        console.log(`Generated Test Custody: ${randomCustody.address}`);
      }

      console.log(`Issuing Gasless Ed25519 Signer for FID ${fid} ...`);
      try {
        const { signer, encodedBytes } = await GaslessSignerManager.issueGaslessSigner({
          fid,
          custodyPrivateKey: custodyKey,
          nodeUrl: config.nodeUrl,
        });

        console.log('\n Gasless Signer Generated Successfully!');
        console.log(`Public Key:      ${signer.publicKeyHex}`);
        console.log(`Expires At:      ${new Date(signer.expiresAt * 1000).toISOString()}`);
        console.log(`Protobuf Size:   ${encodedBytes.length} bytes`);

        config.fid = fid;
        config.signerPublicKey = signer.publicKeyHex;
        config.signerPrivateKey = signer.privateKeyHex;
        saveConfig(config);
        console.log('App key saved to `.farcaster-cli.json` for subsequent posts.');

        console.log('\nBroadcasting KEY_ADD message to node mempool...');
        const submitResult = await GaslessSignerManager.submitKeyAddToNode(config.nodeUrl, encodedBytes);
        if (submitResult.success) {
          console.log(` KEY_ADD accepted by node! Hash: ${submitResult.hash || 'gossiped'}`);
        } else {
          console.log(`⚠️  Node notice: ${submitResult.error}`);
          console.log('(If node is currently syncing snapshots, message will be submitted once node is online)');
        }
      } catch (err: any) {
        console.error('Failed to issue signer:', err.message);
      }
      break;
    }

    case 'post-cast': {
      const text = args.slice(1).join(' ');
      if (!text) {
        console.error('Usage: post-cast "<text>"');
        process.exit(1);
      }

      if (!config.fid || !config.signerPrivateKey) {
        console.error('Error: No active signer found. Run `create-signer <fid>` first.');
        process.exit(1);
      }

      console.log(`Publishing cast from FID ${config.fid} to node ${config.nodeUrl} ...`);
      const result = await client.publishCast(config.fid, config.signerPrivateKey, text);
      if (result.success) {
        console.log(' Cast submitted successfully!');
        console.log(`Hash: ${result.hash || 'submitted to mempool'}`);
      } else {
        console.error(`❌ Cast failed: ${result.error}`);
      }
      break;
    }

    case 'feed': {
      const fid = parseInt(args[1] || String(config.fid || 1), 10);
      let excludeClients: string[] = [];
      let includeClients: string[] = [];
      let keywords: string[] = [];

      for (let i = 2; i < args.length; i++) {
        if (args[i] === '--exclude' && args[i + 1]) {
          excludeClients.push(args[i + 1]);
          i++;
        } else if (args[i] === '--include' && args[i + 1]) {
          includeClients.push(args[i + 1]);
          i++;
        } else if (args[i] === '--keyword' && args[i + 1]) {
          keywords.push(args[i + 1]);
          i++;
        }
      }

      console.log(`Fetching feed for FID ${fid} from ${config.nodeUrl} ...`);
      const rawCasts = await client.getCastsByFid(fid, 30);

      const filterMode = includeClients.length > 0 ? 'include' : excludeClients.length > 0 ? 'exclude' : 'all';
      const selected = includeClients.length > 0 ? includeClients : excludeClients;

      const { filtered, stats } = applyClientFilter(rawCasts, {
        mode: filterMode,
        selectedClients: selected,
        keywordFilters: keywords,
      });

      console.log(`\nFound ${stats.total} casts | Showing: ${stats.shown} | Hidden: ${stats.hidden}`);
      if (excludeClients.length > 0) console.log(`[Filter active] Excluded: ${excludeClients.join(', ')}`);
      if (includeClients.length > 0) console.log(`[Filter active] Only Including: ${includeClients.join(', ')}`);

      console.log('\n------------------------------------------------------');
      for (const cast of filtered) {
        const clientAttr = identifyCastClient(cast);
        console.log(`[${clientAttr.clientName.padEnd(14)}] Hash: ${cast.hash}`);
        console.log(`Date: ${new Date(cast.timestamp).toLocaleString()}`);
        console.log(`"${cast.text}"\n`);
      }
      console.log('------------------------------------------------------');
      break;
    }

    case 'user-profile': {
      const fid = parseInt(args[1] || String(config.fid || 1), 10);
      console.log(`Fetching profile for FID ${fid} ...`);
      const user = await client.getUserProfile(fid);
      console.log('\nUser Profile:');
      console.log(`FID:          ${user.fid}`);
      console.log(`Username:     @${user.username || 'unknown'}`);
      console.log(`Display Name: ${user.displayName || 'unknown'}`);
      console.log(`Bio:          ${user.bio || 'none'}`);
      console.log(`PFP:          ${user.pfpUrl || 'none'}`);
      break;
    }

    case 'follow':
    case 'unfollow': {
      const targetFid = parseInt(args[1], 10);
      if (!targetFid) {
        console.error(`Usage: ${command} <targetFid>`);
        process.exit(1);
      }
      if (!config.fid || !config.signerPrivateKey) {
        console.error('Error: No active signer found. Run `create-signer <fid>` first.');
        process.exit(1);
      }
      const isRemove = command === 'unfollow';
      console.log(`${isRemove ? 'Unfollowing' : 'Following'} FID ${targetFid} from FID ${config.fid}...`);
      const result = await client.publishFollow(
        config.fid,
        config.signerPrivateKey,
        targetFid,
        isRemove,
        config.nodeUrl
      );
      if (result.success) {
        console.log(`✓ Successfully ${isRemove ? 'unfollowed' : 'followed'} FID ${targetFid}! Hash: ${result.hash || 'gossiped'}`);
      } else {
        console.error(`❌ Follow operation failed: ${result.error}`);
      }
      break;
    }

    case 'react': {
      const targetFid = parseInt(args[1], 10);
      const targetHash = args[2];
      const type = (args[3] === 'recast' ? 'recast' : 'like') as 'like' | 'recast';
      if (!targetFid || !targetHash) {
        console.error('Usage: react <targetFid> <targetHash> [like|recast]');
        process.exit(1);
      }
      if (!config.fid || !config.signerPrivateKey) {
        console.error('Error: No active signer found. Run `create-signer <fid>` first.');
        process.exit(1);
      }
      console.log(`Submitting ${type} to cast ${targetHash} from FID ${config.fid}...`);
      const result = await client.publishReaction(
        config.fid,
        config.signerPrivateKey,
        targetFid,
        targetHash,
        type,
        false,
        config.nodeUrl
      );
      if (result.success) {
        console.log(`✓ Reaction submitted! Hash: ${result.hash || 'gossiped'}`);
      } else {
        console.error(`❌ Reaction failed: ${result.error}`);
      }
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
  }
}

main().catch(err => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
