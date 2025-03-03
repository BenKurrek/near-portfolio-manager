from nearai.agents.environment import Environment
import requests
import json
from typing import List, Optional, Dict
import asyncio
from math import ceil, floor
from src.intents import prepare_swap_intent
from src.quote import Quote
from src.mpc import request_mpc_signature, convert_mpc_signature_to_secp256k1
import time

from Crypto.Hash import keccak

import traceback

USDC_TOKEN_ID = "nep141:base-0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.omft.near"

def keccak256(data):
    if isinstance(data, str):
        data = data.encode('utf-8')
    k = keccak.new(digest_bits=256)
    k.update(data)
    return "0x"+k.hexdigest()

def post_to_solver_relay_2(req_data: Dict) -> requests.Response:
    # print("req_data:", req_data)
    res = requests.post(
        "https://solver-relay-v2.chaindefuser.com/rpc",
        headers={"Content-Type": "application/json"},
        data=json.dumps(req_data),
    )
    return res

async def fetch_quote(
    defuse_asset_identifier_in: str,
    defuse_asset_identifier_out: str,
    exact_amount_in: str|None = None,
    exact_amount_out: str|None = None,
    min_deadline_ms: int = 60000,
) -> Optional[List[Quote]]:
    # print("fetching quote")
    # print("defuse_asset_identifier_in:", defuse_asset_identifier_in)
    # print("defuse_asset_identifier_out:", defuse_asset_identifier_out)
    # print("exact_amount_in:", exact_amount_in)

    exact_amount_x = "exact_amount_in" if exact_amount_in else "exact_amount_out"
    value = exact_amount_in if exact_amount_in else exact_amount_out
    req_data = {
        "jsonrpc": "2.0",
        "id": "dontcare",
        "method": "quote",
        "params": [
            {
                "defuse_asset_identifier_in": defuse_asset_identifier_in.lower(),
                "defuse_asset_identifier_out": defuse_asset_identifier_out.lower(),
                exact_amount_x: value,
                "min_deadline_ms": min_deadline_ms,
            }
        ],
    }

    loop = asyncio.get_running_loop()
    res = await loop.run_in_executor(None, post_to_solver_relay_2, req_data)
    # res = post_to_solver_relay_2(req_data)
    data = res.json()
    print(f"data: {data}")
    return [Quote(**quote) for quote in data.get("result", [])] if "result" in data and data.get("result", []) else None

async def get_quotes(token_dict: Dict[str, int], sell: bool=True) -> List[List[Quote]]:
    try:
        items = []
        for token_id, value in token_dict.items():  # Assuming tokenIds is a list
            if int(value) > 0:
                if sell:
                    items.append({
                        "defuse_asset_identifier_in": token_id,
                        "exact_amount_in": str(value),  # Assuming intentsBalance is also a list
                        "defuse_asset_identifier_out": USDC_TOKEN_ID,
                    })
                else:
                    items.append({
                        "defuse_asset_identifier_in": USDC_TOKEN_ID,
                        "exact_amount_in": str(value),  # Assuming intentsBalance is also a list
                        "defuse_asset_identifier_out": token_id,
                    })
        print(f"Items: {items}")
    
        quotes: List[List[Quote] | None]  = await asyncio.gather(*[
            fetch_quote(
                item["defuse_asset_identifier_in"],
                item["defuse_asset_identifier_out"],
                exact_amount_in=item["exact_amount_in"] if "exact_amount_in" in item else None,
                # exact_amount_out=item["exact_amount_out"] if "exact_amount_out" in item else None
            ) for item in items
        ])   
        print(f"Quotes: {quotes}")
        quotes = list(filter(lambda quote: quote is not None, list(map(lambda quote: quote[0] if not quote is None else None, quotes))))
        return quotes
    except Exception as e:
        print(e)
        traceback.print_exc()
        raise Exception(e)



def calculate_rebalance(tokens, raw_quotes: List[Quote], current_balances) -> Dict[str, int]:
    """
    Calculate how much of each coin to buy or sell to rebalance portfolio.
    
    Args:
        tokens: Dict mapping coin identifiers to their target weights (100 = 1%)
        raw_quotes: List of Quote objects with conversion rates
        current_balances: Dict mapping coin identifiers to their current balances
    
    Returns:
        Dict mapping coin identifiers to amount to buy (positive) or sell (negative)
    """
    # Step 1: Calculate the current value of each coin in USDC
    coin_values_usdc = {}
    conversion_rates = {}
    total_portfolio_value_usdc = int(current_balances[USDC_TOKEN_ID]) if USDC_TOKEN_ID in current_balances else 0
    
    for quote in raw_quotes:
        coin_id = quote.defuse_asset_identifier_in
        
        # Calculate value in USDC
        if float(quote.amount_in) > 0:
            conversion_rate = int(quote.amount_out) / int(quote.amount_in)
        else:
            conversion_rate = 0
            
        conversion_rates[coin_id] = conversion_rate
        
        # Get current balance
        current_balance = int(current_balances.get(coin_id, 0))
        
        # Calculate value in USDC
        value_in_usdc = current_balance * conversion_rate
        
        coin_values_usdc[coin_id] = value_in_usdc
        print(f"Coin: {coin_id} Conversion rate: {conversion_rate} Balance: {current_balance} Value USDC: {value_in_usdc}")
        
        # Add to total portfolio value
        total_portfolio_value_usdc += value_in_usdc
    print(f"Total val {total_portfolio_value_usdc}")
    
    # Step 2: Calculate target values based on weights
    target_values_usdc = {}
    for coin_id, weight in tokens.items():
        # Convert weight from "100 = 1%" to decimal
        target_values_usdc[coin_id] = total_portfolio_value_usdc * weight /10000
        print(f"Convert total:{total_portfolio_value_usdc} target: {target_values_usdc[coin_id]}")
    
    # Step 3: Calculate differences (how much to buy/sell in USDC)
    differences_usdc = {}
    for coin_id in tokens.keys():
        current_value = coin_values_usdc.get(coin_id, 0)
        target_value = target_values_usdc.get(coin_id, 0)
        diff = target_value - current_value
        print(f"Current: {current_value} Target: {target_value} diff: {diff}")
        differences_usdc[coin_id] = diff
    
    # Step 4: Convert USDC differences to native coin amounts
    rebalance_amounts = {}
    for coin_id, usdc_diff in differences_usdc.items():
        # Convert from USDC value to coin amount
        conversion_rate = conversion_rates.get(coin_id, 0)
        if conversion_rate > 0:
            coin_amount = usdc_diff / conversion_rate
            
            # Try and sell more than you buy
            coin_amount = floor(usdc_diff) if coin_amount > 0 else ceil(coin_amount)
            # To keep from overdraft
            if coin_amount > 5000:
                coin_amount -= 5000
            print(f"Rebalance {coin_id}: {coin_amount} ({usdc_diff} USDC)")
            if coin_amount != 0:
                rebalance_amounts[coin_id] = coin_amount
    
    return rebalance_amounts

async def run(env: Environment):
    # Step 1: Gather env vars
    agent_id = None
    if "agent_id" in env.env_vars:
        agent_id = env.env_vars["agent_id"]
    else:
        pass
    
    contract_id = None
    if "contract_id" in env.env_vars:
        contract_id = env.env_vars["contract_id"]
    else:
        pass
    
    # Step 2: Get agent's info
    near = env.set_near(account_id=agent_id, private_key=env.env_vars["pk"])
    
    result = await near.view(
        contract_id=contract_id,
        method_name="get_agent_info",
        args={"agent_id": agent_id}
    )
    
    agent_info = result.result if result else None
    if agent_info:
        print("Agent info: {str(agent_info)}")
     
    # Step 3: Get user's info and portfolio
    for agent in agent_info:
        print(f"Current agent: {agent}")
        # TODO loop through all
        result = await near.view(
            contract_id=contract_id,
            method_name="get_user_info",
            args={"user_id": agent}
        )
        
        user_info = result.result if result else None
        if user_info:
            print(f"user_info: {user_info}")
            
        near_intents_address = user_info["near_intents_address"]
        tokens = user_info["required_spread"]
        token_ids = list(tokens.keys())
        if not USDC_TOKEN_ID in token_ids:
            token_ids.append(USDC_TOKEN_ID)
        
        print(f"Deposit address: {near_intents_address}, tokens: {tokens}")
        
        # Step 4: Get user's balances
        result = await near.view(
            contract_id="intents.near",
            method_name="mt_batch_balance_of",
            args={
                "account_id": near_intents_address.lower(),
                "token_ids": token_ids,      
            }
        )
        
        intents_balance = result.result if result else None
        
        intents_dict = {token_id: value for token_id, value in zip(token_ids, intents_balance)}
        print(f"Intents: {str(intents_dict)}")
        
        raw_quotes: List[List[Quote] | None]  = await get_quotes(intents_dict)
        
        print(f"Raw Quotes: {', '.join([str(raw_quote) for raw_quote in raw_quotes])}")
        
        # Step 5: Calculate rebalanced portfolio
        try:
            rebalance = calculate_rebalance(tokens, raw_quotes, intents_dict)
        except Exception as e:
            print(f"An error occurred: {e}")
            traceback.print_exc()
            
        print(f"Rebalance: {rebalance}")
        
        buy_tokens_dict = {}
        sell_token_dict = {}
        for token_id, value in rebalance.items():
            if value > 0:
                buy_tokens_dict[token_id] = value
            else:
                sell_token_dict[token_id] = -1*value
        print(f"Buy token dict {buy_tokens_dict}")
        # Convert rebalance into quotes
        
        
        # Sell and then buy
        for token_dict, sell in [(sell_token_dict, True), (buy_tokens_dict, False)]:
            raw_quotes = await get_quotes(token_dict, sell=sell)
            if len(raw_quotes) == 0:
                print(f"No quotes to {'sell' if sell else 'buy'}")
                continue
            # raw_quotes: List[Quote] = list(filter(lambda quote: quote is not None, list(map(lambda quote: quote[0] if not quote is None else None, quotes))))
            print(f"Raw Quotes: {', '.join([str(raw_quote) for raw_quote in raw_quotes])}")
            
            try:
                result = await prepare_swap_intent(raw_quotes, near_intents_address)
            except Exception as e:
                print(f"An error occurred: {e}")
                traceback.print_exc()
                
            intents = result["intents"]
            quote_hashes = result["quote_hashes"]
            print(f"Intents result: {result}")
            
            # Add the ERC-191 prefix to the message
            intents_message = json.dumps(intents, separators=(',', ':'))
            print(f"Intents msg: len: {len(intents_message)} and {intents_message}")
            prefix = f"\x19Ethereum Signed Message:\n{len(intents_message)}"
            prefixed_message = prefix + intents_message
            print("prefixed_message: ", prefixed_message)

            try:
                # Encode the prefixed message to bytes
                encoded = prefixed_message.encode("utf-8")

                # 2. Compute a keccak256 hash of the encoded message
                hash_value = keccak256(encoded)

                # TODO change agent_info[1]
                # Request the MPC signature
                signatures = await request_mpc_signature({
                    "signer_account": near,
                    "contract_id": contract_id,
                    "method_name": "balance_portfolio",
                    "args": {
                        "user_portfolio": agent,
                        "hash": hash_value,
                        "defuse_intents": intents,
                    },
                })
                print("FINAL signatures: ", signatures)

                # Convert MPC signature to secp256k1 format
                formatted_signature = convert_mpc_signature_to_secp256k1(signatures)

                # Prepare the signed data
                signed_data = {
                    "standard": "erc191",
                    "payload": json.dumps(intents, separators=(',', ':')),
                    "signature": formatted_signature,
                }
                print("signed_data: ", signed_data)

                # Post the signed data to the network
                req_data = {
                    "jsonrpc": "2.0",
                    "id": "dontcare",
                    "method": "publish_intent",
                    "params": [
                        {
                            "signed_data": signed_data,
                            "quote_hashes": quote_hashes,
                        }
                    ],
                }

                res = requests.post(
                    "https://solver-relay-v2.chaindefuser.com/rpc",
                    headers={"Content-Type": "application/json"},
                    data=json.dumps(req_data),
                    timeout=5000
                )
                print(f"Final response: {res}")
                print(f"json: {res.json()}")
            except Exception as e:
                print(f"Exception: {e}")
                traceback.print_exc()
        
    
    
asyncio.run(run(env))
