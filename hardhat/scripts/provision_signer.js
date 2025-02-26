import { createHash } from 'crypto';
import { createPrivateKey, createPublicKey, generateKeyPairSync, Sign } from 'crypto';

// Assuming you have an ECDSA key pair
const privateKey = createPrivateKey(privateKeyBuffer); // Your private key buffer
const publicKey = createPublicKey(publicKeyBuffer); // Your public key buffer

// The string to sign
const message = 'Hello, world!';

// Hash the message
const hash = createHash('sha256');
hash.update(message);
const hashedMessage = hash.digest();

// Sign the hashed message
const signer = createSign('sha256');
signer.update(hashedMessage);
const signature = signer.sign(privateKey);

// Now you can use the signature to verify the message with the public key
const verifier = createVerify('sha256');
verifier.update(hashedMessage);
const isVerified = verifier.verify(publicKey, signature);

console.log('Signature verified:', isVerified);