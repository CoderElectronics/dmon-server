const crypto = require("crypto");
var CryptoJS = require("crypto-js");

export const generate_jwt_key = () => {
  return Buffer.from(crypto.randomUUID()).toString('base64');
};

export function encode_query(keyString, ivString, plaintextString) {
  try {
    const keyHash = crypto.createHash('sha512').update(keyString).digest();
    const ivHash = crypto.createHash('sha512').update(ivString).digest();

    const key = keyHash.subarray(0, 32);
    const iv = ivHash.subarray(0, 16);

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintextString, 'utf-8'),
      cipher.final()
    ]);

    return encrypted.toString('hex');
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

export function decode_query(keyString, base64IV, encryptedHex) {
  try {
    // Hash the key
    const keyHash = crypto.createHash('sha512').update(keyString).digest();
    const key = keyHash.subarray(0, 32);
    const iv = Buffer.from(base64IV, 'base64');

    // Verify IV length
    if (iv.length !== 16) {
      throw new Error('Invalid IV length');
    }

    const encryptedBytes = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    const decrypted = Buffer.concat([
      decipher.update(encryptedBytes),
      decipher.final()
    ]);

    return decrypted.toString('utf-8');
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}
