import { SnapchainNodeClient } from '../src/lib/farcaster/node-client';
import { identifyCastClient, applyClientFilter } from '../src/lib/farcaster/client-filter';
import { GaslessSignerManager } from '../src/lib/farcaster/gasless-signer';
import { generateCustodyAccount, deriveCustodyFromMnemonic, generateDevMnemonic, validateMnemonic } from '../src/lib/farcaster/crypto';
import { feedStore } from '../src/lib/farcaster/feed-store';
import { FarcasterCast } from '../src/lib/farcaster/types';

async function runTests() {
  console.log('--- 1. Testing Client Identification ---');
  const mockCasts: FarcasterCast[] = [
    {
      hash: '0x1111',
      fid: 1,
      text: 'Checking out Warpcast channels!',
      timestamp: Date.now(),
      parentUrl: 'https://warpcast.com/~/channel/farcaster',
    },
    {
      hash: '0x2222',
      fid: 2,
      text: 'Supercast is super fast via @supercast',
      timestamp: Date.now(),
    },
    {
      hash: '0x3333',
      fid: 3,
      text: 'Pure Snapchain protocol cast, no middleman!',
      timestamp: Date.now(),
    },
    {
      hash: '0x4444',
      fid: 4,
      text: 'Spam promotion buy tokens now 100x gem',
      timestamp: Date.now(),
    },
  ];

  for (const c of mockCasts) {
    const attr = identifyCastClient(c);
    c.clientSource = attr.clientName;
    console.log(`Cast [${c.hash}]: Client = ${attr.clientName} (indicator: ${attr.indicator})`);
  }

  console.log('\n--- 2. Testing Client Filtering Rules ---');
  // Exclude Warpcast
  const excludeWarpcast = applyClientFilter(mockCasts, {
    mode: 'exclude',
    selectedClients: ['Warpcast'],
    keywordFilters: [],
  });
  console.log('Exclude Warpcast count:', excludeWarpcast.filtered.length, 'expected 3');
  if (excludeWarpcast.filtered.some(c => c.clientSource === 'Warpcast')) {
    throw new Error('Filter failed to exclude Warpcast');
  }

  // Include ONLY Supercast
  const onlySupercast = applyClientFilter(mockCasts, {
    mode: 'include',
    selectedClients: ['Supercast'],
    keywordFilters: [],
  });
  console.log('Include only Supercast count:', onlySupercast.filtered.length, 'expected 1');
  if (onlySupercast.filtered.length !== 1 || onlySupercast.filtered[0].clientSource !== 'Supercast') {
    throw new Error('Filter failed on include only Supercast');
  }

  // Keyword filter
  const keywordFiltered = applyClientFilter(mockCasts, {
    mode: 'all',
    selectedClients: [],
    keywordFilters: ['spam promotion'],
  });
  console.log('Keyword filter count:', keywordFiltered.filtered.length, 'expected 3');
  if (keywordFiltered.filtered.some(c => c.text.includes('Spam promotion'))) {
    throw new Error('Keyword filter failed');
  }

  console.log('\n--- 3. Testing Mnemonic & Cryptographic Key Derivation ---');
  const devMnemonic = generateDevMnemonic();
  console.log('Generated 12-word Mnemonic:', devMnemonic.split(' ').length, 'words');
  const validCheck = validateMnemonic(devMnemonic);
  if (!validCheck.isValid || validCheck.wordCount !== 12) {
    throw new Error('Mnemonic validation failed');
  }

  const custody = deriveCustodyFromMnemonic(devMnemonic);
  console.log('Derived Custody Address:', custody.address);
  if (!custody.address.startsWith('0x') || custody.address.length !== 42) {
    throw new Error('Invalid derived custody address');
  }

  console.log('\n--- 4. Testing Gasless Signer Generation (EIP-712) ---');
  const testCustody = generateCustodyAccount();
  const gaslessResult = await GaslessSignerManager.issueGaslessSigner({
    fid: 999999,
    custodyPrivateKey: testCustody.privateKey,
    nodeUrl: 'http://127.0.0.1:3381',
  });
  console.log('Gasless Signer Public Key:', gaslessResult.signer.publicKeyHex);
  console.log('Protobuf Byte Length:', gaslessResult.encodedBytes.length);
  if (gaslessResult.encodedBytes.length < 50) {
    throw new Error('Invalid protobuf byte length');
  }

  console.log('\n--- 5. Testing Feed Store Registry & Threads ---');
  const initialFeed = await feedStore.getFeed();
  console.log('Feed casts count in store (from node/cache):', initialFeed.length);

  // Test adding a newly published cast
  const testCastHash = '0xabcd' + Date.now().toString(16);
  feedStore.addCast({
    hash: testCastHash,
    fid: 999999,
    text: 'Test cast on sovereign client!',
    timestamp: Date.now(),
    clientSource: 'Direct Snapchain',
  });

  const updatedFeed = await feedStore.getFeed();
  const found = updatedFeed.find(c => c.hash === testCastHash);
  if (!found) {
    throw new Error('Added cast not found in feed');
  }
  console.log('Successfully added and queried cast:', found.hash);

  console.log('\n--- 6. Testing Node Client Offline Fallback ---');
  const client = new SnapchainNodeClient('http://127.0.0.1:3381');
  const health = await client.checkHealth();
  console.log('Health check handled smoothly:', health.isOnline ? 'Online' : `Offline (expected: ${health.error})`);

  console.log('\n✓ All protocol unit tests PASSED successfully!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
