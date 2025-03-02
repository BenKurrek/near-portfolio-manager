
class Quote:
    def __init__(
        self,
        amount_in: str,
        amount_out: str,
        defuse_asset_identifier_in: str,
        defuse_asset_identifier_out: str,
        expiration_time: str,
        quote_hash: str
    ):
        self.amount_in = amount_in
        self.amount_out = amount_out
        self.defuse_asset_identifier_in = defuse_asset_identifier_in
        self.defuse_asset_identifier_out = defuse_asset_identifier_out
        self.expiration_time = expiration_time
        self.quote_hash = quote_hash
    def __str__(self):
        return (
            f"""{{
                amount_in: {self.amount_in}, 
                amount_out: {self.amount_out}, 
                defuse_asset_identifier_in: {self.defuse_asset_identifier_in}, 
                defuse_asset_identifier_out: {self.defuse_asset_identifier_out}, 
                expiration_time: {self.expiration_time}, 
                quote_hash: {self.quote_hash})
            }}"""
        )