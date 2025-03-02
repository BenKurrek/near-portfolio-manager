from pynear.account import Account
import asyncio
from pynear.dapps.core import NEAR

ACCOUNT_ID = "bob.near"
PRIVATE_KEY = "ed25519:..."

async def main():
    acc = Account(ACCOUNT_ID, PRIVATE_KEY)

    await acc.startup()
    print(await acc.get_balance() / NEAR)
    print(await acc.get_balance("bob.near") / NEAR)

    transaction = await acc.send_money("bob.near", NEAR * 2)
    print(tr.transaction.hash)
    print(tr.logs)

    transaction = await acc.phone.send_near_to_phone("+15626200911", NEAR // 10)
    print(tr.transaction.hash)

asyncio.run(main())