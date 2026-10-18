import {
  makeKeyAddBody,
  makeKeyAdd,
  makeCastAdd,
  makeReactionAdd,
  makeLinkAdd,
  ViemLocalEip712Signer,
  NobleEd25519Signer,
  FarcasterNetwork,
  getFarcasterTime,
  ADMISSIBLE_KEY_ADD_SCOPES,
  ReactionType,
  CastType,
  Message,
} from '@farcaster/core';
import { generatePrivateKey, privateKeyToAccount, toAccount } from 'viem/accounts';
import * as ed from '@noble/ed25519';

async function runProtocolTests() {
  console.log('--- 1. Testing Custody & Ed25519 Generation ---');
  const custodyAcc = privateKeyToAccount(generatePrivateKey());
  console.log('Custody Address:', custodyAcc.address);

  const privateKey = ed.utils.randomPrivateKey();
  const edSigner = new NobleEd25519Signer(privateKey);
  const edPubKeyResult = await edSigner.getSignerKey();
  if (edPubKeyResult.isErr()) throw edPubKeyResult.error;
  const edPubKey = edPubKeyResult.value;
  console.log('Ed25519 Public Key Length:', edPubKey.length);

  console.log('\n--- 2. Testing Gasless KEY_ADD Generation ---');
  const fid = 999999;
  const farcasterNow = getFarcasterTime()._unsafeUnwrap();
  
  const bodyResult = await makeKeyAddBody(
    {
      fid: BigInt(fid),
      key: edPubKey,
      scopes: [...ADMISSIBLE_KEY_ADD_SCOPES] as any,
      ttl: 30 * 24 * 3600, // 30 days
      nonce: 1,
      deadline: farcasterNow + 3600,
    },
    new ViemLocalEip712Signer(toAccount(custodyAcc))
  );

  if (bodyResult.isErr()) {
    throw new Error('makeKeyAddBody failed: ' + bodyResult.error);
  }
  console.log('Gasless KeyAddBody created successfully!');

  const keyAddMsgResult = await makeKeyAdd(
    bodyResult.value,
    { fid, network: FarcasterNetwork.MAINNET },
    edSigner
  );

  if (keyAddMsgResult.isErr()) {
    throw new Error('makeKeyAdd failed: ' + keyAddMsgResult.error);
  }
  const keyAddMsg = keyAddMsgResult.value;
  const encodedKeyAdd = Message.encode(keyAddMsg).finish();
  console.log('KEY_ADD Message binary encoded bytes:', encodedKeyAdd.length);

  console.log('\n--- 3. Testing CastAdd Message Generation ---');
  const castAddResult = await makeCastAdd(
    {
      text: 'Hello decentralized social! Running on my own Snapchain read node.',
      embeds: [{ url: 'https://snapchain.farcaster.xyz' }],
      embedsDeprecated: [],
      mentions: [],
      mentionsPositions: [],
      type: CastType.CAST,
    },
    { fid, network: FarcasterNetwork.MAINNET },
    edSigner
  );

  if (castAddResult.isErr()) {
    throw new Error('makeCastAdd failed: ' + castAddResult.error);
  }
  const castMsg = castAddResult.value;
  const encodedCast = Message.encode(castMsg).finish();
  console.log('CastAdd Message binary encoded bytes:', encodedCast.length);

  console.log('\n--- 4. Testing ReactionAdd Message Generation (Like) ---');
  const reactionResult = await makeReactionAdd(
    {
      type: ReactionType.LIKE,
      targetCastId: {
        fid: 37,
        hash: new Uint8Array(20),
      },
    },
    { fid, network: FarcasterNetwork.MAINNET },
    edSigner
  );

  if (reactionResult.isErr()) {
    throw new Error('makeReactionAdd failed: ' + reactionResult.error);
  }
  const reactionMsg = reactionResult.value;
  const encodedReaction = Message.encode(reactionMsg).finish();
  console.log('ReactionAdd Message binary encoded bytes:', encodedReaction.length);

  console.log('\n--- 5. Testing LinkAdd Message Generation (Follow) ---');
  const linkResult = await makeLinkAdd(
    {
      type: 'follow',
      targetFid: 37,
    },
    { fid, network: FarcasterNetwork.MAINNET },
    edSigner
  );

  if (linkResult.isErr()) {
    throw new Error('makeLinkAdd failed: ' + linkResult.error);
  }
  const linkMsg = linkResult.value;
  const encodedLink = Message.encode(linkMsg).finish();
  console.log('LinkAdd Message binary encoded bytes:', encodedLink.length);

  console.log('\n[SUCCESS] ALL FARCASTER PROTOCOL ENGINE TESTS PASSED!');
}

runProtocolTests().catch((err) => {
  console.error('[TEST ERROR]', err);
  process.exit(1);
});
