use indexmap::IndexMap;
use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use std::io::{self, Read, Write};

/// A wrapper around IndexMap that implements Borsh serialization.
#[derive(Debug, Clone, Default)]
pub struct OrderedMap<K, V>(pub IndexMap<K, V>);

impl<K, V> BorshSerialize for OrderedMap<K, V>
where
    K: BorshSerialize,
    V: BorshSerialize,
{
    fn serialize<W: Write>(&self, writer: &mut W) -> io::Result<()> {
        // Write the number of elements as a u32.
        (self.0.len() as u32).serialize(writer)?;
        // Serialize each key/value pair in insertion order.
        for (key, value) in self.0.iter() {
            key.serialize(writer)?;
            value.serialize(writer)?;
        }
        Ok(())
    }
}

impl<K, V> BorshDeserialize for OrderedMap<K, V>
where
    K: BorshDeserialize + Eq + std::hash::Hash,
    V: BorshDeserialize,
{
    fn deserialize_reader<R: Read>(reader: &mut R) -> io::Result<Self> {
        // Read the number of elements.
        let len = u32::deserialize_reader(reader)? as usize;
        let mut map = IndexMap::with_capacity(len);
        // Deserialize each key/value pair.
        for _ in 0..len {
            let key = K::deserialize_reader(reader)?;
            let value = V::deserialize_reader(reader)?;
            map.insert(key, value);
        }
        Ok(OrderedMap(map))
    }
}
