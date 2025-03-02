import base64
import base58
import json
import asyncio
import time
from py_near.models import TransactionResult 
from py_near.account import Account

from near_api.account import Account
from near_api.providers import JsonProvider

import traceback



class MpcSignature:
    def __init__(self, big_r: dict, s: dict, recovery_id: int):
        self.big_r = big_r
        self.s = s
        self.recovery_id = recovery_id


Secp256k1Signature = str


async def request_mpc_signature(payload: dict) -> MpcSignature:
    signer_account: Account = payload["signer_account"]
    contract_id = payload["contract_id"]
    method_name = payload["method_name"]
    args = payload["args"]

    async def extract_base64_signature(txn: TransactionResult) -> str:
        try:
            status = txn.status
            if status and isinstance(status, dict) and 'SuccessValue' in status:
                return status['SuccessValue']
        except Exception as e:
            print(f"excpetion: {e}")
            traceback.print_exc()
            raise Exception("Failed to extract signature from transaction outcome.")

    try:
        print(f"args: {args}")
        promise: TransactionResult = await signer_account.call(
            contract_id=contract_id,
            method_name=method_name,
            args=args,
            gas=300000000000000,
            amount=0,
        )
        print(f"balance promise: {promise.status}")
        base64_signature = await extract_base64_signature(promise)
        raw_buffer = base64.b64decode(base64_signature)
        parsed = json.loads(raw_buffer.decode())  # Assuming the response is a MpcSignature
        print("MPC Signatures:", parsed)
        return MpcSignature(**parsed)

    except Exception as e:
        print(f"Rest exception: {e}")
        if hasattr(e, "context") and hasattr(e.context, "transaction_hash"):
            tx_hash = e.context.transaction_hash
            
            try:
                final_result = await wait_for_transaction(
                    signer_account.provider(),
                    tx_hash,
                    contract_id,
                    total_timeout=400000,
                    poll_interval=3000,
                )

                base64_signature = await extract_base64_signature(final_result)
                raw_buffer = base64.b64decode(base64_signature)
                parsed = json.loads(raw_buffer.decode())  # Assuming the response is a MpcSignature
                print("MPC Signatures:", parsed)
                return MpcSignature(**parsed)

            except Exception as poll_error:
                print(f"Polling failed: {poll_error}")

            raise Exception("No signatures found in the final transaction.")

        else:
            print("Unexpected error during function call:", e)
            raise e


async def wait_for_transaction(
    provider,
    tx_hash: str,
    contract_id: str,
    total_timeout: int = 40000,
    poll_interval: int = 3000,
) :
    start_time = time.time()

    while (time.time() - start_time) * 1000 < total_timeout:
        try:
            result = await provider.get_tx_status(tx_hash, contract_id)
            print(f"Result: {result}")

            if isinstance(result.status, dict):
                status = result.status

                if "SuccessValue" in status:
                    return result
                elif "Failure" in status:
                    raise Exception(f"Transaction failed: {json.dumps(status['Failure'])}")
            else:
                print(f"Transaction status: {result.status}")
        except Exception as e:
            print(e)
            traceback.print_exc()

        await sleep(poll_interval)
    print("Transaction polling timed out after 40 seconds.")
    raise Exception("Transaction polling timed out after 40 seconds.")


async def sleep(ms: int) -> None:
    await asyncio.sleep(ms / 1000)


def convert_mpc_signature_to_secp256k1(sig: MpcSignature) -> Secp256k1Signature:
    def strip_0x(hex_value: str) -> str:
        return hex_value[2:] if hex_value.startswith("0x") else hex_value

    r = strip_0x(sig.big_r["affine_point"])
    if len(r) == 66:
        r = r[2:]  # Remove the first byte (prefix)
    r = r.zfill(64)  # Ensure it's 32 bytes (64 hex characters)

    s = strip_0x(sig.s["scalar"]).zfill(64)

    recovery_id = hex(sig.recovery_id)[2:].zfill(2)

    hex_combined = r + s + recovery_id

    bytes_combined = bytes.fromhex(hex_combined)
    base58_combined = base58.b58encode(bytes_combined).decode()

    return f"secp256k1:{base58_combined}"

