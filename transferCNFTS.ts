import { createTransferInstruction,PROGRAM_ID as BUBBLEGUM_PROGRAM_ID} from "@metaplex-foundation/mpl-bubblegum";
import { loadWalletKey, sendVersionedTx } from "./utils";
import { AccountMeta, Connection, Keypair, PublicKey, SystemProgram, Transaction, VersionedMessage } from "@solana/web3.js";
import { SPL_ACCOUNT_COMPRESSION_PROGRAM_ID, SPL_NOOP_PROGRAM_ID, ValidDepthSizePair, getConcurrentMerkleTreeAccountSize } from "@solana/spl-account-compression";
import { SYSTEM_PROGRAM_ID } from "@raydium-io/raydium-sdk";
import {
    PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
  } from "@metaplex-foundation/mpl-token-metadata";
import { getAsset, getAssetProof } from "./readAPI";
import * as bs58 from "bs58";

async function transferCNFTs() {
    const keypair = loadWalletKey("9hFxrJSPps7AoNXkx4feK2gR1FLrbLcCtDiLFswtyyt.json");
    const connection = new Connection("https://api.devnet.solana.com");
    const merkleTree = loadWalletKey("TzbPELaYFamUjuFvfuvQCwNbPwSX9u3tAHxPeZ6exGt.json").publicKey;

    const [treeAuthority, _bump] = PublicKey.findProgramAddressSync(
        [merkleTree.toBuffer()],
        BUBBLEGUM_PROGRAM_ID,
    );

    const assetId = "DGWU3mHenDerCvjkeDsKYEbsvXbWvqdo1bVoXy3dkeTd";
    const res = await getAsset(assetId);
    // console.log(res)

    const proof = await getAssetProof(assetId);
    const proofPathAsAccounts = mapProof(proof);

        const ix = createTransferInstruction({
            treeAuthority: treeAuthority,
            leafOwner: keypair.publicKey,
            leafDelegate: keypair.publicKey,
            newLeafOwner : new PublicKey("6Jaifbr1u9L6DPWk2G3a7CvAPdwpQk95cQd3rwJyKp6d"),
            merkleTree: merkleTree,
            logWrapper: SPL_NOOP_PROGRAM_ID,
            compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
            anchorRemainingAccounts: proofPathAsAccounts,
        }, {
            creatorHash: decode(res.compression.creator_hash),
            dataHash: decode(res.compression.data_hash),
            index: res.compression.leaf_id,
            nonce: res.compression.leaf_id, 
            root: decode(proof.root)
        });


    const sx = await sendVersionedTx(connection, [ix], keypair.publicKey, [keypair])
    console.log(sx);
}

// function decode(stuff:string){
//   return bufferToArray(bs58.decode(stuff))
// }
// function bufferToArray(buffer: Buffer): number[] {
//   const nums :number[] = [];
//   for (let i = 0; i < buffer.length; i++) {
//     nums.push(buffer[i]);
//   }
//   return nums;
// }
function decode(stuff: string) {
  const uint8Array = bs58.decode(stuff);
  const buffer = Buffer.from(uint8Array);
  return bufferToArray(buffer);
}

function bufferToArray(buffer: Buffer): number[] {
  const nums: number[] = [];
  for (let i = 0; i < buffer.length; i++) {
    nums.push(buffer[i]);
  }
  return nums;
}
const mapProof = (assetProof: { proof: string[] }): AccountMeta[] => {
  if (!assetProof.proof || assetProof.proof.length === 0) {
    throw new Error("Proof is empty");
  }
  return assetProof.proof.map((node) => ({
    pubkey: new PublicKey(node),
    isSigner: false,
    isWritable: false,
  }));
};

transferCNFTs();