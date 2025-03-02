import json
import random
import base64
import requests
from typing import List
from src.quote import Quote
from datetime import datetime

def convert_to_timestamp(time_str):
    # Parse the time string and convert to a datetime object
    dt = datetime.strptime(time_str, "%Y-%m-%dT%H:%M:%S.%fZ")
    
    # Convert the datetime object to a Unix timestamp (seconds since epoch)
    return dt.timestamp()
    
async def prepare_swap_intent(provider_quotes: List[Quote], near_intents_address):
    """
    Prepare swap intent from provider quotes.
    
    Args:
        provider_quotes: List of raw quotes
        near_intents_address: NEAR intents address
        
    Returns:
        Dictionary containing intents and quote hashes
    """
    nonce = await generate_nonce(near_intents_address, "https://g.w.lavanet.xyz:443/gateway/near/rpc-http/f653c33afd2ea30614f69bc1c73d4940")
    
    # Aggregate amounts per token.
    # For each quote, subtract the amount_in (token sent) and add the amount_out (token received).
    aggregated_diff = {}
    for quote in provider_quotes:
        asset_in = quote.defuse_asset_identifier_in
        asset_out = quote.defuse_asset_identifier_out
        
        if asset_in not in aggregated_diff:
            aggregated_diff[asset_in] = 0
        if asset_out not in aggregated_diff:
            aggregated_diff[asset_out] = 0
            
        aggregated_diff[asset_in] -= int(quote.amount_in)
        aggregated_diff[asset_out] += int(quote.amount_out)
    
    # Convert the aggregated numeric amounts into strings.
    # Negative numbers will naturally include a '-' prefix.
    token_diff = {}
    for asset, amount in aggregated_diff.items():
        token_diff[asset] = str(amount)
    
    # Determine the earliest expiration time from the quotes (as the deadline)
    earliest_quote: Quote = provider_quotes[0]
    for quote in provider_quotes:
        if convert_to_timestamp(quote.expiration_time) < convert_to_timestamp(earliest_quote.expiration_time):
            earliest_quote = quote
    
    # Build the message payload
    return {
        "intents": {
            "signer_id": near_intents_address.lower(),
            "deadline": earliest_quote.expiration_time,
            "nonce": nonce,
            "verifying_contract": "intents.near",
            "intents": [
                {
                    "intent": "token_diff",
                    "diff": token_diff,
                }
            ],
        },
        "quote_hashes": [quote.quote_hash for quote in provider_quotes],
    }

async def generate_nonce(signer_id, near_rpc_url):
    """
    Generate a unique nonce.
    
    Args:
        signer_id: The signer's ID
        near_rpc_url: NEAR RPC URL
        
    Returns:
        A unique nonce string
    """
    max_retries = 1000
    while max_retries > 0:
        # Generate random bytes and convert to base64
        random_bytes = bytes([random.randint(0, 255) for _ in range(32)])
        nonce_string = base64.b64encode(random_bytes).decode('utf-8')
        
        is_used = await is_nonce_used(nonce_string, signer_id, near_rpc_url)
        
        if not is_used:
            return nonce_string
            
        max_retries -= 1
    
    raise Exception("Failed to generate nonce")

async def is_nonce_used(nonce, signer_id, near_rpc_url):
    """
    Check if a nonce is already used.
    
    Args:
        nonce: The nonce to check
        signer_id: The signer's ID
        near_rpc_url: NEAR RPC URL
        
    Returns:
        Boolean indicating if the nonce is used
    """
    args = json.dumps({
        "nonce": nonce,
        "account_id": signer_id.lower(),
    })
    print(f"args: {args}")
    
    args_base64 = base64.b64encode(args.encode()).decode('utf-8')
    print(f"args_base64: {args_base64}")
    
    req_data = {
        "jsonrpc": "2.0",
        "id": "dontcare",
        "method": "query",
        "params": {
            "request_type": "call_function",
            "finality": "final",
            "account_id": "intents.near",
            "method_name": "is_nonce_used",
            "args_base64": args_base64,
        }
    }
    print(f"req data: {req_data}")
    res = requests.post(
        near_rpc_url,
        headers={"Content-Type": "application/json"},
        data=json.dumps(req_data)
    )
    
    data = res.json()
    print(f"data: {data}")
    result_data = data["result"]["result"]
    if isinstance(result_data, list):
        result_data = "".join(map(chr, result_data))  # Convert list of ASCII values to a string
    result = json.loads(result_data.encode('utf-8').decode('utf-8'))
    print(f"result: {result}")
    return result